import { money, moneyText, address, plural, WRAP, pageHead, blockHead, button, escape, loadingBox, errorBox } from "../componants/parts";
import { t, locale } from "../../lang";
import { memberLabel, positionLabel, positionParam } from "../componants/ids";

/*
 * YOUR CODE (off-chain). Money history of one address, per rank: which ID paid what, purchases (upgrade balance
 * + wallet) and automatic upgrades, newest first. `data` comes from getHistoryData() in src/project/chain.
 * Link parameters: #/history?addr=0x…&rank=3 (no addr = the connected wallet, no rank = every rank).
 */

const STEP = 60;            // rows shown at first, and added by "Show more"
let shown = STEP;
let shownKey = "";

const timeOf = (seconds) => (seconds > 0 ? new Date(seconds * 1000).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" }) : "");
const dayOf = (seconds) => (seconds > 0 ? new Date(seconds * 1000).toLocaleDateString(locale(), { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "–");

const idLink = (rank, index) => /*html*/`<a href="#/board?rank=${rank}&pos=${positionParam(rank, index)}" class="figure font-semibold text-mint-200 underline decoration-mint-500/40 underline-offset-2 hover:text-mint-100">R${rank} ${positionLabel(rank, index)}</a>`;

const whoName = (data, member) => (member === data.memberId ? (data.isOther ? t("this member") : t("You")) : t("Member {member}", { member: memberLabel(member) }));

const hrefWith = (data, extra) => {
    const params = new URLSearchParams();
    if (data.isOther) params.set("addr", data.account);
    for (const [ k, v ] of Object.entries(extra)) if (v !== "" && v !== null && v !== undefined) params.set(k, v);
    const q = params.toString();
    return `#/history${q ? `?${q}` : ""}`;
};

const ICON = {
    wallet: `<path d="M3 7h15a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z"/><path d="M3 7l12-3v3"/>`,
    up: `<path d="M12 19V5"/><path d="M6 11l6-6 6 6"/>`,
    cart: `<path d="M3 4h2l2.4 11h10.2L20 8H7"/><circle cx="10" cy="19" r="1.3"/><circle cx="17" cy="19" r="1.3"/>`,
    plus: `<path d="M12 5v14M5 12h14"/>`,
};
const icon = (name, look) => /*html*/`
    <span class="flex size-9 shrink-0 items-center justify-center rounded-xl ${look}" aria-hidden="true">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[name]}</svg>
    </span>
`;

const ORIGIN = (e) => {
    if (e.isStart) return t("Start ID of the rank");
    if (!e.from) return t("Signed up");
    if (e.from === e.rank - 1) return t("Moved up from Rank {rank}", { rank: e.from });
    return t("Re-born from Rank {rank}", { rank: e.from });
};

const newIdList = (list) => (list?.length ? /*html*/`
    <p class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-soft">${t("New IDs")}: ${list.map((n) => idLink(n.rank, n.index)).join(`<span class="text-dim">·</span>`)}</p>
` : "");

const after = (data, e, show) => (show && e.balanceAfter !== undefined
    ? /*html*/`<p class="mt-1 text-[11px] text-dim">${t("Rank {rank} upgrade balance after: {amount}", { rank: e.rank, amount: moneyText(data, e.balanceAfter) })}</p>`
    : "");

/** One row of the timeline */
const eventRow = (data, e, inRank) => {
    if (e.kind === "in") {
        const left = e.slot === "left";
        return /*html*/`
            <li class="flex gap-3 px-4 py-3.5 sm:px-5">
                ${icon(left ? "wallet" : "up", left ? "bg-gold-300/10 text-gold-200" : "bg-mint-400/10 text-mint-300")}
                <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                        <p class="text-[14px] text-text">${t("From {id} · {who}", { id: idLink(e.rank, e.payer.index), who: escape(whoName(data, e.payer.member)) })}</p>
                        <span class="figure text-[12px] text-dim">${timeOf(e.t)}</span>
                    </div>
                    <p class="mt-0.5 text-[12px] text-soft">${left ? t("Left slot (first) of {id}", { id: idLink(e.rank, e.board) }) : t("Right slot (second) of {id} · board complete", { id: idLink(e.rank, e.board) })}</p>
                    <div class="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[13px]">
                        ${e.cash > 0n ? /*html*/`<span class="text-soft">${t("To wallet")} <b class="figure text-gold-200">+${moneyText(data, e.cash)}</b></span>` : ""}
                        ${e.balance > 0n ? /*html*/`<span class="text-soft">${t("To upgrade balance")} <b class="figure text-mint-300">+${moneyText(data, e.balance)}</b></span>` : ""}
                    </div>
                    ${after(data, e, inRank)}
                </div>
            </li>
        `;
    }
    if (e.kind === "buy") {
        const next = data.rules[e.rank]?.next || e.rank + 1;
        return /*html*/`
            <li class="flex gap-3 px-4 py-3.5 sm:px-5">
                ${icon("cart", "bg-white/[0.06] text-text")}
                <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                        <p class="text-[14px] font-semibold text-text">${t("Bought Rank {rank} × {count}", { rank: next, count: e.count })}</p>
                        <span class="figure text-[12px] text-dim">${timeOf(e.t)}</span>
                    </div>
                    <p class="mt-0.5 text-[12px] text-soft">${t("Price {price} each, paid from the Rank {rank} upgrade balance first", { price: moneyText(data, e.price), rank: e.rank })}</p>
                    <div class="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[13px]">
                        <span class="text-soft">${t("From upgrade balance")} <b class="figure text-mint-300">${moneyText(data, e.fromBalance)}</b></span>
                        <span class="text-soft">${t("From wallet")} <b class="figure text-text">${moneyText(data, e.fromWallet)}</b></span>
                    </div>
                    ${newIdList(e.newIds)}
                </div>
            </li>
        `;
    }
    if (e.kind === "auto") {
        const next = data.rules[e.rank]?.next;
        return /*html*/`
            <li class="flex gap-3 px-4 py-3.5 sm:px-5">
                ${icon("up", "bg-mint-400/10 text-mint-300")}
                <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                        <p class="text-[14px] font-semibold text-text">${next ? t("Moved up to Rank {rank} automatically", { rank: next }) : t("Re-born automatically")}</p>
                        <span class="figure text-[12px] text-dim">${timeOf(e.t)}</span>
                    </div>
                    <p class="mt-0.5 text-[12px] text-soft">${t("Used {amount} of the Rank {rank} upgrade balance", { amount: moneyText(data, e.used), rank: e.rank })}</p>
                    ${newIdList(e.newIds)}
                    ${after(data, e, inRank)}
                </div>
            </li>
        `;
    }
    return /*html*/`
        <li class="flex gap-3 px-4 py-3 sm:px-5">
            ${icon("plus", "border border-edge-hi text-soft")}
            <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <p class="text-[14px] text-text">${t("New ID {id}", { id: idLink(e.rank, e.index) })}</p>
                    <span class="figure text-[12px] text-dim">${timeOf(e.t)}</span>
                </div>
                <p class="mt-0.5 text-[12px] text-soft">${ORIGIN(e)}</p>
            </div>
        </li>
    `;
};

/** Timeline grouped by day */
const timeline = (data, events, inRank) => {
    if (!events.length) return /*html*/`<p class="rounded-2xl border border-dashed border-edge-hi px-5 py-6 text-sm text-soft">${t("Nothing has happened here yet.")}</p>`;
    const list = events.slice(0, shown);
    const days = [];
    for (const e of list) {
        const day = dayOf(e.t);
        if (days.at(-1)?.day !== day) days.push({ day, items: [] });
        days.at(-1).items.push(e);
    }
    return /*html*/`
        <div class="flex flex-col gap-4">
            ${days.map((d) => /*html*/`
                <section>
                    <h3 class="mb-2 pl-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-dim">${d.day}</h3>
                    <ul class="divide-y divide-edge overflow-hidden rounded-2xl border border-edge bg-raised">${d.items.map((e) => eventRow(data, e, inRank)).join("")}</ul>
                </section>
            `).join("")}
            ${events.length > shown ? /*html*/`
                <div class="flex items-center justify-between gap-3 text-[13px] text-soft">
                    <span>${t("Showing {shown} of {total}", { shown: list.length, total: events.length })}</span>
                    ${button(t("Show more"), "historyMore()", { kind: "ghost", full: false, size: "sm" })}
                </div>
            ` : ""}
        </div>
    `;
};

const tile = (label, value, look = "text-text", note = "") => /*html*/`
    <div class="min-w-0 rounded-2xl border border-edge bg-raised p-4">
        <dt class="text-[12px] text-soft">${label}</dt>
        <dd class="mt-1 truncate text-lg font-semibold ${look}">${value}</dd>
        ${note ? /*html*/`<p class="mt-1 text-[11px] leading-snug text-dim">${note}</p>` : ""}
    </div>
`;

const rankChips = (data, selected) => /*html*/`
    <div class="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div class="flex min-w-max gap-1 rounded-xl border border-edge bg-raised p-1" role="tablist" aria-label="${t("Ranks")}">
            ${[ { rank: 0 }, ...data.ranks ].map((r) => {
                const isActive = r.rank === selected;
                return /*html*/`
                    <a href="${hrefWith(data, { rank: r.rank || "" })}" role="tab" aria-selected="${isActive}"
                        class="figure min-w-10 rounded-lg px-3 py-1.5 text-center text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-400
                        ${isActive ? "bg-mint-400 text-night" : "text-soft hover:bg-white/[0.05] hover:text-text"}">${r.rank ? r.rank : t("All")}</a>
                `;
            }).join("")}
        </div>
    </div>
`;

const rankSummary = (data, r) => {
    const pct = r.upgradeCost > 0n ? Number((r.balance * 1000n) / r.upgradeCost) / 10 : 0;
    return /*html*/`
        <section class="surface rounded-2xl p-5 sm:p-6">
            ${blockHead(t("Rank {rank} · {tier}", { rank: r.rank, tier: escape(data.tiers[r.rank - 1] ?? "") }), plural(r.ids, "ID"))}
            <dl class="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                ${tile(t("Cash to wallet"), money(data, r.cashIn), "text-gold-200")}
                ${tile(t("Into upgrade balance"), money(data, r.balanceIn), "text-mint-300", t("from the IDs below"))}
                ${tile(t("Topped up from wallet"), money(data, r.toppedUp), "text-text", t("purchases of Rank {rank}", { rank: data.rules[r.rank]?.next || r.rank + 1 }))}
                ${tile(t("Used for upgrades"), money(data, r.used), "text-text", plural(r.upgrades, "upgrade"))}
            </dl>
            <div class="mt-4 flex flex-col gap-2">
                <div class="flex items-baseline justify-between gap-3 text-[13px]">
                    <span class="text-soft">${t("Upgrade balance now")}</span>
                    <span class="figure"><b class="text-mint-300">${moneyText(data, r.balance)}</b> / ${moneyText(data, r.upgradeCost)}</span>
                </div>
                <div class="h-1.5 overflow-hidden rounded-full bg-edge" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}" aria-label="${t("Upgrade balance")}">
                    <div class="h-full rounded-full bg-mint-400" style="width:${Math.min(100, pct)}%"></div>
                </div>
                <p class="text-[12px] text-dim">${t("Into upgrade balance + topped up − used for upgrades = upgrade balance now.")}</p>
                ${r.exact ? "" : /*html*/`<p class="text-[12px] text-gold-200">${t("The order of some purchases in this rank could not be worked out exactly. The totals above are exact.")}</p>`}
            </div>
        </section>
    `;
};

const lookup = (data) => /*html*/`
    <form class="flex flex-col gap-2 sm:flex-row sm:items-end" onsubmit="event.preventDefault(); historyLookup(this.addr.value)">
        <div class="min-w-0 flex-1">
            <label for="history-addr" class="mb-1.5 block text-[12px] text-soft">${t("Wallet address")}</label>
            <input id="history-addr" name="addr" type="text" inputmode="text" autocomplete="off" spellcheck="false" placeholder="0x…"
                value="${data.isOther ? escape(data.account) : ""}"
                class="figure w-full rounded-lg border border-edge-hi bg-night px-3 py-2.5 text-[14px] text-text placeholder:text-dim focus:border-mint-500 focus:outline-none focus:ring-2 focus:ring-mint-400/40" />
        </div>
        <div class="flex gap-2">
            <button type="submit" class="inline-flex min-h-11 items-center justify-center rounded-lg border border-edge-hi bg-white/[0.03] px-4 text-sm font-semibold text-text hover:border-mint-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-400">${t("View")}</button>
            ${data.isOther && data.isConnected ? /*html*/`<a href="#/history" class="inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold text-soft hover:text-text">${t("My wallet")}</a>` : ""}
        </div>
    </form>
`;

const empty = (data) => /*html*/`
    <section class="surface max-w-xl rounded-3xl p-6 sm:p-8">
        <p class="font-wide text-lg font-medium text-text">${!data.isConnected && !data.isOther ? t("Connect your wallet to see your history.") : t("This wallet has not joined yet.")}</p>
        <p class="mt-2 text-sm leading-relaxed text-soft">${t("Or type any member's wallet address above.")}</p>
        ${!data.isConnected && !data.isOther ? /*html*/`<div class="mt-6 max-w-xs">${button(t("Connect wallet"), "openWallet()")}</div>` : ""}
    </section>
`;

const history = (data) => {
    const params = Object.fromEntries(new URLSearchParams(window.location.hash.split("?")[1] ?? ""));
    const selected = Number(params.rank) || 0;
    const rank = data.ranks?.find((r) => r.rank === selected) ?? null;
    const key = `${data.account}:${selected}`;
    if (key !== shownKey) { shownKey = key; shown = STEP; }
    // Every rank: money and purchases, plus sign-ups; the IDs that came from upgrades show inside their upgrade row
    const events = rank ? rank.events : (data.events ?? []).filter((e) => e.kind !== "new" || (!e.from && !e.isStart));

    return /*html*/`
    <main class="${WRAP} flex flex-col gap-8 py-10 sm:py-14">
        ${pageHead(t("History"), t("Money history"), t("Every payment into this wallet's IDs, by rank: which ID paid it, what went to the wallet and what went to the upgrade balance, plus purchases and upgrades."))}
        ${lookup(data)}
        ${!data.isMember ? empty(data) : /*html*/`
            <p class="-mt-4 text-[13px] text-soft">${t("Member {member}", { member: memberLabel(data.memberId) })} · <span class="figure">${escape(address(data.account))}</span></p>
            <dl class="grid grid-cols-2 gap-3 lg:grid-cols-4">
                ${tile(t("Cash from boards"), money(data, data.totals.cashIn), "text-gold-200")}
                ${tile(t("Into upgrade balances"), money(data, data.totals.balanceIn), "text-mint-300")}
                ${tile(t("Topped up for purchases"), money(data, data.totals.toppedUp))}
                ${tile(t("Upgrade balances now"), money(data, data.totals.held), "text-mint-300")}
            </dl>
            <p class="-mt-4 text-[12px] text-dim">${t("Invite rewards so far: {amount} (not listed one by one).", { amount: moneyText(data, data.referralEarned) })}</p>
            ${rankChips(data, rank ? rank.rank : 0)}
            ${rank ? rankSummary(data, rank) : ""}
            ${timeline(data, events, Boolean(rank))}
            <p class="text-[12px] leading-relaxed text-dim">${t("Worked out from the IDs the contract stores and the rank rules. Transaction links are not shown, because the public node does not keep old event logs.")}</p>
        `}
    </main>
    `;
};

const historyLoading = loadingBox;
const historyError = errorBox;

/** Next page of rows (called from the "Show more" button) */
const showMore = () => { shown += STEP; };

export { history, historyLoading, historyError, showMore };
