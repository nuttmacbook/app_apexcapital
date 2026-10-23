/*
 * YOUR CODE (on-chain). Reading contracts: one function per page, one contract call per page.
 * Results are cached for a few seconds (src/engine/chain/cache.js), so moving between pages is free.
 * The UI imports from here; it never talks to a contract itself.
 */

import { box, readRpc } from "../../engine/chain/connect";
import { cachedRead } from "../../engine/chain/cache";
import { metered } from "../../engine/chain/rpcMeter";
import { toHomeView, toPlanView, toBoardView, toTeamView } from "./viewParse";
import { ApexContract } from "../../generated/contracts/apexmatrix";

// getBoardView: "open the viewer's first ID in this rank (or the top of the rank)"
const AUTO_POSITION = (1n << 256n) - 1n;
const BOARD_PAGE = 24n;
const TEAM_PAGE = 20n;

const matrix = () => metered(box.createWeb3Contract(ApexContract, readRpc()), "ApexMatrix");
const whoOf = (account) => (account ?? box.ZERO).toLowerCase();
/** Whole number ≥ 0 from a link parameter, or the fallback */
const wholeOr = (value, fallback) => (/^\d+$/.test(String(value ?? "")) ? BigInt(value) : fallback);

/** Dashboard view; `fresh: true` skips the cache (used right before a transaction) */
const readHomeView = async (account, refId = 0n, { fresh = false } = {}) => {
    const who = whoOf(account);
    const raw = await cachedRead(`home:${who}:${refId}`, () => matrix().methods.getHomeView(who, refId).call(), { fresh });
    return toHomeView(raw);
};

/**
 * Dashboard and sign-up.
 *
 * @param {object} wallet  connected wallet ({ address, signer }) or null
 * @param {object} options
 * @param {string} options.ref  sponsor id from the link (?ref=)
 * @returns {Promise<object>}
 */
export async function getHomeData(wallet, { ref = "" } = {}) {
    const view = await readHomeView(wallet?.address, wholeOr(ref, 0n));
    return { wallet, isConnected: Boolean(wallet?.address), ...view };
}

/** Dividend page: the sender's token balance and allowance (same view as the dashboard, so one call) */
export async function getDividendData(wallet) {
    const view = await readHomeView(wallet?.address, 0n);
    return { wallet, isConnected: Boolean(wallet?.address), ...view };
}

/** Marketing plan: every rank's rule, as the contract has it */
export async function getPlanData(wallet) {
    const raw = await cachedRead("plan", () => matrix().methods.getPlanView().call(), { ttl: 60_000 });
    return { wallet, isConnected: Boolean(wallet?.address), ...toPlanView(raw) };
}

/**
 * Board page: four levels of one rank below a position, plus a page of the viewer's IDs in that rank.
 *
 * @param {object} wallet
 * @param {object} options  rank (1..), pos (position index or "" for the viewer's first), page (0..)
 */
export async function getBoardData(wallet, { rank = "1", pos = "", page = "0" } = {}) {
    const who = whoOf(wallet?.address);
    const r = wholeOr(rank, 1n) || 1n;
    const index = wholeOr(pos, AUTO_POSITION);
    const offset = wholeOr(page, 0n) * BOARD_PAGE;
    const raw = await cachedRead(`board:${who}:${r}:${index}:${offset}`, () => matrix().methods.getBoardView(who, r, index, offset, BOARD_PAGE).call());
    return { wallet, isConnected: Boolean(wallet?.address), page: Number(offset / BOARD_PAGE), pageSize: Number(BOARD_PAGE), ...toBoardView(raw) };
}

/** Team page: the viewer's sponsor and one page of the people they sponsored */
export async function getTeamData(wallet, { page = "0" } = {}) {
    const who = whoOf(wallet?.address);
    const offset = wholeOr(page, 0n) * TEAM_PAGE;
    const raw = await cachedRead(`team:${who}:${offset}`, () => matrix().methods.getTeamView(who, offset, TEAM_PAGE).call());
    return { wallet, isConnected: Boolean(wallet?.address), page: Number(offset / TEAM_PAGE), pageSize: Number(TEAM_PAGE), ...toTeamView(raw) };
}

export { readHomeView, AUTO_POSITION };
