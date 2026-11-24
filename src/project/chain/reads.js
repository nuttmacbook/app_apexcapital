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
import { buildHistory } from "./history";
import { multiRead } from "./multiRead";

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

/** Runs `jobs` (functions returning promises) at most `limit` at a time, keeping their order */
const inBatches = async (jobs, limit = 6) => {
    const out = new Array(jobs.length);
    let next = 0;
    const worker = async () => { while (next < jobs.length) { const i = next++; out[i] = await jobs[i](); } };
    await Promise.all(Array.from({ length: Math.min(limit, jobs.length) }, worker));
    return out;
};

const HISTORY_TTL = 60_000;
const HISTORY_PARALLEL = 3;     // public RPCs refuse bursts, so only a few reads at a time

/** Tries a read again after a short wait when the RPC refuses it (rate limits show up as network errors) */
const withRetry = async (read, tries = 4) => {
    for (let n = 1; ; n++) {
        try { return await read(); } catch (error) {
            if (n >= tries) throw error;
            await new Promise((resolve) => setTimeout(resolve, 700 * 2 ** (n - 1)));
        }
    }
};
const MAX_PAGE = 100n;
const isAddress = (value) => /^0x[0-9a-fA-F]{40}$/.test(String(value ?? ""));

const slotOf = (n) => (n?.exists ? { index: n.index, member: n.member, account: n.account, createdAt: n.createdAt } : null);

/** The IDs of `mine` found in the top 3 levels of one board view, each with its two slots */
const idsInView = (nodes, mine, found) => {
    for (let k = 0; k < 7; k++) {
        const n = nodes[k];
        if (!n?.exists || !mine.has(n.index) || found.has(n.index)) continue;
        found.set(n.index, { index: n.index, from: n.from, createdAt: n.createdAt, filled: n.filled,
            slots: [ n.filled >= 1 ? slotOf(nodes[2 * k + 1]) : null, n.filled >= 2 ? slotOf(nodes[2 * k + 2]) : null ] });
    }
};

/** Pages of "my IDs" to read for each rank: [ rank, offset ] */
const listPages = (held, counts) => held.flatMap((rank) => {
    const pages = [];
    for (let offset = 0n; offset < BigInt(counts[rank - 1]); offset += MAX_PAGE) pages.push([ rank, offset ]);
    return pages;
});

/**
 * Every ID of `who` with its two slots, in two packed requests (Multicall3): first the list of IDs per rank,
 * then one board view per ID (sent in chunks). About 2 to 6 requests whatever the number of IDs.
 */
const readHistoryIds = async (who, held, counts) => {
    const pages = listPages(held, counts);
    const lists = await withRetry(() => cachedRead(`hist-lists:${who}`, () => multiRead(ApexContract,
        pages.map(([ rank, offset ]) => [ "getBoardView", [ who, BigInt(rank), AUTO_POSITION, offset, MAX_PAGE ] ])), { ttl: HISTORY_TTL }));
    const mineByRank = {};
    lists.forEach((raw, i) => { const rank = pages[i][0]; (mineByRank[rank] ??= []).push(...toBoardView(raw).myIndices); });

    const wanted = Object.entries(mineByRank).flatMap(([ rank, indices ]) => indices.map((index) => [ Number(rank), index ]));
    const views = await withRetry(() => cachedRead(`hist-views:${who}`, () => multiRead(ApexContract,
        wanted.map(([ rank, index ]) => [ "getBoardView", [ who, BigInt(rank), BigInt(index), 0n, 0n ] ])), { ttl: HISTORY_TTL }));
    const ids = {};
    const found = {};
    views.forEach((raw, i) => {
        const rank = wanted[i][0];
        found[rank] ??= new Map();
        idsInView(toBoardView(raw).nodes, new Set(mineByRank[rank]), found[rank]);
    });
    for (const rank of Object.keys(found)) ids[rank] = [ ...found[rank].values() ];
    return ids;
};

/** Same result one view at a time (for a chain without Multicall3, such as a fresh local node) */
const readHistoryIdsOneByOne = async (who, held, counts) => {
    const lists = await inBatches(held.map((rank) => () => withRetry(async () => {
        const indices = [];
        for (const [ , offset ] of listPages([ rank ], counts)) {
            const raw = await cachedRead(`hist-list:${who}:${rank}:${offset}`, () => matrix().methods.getBoardView(who, BigInt(rank), AUTO_POSITION, offset, MAX_PAGE).call(), { ttl: HISTORY_TTL });
            indices.push(...toBoardView(raw).myIndices);
        }
        return { rank, indices };
    })), HISTORY_PARALLEL);

    // One board view holds 4 levels: an ID already seen near the top of an earlier view needs no call of its own
    const perRank = await inBatches(lists.map(({ rank, indices }) => async () => {
        const mine = new Set(indices);
        const found = new Map();
        for (const index of [ ...mine ].sort((x, y) => x - y)) {
            if (found.has(index)) continue;
            const raw = await withRetry(() => cachedRead(`hist-id:${rank}:${index}`,
                () => matrix().methods.getBoardView(who, BigInt(rank), BigInt(index), 0n, 0n).call(), { ttl: HISTORY_TTL }));
            idsInView(toBoardView(raw).nodes, mine, found);
        }
        return [ rank, [ ...found.values() ] ];
    }), HISTORY_PARALLEL);
    return Object.fromEntries(perRank);
};

/**
 * Money history of one address, per rank: what came in from which ID, purchases (balance + wallet) and upgrades.
 * Worked out from contract state in src/project/chain/history.js (no event logs, so no transaction hashes).
 * Requests: the dashboard view and the plan (both cached), then the member's IDs and their slots packed through
 * Multicall3 (2 to 6 requests in all). Everything is kept for a minute.
 *
 * @param {object} wallet
 * @param {object} options  addr: another address to look at (else the connected wallet)
 */
export async function getHistoryData(wallet, { addr = "" } = {}) {
    const who = whoOf(isAddress(addr) ? addr : wallet?.address);
    const base = { wallet, isConnected: Boolean(wallet?.address), account: who, isOther: isAddress(addr) && who !== whoOf(wallet?.address) };
    const [ home, planRaw ] = await Promise.all([
        withRetry(() => readHomeView(who, 0n)),
        withRetry(() => cachedRead("plan", () => matrix().methods.getPlanView().call(), { ttl: 60_000 })),
    ]);
    const plan = toPlanView(planRaw);
    const view = { ...base, tokenSymbol: home.tokenSymbol, tokenDecimals: home.tokenDecimals, isMember: home.isMember, memberId: home.myId,
        boardEarned: home.myBoardEarned, referralEarned: home.myReferralEarned, tiers: home.tiers, rankCounts: home.myRankCounts };
    if (!home.isMember) return { ...view, ranks: [], events: [], totals: null };

    const rules = {};
    for (const r of plan.ranks) rules[r.rank] = { cost: r.cost, inflow: r.inflow, firstPayout: r.firstPayout, upgradeCost: r.upgradeCost, next: r.next, rebirths: r.rebirths };
    const held = plan.ranks.map((r) => r.rank).filter((rank) => (home.myRankCounts[rank - 1] ?? 0) > 0);

    const ids = await readHistoryIds(who, held, home.myRankCounts).catch(() => readHistoryIdsOneByOne(who, held, home.myRankCounts));
    const balances = {};
    plan.ranks.forEach((r, i) => { balances[r.rank] = home.myBalances[i] ?? 0n; });
    return { ...view, rules, ...buildHistory({ rules, ids, balances }) };
}

export { readHomeView, AUTO_POSITION };
