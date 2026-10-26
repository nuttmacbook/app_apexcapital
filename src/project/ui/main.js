/*
 * YOUR CODE (off-chain). The website in one place:
 *   1. which pages exist
 *   2. what each button does
 * Blockchain work comes from src/project/chain (imported, never written here).
 * Drawing, wallet changes and loading are handled by src/engine/ui/app.js. Settings live in settings/.env.
 */

import "./main.css";
import { t, lang, setLang } from "../lang";
import { startApp, openWallet } from "../../engine/ui/app";
import { getHomeData, getPlanData, getBoardData, getTeamData, getDividendData, register, processQueue, buyRank, buyPrice, transferWallet, dividend, parseRecipients, toUnits } from "../chain";
import { formNumber } from "../../engine/ui/helpers";
import { header } from "./componants/header";
import { mountAmbient, watchPageEntry } from "./componants/ambient";
import { isDev, isMasked, toggleIdView, memberParam, positionParam, parseMember, parsePosition } from "./componants/ids";
import { footer } from "./componants/footer";
import { notify } from "./componants/toast";
import { home, homeLoading, homeError } from "./pages/home";
import { plan, planLoading, planError } from "./pages/plan";
import { board, boardLoading, boardError } from "./pages/board";
import { team, teamLoading, teamError } from "./pages/team";
import { dividend as dividendPage, dividendLoading, dividendError } from "./pages/dividend";

/* ------------------------------------ link parameters (#/board?rank=3&pos=<code>, ?ref=<code>; plain numbers in dev only) */

const REF_KEY = "apex.ref";

/** Parameters after "?" in the hash */
const hashParams = () => Object.fromEntries(new URLSearchParams(window.location.hash.split("?")[1] ?? ""));

const DEFAULT_SPONSOR = "1";
const isMemberId = (value) => /^[1-9]\d*$/.test(String(value ?? "").trim());

/** Member number from a link or an input (a code, or a plain number in dev mode); null when not valid */
const memberFrom = (text) => {
    const id = parseMember(text);
    return id && id > 0 ? id : null;
};

/**
 * A referral link (?ref=<code> in the address, or #/?ref=<code>) is remembered in this browser until another referral link is opened,
 * so closing the app or refreshing keeps the same sponsor. After it is saved, ?ref= is taken out of the address bar,
 * so a refresh never overwrites a sponsor the visitor typed in by hand.
 */
const captureRef = () => {
    const url = new URL(window.location.href);
    const fromLink = memberFrom(url.searchParams.get("ref") ?? hashParams().ref);
    if (!fromLink) return;
    try { localStorage.setItem(REF_KEY, String(fromLink)); } catch {}
    if (url.searchParams.has("ref")) {
        url.searchParams.delete("ref");
        history.replaceState(history.state, "", url.pathname + url.search + url.hash);
    }
};

/** Sponsor id: the remembered referral link, else member #1 */
const sponsorRef = () => {
    try {
        const saved = localStorage.getItem(REF_KEY);
        if (isMemberId(saved)) return saved;
    } catch {}
    return DEFAULT_SPONSOR;
};

captureRef();
window.addEventListener("hashchange", captureRef);

/** Board link parameters with pos turned back into a number (an unknown code opens the viewer's own ID) */
const boardParams = () => {
    const params = hashParams();
    const index = params.pos ? parsePosition(params.rank ?? 1, params.pos) : null;
    return { ...params, pos: index === null ? "" : String(index) };
};

/* ------------------------------------ 1. pages (the first one opens by default; others at #/name) */

const pages = {
    home: { load: async (wallet) => { homeData = await getHomeData(wallet, { ref: sponsorRef() }); return homeData; }, view: home, loading: homeLoading, error: homeError },
    plan: { load: getPlanData, view: plan, loading: planLoading, error: planError },
    board: { load: (wallet) => getBoardData(wallet, boardParams()), view: board, loading: boardLoading, error: boardError },
    team: { load: (wallet) => getTeamData(wallet, hashParams()), view: team, loading: teamLoading, error: teamError },
    "multi-transfer": { load: async (wallet) => { const data = await getDividendData(wallet); dividendToken = { symbol: data.tokenSymbol, decimals: data.tokenDecimals }; return data; }, view: dividendPage, loading: dividendLoading, error: dividendError },
};

