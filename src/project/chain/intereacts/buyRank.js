import { box, formNumber } from "../../../engine/chain/connect";
import { invalidateReads } from "../../../engine/chain/cache";
import { normalize } from "../../../engine/chain/txError";
import { approveIfNeeded } from "../../../engine/chain/erc20";
import { readHomeView } from "../reads";
import { ApexContract } from "../../../generated/contracts/apexmatrix";
import { readableRevert } from "../revertText";

const MAX_BUY = 50;

/** What buying `count` IDs in `rank` costs the wallet: the upgrade price of rank - 1 per ID, minus that rank's balance */
export const buyPrice = (view, rank, count) => {
    const below = rank - 2;
    const price = (view?.upgradeCosts?.[below] ?? 0n) * BigInt(count);
    const balance = view?.myBalances?.[below] ?? 0n;
    return price > balance ? price - balance : 0n;
};

/**
 * YOUR CODE (on-chain). Buys `count` IDs in `rank` right away (needs at least one ID in rank - 1).
 * Steps: check → approve exactly the top-up (only when needed) → buyRank.
 *
 * @param {object} wallet  { address, signer }
 * @param {object} options
 * @param {number} options.rank   rank to buy into (2 and up)
 * @param {number} options.count  how many IDs (1 to 50)
 * @param {Function} options.onStep  called at each step, to update the toast
 * @returns {Promise<object>} receipt
 */
export async function buyRank(wallet, { rank, count, onStep = () => {} } = {}) {
    if (!wallet?.address || !wallet?.signer) throw new Error("Wallet is not connected.");
    const r = Number(rank);
    const n = Number(count);
    if (!Number.isInteger(n) || n < 1 || n > MAX_BUY) throw new Error(`Buy between 1 and ${MAX_BUY} IDs at a time.`);

    onStep({ stage: "checking" });
    const view = await readHomeView(wallet.address, 0n, { fresh: true });
    if (!view.isMember) throw new Error("Join first, then you can buy ranks.");
    if (!Number.isInteger(r) || r < 2 || r > view.rankCount) throw new Error("That rank does not exist.");
    if (!(view.myRankCounts[r - 2] > 0)) throw new Error(`You need at least one ID in Rank ${r - 1} before you can buy Rank ${r}.`);
    const amount = buyPrice(view, r, n);
    if (view.walletBalance < amount) throw new Error(`This costs ${formNumber(amount, view.tokenDecimals, 2)} ${view.tokenSymbol}. Your wallet does not have enough.`);

    const needsApprove = amount > 0n && view.allowance < amount;
    const total = needsApprove ? 2 : 1;
    await approveIfNeeded({ wallet, token: view.token, spender: ApexContract.address, amount, allowance: view.allowance, onStep, index: 1, total });

    onStep({ stage: "buy", index: total, total });
    try {
        const value = BigInt(4e14);
        const tx = await box.createEtherContract(ApexContract, wallet.signer).buyRank(BigInt(r), BigInt(n), { value });
        onStep({ stage: "buying", index: total, total });
        const receipt = await tx.wait();
        invalidateReads();
        return receipt;
    } catch (error) {
        throw normalize(readableRevert(error), box.handleTxError(ApexContract, error), "The purchase did not go through.");
    }
}
