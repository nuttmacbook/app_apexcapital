import { formNumber, shortAddress, escapeHtml as escape } from "../../../engine/ui/helpers";

/*
 * YOUR CODE (off-chain). Small pieces every page shares: amounts, buttons, section titles, paging.
 * Each one returns HTML. Nothing here talks to a contract.
 */

/** An amount with its token symbol, e.g. "10.00 USDT"; symbol and decimals come from the contract */
const money = (data, value, digits = 2) => `<span class="figure">${formNumber(value ?? 0n, data?.tokenDecimals ?? 0, digits)}</span><span class="ml-1 text-[0.62em] font-medium tracking-normal text-dim">${escape(data?.tokenSymbol ?? "")}</span>`;

/** Amount without the symbol, for rows where the symbol is already in the heading */
const formatAmount = (data, value, digits = 2) => formNumber(value ?? 0n, data?.tokenDecimals ?? 0, digits);

/** Plain-text amount (buttons, titles, sentences) */
const moneyText = (data, value, digits = 2) => `${formNumber(value ?? 0n, data?.tokenDecimals ?? 0, digits)} ${data?.tokenSymbol ?? ""}`;

/** "20 Oct 2026" from a unix time in seconds */
const dateOf = (seconds) => (seconds > 0 ? new Date(seconds * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "–");

const address = (value) => (value ? shortAddress(value) : "–");

const percent = (bps) => `${(bps / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;

const plural = (count, word) => `${count.toLocaleString("en-US")} ${word}${count === 1 ? "" : "s"}`;

/** Container width shared by every section */
const WRAP = "mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8";

/** Centered section title with a small label, as on the landing page */
const sectionTitle = (label, title, lead = "") => /*html*/`
    <div class="mx-auto max-w-2xl text-center">
        <span class="pill">${label}</span>
        <h2 class="mt-4 font-wide text-[1.7rem] font-medium leading-tight tracking-[-0.01em] text-text sm:text-[2.1rem]">${title}</h2>
        ${lead ? /*html*/`<p class="mt-3 text-[15px] leading-relaxed text-soft">${lead}</p>` : ""}
    </div>
`;

/** Left-aligned heading for app pages (board, team) */
const pageHead = (label, title, lead = "") => /*html*/`
    <div class="max-w-3xl">
        <span class="pill">${label}</span>
        <h1 class="mt-4 font-wide text-[1.9rem] font-medium leading-tight tracking-[-0.015em] text-text sm:text-[2.6rem]">${title}</h1>
        ${lead ? /*html*/`<p class="mt-3 text-[15px] leading-relaxed text-soft sm:text-base">${lead}</p>` : ""}
    </div>
`;

/** Small heading inside a card or a page section */
const blockHead = (title, aside = "") => /*html*/`
    <div class="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 class="font-wide text-lg font-medium text-text">${title}</h2>
        ${aside ? /*html*/`<div class="text-[13px] text-soft">${aside}</div>` : ""}
    </div>
`;

/** A button that calls a window function */
const button = (label, onclick, { isDisabled = false, kind = "primary", full = true, size = "md" } = {}) => {
    const look = {
        primary: "bg-gradient-to-b from-mint-300 to-mint-400 text-night hover:from-mint-200 hover:to-mint-300 shadow-[0_10px_30px_-12px_rgb(63_207_122/0.55)] disabled:bg-none disabled:bg-edge-hi disabled:text-dim disabled:shadow-none",
        ghost: "border border-edge-hi bg-white/[0.03] text-text hover:border-mint-500 hover:text-mint-200",
        light: "bg-text text-night hover:bg-white",
    }[kind];
    const pad = size === "sm" ? "px-3.5 py-2 text-[13px]" : "px-5 py-3 text-sm";
    return /*html*/`
        <button type="button" onclick="${onclick}" ${isDisabled ? "disabled" : ""}
            class="${full ? "w-full" : ""} inline-flex items-center justify-center rounded-lg font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-400 focus-visible:ring-offset-2 focus-visible:ring-offset-night disabled:cursor-not-allowed ${pad} ${look} ${kind === "primary" && !isDisabled ? "btn-sheen" : ""}">
            ${label}
        </button>
    `;
};

/** A label / value row */
const row = (label, value, valueClass = "text-text") => /*html*/`
    <div class="flex items-baseline justify-between gap-4 py-3">
        <dt class="text-[13px] text-soft">${label}</dt>
        <dd class="text-right text-sm font-medium ${valueClass}">${value}</dd>
    </div>
`;

/** Ranks grouped by tier, keeping the contract's order: [ { tier, ranks: [ ... ] } ] */
const byTier = (ranks) => ranks.reduce((groups, r) => {
    const last = groups.at(-1);
    if (last && last.tier === r.tier) last.ranks.push(r);
    else groups.push({ tier: r.tier, ranks: [ r ] });
    return groups;
}, []);

/** Previous / next page; `go` is a window function name taking the page number */
const pager = ({ page, pageSize, total, go }) => {
    const pages = Math.max(1, Math.ceil(total / pageSize));
    if (pages <= 1) return "";
    return /*html*/`
        <nav class="flex items-center justify-between gap-3 pt-4 text-[13px] text-soft" aria-label="Pages">
            <span>Page ${page + 1} of ${pages}</span>
            <div class="flex gap-2">
                ${button("Previous", `${go}(${page - 1})`, { kind: "ghost", full: false, size: "sm", isDisabled: page <= 0 })}
                ${button("Next", `${go}(${page + 1})`, { kind: "ghost", full: false, size: "sm", isDisabled: page + 1 >= pages })}
            </div>
        </nav>
    `;
};

/** Shown when a page could not read its data */
const errorBox = (message) => /*html*/`
    <main class="${WRAP} py-16">
        <div class="surface max-w-xl rounded-2xl p-6" role="alert">
            <p class="font-semibold text-text">This page could not load its data.</p>
            <p class="mt-1 text-sm text-soft">${escape(message)}</p>
            <div class="mt-4">${button("Try again", "refreshPage()", { kind: "ghost", full: false, size: "sm" })}</div>
        </div>
    </main>
`;

/** Generic loading placeholder */
const loadingBox = /*html*/`
    <main class="${WRAP} flex flex-col gap-6 py-16" aria-busy="true">
        <div class="skeleton h-7 w-28 rounded-full"></div>
        <div class="skeleton h-12 w-[30rem] max-w-full rounded-lg"></div>
        <div class="skeleton h-5 w-[24rem] max-w-full rounded"></div>
        <div class="skeleton mt-6 h-80 rounded-2xl"></div>
    </main>
`;

export { money, moneyText, formatAmount, dateOf, address, percent, plural, WRAP, sectionTitle, pageHead, blockHead, button, row, byTier, pager, errorBox, loadingBox, escape };
