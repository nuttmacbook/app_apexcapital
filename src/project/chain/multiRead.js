/*
 * YOUR CODE (on-chain). Many view calls of one contract in ONE request to the RPC, through Multicall3.
 *
 * Public RPCs refuse bursts of requests, so pages that need many views (the money history) send them packed:
 * Multicall3.aggregate3 runs every call inside one eth_call and returns each answer. Nothing is written on chain.
 * Multicall3 sits at the same address on BNB Chain and almost every EVM chain (https://www.multicall3.com).
 * A chain without it (a fresh local node) makes the packed read fail; the caller then reads one by one.
 * Encoding and decoding use ethers' Interface (ethers comes with kitbox).
 */

import { Interface } from "ethers";
import { readRpc } from "../../engine/chain/connect";

const MULTICALL3 = "0xcA11bde05977b3631167028862bE2a173976CA11";
const CHUNK = 30;               // calls per request: keeps each answer at a few hundred kB

const multicall = new Interface([ "function aggregate3((address target, bool allowFailure, bytes callData)[] calls) payable returns ((bool success, bytes returnData)[] returnData)" ]);

let nextId = 1;

/** One eth_call to the read RPC */
const ethCall = async (to, data) => {
    const response = await fetch(readRpc(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: nextId++, method: "eth_call", params: [ { to, data }, "latest" ] }),
    });
    if (!response.ok) throw new Error(`The network answered ${response.status}.`);
    const body = await response.json();
    if (body.error) throw new Error(body.error.message ?? "The network refused the read.");
    return body.result;
};

/**
 * Runs view calls of one contract, packed CHUNK at a time.
 *
 * @param {{ address: string, abi: object[] }} contract  as in src/generated/contracts
 * @param {Array<[ string, any[] ]>} calls               [ functionName, args ] for each call
 * @returns {Promise<object[]>}                         each decoded answer (fields by name), in the same order
 */
export async function multiRead(contract, calls) {
    const iface = new Interface(contract.abi);
    const out = [];
    for (let start = 0; start < calls.length; start += CHUNK) {
        const part = calls.slice(start, start + CHUNK);
        const data = multicall.encodeFunctionData("aggregate3", [ part.map(([ name, args ]) => [ contract.address, false, iface.encodeFunctionData(name, args) ]) ]);
        const [ results ] = multicall.decodeFunctionResult("aggregate3", await ethCall(MULTICALL3, data));
        results.forEach(([ , returnData ], i) => out.push(iface.decodeFunctionResult(part[i][0], returnData)[0]));
    }
    return out;
}
