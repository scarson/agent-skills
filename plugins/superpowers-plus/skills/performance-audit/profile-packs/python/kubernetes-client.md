# Python performance module: Kubernetes client (`kubernetes` / `kubernetes-asyncio`)
> Load when the Kubernetes Python client is material to the scope — `kubernetes` / `kubernetes-asyncio`, `client.CoreV1Api`/`AppsV1Api`, `watch.Watch`, KubeSpawner, or operator/controller code — see the module map in `../python.md`. Core lanes + Runtime & interpreter notes live in `../python.md`; this file is the Kubernetes-client lens only. It *deepens* the core lanes for the API-server access pattern; it does not restate them.

## Kubernetes client (operator / controller / cloud-glue Python)

> The dominant cost of Kubernetes-client code is **round-trips to the API server**, not local CPU: the
> audited Python is orchestration, the work happens in the apiserver/etcd. Reason about *how often* and
> *how wide* each call is, and whether a poll re-fetches what a watch/cache could stream. Verify concrete
> API names/params against the currency brief — the client tracks the cluster's API version.

## Data access & I/O (lane `data-access`)

- **Re-`list_*` in a poll loop is the headline waste.** Polling `list_namespaced_*` every tick re-pulls the whole collection each time. Follow changes with **`watch.Watch().stream(api.list_*, resource_version=…)`** (incremental events). Note the official Python client has **no built-in informer/`SharedInformerFactory`** like Go's client-go (a long-standing open request) — so for a real controller you either **hand-maintain a local cache fed by `watch`**, or use an operator framework such as **`kopf`** that supplies the watch + cache + dedup. Reads should hit that local cache, not the apiserver. *(verify the watch API for your client version.)*
- **Narrow server-side; never filter in Python.** Pass `field_selector` / `label_selector` so the apiserver returns only matching objects, and use `limit=` + the `_continue` token to page large collections — pulling a whole namespace and filtering client-side moves megabytes and serializes objects you discard.
- **Reuse one `ApiClient`.** It owns the urllib3 connection pool and TLS context; building `client.ApiClient()` / re-running `config.load_kube_config()` per call repays TLS + pool setup every time. Construct the `*Api` objects once and share them.
- **Patch / server-side apply over read-modify-write.** A `read_*` then `replace_*` is two round-trips and races other writers; a single `patch_namespaced_*` is one call and conflict-aware. For **SSA** specifically the Python client needs the `field_manager` arg **and** the `application/apply-patch+yaml` content type — the default patch is *not* SSA, a known sharp edge (kubernetes-client/python#1202). *(verify SSA support for your cluster/client version.)*
- **No per-item `read_*` in a loop.** Fetching each object by name inside a loop is an N+1 against the apiserver — `list_*` once with a selector and index the result.

## Concurrency & parallelization (lane `concurrency`)

- **The official `kubernetes` client is synchronous/blocking (urllib3).** Calling it directly on an event loop (FastAPI/Starlette/async worker) **parks the loop** for the whole round-trip. Run it via `asyncio.to_thread` / a thread-pool executor, or use **`kubernetes-asyncio`** for a native-async path. *(cross-ref `../python.md` "Hidden blocking that parks the loop" + `python/async-asyncio.md`.)*
- **`watch.Watch().stream(...)` is a blocking generator.** Consume it on a dedicated thread/task, not inline on a request path; one blocking watch on the loop stalls everything multiplexed on it.
- **Bound fan-out across resources/namespaces.** The apiserver enforces rate limits and API Priority & Fairness; an unbounded `gather`/thread-burst of list/patch calls trips throttling (HTTP 429) and degrades the whole cluster — cap concurrency with a semaphore and respect `Retry-After`.

## Memory & allocation (lane `memory`)

- **A full `list_*` of a large collection materializes every object** — including verbose `managedFields` and `last-applied-configuration` annotations — into Python objects at once. Page with `limit=`; and when you only need names/labels, request a metadata-only projection (the apiserver's `PartialObjectMetadata` via an `Accept` header) — note the generated Python client has no first-class param for it, so it's a header-level technique, not a clean call.
- **Consume watch streams incrementally.** Collecting a watch (or a paged list) into one big list before processing holds the whole result set; process per event/page and let it drain.

## Framework-idiom currency (lane `idiom-currency`)

- **A `watch`-fed local cache, or an operator framework (`kopf`)** supersedes hand-rolled poll-and-relist loops for code that reacts to cluster state (it gives you the watch + cache + dedup + resync). Unlike Go's client-go there is **no built-in informer** in the official Python client, so this is a framework/hand-roll choice, not a stdlib-of-the-client one. *(verify against your framework version.)*
- **Server-side apply (SSA)** is the modern declarative write (field ownership, no read-modify-write race); prefer it over GET-then-PUT for reconcilers.
- **Watch bookmarks** (`allow_watch_bookmarks=True`) let a watcher resume from a recent `resourceVersion` after a drop without a full re-list — cheaper reconnects on long-lived watches.
- **`kubernetes-asyncio`** for async services that need many concurrent calls without a thread-pool. *(verify parity with the sync client's surface for your version.)*

## Sources
- Kubernetes Python client (verified) — `*Api` list params `_continue`/`limit`/`field_selector`/`label_selector`/`allow_watch_bookmarks`, `watch`, `ApiClient` connection handling: github.com/kubernetes-client/python (`kubernetes/docs/CoreV1Api.md`). SSA content-type sharp edge: kubernetes-client/python#1202.
- No built-in informer in the official Python client (vs Go client-go) — long-standing request: github.com/kubernetes-client/python/issues/868; operator framework: github.com/nolar/kopf.
- Kubernetes API concepts — field/label selectors, efficient detection of changes (watch + `resourceVersion` + bookmarks), API Priority & Fairness / 429 handling: kubernetes.io/docs/reference/using-api/.
- Server-side apply: kubernetes.io/docs/reference/using-api/server-side-apply/.
- `kubernetes-asyncio`: github.com/tomplus/kubernetes_asyncio.
