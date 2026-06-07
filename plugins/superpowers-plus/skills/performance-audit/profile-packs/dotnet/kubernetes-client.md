# .NET performance module: Kubernetes client (`KubernetesClient` / KubeOps)
> Load when the .NET Kubernetes client is material to the scope — the `KubernetesClient` package / `k8s` namespace, `new Kubernetes(config)`, `*Async` list/watch calls, a `SharedInformer`, or KubeOps operator code — see the module map in `../dotnet.md`. Core lanes + Variant notes live in `../dotnet.md`; this file is the Kubernetes-client (.NET) lens only. It *deepens* the core lanes for the apiserver access pattern; it does not restate them. (Grounded against the kubernetes-client/csharp repo — see Sources.)

## Kubernetes in .NET (KubernetesClient / KubeOps)

> .NET is a **less common** operator/controller ecosystem than Go/Python/Rust, so load this when k8s API
> work is *central* to the scope (a KubeOps operator, or a service doing real apiserver work) — not on an
> incidental reference. As with any client the cost is **round-trips to the apiserver**, but the .NET
> client has two decisive twists: it is **async-first** (so the footgun is sync-over-async, the opposite
> of Python's), and — unlike the Python client — it **ships a built-in Rx-based `SharedInformer` + cache**,
> so the question is whether reads come from that cache rather than a poll. Verify concrete names against
> the currency brief — the client tracks the cluster API version.

## Data access & I/O (lane `data-access`)

- **Reuse one `Kubernetes` client.** `new Kubernetes(config)` owns an `HttpClient` and its connection pool; constructing one per call repays TLS + handshake and risks the classic .NET socket-exhaustion footgun. Build it once and share it (or register it as a singleton).
- **Use the built-in `SharedInformer`, not a poll loop.** The client ships a Reactive-Extensions-based **shared informer + shared informer factory + versioned cache** (it exists here, unlike the Python client) — one physical watch feeds a local cache that multiple subscribers read. Re-calling `List*Async` on a timer is the dominant avoidable cost; follow changes through the informer and read from its cache. *(verify the informer API for your client version.)*
- **Narrow server-side; page large lists.** Pass `fieldSelector` / `labelSelector` so the apiserver filters, and page with `limit` + `continueParameter` (take the continue token from the response, e.g. `result.Continue()`) — don't pull a whole namespace and filter in LINQ.
- **Server-side apply over read-modify-write.** A read then `Replace*Async` is two round-trips and races other writers; one `Patch*Async` with `new V1Patch(body, V1Patch.PatchType.ApplyPatch)` and a required `fieldManager` is a single conflict-aware call (content type `application/apply-patch+yaml`). Note SSA on CRDs via the custom-objects API has historically been rougher (`V1Patch` support gaps) — *(verify for your client version; see kubernetes-client/csharp#528.)*

## Concurrency & parallelization (lane `concurrency`)

- **The client is async-first — never sync-over-async.** Blocking on it with `.Result` / `.Wait()` / `.GetAwaiter().GetResult()` ties up a thread-pool thread for the whole round-trip and can **deadlock or starve the pool** under load. `await` the `*Async` methods all the way up and thread a `CancellationToken` through. *(cross-ref `../dotnet.md` async/`ConfigureAwait` notes — this is the .NET-specific inverse of Python's "sync client on the loop".)*
- **Consume watches / informer streams on background work, not inline.** Observe the Rx stream (or the `Watch*Async` callback) from a hosted/background service; a watch held open on a request path pins resources for the connection's lifetime.
- **Bound fan-out across resources/namespaces.** An unbounded burst of concurrent `*Async` calls trips the apiserver's API Priority & Fairness (HTTP 429); cap concurrency (e.g. a `SemaphoreSlim`) and respect `Retry-After`.

## Memory & allocation (lane `memory`)

- **A large `List*Async` deserializes every object into POCOs at once** (System.Text.Json on modern versions) — page with `limit` rather than materializing a whole namespace. The `SharedInformer` cache likewise holds every watched object, so scope it with the server-side selector on the informer's query rather than caching cluster-wide.
- **Observe watch events incrementally.** Buffering an entire watch/list into a `List<T>` before processing holds the whole set; process per event/page via the Rx pipeline and let it drain.

## Framework-idiom currency (lane `idiom-currency`)

- **The Rx-based `SharedInformer` + shared cache** supersedes hand-rolled poll loops; **`V1Patch.PatchType.ApplyPatch`** is the modern declarative write; **KubeOps** provides full operator scaffolding (reconcile/requeue, finalizers, leader election) on top of the client. Verify each against your client / KubeOps version.

## Sources
- Official .NET client (verified) — single `Kubernetes(config)` reuse, async-first `*Async` API, `Watch`/`WatchObjectAsync`, list params (`limit`/`continueParameter`/`fieldSelector`/`labelSelector`/`allowWatchBookmarks`): github.com/kubernetes-client/csharp.
- Built-in Rx `SharedInformer` + shared informer factory + versioned cache: github.com/kubernetes-client/csharp/pull/394.
- Server-side apply — `V1Patch.PatchType.ApplyPatch` (`application/apply-patch+yaml`) + required `fieldManager`; CRD/custom-objects caveat: kubernetes-client.github.io/csharp/api/k8s.Models.V1Patch.PatchType.html, kubernetes-client/csharp#528.
- KubeOps (.NET operator framework): github.com/buehler/dotnet-operator-sdk.
- API Priority & Fairness / 429: kubernetes.io/docs/concepts/cluster-administration/flow-control/.