// Last dashboard data, for the live price of "Move up a rank" while choosing
let homeData = null;

// Token facts of the dividend page, kept for the live summary while typing
let dividendToken = { symbol: "", decimals: 0 };

mountAmbient();
const app = startApp({ pages, header, footer, notify });
watchPageEntry();

/* ------------------------------------ dev mode: switch between real numbers and codes (VITE_APP_MODE=dev) */

if (isDev()) {
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "fixed bottom-[4.5rem] left-4 z-40 rounded-full border border-gold-300/50 bg-[#141106]/90 px-3 py-1.5 text-[11px] font-semibold text-gold-200 backdrop-blur hover:border-gold-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300";
    const label = () => { toggle.textContent = isMasked() ? t("IDs: codes (production view)") : t("IDs: real numbers (dev)"); };
    toggle.onclick = () => { toggleIdView(); label(); app.refresh({ quiet: true }); };
    label();
    window.addEventListener("apex:lang", label);
    document.body.appendChild(toggle);
}

/* ------------------------------------ 2. buttons (called from onclick="..." in the pages) */

window.openWallet = openWallet;

/** EN | TH in the header: redraws the page in the other language (nothing is read again) */
window.switchLang = (code) => {
    if (code === lang()) return;
    setLang(code);
    app.refresh({ quiet: true });
    window.dispatchEvent(new Event("apex:lang"));
};
window.refreshPage = () => app.refresh({ fresh: true });

const badSponsor = () => notify.error(new Error(isMasked() ? "That sponsor code is not valid. Check it with the person who invited you." : "Enter the member ID of the person who invited you."));

window.setSponsor = (value) => {
    if (!String(value ?? "").trim()) return;
    const id = memberFrom(value);
    if (!id) return badSponsor();
    try { localStorage.setItem(REF_KEY, String(id)); } catch {}
    window.location.hash = `#/?ref=${memberParam(id)}`;
};

window.doRegister = () => {
    const typed = document.querySelector("[data-sponsor-input]")?.value?.trim();
    const id = typed ? memberFrom(typed) : Number(sponsorRef());
    if (!id) return badSponsor();
    app.runTx((wallet, options) => register(wallet, { ...options, sponsorId: String(id) }), { title: "Welcome aboard", desc: "You are a member now. Your first ID is on a Rank 1 board." });
};

/** Scrolls to the sign-up form and puts the cursor in the sponsor field */
window.focusJoin = () => {
    if (!document.getElementById("join")) {
        window.location.hash = "#/";
        return;
    }
    document.getElementById("join").scrollIntoView({ behavior: "smooth", block: "center" });
    document.querySelector("[data-sponsor-input]")?.focus({ preventScroll: true });
};

window.doProcessQueue = () => app.runTx(processQueue, { title: "Placed", desc: "The waiting IDs are on their boards." });

window.copyRefLink = async () => {
    const link = document.querySelector("[data-ref-link]")?.textContent?.trim() ?? "";
    try {
        await navigator.clipboard.writeText(link);
        notify.success({ title: "Link copied", desc: "Send it to the people you invite." });
    } catch (err) {
        console.error(err);
        notify.error(new Error("Could not copy. Select the link and copy it by hand."));
    }
};

/** Opens a rank's board with `pos` at the top: a number from a page, or what was typed in "Go to ID" (empty = the viewer's first ID) */
window.openBoard = (rank, pos = "", page = "") => {
    const query = new URLSearchParams({ rank: String(rank) });
    const typed = String(pos).trim();
    if (typed !== "") {
        const index = typeof pos === "number" ? pos : parsePosition(rank, typed);
        if (index === null) return notify.error(new Error(isMasked() ? "That ID code is not valid in this rank." : "Enter an ID number."));
        query.set("pos", positionParam(rank, index));
    }
    if (String(page) !== "") query.set("page", String(page));
    window.location.hash = `#/board?${query}`;
};

window.myIdsPage = (page) => window.openBoard(hashParams().rank ?? 1, "", Math.max(0, page));

