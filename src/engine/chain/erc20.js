/*
 * ENGINE (same in every project, do not edit).
 *
 * Any ERC20 token by address. Works for zero, one or many tokens: nothing about a token is written here,
 * the address always comes from the contract (e.g. a view that returns it) or from the address book.
 */

import { box } from "./connect";
import { normalize } from "./txError";

const ERC20_ABI = [
    { inputs: [ { internalType: "address", name: "account", type: "address" } ], name: "balanceOf", outputs: [ { internalType: "uint256", name: "", type: "uint256" } ], stateMutability: "view", type: "function" },
    { inputs: [ { internalType: "address", name: "owner", type: "address" }, { internalType: "address", name: "spender", type: "address" } ], name: "allowance", outputs: [ { internalType: "uint256", name: "", type: "uint256" } ], stateMutability: "view", type: "function" },
    { inputs: [ { internalType: "address", name: "spender", type: "address" }, { internalType: "uint256", name: "amount", type: "uint256" } ], name: "approve", outputs: [ { internalType: "bool", name: "", type: "bool" } ], stateMutability: "nonpayable", type: "function" },
];

/** { address, abi } for kitbox's createEtherContract / createWeb3Contract */
const tokenAt = (address) => ({ address, abi: ERC20_ABI });

/**
 * Approves `spender` for exactly `amount` when the current allowance is lower. Never approves more.
 *
 * @param {object} options
 * @param {object} options.wallet      { address, signer }
 * @param {string} options.token       token address
 * @param {string} options.spender     contract that will take the tokens
 * @param {bigint} options.amount      amount needed
 * @param {bigint} options.allowance   current allowance (read with the page view, so no extra call)
 * @param {Function} options.onStep    progress callback
 * @param {number} options.index       step number of the approval in the flow
 * @param {number} options.total       number of wallet prompts in the flow
 * @returns {Promise<boolean>} true when an approval was sent
 */
async function approveIfNeeded({ wallet, token, spender, amount, allowance, onStep = () => {}, index = 1, total = 1 }) {
    if (BigInt(allowance ?? 0) >= BigInt(amount ?? 0)) return false;
    onStep({ stage: "approve", index, total });
    try {
        const tx = await box.createEtherContract(tokenAt(token), wallet.signer).approve(spender, amount);
        onStep({ stage: "approving", index, total });
        await tx.wait();
        return true;
    } catch (error) {
        throw normalize(error, box.handleTxError(tokenAt(token), error), "Approval failed. Please try again.");
    }
}

export { tokenAt, approveIfNeeded, ERC20_ABI };
