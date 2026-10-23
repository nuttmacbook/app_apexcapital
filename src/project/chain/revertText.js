/*
 * YOUR CODE (on-chain). The contract reverts with short custom errors (they keep it under the 24 KB limit).
 * This turns their names into sentences before the toast shows them. Pages normally never see these,
 * because every interaction checks the same conditions first; they cover a race (someone else acted first).
 */

const TEXT = {
    AlreadyRegistered: "This wallet has already joined.",
    UnknownSponsor: "That sponsor ID does not exist.",
    PaymentFailed: "The token payment did not go through. Check your balance and the approval.",
    NotAMember: "Join first, then you can buy ranks.",
    UnknownRank: "That rank does not exist.",
    BuyCount: "Buy between 1 and 50 IDs at a time.",
    NeedsAnIDInTheRankBelow: "You need at least one ID in the rank below first.",
    QueueIsEmpty: "Nothing is waiting to be placed any more.",
    ZeroSteps: "Choose how many placements to process.",
    NoRecipients: "Add at least one wallet address.",
    ZeroRecipient: "The list contains the zero address.",
    ShareIsZero: "The amount is too small to split between that many wallets.",
    DividendFailed: "The transfer did not go through. Check your balance and the approval.",
    UnknownPosition: "That ID does not exist in this rank.",
    AlreadyAMember: "The new wallet already has an account. Use a wallet that has never joined.",
    ZeroAddress: "Enter a real wallet address.",
    RootAndCompanyMustDiffer: "The company wallet cannot hold a member account.",
};

// The website's ABI expects other fields than the contract returns: a contract older (or newer) than the site
const MISMATCH = /deferred error during ABI decoding|could not decode result data/i;
const MISMATCH_TEXT = "The website and the contract on this chain do not match. On the local test chain, stop npm run dev and start it again so the new contract is deployed. On BNB Chain, deploy or upgrade the contract that matches this build.";

/** Sentence for a website/contract mismatch, or null when the error is something else */
const mismatchText = (error) => (MISMATCH.test(`${error?.shortMessage ?? ""} ${error?.message ?? ""}`) ? MISMATCH_TEXT : null);

/** Puts a readable sentence in error.reason when the contract reverted with one of its custom errors */
const readableRevert = (error) => {
    const name = error?.revert?.name ?? String(error?.reason ?? "").match(/^(\w+)\(\)$/)?.[1];
    const text = (name && TEXT[name]) || mismatchText(error);
    if (text && error && typeof error === "object") {
        try { error.reason = text; } catch {}
    }
    return error;
};

export { readableRevert, mismatchText };
