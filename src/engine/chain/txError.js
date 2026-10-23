// ENGINE (same in every project, do not edit). Error helpers for transactions (project/chain/intereacts).

/**
 * Keeps the wallet's own error code so the UI can tell a rejection from a failure.
 *
 * @param {any} error     what the wallet or RPC threw
 * @param {any} handled   result of box.handleTxError(Contract, error)
 * @param {string} fallback  message when nothing readable came back
 * @returns {Error}
 */
export function normalize(error, handled, fallback) {
    const message = error?.reason || handled?.raw?.shortMessage || error?.shortMessage || error?.message || fallback;
    const out = new Error(message);
    out.code = error?.code;
    out.cause = error;
    return out;
}

/** True when the person closed or rejected the wallet prompt */
export const isUserReject = (error) => {
    const code = error?.code ?? error?.cause?.code;
    return code === 4001 || code === "ACTION_REJECTED";
};
