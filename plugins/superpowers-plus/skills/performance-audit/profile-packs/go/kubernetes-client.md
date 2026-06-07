# Go performance module: Kubernetes (client-go / controller-runtime / Operator SDK)
> Load when `k8s.io/client-go`, `sigs.k8s.io/controller-runtime`, Kubebuilder / Operator-SDK scaffolding, informers/listers, or a `Reconcile(...)` loop is material to the scope — see the module map in `../go.md`. Core lanes + Runtime & GC notes live in `../go.md`; this file is the Go Kubernetes-client lens only. It *deepens* the core lanes for the apiserver access pattern; it does not restate them. Go is the primary operator/controller ecosystem, so this is a common, high-materiality lens.

## Kubernetes in Go (client-go / controller-runtime)

> As with any Kubernetes client, the cost lives in **round-trips to the apiserver**, not local CPU —
> but controller-runtime adds a decisive twist: reads go through an **in-memory informer cache by
> default**, so the perf question is usually "is this read served from cache or hammering the
> apiserver, and is the cache scoped so it doesn't blow up memory?" Verify concrete API names/options
> against the currency brief — the client tracks the cluster API and controller-runtime versions.

## Data access & I/O (lane `data-access`)

- **Reads through `mgr.GetClient()` hit the cache, not the apiserver — keep them there.** controller-runtime's default client serves `Get`/`List` from the informer cache. Use `APIReader` (uncached) **only** when you need a guaranteed-live read; routing ordinary reads through `APIReader` turns every reconcile into direct apiserver load. Conversely, don't add your own polling `List` against the apiserver when the cached client already has the data.
- **A cached `List` still returns *all* cached objects of that type unless you index + select.** Filtering the result in Go after `List(ctx, &list)` loads the whole set into the reconcile. Register a **field indexer** (`mgr.GetFieldIndexer().IndexField`) and query with `client.MatchingFields{...}` / `client.MatchingLabels{...}` so the cache narrows server-side-style. *(verify indexer API for your controller-runtime version.)*
- **Use informers/listers, never a poll loop.** In raw client-go, a `SharedInformerFactory` + lister gives one watch feeding a local cache that all reads hit; re-`List`-ing per tick/reconcile is the dominant avoidable cost.
- **Server-side apply over get-modify-update.** `Patch(ctx, obj, client.Apply, client.FieldOwner("…"), client.ForceOwnership)` (SSA) sets desired state with field ownership in one call and no read-modify-write race — `FieldOwner` is required, and the docs say most controllers want `ForceOwnership` to take conflicting fields; a `Get` then `Update` is two round-trips and conflicts under contention. *(verify SSA support for your cluster/client version.)*
- **Page large lists / use protobuf for built-ins.** `client.Limit` + the continue token for large collections; the **typed** clients negotiate protobuf for built-in types (smaller/faster than the JSON the `unstructured`/dynamic client uses) — reserve `unstructured`/dynamic for CRDs or generic code rather than defaulting to it.

## Concurrency & parallelization (lane `concurrency`)

- **Client-side rate limits — know which default actually applies.** Raw **client-go**'s `rest.Config` defaults to `QPS=5, Burst=10`; a busy raw client hits client-side throttling (the `Waited for … due to client-side throttling` log) — latency the apiserver never saw, so raise `QPS`/`Burst` for hot raw-client-go code. **controller-runtime is different:** its `GetConfig`/manager **disables client-side rate limiting by default** and relies on **server-side API Priority & Fairness** — so for a controller-runtime app the lever is APF + the rate-limited workqueue, and you'd set `QPS`≥0 only to deliberately *re-enable* client-side limiting. Either way, respect APF 429s + `Retry-After`. *(verify for your client/controller-runtime version.)*
- **Avoid reconcile storms — gate what triggers `Reconcile`.** Without predicates, every status write you make re-triggers your own reconcile. Use `builder.WithPredicates(predicate.GenerationChangedPredicate{})` (and precise `Owns`/`Watches`) so spurious updates don't spin the loop; this is the single most common controller throughput bug.
- **Tune `MaxConcurrentReconciles` (defaults to 1) + the rate-limited workqueue.** With the default of one worker every reconcile is serialized; the rate-limited workqueue already dedups and backs off per-key — size concurrency to the workload rather than fanning out unbounded goroutines per object.

## Memory & allocation (lane `memory`)

- **The informer cache holds every object of every watched type — scope it.** By default controller-runtime caches all objects cluster-wide for each watched GVK; on a large cluster that is the controller's dominant memory cost (and an OOM risk). Scope with `cache.Options{ByObject: {Label/Field selectors, Namespaces}}` (or the cache-wide `DefaultLabelSelector`/`DefaultNamespaces`), watch only the namespaces/types you need, and set `DefaultTransform: cache.TransformStripManagedFields()` to drop `managedFields` cache-wide — the docs note this "can lead to a significant reduction in memory usage" when you don't read managedFields. *(verify `cache.Options` shape for your version.)*
- **Don't deep-copy in tight loops needlessly.** `client.Object` reads from the cache return pointers you must **not mutate** (you'd corrupt the cache) — `DeepCopy()` before mutating, but only once per object, not repeatedly inside inner loops.

## Framework-idiom currency (lane `idiom-currency`)

- **Informer cache + field indexers** (the controller-runtime model) supersede hand-rolled poll-and-filter loops — verify the manager's cache/index options for your version.
- **Server-side apply** is the modern declarative write for reconcilers (field ownership, no RMW race).
- **Predicates + `Owns`/`Watches`** (e.g. `GenerationChangedPredicate`, `ResourceVersionChangedPredicate`) are the idiomatic way to suppress no-op reconciles.
- **Watch bookmarks** (`AllowWatchBookmarks`) for resumable watches in raw client-go; cheaper reconnects without a full relist.

## Sources
- client-go — informers/listers, `rest.Config` QPS/Burst, pagination (`Limit`/`Continue`), protobuf content negotiation: github.com/kubernetes/client-go, kubernetes.io/docs/reference/using-api/.
- controller-runtime (verified against pkg.go.dev) — client SSA (`client.Apply`/`FieldOwner`/`ForceOwnership`), `MatchingFields`/`MatchingLabels` + `FieldIndexer.IndexField`, "DeepCopy before mutating a cached object": `…/pkg/client`; `GenerationChangedPredicate`/`ResourceVersionChangedPredicate`: `…/pkg/predicate`; `MaxConcurrentReconciles` (default 1): `…/pkg/controller`; `cache.Options`/`ByObject`/`TransformStripManagedFields`: `…/pkg/cache`. Root: pkg.go.dev/sigs.k8s.io/controller-runtime.
- API Priority & Fairness / client-side throttling: kubernetes.io/docs/concepts/cluster-administration/flow-control/.
- Server-side apply: kubernetes.io/docs/reference/using-api/server-side-apply/.
