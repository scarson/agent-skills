# Rust performance module: Kubernetes (kube-rs — the `kube` crate)
> Load when `kube` / `kube-runtime` / `kube-client` / `kube-derive` is material to the scope — a `Controller`, `watcher`, `reflector`/`Store`, or a `Reconcile`-style loop — see the module map in `../rust.md`. Core lanes + Runtime & build notes live in `../rust.md`; this file is the kube-rs lens only. It *deepens* the core lanes for the apiserver access pattern; it does not restate them. (Grounded in the kube-rs optimization guide — see Sources.)

## Kubernetes in Rust (kube-rs)

> As with any Kubernetes client the cost lives in **round-trips to the apiserver**, but kube-rs's
> `Controller`/`reflector` keeps a local **`Store`** (the informer-cache equivalent), and the guide is
> explicit that *"the primary contributor to your controller's memory use is going to be the mandatory
> reflector for the main object."* So the two perf questions are: are reads served from the `Store`
> rather than the apiserver, and is the watch scoped/trimmed so the `Store` doesn't hold (and copy) more
> than it needs? The `kube` crate API moves fast — verify names against the currency brief / your version.

## Data access & I/O (lane `data-access`)

- **Read from the reflector `Store`, not the apiserver.** A `Controller` maintains a `reflector` cache; take its reader (`reflector::store()` returns a `(reader, writer)` pair — pass the **reader** into the reconciler) and read cached objects from it instead of issuing `Api::get`/`Api::list` per reconcile. Re-listing the apiserver inside the loop is the dominant avoidable cost.
- **Narrow the watch with `watcher::Config`.** Scope what the watch (and therefore the `Store`) pulls: `Config::default().labels("environment in (production, qa)")`, `.fields("metadata.name=foo")`, even negative field selectors (`"metadata.namespace!=kube-system"`) — filter server-side rather than loading everything and filtering in Rust.
- **Page or stream large initial lists.** The initial list defaults to `page_size(500)`; lower it (`Config::default().page_size(50)`) on constrained clusters, or use **`streaming_lists()`** (WatchList) where the cluster supports it to avoid paginated-list overhead entirely. *(verify cluster WatchList support.)*
- **Server-side apply over get-then-replace.** `Patch::Apply` with `PatchParams::apply("my-field-manager")` sets desired state with field ownership in one call and no read-modify-write race; a `get` then `replace` is two round-trips and conflicts under contention. *(verify SSA params for your `kube` version.)*

## Concurrency & parallelization (lane `concurrency`)

- **Cap reconcile concurrency — the default is unbounded.** A `Controller`'s reconciler runs with infinite concurrency by default; `Config::default().concurrency(3)` flattens spiky workloads (a surge of events otherwise spawns unbounded concurrent reconciles + apiserver calls). *(`controller::Config`.)*
- **Debounce rapid event bursts.** `Config::default().debounce(Duration::from_secs(5))` coalesces successive events for the same object — trades a little latency for far fewer reconciles under churn.
- **Filter no-op reconciles with predicates.** Your own status writes re-trigger your watch; gate with `watcher(...).applied_objects().predicate_filter(predicates::generation)` (or `predicates::resource_version`) so unchanged-spec updates don't requeue — the kube-rs analogue of a reconcile storm.
- **Always back off on errors in custom streams.** A hand-rolled `watcher` stream without `.default_backoff()` hot-loops the apiserver on a persistent error; include it to bound retry pressure.

## Memory & allocation (lane `memory`)

- **The reflector `Store` is the dominant memory cost — trim before it stores.** Use **`metadata_watcher()`** (yielding `PartialObjectMeta<T>`) instead of `watcher()` when you only need metadata — the guide reports ~30% memory reduction. And/or prune in a `.modify()` transform before caching: clear `managed_fields_mut()`, `annotations_mut()`, set `status = None`.
- **Don't over-prune `ObjectMeta`.** `kube::runtime` relies on `.metadata.name`, `.metadata.resourceVersion`, `.metadata.namespace`, and sometimes `.metadata.ownerReferences` — pruning those breaks the watcher/Store. Trim weight, keep the keys.
- **Scope the `Store` and share it.** A label/field-selected watch holds fewer objects; where several controllers need the same objects, share one `Store`/reflector rather than maintaining duplicate caches of the same resource.

## Framework-idiom currency (lane `idiom-currency`)

- **`streaming_lists()` (WatchList)** over paginated initial lists on supporting clusters; **`metadata_watcher`** for metadata-only streams; **predicates** (`predicates::generation` / `predicates::resource_version`) to dedup reconciles; **server-side apply** (`Patch::Apply`) for declarative writes. The `kube` crate evolves quickly — verify each against your version / the currency brief.

## Sources
- kube-rs optimization guide (the authoritative perf reference — reflector `Store` memory, `watcher::Config` selectors, `metadata_watcher`/`PartialObjectMeta`, `.modify()` pruning + the ObjectMeta caveat, `streaming_lists`/`page_size`, `predicate_filter`/`predicates`, `controller::Config` `concurrency`/`debounce`, `default_backoff`): https://kube.rs/controllers/optimization/.
- `kube::runtime` API (`Controller`, `watcher`/`watcher::Config`, `reflector`/`Store`, `predicates`, `applier`, `Scheduler`): https://docs.rs/kube/latest/kube/runtime/index.html.
- Server-side apply with `Patch::Apply` / `PatchParams::apply`: https://docs.rs/kube/latest/kube/api/struct.Api.html and kubernetes.io/docs/reference/using-api/server-side-apply/.
