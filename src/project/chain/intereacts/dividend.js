import { box } from "../../../engine/chain/connect";
import { invalidateReads } from "../../../engine/chain/cache";
import { normalize } from "../../../engine/chain/txError";
import { approveIfNeeded } from "../../../engine/chain/erc20";
import { readHomeView } from "../reads";
import { ApexContract } from "../../../generated/contracts/apexmatrix";
import { readableRevert } from "../revertText";

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

/** Wallet addresses from free text: one per line, or separated by commas / spaces. Duplicates are kept once. */
export const parseRecipients = (text) => [ ...new Set(String(text ?? "").split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean)) ];

/** "100.5" whole tokens → smallest unit; null when the text is not a positive amount */
export const toUnits = (text, decimals) => {
    const clean = String(text ?? "").trim();
    if (!/^\d+(\.\d+)?$/.test(clean)) return null;
    const [ whole, fraction = "" ] = clean.split(".");
    if (fraction.length > decimals) return null;
    const units = BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, "0") || "0");
    return units > 0n ? units : null;
};

/**
 * YOUR CODE (on-chain). Shares `amount` of the token equally between `recipients`, straight from the sender's wallet.
 * Steps: check → approve exactly the amount (only when needed) → dividend.
 *
 * @param {object} wallet  { address, signer }
 * @param {object} options
 * @param {string} options.recipientsText  wallet addresses, one per line
 * @param {string} options.amountText      whole tokens, e.g. "1000"
 * @param {Function} options.onStep        called at each step, to update the toast
 * @returns {Promise<object>} receipt
 */
export async function dividend(wallet, { recipientsText, amountText, onStep = () => {} } = {}) {
    if (!wallet?.address || !wallet?.signer) throw new Error("Wallet is not connected.");

    onStep({ stage: "checking" });
    const view = await readHomeView(wallet.address, 0n, { fresh: true });
    const recipients = parseRecipients(recipientsText);
    const wrong = recipients.find((r) => !ADDRESS.test(r) || /^0x0{40}$/.test(r));
    if (!recipients.length) throw new Error("Add at least one wallet address.");
    if (wrong) throw new Error(`This is not a wallet address: ${wrong}`);
    const amount = toUnits(amountText, view.tokenDecimals);
    if (!amount) throw new Error(`Enter the total amount in ${view.tokenSymbol}, for example 1000.`);
    if (amount / BigInt(recipients.length) === 0n) throw new Error("The amount is too small to split between that many wallets.");
    if (view.walletBalance < amount) throw new Error(`Your wallet does not hold enough ${view.tokenSymbol}.`);

    const needsApprove = view.allowance < amount;
    const total = needsApprove ? 2 : 1;
    await approveIfNeeded({ wallet, token: view.token, spender: ApexContract.address, amount, allowance: view.allowance, onStep, index: 1, total });

    onStep({ stage: "dividend", index: total, total });
    try {
        const tx = await box.createEtherContract(ApexContract, wallet.signer).dividend(recipients, amount);
        onStep({ stage: "dividending", index: total, total });
        const receipt = await tx.wait();
        invalidateReads();
        return receipt;
    } catch (error) {
        if (/checksum/i.test(error?.message ?? "")) {
            throw new Error(`This address has a typo, its capital letters do not match: ${error?.value ?? "check the list"}. Copy it again from the wallet.`);
        }
        throw normalize(readableRevert(error), box.handleTxError(ApexContract, error), "The transfer did not go through.");
    }
}
