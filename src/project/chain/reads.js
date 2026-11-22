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

/**
 * Money trail of one ID (the panel that opens when an ID is tapped on the board).
 * Everything is worked out from what the contract stores plus the rank's rules, so no event logs are needed:
 *   - the board above it (which slot it took, so what it paid there),
 *   - its two slots (what each ID below paid into it),
 *   - the owner's upgrade balance in this rank (shared by all of the owner's IDs there).
 * Two contract calls, sent together: the board view from the ID's parent (holds the parent, the ID and its two slots)
 * and the owner's dashboard view (upgrade balance and price).
 *
 * @param {object} wallet
 * @param {object} options  rank (1..), index of the ID, parent index (null for the top ID of a rank),
 *                          account of the owner when the page already knows it (both calls then go out at once)
 */
export async function getMoneyTrail(wallet, { rank, index, parent = null, account = "" }) {
    const who = whoOf(wallet?.address);
    const r = BigInt(rank);
    const anchor = BigInt(parent ?? index);
    const known = /^0x[0-9a-fA-F]{40}$/.test(account) ? readHomeView(account, 0n) : null;
    const raw = await cachedRead(`trail:${who}:${r}:${anchor}`, () => matrix().methods.getBoardView(who, r, anchor, 0n, 1n).call());
    const view = toBoardView(raw);

    // From the parent the ID sits at node 1 (left slot) or 2 (right slot); from itself at node 0
    const k = parent === null ? 0 : [ 1, 2 ].find((n) => view.nodes[n]?.exists && view.nodes[n].index === Number(index));
    if (k === undefined) throw new Error("This ID is not on that board.");
    const target = view.nodes[k];
    const above = parent === null ? null : { ...view.nodes[0], slot: k === 1 ? "left" : "right" };
    const slots = [ 2 * k + 1, 2 * k + 2 ].map((n) => (view.nodes[n]?.exists ? view.nodes[n] : null));

    const owner = await (known && account.toLowerCase() === target.account.toLowerCase() ? known : readHomeView(target.account, 0n));
    const at = Number(r) - 1;
    return {
        wallet,
        tokenSymbol: view.tokenSymbol,
        tokenDecimals: view.tokenDecimals,
        rank: view.rank,
        tier: view.tier,
        cost: view.cost,
        inflow: view.inflow,
        firstPayout: view.firstPayout,
        referral: view.cost - view.inflow,
        next: view.next,
        viewerId: view.viewerId,
        target,
        above,
        slots,
        ownerBalance: owner.myBalances[at] ?? 0n,
        upgradeCost: owner.upgradeCosts[at] ?? 0n,
    };
}

export { readHomeView, AUTO_POSITION };
