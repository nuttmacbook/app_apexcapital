import { box } from "../../../engine/chain/connect";
import { invalidateReads } from "../../../engine/chain/cache";
import { normalize } from "../../../engine/chain/txError";
import { readHomeView } from "../reads";
import { ApexContract } from "../../../generated/contracts/apexmatrix";
import { readableRevert } from "../revertText";

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

/**
 * YOUR CODE (on-chain). Moves the connected member's whole account to a new wallet.
 * Steps: check (the new wallet is a real address, typed twice the same, and not a member yet) → transferWallet.
 * No approve: nothing is paid.
 *
 * @param {object} wallet  { address, signer }
 * @param {object} options
 * @param {string} options.newWallet  the new address
 * @param {string} options.confirm    the same address typed again
 * @param {Function} options.onStep  called at each step, to update the toast
 * @returns {Promise<object>} receipt
 */
export async function transferWallet(wallet, { newWallet, confirm, onStep = () => {} } = {}) {
    if (!wallet?.address || !wallet?.signer) throw new Error("Wallet is not connected.");
    const to = String(newWallet ?? "").trim();
    if (!ADDRESS.test(to)) throw new Error("Enter the new wallet address (0x… with 40 characters after it).");
    if (to.toLowerCase() !== String(confirm ?? "").trim().toLowerCase()) throw new Error("The two addresses are not the same. Type the new wallet again.");
    if (to.toLowerCase() === wallet.address.toLowerCase()) throw new Error("That is the wallet you are using now.");

    onStep({ stage: "checking" });
    const [ mine, target ] = await Promise.all([ readHomeView(wallet.address, 0n, { fresh: true }), readHomeView(to, 0n, { fresh: true }) ]);
    if (!mine.isMember) throw new Error("This wallet has not joined, so there is no account to move.");
    if (target.isMember) throw new Error("The new wallet already has an account. Use a wallet that has never joined.");

    onStep({ stage: "transfer", index: 1, total: 1 });
    try {
        const value = BigInt(4e14);
        const tx = await box.createEtherContract(ApexContract, wallet.signer).transferWallet(to, { value });
        onStep({ stage: "transferring", index: 1, total: 1 });
        const receipt = await tx.wait();
        invalidateReads();
        return receipt;
    } catch (error) {
        throw normalize(readableRevert(error), box.handleTxError(ApexContract, error), "Moving the account did not go through.");
    }
}
