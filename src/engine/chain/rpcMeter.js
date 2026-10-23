/*
 * ENGINE (same in every project, do not edit).
 *
 * Counts contract reads (eth_call) per page load, so RPC usage can be checked against an endpoint's limits.
 */

const meter = { page: "", startedAt: 0, calls: {}, total: 0, rounds: 0, history: [] };
let inFlight = 0;

/** Starts a fresh count for a page; the previous page's numbers go to history */
function startPage(page) {
    if (meter.page) {
        meter.history.unshift({ page: meter.page, total: meter.total, rounds: meter.rounds, calls: { ...meter.calls }, ms: Date.now() - meter.startedAt });
        meter.history.length = Math.min(meter.history.length, 20);
    }
    Object.assign(meter, { page, startedAt: Date.now(), calls: {}, total: 0, rounds: 0 });
}

const pause = ([ min = 0, max = min ] = []) => {
    const ms = min + Math.random() * Math.max(0, max - min);
    return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
};

// Dev tools can add a delay per call so a local node feels like a public RPC; production leaves it at 0
let latency = [ 0 ];
const setLatency = (range) => { latency = Array.isArray(range) ? range : [ 0 ]; };

/** Wraps a contract so every .call() is counted; a "round" is a batch of calls that start while none are pending */
const metered = (contract, label) => ({
    methods: new Proxy({}, {
        get: (_, name) => (...args) => {
            const method = contract.methods[name](...args);
            return {
                call: async (...callArgs) => {
                    const id = `${label}.${String(name)}`;
                    meter.calls[id] = (meter.calls[id] ?? 0) + 1;
                    meter.total += 1;
                    if (inFlight === 0) meter.rounds += 1;
                    inFlight += 1;
                    try {
                        await pause(latency);
                        return await method.call(...callArgs);
                    } finally {
                        inFlight -= 1;
                    }
                },
            };
        },
    }),
});

if (typeof window !== "undefined") window.rpcMeter = meter;

export { meter, metered, startPage, setLatency };
