import { box } from "../../../engine/chain/connect";
import { invalidateReads } from "../../../engine/chain/cache";
import { normalize } from "../../../engine/chain/txError";
import { readHomeView } from "../reads";
import { ApexContract } from "../../../generated/contracts/apexmatrix";
import { readableRevert } from "../revertText";

// One click places at most this many, so the transaction stays well inside a block (about 120k gas each)
const MAX_PER_CLICK = 150;

/**
 * YOUR CODE (on-chain). Places every waiting ID. Anyone may do it; it only costs gas.
 * Sign-ups already place what they can, so this is only needed when many placements pile up.
 *
 * @param {object} wallet  { address, signer }
 * @param {object} options
 * @param {Function} options.onStep  called at each step, to update the toast
 * @returns {Promise<object>} receipt
 */
export async function processQueue(wallet, { onStep = () => {} } = {}) {
    if (!wallet?.address || !wallet?.signer) throw new Error("Wallet is not connected.");

    onStep({ stage: "checking" });
    const view = await readHomeView(wallet.address, 0n, { fresh: true });
    if (view.queued <= 0) throw new Error("Nothing is waiting to be placed.");

    onStep({ stage: "process", index: 1, total: 1 });
    try {
        const tx = await box.createEtherContract(ApexContract, wallet.signer).processQueue(BigInt(Math.min(view.queued, MAX_PER_CLICK)));
        onStep({ stage: "processing", index: 1, total: 1 });
        const receipt = await tx.wait();
        invalidateReads();
        return receipt;
    } catch (error) {
        throw normalize(readableRevert(error), box.handleTxError(ApexContract, error), "The placements did not go through.");
    }
}
