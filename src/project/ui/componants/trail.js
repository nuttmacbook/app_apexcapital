import { moneyText, escape } from "./parts";
import { t, locale } from "../../lang";
import { memberLabel, positionLabel } from "./ids";

/*
 * YOUR CODE (off-chain). Money trail of one ID: the panel that opens when an ID is tapped on the board.
 * It shows where this ID's money went when it entered, what the IDs below paid into it, and the owner's
 * upgrade balance in this rank. Amounts follow the rank's rules (the first slot pays the owner, the second
 * goes to the upgrade balance). `data` comes from getMoneyTrail() in src/project/chain.
 */

const STATUS = [ "Open 0/2", "Waiting 1/2", "Complete 2/2" ];
const STATUS_LOOK = [
    "border border-edge-hi bg-card-hi text-soft",
    "bg-gold-300/10 text-gold-200",
    "bg-mint-900 text-mint-300",
];

/** "14 Nov 2026, 15:30" from a unix time in seconds */
const timeOf = (seconds) => (seconds > 0
    ? new Date(seconds * 1000).toLocaleString(locale(), { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "–");

const isMine = (data, member) => data.viewerId > 0 && member === data.viewerId;

/** "You" or "Member #12" */
const ownerName = (data, member) => (isMine(data, member) ? t("You") : t("Member {member}", { member: memberLabel(member) }));

/** How the ID was paid for, from where it came */
const originText = (rank, from) => {
    if (!from) return t("Joined with an invite link");
    if (from === rank - 1) return t("Moved up from Rank {rank}", { rank: from });
    return t("Re-born from Rank {rank}", { rank: from });
};

const isAddr = (value) => /^0x[0-9a-fA-F]{40}$/.test(String(value ?? ""));

/** Wallet of an ID's owner: copy it, or open that wallet's money history */
const walletRow = (account, { full = false } = {}) => (isAddr(account) ? /*html*/`
    <div class="flex items-center gap-1.5">
        <span class="figure min-w-0 flex-1 ${full ? "break-all text-[12px] text-text" : "truncate text-[12px] text-soft"}" title="${account}">${full ? account : `${account.slice(0, 8)}…${account.slice(-6)}`}</span>
        <button type="button" onclick="copyAddress('${account}')" aria-label="${t("Copy wallet address")}" title="${t("Copy wallet address")}"
            class="flex size-9 shrink-0 items-center justify-center rounded-lg border border-edge-hi text-soft hover:border-mint-500 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-400">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>
        </button>
        <button type="button" onclick="openHistory('${account}')" aria-label="${t("Money history of this wallet")}" title="${t("Money history of this wallet")}"
            class="flex size-9 shrink-0 items-center justify-center rounded-lg border border-edge-hi text-soft hover:border-mint-500 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-400">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></svg>
        </button>
    </div>
` : "");

const amountRow = (label, value, look = "text-text") => /*html*/`
    <div class="flex items-baseline justify-between gap-3 text-[13px]">
        <span class="text-soft">${label}</span>
        <span class="figure shrink-0 font-semibold ${look}">${value}</span>
    </div>
`;

const sectionTitle = (text) => /*html*/`<h3 class="text-[12px] font-semibold uppercase tracking-[0.06em] text-soft">${text}</h3>`;

/** What one ID pays the board it enters, by the slot it takes ("left" = first, "right" = second) */
const slotSplit = (data, slot) => (slot === "left"
    ? { cash: data.firstPayout, balance: data.inflow - data.firstPayout }
    : { cash: 0n, balance: data.inflow });

/** Rows of one payment into a board: cash to the wallet and/or the upgrade balance */
const splitRows = (data, slot, whose) => {
    const { cash, balance } = slotSplit(data, slot);
    const wallet = whose === "you" ? t("To your wallet") : t("To the owner's wallet");
    const upgrade = whose === "you" ? t("Into your Rank {rank} upgrade balance", { rank: data.rank }) : t("Into the owner's Rank {rank} upgrade balance", { rank: data.rank });
    return [
        cash > 0n ? amountRow(wallet, `+${moneyText(data, cash)}`, "text-gold-200") : "",
        balance > 0n ? amountRow(upgrade, `+${moneyText(data, balance)}`, "text-mint-300") : "",
        slot === "right" ? /*html*/`<p class="text-[12px] text-soft">${t("Second slot: this completed the board.")}</p>` : "",
    ].join("");
};

const summary = (data) => {
    const { filled } = data.target;
    const first = slotSplit(data, "left");
    const second = slotSplit(data, "right");
    const cash = filled >= 1 ? first.cash : 0n;
    const balance = (filled >= 1 ? first.balance : 0n) + (filled >= 2 ? second.balance : 0n);
    const toCome = (filled < 1 ? first.cash + first.balance : 0n) + (filled < 2 ? second.balance : 0n);
    return /*html*/`
        <dl class="grid grid-cols-3 gap-2">
            ${[
                [ t("Paid to wallet"), cash, "text-gold-200" ],
                [ t("To upgrade"), balance, "text-mint-300" ],
                [ t("Still to come"), toCome, "text-text" ],
            ].map(([ label, value, look ]) => /*html*/`
                <div class="min-w-0 rounded-xl border border-edge bg-card px-3 py-2.5">
                    <dt class="truncate text-[11px] text-soft">${label}</dt>
                    <dd class="figure mt-0.5 truncate text-[15px] font-bold ${look}">${moneyText(data, value)}</dd>
                </div>
            `).join("")}
        </dl>
    `;
};

const entered = (data) => {
    const { target, above } = data;
    if (!above) {
        return /*html*/`
            <section class="flex flex-col gap-2.5">
                ${sectionTitle(t("When this ID entered"))}
                <p class="rounded-xl border border-dashed border-edge-hi px-4 py-3 text-[13px] text-soft">${t("This is the start ID of the rank. It was made when the system opened, so it paid no one.")}</p>
            </section>
        `;
    }
    const whose = isMine(data, above.member) ? "you" : "owner";
    const slot = above.slot === "left" ? t("left slot (first)") : t("right slot (second)");
    return /*html*/`
        <section class="flex flex-col gap-2.5">
            ${sectionTitle(t("When this ID entered · {amount}", { amount: moneyText(data, data.cost) }))}
            <div class="flex flex-col gap-2 rounded-xl border border-edge bg-card px-4 py-3">
                <p class="text-[14px] font-semibold text-text">${t("Went to ID {id} · {owner} · {slot}", { id: positionLabel(data.rank, above.index), owner: ownerName(data, above.member), slot })}</p>
                ${isMine(data, above.member) ? "" : walletRow(above.account)}
                ${data.referral > 0n ? amountRow(t("Invite reward to the sponsor of this ID's owner"), moneyText(data, data.referral), "text-soft") : ""}
                ${splitRows(data, above.slot, whose)}
                <p class="text-[12px] text-dim">${originText(data.rank, target.from)}</p>
            </div>
        </section>
    `;
};

const slotCard = (data, node, slot) => {
    const whose = isMine(data, data.target.member) ? "you" : "owner";
    const name = slot === "left" ? t("Left slot") : t("Right slot");
    if (!node) {
        const { cash, balance } = slotSplit(data, slot);
        const parts = [
            cash > 0n ? t("{amount} to the wallet", { amount: moneyText(data, cash) }) : "",
            balance > 0n ? t("{amount} to the upgrade balance", { amount: moneyText(data, balance) }) : "",
        ].filter(Boolean).join(t(" and "));
        return /*html*/`
            <div class="flex flex-col gap-1 rounded-xl border border-dashed ${slot === "left" || data.target.filled === 1 ? "border-gold-500/60 bg-gold-300/[0.03]" : "border-edge-hi"} px-4 py-3">
                <p class="text-[14px] font-semibold text-text">${t("{slot} · empty", { slot: name })}</p>
                <p class="text-[12px] leading-relaxed text-soft">${t("The ID that takes this slot pays {parts}.", { parts })}</p>
            </div>
        `;
    }
    return /*html*/`
        <div class="flex flex-col gap-2 rounded-xl border border-edge bg-card px-4 py-3">
            <div class="flex items-baseline justify-between gap-3">
                <p class="min-w-0 truncate text-[14px] font-semibold text-text">${name} · ID ${positionLabel(data.rank, node.index)} · ${ownerName(data, node.member)}</p>
                <span class="figure shrink-0 text-[12px] text-soft">${timeOf(node.createdAt)}</span>
            </div>
            ${isMine(data, node.member) ? "" : walletRow(node.account)}
            ${splitRows(data, slot, whose)}
        </div>
    `;
};

const balanceBox = (data) => {
    if (!(data.upgradeCost > 0n)) return "";
    const mine = isMine(data, data.target.member);
    const pct = Number((data.ownerBalance * 1000n) / data.upgradeCost) / 10;
    const after = data.next
        ? t("When it reaches the price, a new Rank {rank} ID is made automatically.", { rank: data.next })
        : t("When it reaches the price, the re-born IDs are made automatically.");
    return /*html*/`
        <section class="flex flex-col gap-2 rounded-xl border border-edge bg-card px-4 py-3">
            <div class="flex items-baseline justify-between gap-3 text-[13px]">
                <span class="text-soft">${mine ? t("Your Rank {rank} upgrade balance", { rank: data.rank }) : t("Owner's Rank {rank} upgrade balance", { rank: data.rank })}</span>
                <span class="figure shrink-0"><b class="text-mint-300">${moneyText(data, data.ownerBalance)}</b> / ${moneyText(data, data.upgradeCost)}</span>
            </div>
            <div class="h-1.5 overflow-hidden rounded-full bg-edge" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}" aria-label="${t("Upgrade balance")}">
                <div class="h-full rounded-full bg-mint-400" style="width:${Math.min(100, pct)}%"></div>
            </div>
            <p class="text-[12px] leading-relaxed text-soft">${t("Held in the contract, not lost. It is shared by all of this member's Rank {rank} IDs.", { rank: data.rank })} ${after}</p>
        </section>
    `;
};

/** The whole panel body */
const trailBody = (data) => {
    const { target } = data;
    const mine = isMine(data, target.member);
    return /*html*/`
        <header class="flex items-start justify-between gap-3">
            <div class="flex min-w-0 flex-col gap-1">
                <div class="flex items-center gap-2">
                    <span class="rounded-md border border-edge-hi bg-card-hi px-1.5 py-0.5 text-[11px] font-bold tracking-[0.04em] text-soft">${t("RANK {rank}", { rank: data.rank })}</span>
                    <h2 id="trail-title" class="figure truncate text-xl font-bold text-text">ID ${positionLabel(data.rank, target.index)}</h2>
                </div>
                <p class="text-[13px] ${mine ? "text-gold-200" : "text-soft"}">${ownerName(data, target.member)} · ${escape(data.tier)} · ${timeOf(target.createdAt)}</p>
            </div>
            <span class="shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold ${STATUS_LOOK[target.filled] ?? STATUS_LOOK[0]}">${t(STATUS[target.filled] ?? STATUS[0])}</span>
        </header>
        <div class="-mt-2 rounded-xl border border-edge bg-card px-3 py-2">
            <p class="mb-1 text-[11px] text-soft">${t("Owner's wallet")}</p>
            ${walletRow(target.account, { full: true })}
        </div>
        ${summary(data)}
        ${entered(data)}
        <section class="flex flex-col gap-2.5">
            ${sectionTitle(t("Received from the IDs below"))}
            ${slotCard(data, data.slots[0], "left")}
            ${slotCard(data, data.slots[1], "right")}
        </section>
        ${balanceBox(data)}
        <p class="text-[11px] leading-relaxed text-dim">${t("Worked out from the IDs on this board and the rank's rules in the contract.")}</p>
    `;
};

const trailLoading = /*html*/`
    <div class="flex flex-col gap-4" aria-busy="true">
        <div class="skeleton h-7 w-40 rounded-lg"></div>
        <div class="grid grid-cols-3 gap-2"><div class="skeleton h-14 rounded-xl"></div><div class="skeleton h-14 rounded-xl"></div><div class="skeleton h-14 rounded-xl"></div></div>
        <div class="skeleton h-28 rounded-xl"></div>
        <div class="skeleton h-40 rounded-xl"></div>
    </div>
`;

const trailError = /*html*/`
    <div class="flex flex-col gap-3" role="alert">
        <p class="font-semibold text-text">${t("The money trail could not load.")}</p>
        <p class="text-sm text-soft">${t("The network did not answer. Check your connection and try again.")}</p>
    </div>
`;

/* ------------------------------------ the panel (one at a time, bottom sheet on phones, centred on wide screens) */

let panel = null;
let lastFocus = null;

const onKey = (event) => { if (event.key === "Escape") closeTrail(); };

function closeTrail() {
    if (!panel) return;
    panel.remove();
    panel = null;
    document.removeEventListener("keydown", onKey);
    document.documentElement.classList.remove("overflow-hidden");
    lastFocus?.focus?.({ preventScroll: true });
}

/**
 * Opens the panel and fills it when the data arrives.
 * @param {Function} load   () => Promise<data>
 * @param {object} actions  boardOnclick: onclick text of "Open the board below this ID"
 */
function openTrail(load, { boardOnclick = "" } = {}) {
    closeTrail();
    lastFocus = document.activeElement;
    panel = document.createElement("div");
    panel.className = "fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6";
    panel.innerHTML = /*html*/`
        <div class="absolute inset-0 bg-black/70 backdrop-blur-[2px]" data-trail-close></div>
        <div role="dialog" aria-modal="true" aria-labelledby="trail-title"
            class="relative flex max-h-[88dvh] w-full max-w-lg flex-col rounded-t-3xl border-t border-edge bg-raised sm:rounded-3xl sm:border">
            <div class="flex items-center justify-between px-5 pb-1 pt-3">
                <span class="mx-auto h-1 w-10 rounded-full bg-edge-hi sm:hidden" aria-hidden="true"></span>
                <span class="hidden text-[13px] font-semibold text-soft sm:inline">${t("Money trail")}</span>
                <button type="button" data-trail-close aria-label="${t("Close")}"
                    class="absolute right-3 top-2 flex size-10 items-center justify-center rounded-full text-soft hover:bg-white/[0.06] hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-400">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
                </button>
            </div>
            <div class="flex flex-col gap-5 overflow-y-auto px-5 pb-4 pt-2" data-trail-body>${trailLoading}</div>
            <div class="flex gap-2 border-t border-edge px-5 py-4" data-trail-actions hidden>
                ${boardOnclick ? /*html*/`<button type="button" onclick="${boardOnclick}" class="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-gradient-to-b from-mint-300 to-mint-400 px-4 text-sm font-semibold text-night hover:from-mint-200 hover:to-mint-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-400">${t("Open the board below this ID")}</button>` : ""}
                <button type="button" data-trail-close class="inline-flex min-h-11 items-center justify-center rounded-lg border border-edge-hi bg-white/[0.03] px-4 text-sm font-semibold text-text hover:border-mint-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-400">${t("Close")}</button>
            </div>
        </div>
    `;
    panel.querySelectorAll("[data-trail-close]").forEach((el) => el.addEventListener("click", closeTrail));
    document.body.appendChild(panel);
    document.documentElement.classList.add("overflow-hidden");
    document.addEventListener("keydown", onKey);
    panel.querySelector("button[data-trail-close]")?.focus({ preventScroll: true });

    const mine = panel;
    load().then((data) => {
        if (panel !== mine) return;
        panel.querySelector("[data-trail-body]").innerHTML = trailBody(data);
        panel.querySelector("[data-trail-actions]").hidden = false;
    }).catch((err) => {
        console.error(err);
        if (panel !== mine) return;
        panel.querySelector("[data-trail-body]").innerHTML = trailError;
        panel.querySelector("[data-trail-actions]").hidden = false;
    });
}

export { openTrail, closeTrail };
