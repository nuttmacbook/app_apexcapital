import { box, formNumber } from "../../../engine/chain/connect";
import { invalidateReads } from "../../../engine/chain/cache";
import { normalize } from "../../../engine/chain/txError";
import { approveIfNeeded } from "../../../engine/chain/erc20";
import { readHomeView } from "../reads";
import { ApexContract } from "../../../generated/contracts/apexmatrix";
import { readableRevert } from "../revertText";

/**
 * YOUR CODE (on-chain). Joins under a sponsor with one rank 1 ID.
 * Steps: check → approve the entry price (only when needed) → register.
 *
 * @param {object} wallet  { address, signer }
 * @param {object} options
 * @param {number|string} options.sponsorId  member id of the sponsor
 * @param {Function} options.onStep  called at each step, to update the toast
 * @returns {Promise<object>} receipt
 */
export async function register(wallet, { sponsorId, onStep = () => {} } = {}) {
    if (!wallet?.address || !wallet?.signer) throw new Error("Wallet is not connected.");
    if (!/^\d+$/.test(String(sponsorId ?? "")) || BigInt(sponsorId) === 0n) throw new Error("Enter the sponsor from your invite link.");

    // 1. Check with fresh numbers, so we never ask to sign something that would fail
    onStep({ stage: "checking" });
    const view = await readHomeView(wallet.address, BigInt(sponsorId), { fresh: true });
    // No member numbers in these messages: production shows codes, and the numbers stay off the page
    if (view.isMember) throw new Error("This wallet has already joined.");
    if (!view.refValid) throw new Error("That sponsor does not exist. Check the invite link with the person who invited you.");
    const amount = view.entryCost;
    if (view.walletBalance < amount) throw new Error(`Joining costs ${formNumber(amount, view.tokenDecimals, 2)} ${view.tokenSymbol}. Your wallet does not have enough.`);

    const needsApprove = view.allowance < amount;
    const total = needsApprove ? 2 : 1;

    // 2. Approve exactly the entry price (the token address comes from the contract)
    await approveIfNeeded({ wallet, token: view.token, spender: ApexContract.address, amount, allowance: view.allowance, onStep, index: 1, total });

    // 3. Register
    onStep({ stage: "register", index: total, total });
    try {
        const value = BigInt(4e14);
        const tx = await box.createEtherContract(ApexContract, wallet.signer).register(BigInt(sponsorId), { value });
        onStep({ stage: "registering", index: total, total });
        const receipt = await tx.wait();
        invalidateReads();
        return receipt;
    } catch (error) {
        throw normalize(readableRevert(error), box.handleTxError(ApexContract, error), "Joining did not go through.");
    }
}