/** Live summary on the dividend page: count, equal share and what is actually sent */
window.updateDividendPreview = () => {
    const wallets = parseRecipients(document.querySelector("[data-dividend-wallets]")?.value);
    const amount = toUnits(document.querySelector("[data-dividend-amount]")?.value, dividendToken.decimals);
    const wrong = wallets.find((w) => !/^0x[0-9a-fA-F]{40}$/.test(w));
    const share = amount && wallets.length ? amount / BigInt(wallets.length) : 0n;
    const text = (value) => (value > 0n ? `${formNumber(value, dividendToken.decimals, 2)} ${dividendToken.symbol}` : "–");
    const set = (selector, value) => { const el = document.querySelector(selector); if (el) el.textContent = value; };
    set("[data-dividend-count]", String(wallets.length));
    set("[data-dividend-share]", text(share));
    set("[data-dividend-total]", text(share * BigInt(wallets.length)));
    const rest = amount && share ? amount - share * BigInt(wallets.length) : null;
    const tiny = 10n ** BigInt(Math.max(0, dividendToken.decimals - 6));
    set("[data-dividend-rest]", rest === null ? "–" : rest === 0n ? t("Nothing") : rest < tiny ? t("Under 0.000001 {token}", { token: dividendToken.symbol }) : `${formNumber(rest, dividendToken.decimals, 6)} ${dividendToken.symbol}`);
    const problem = document.querySelector("[data-dividend-problem]");
    if (problem) {
        problem.textContent = wrong ? t("This is not a wallet address: {address}", { address: wrong }) : "";
        problem.classList.toggle("hidden", !wrong);
    }
};

/* ------------------------------------ move up a rank */

const buyChoice = () => ({
    rank: Number(document.querySelector("[data-buy-rank]")?.value ?? 0),
    count: Math.trunc(Number(document.querySelector("[data-buy-count]")?.value ?? 0)),
});

/** Live price: per ID, what the balance covers, and what the wallet pays */
window.updateBuyPreview = () => {
    const { rank, count } = buyChoice();
    const set = (selector, value) => { const el = document.querySelector(selector); if (el) el.textContent = value; };
    const text = (value) => `${formNumber(value, homeData?.tokenDecimals ?? 0, 2)} ${homeData?.tokenSymbol ?? ""}`;
    if (!homeData || rank < 2 || count < 1 || count > 50) {
        [ "[data-buy-each]", "[data-buy-balance]", "[data-buy-pay]" ].forEach((s) => set(s, "–"));
        return;
    }
    const each = homeData.upgradeCosts?.[rank - 2] ?? 0n;
    const pay = buyPrice(homeData, rank, count);
    set("[data-buy-each]", text(each));
    set("[data-buy-balance]", text(each * BigInt(count) - pay));
    set("[data-buy-pay]", text(pay));
};

window.stepBuyCount = (delta) => {
    const input = document.querySelector("[data-buy-count]");
    if (!input) return;
    input.value = String(Math.min(50, Math.max(1, Math.trunc(Number(input.value || 1)) + delta)));
    window.updateBuyPreview();
};

window.doBuyRank = () => {
    const { rank, count } = buyChoice();
    app.runTx((wallet, options) => buyRank(wallet, { ...options, rank, count }), { title: t("Moved up to Rank {rank}", { rank }), desc: t(count > 1 ? "{count} new IDs in Rank {rank}. Find them on the board." : "1 new ID in Rank {rank}. Find it on the board.", { count, rank }) });
};

window.doTransferWallet = () => {
    const newWallet = document.querySelector("[data-new-wallet]")?.value ?? "";
    const confirm = document.querySelector("[data-new-wallet-again]")?.value ?? "";
    app.runTx((wallet, options) => transferWallet(wallet, { ...options, newWallet, confirm }), { title: "Account moved", desc: "Your account now belongs to the new wallet. Connect that wallet to keep using it." });
};

window.doDividend = () => {
    const recipientsText = document.querySelector("[data-dividend-wallets]")?.value ?? "";
    const amountText = document.querySelector("[data-dividend-amount]")?.value ?? "";
    app.runTx((wallet, options) => dividend(wallet, { ...options, recipientsText, amountText }), { title: "Transfer sent", desc: "Every wallet on the list received its share." });
};

window.teamPage = (page) => { window.location.hash = `#/team?page=${Math.max(0, page)}`; };
