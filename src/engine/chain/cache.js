/*
 * ENGINE (same in every project, do not edit).
 *
 * Short-lived read cache for page views.
 * - Same key while a read is in flight: callers share one request (wallet events often fire twice in a row)
 * - Same key within ttl: served from memory, no RPC call (back/forward between pages)
 * - invalidateReads() after anything that changes chain state
 */

const entries = new Map();
const DEFAULT_TTL = 15_000;

function cachedRead(key, load, { ttl = DEFAULT_TTL, fresh = false } = {}) {
    const hit = entries.get(key);
    if (hit?.pending) return hit.pending;
    if (!fresh && hit && Date.now() - hit.at < ttl) return Promise.resolve(hit.value);

    const pending = load()
        .then((value) => { entries.set(key, { value, at: Date.now() }); return value; })
        .catch((error) => { entries.delete(key); throw error; });

    entries.set(key, { ...hit, pending });
    return pending;
}

function invalidateReads() {
    entries.clear();
}

export { cachedRead, invalidateReads };
