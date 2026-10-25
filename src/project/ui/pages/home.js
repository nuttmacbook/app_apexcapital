import { settings } from "../../../engine/settings";
import { t, lang } from "../../lang";
import { buyPrice } from "../../chain";
import { memberLabel, memberParam, positionLabel, positionParam, isMasked } from "../componants/ids";
import { money, moneyText, formatAmount, dateOf, address, percent, plural, WRAP, sectionTitle, blockHead, button, row, escape, loadingBox, errorBox } from "../componants/parts";

/*
 * YOUR CODE (off-chain). Dashboard: the landing page with sign-up for visitors, the account for members.
 * `data` comes from getHomeData() in src/project/chain (this file never talks to a contract).
 */

const BPS = 10_000n;
const sponsorShare = (data) => ((data?.entryCost ?? 0n) * BigInt(data?.referralBps ?? 0)) / BPS;
const tierCount = (data) => new Set(data?.tiers ?? []).size;

/** The tagline in two tones: first half bright, second half soft */
const twoTone = (text) => {
    const words = String(text ?? "").split(" ");
    const cut = Math.ceil(words.length / 2);
    // Thai has no spaces between words, so each half stays on one line instead of breaking inside a word
    const keep = lang() === "th" ? " whitespace-nowrap" : "";
    return `<span class="text-luxe${keep}">${escape(words.slice(0, cut).join(" "))}</span> <span class="text-soft/80${keep}">${escape(words.slice(cut).join(" "))}</span>`;
};

/* ------------------------------------ sign-up (inside the phone) */

const sponsorStatus = (data) => {
    if (!data?.refId) return /*html*/`<p class="mt-2 text-[12px] leading-relaxed text-dim">${t("Filled in for you when you open an invite link.")}</p>`;
    if (!data?.refValid) return /*html*/`<p class="mt-2 text-[12px] text-loss">${t("There is no member {member}.", { member: escape(memberLabel(data.refId)) })}</p>`;
    return /*html*/`<p class="mt-2 flex items-center gap-1.5 text-[12px] text-mint-300"><span class="size-1.5 rounded-full bg-mint-400" aria-hidden="true"></span>${t("Sponsor {member},", { member: escape(memberLabel(data.refId)) })} <span class="figure">${address(data.refAccount)}</span></p>`;
};

const joinButton = (data) => {
    if (!data?.isConnected) return button(t("Connect wallet"), "openWallet()");
    if (data?.isMember) return button(t("You are member {member}", { member: memberLabel(data.myId) }), "", { isDisabled: true });
    const amount = data?.entryCost ?? 0n;
    if ((data?.walletBalance ?? 0n) < amount) return button(t("Needs {amount}", { amount: moneyText(data, amount) }), "", { isDisabled: true });
    if (!data?.refValid) return button(t("Enter a sponsor ID"), "", { isDisabled: true });
    const needsApprove = (data?.allowance ?? 0n) < amount;
    return button(needsApprove ? t("Approve and join") : t("Join for {amount}", { amount: moneyText(data, amount) }), "doRegister()");
};

const joinScreen = (data) => /*html*/`
    <div class="phone mx-auto w-full max-w-[22rem] xl:mr-0">
        <div class="phone-screen surface rounded-2xl bg-raised p-5 sm:border-0 sm:px-6 sm:pb-7 sm:pt-12">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <img src="/brand-mark.png" alt="" class="h-5 w-auto" />
                    <span class="font-wide text-[12px] font-semibold tracking-[0.04em] text-text">${settings.appName}</span>
                </div>
                <span class="rounded-full border border-edge-hi px-2 py-0.5 text-[11px] text-soft">BNB Chain</span>
            </div>

            <p class="mt-6 text-[13px] text-soft">${t("Entry price")}</p>
            <p class="mt-1 text-[2.1rem] font-semibold leading-none text-text">${money(data, data?.entryCost)}</p>

            <div class="mt-5 flex h-1.5 overflow-hidden rounded-full bg-edge" aria-hidden="true">
                <div class="bg-gold-300" style="width:${(data?.referralBps ?? 0) / 100}%"></div>
                <div class="flex-1 bg-mint-400"></div>
            </div>
            <dl class="mt-2 grid grid-cols-2 gap-2 text-[12px]">
                <div><dt class="text-dim">${t("To sponsor")}</dt><dd class="figure mt-0.5 text-text">${moneyText(data, sponsorShare(data))}</dd></div>
                <div class="text-right"><dt class="text-dim">${t("To your board")}</dt><dd class="figure mt-0.5 text-text">${moneyText(data, (data?.entryCost ?? 0n) - sponsorShare(data))}</dd></div>
            </dl>

            <label for="sponsor-id" class="mt-6 block text-[13px] font-medium text-text">${t("Sponsor ID")}</label>
            <div class="mt-2 flex rounded-xl border border-edge-hi bg-night/70 focus-within:border-mint-500 focus-within:ring-2 focus-within:ring-mint-500/25">
                <input id="sponsor-id" data-sponsor-input type="text" autocomplete="off" spellcheck="false" ${isMasked() ? `maxlength="9"` : `inputmode="numeric"`} value="${escape(data?.refId ? memberLabel(data.refId).replace(/^#/, "") : "")}" placeholder="${isMasked() ? t("Sponsor code") : t("Member ID")}"
                    onchange="setSponsor(this.value)" onkeydown="if (event.key === 'Enter') setSponsor(this.value)"
                    class="figure w-full min-w-0 rounded-xl bg-transparent px-3.5 py-3 text-[15px] text-text outline-none placeholder:text-dim ${isMasked() ? "uppercase tracking-[0.08em] placeholder:normal-case placeholder:tracking-normal" : ""}" />
                <button type="button" onclick="setSponsor(document.querySelector('[data-sponsor-input]').value)"
                    class="shrink-0 rounded-r-xl px-4 text-[13px] font-semibold text-mint-300 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-400">${t("Check")}</button>
            </div>
            ${sponsorStatus(data)}

            <div class="mt-5 flex items-center justify-between rounded-xl border border-edge bg-night/50 px-3.5 py-2.5 text-[12px]">
                <span class="text-soft">${t("In your wallet")}</span>
                <span class="figure text-text">${data?.isConnected ? moneyText(data, data?.walletBalance) : t("Not connected")}</span>
            </div>

            <div class="mt-5">${joinButton(data)}</div>
            <p class="mt-3 text-center text-[11px] leading-relaxed text-dim">${t("Two wallet prompts: allow exactly {amount}, then confirm.", { amount: moneyText(data, data?.entryCost) })}</p>
        </div>
    </div>
`;

/* ------------------------------------ visitor */

const paidOut = (data) => (data?.totalReferral ?? 0n) + (data?.totalBoardPaid ?? 0n);

const visitorHero = (data) => /*html*/`
    <section class="glow-top -mt-24 pt-24">
        <div class="${WRAP} grid items-center gap-12 pb-16 pt-10 sm:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pb-24">
            <div class="min-w-0">
                <span class="pill">${t("Live on BNB Smart Chain")}</span>
                <h1 class="mt-6 font-wide text-[2.6rem] font-medium leading-[1.04] tracking-[-0.025em] sm:text-6xl lg:text-[4.1rem]">${twoTone(t(settings.tagline))}</h1>
                <p class="mt-6 max-w-lg text-base leading-relaxed text-soft sm:text-[17px]">
                    ${t("A two-slot board that runs through {ranks} ranks. Each slot that fills below you pays you or builds your upgrade, and you can move up any time by topping up the difference. Paid in {token}, in the open.", { ranks: data?.rankCount || "–", token: escape(data?.tokenSymbol) })}
                </p>
                <div class="mt-8 flex flex-wrap gap-3">
                    <div>${button(t("Join now"), "focusJoin()", { full: false })}</div>
                    <a href="#/plan" class="inline-flex items-center rounded-lg border border-edge-hi bg-white/[0.03] px-5 py-3 text-sm font-semibold text-text transition hover:border-mint-500 hover:text-mint-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-400">${t("See the plan")}</a>
                </div>
                <div class="mt-10 flex items-start gap-3">
                    <span class="mt-2 size-2 shrink-0 rounded-full bg-mint-400 shadow-[0_0_10px] shadow-mint-400" aria-hidden="true"></span>
                    <div>
                        <p class="figure text-lg font-semibold text-text">${t("{count} members", { count: (data?.memberCount ?? 0).toLocaleString("en-US") })}</p>
                        <p class="whitespace-nowrap text-[13px] text-dim">${t("{amount} paid out so far", { amount: moneyText(data, paidOut(data)) })}</p>
                    </div>
                </div>
            </div>

            <div class="relative" id="join">
                <!-- Floating cards beside the phone (extra-wide screens only, so they never cover the form) -->
                <div class="surface absolute left-0 top-20 z-10 hidden w-[9.5rem] rounded-2xl bg-card/90 p-4 backdrop-blur xl:block">
                    <p class="text-[12px] text-soft">${t("Sponsor share")}</p>
                    <p class="mt-1 text-2xl font-semibold text-text">${percent(data?.referralBps ?? 0)}</p>
                    <p class="mt-1 text-[12px] text-dim">${t("of every Rank 1 entry")}</p>
                </div>
                <div class="surface absolute bottom-24 left-0 z-10 hidden w-[9.5rem] rounded-2xl bg-card/90 p-4 backdrop-blur xl:block">
                    <p class="text-[12px] text-soft">${t("Members")}</p>
                    <p class="figure mt-1 text-2xl font-semibold text-text">${(data?.memberCount ?? 0).toLocaleString("en-US")}</p>
                    <p class="mt-1 flex items-center gap-1.5 text-[12px] text-dim"><span class="size-1.5 rounded-full bg-mint-400 shadow-[0_0_8px] shadow-mint-400"></span>${t("live count")}</p>
                </div>
                ${joinScreen(data)}
            </div>
        </div>
    </section>
`;

const statStrip = (data) => /*html*/`
    <section class="border-y border-edge bg-raised/60">
        <dl class="${WRAP} grid grid-cols-2 gap-y-8 py-10 lg:grid-cols-4">
            ${[
                [ (data?.memberCount ?? 0).toLocaleString("en-US"), "Members" ],
                [ money(data, data?.totalReferral, 0), "Paid to sponsors" ],
                [ money(data, data?.totalBoardPaid, 0), "Paid by boards" ],
                [ money(data, data?.totalHeld, 0), "Held for open boards" ],
            ].map(([ value, label ]) => /*html*/`
                <div class="text-center">
                    <dd class="font-wide text-[1.7rem] font-medium tracking-[-0.01em] text-text sm:text-4xl">${value}</dd>
                    <dt class="mt-1 text-[13px] text-soft">${t(label)}</dt>
                </div>
            `).join("")}
        </dl>
    </section>
`;

/** Mini board drawing for the feature cards */
const miniBoard = () => /*html*/`
    <svg viewBox="0 0 300 150" class="h-auto w-full" role="img" aria-label="${t("One ID with two slots below it")}">
        <defs><linearGradient id="mb" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#3fcf7a"/><stop offset="1" stop-color="#178a48"/></linearGradient></defs>
        <line x1="150" y1="50" x2="75" y2="100" stroke="#333333" stroke-width="1.5"/>
        <line x1="150" y1="50" x2="225" y2="100" stroke="#333333" stroke-width="1.5"/>
        <rect x="105" y="14" width="90" height="38" rx="10" fill="url(#mb)"/>
        <text x="150" y="38" text-anchor="middle" fill="#050505" font-size="13" font-weight="600" font-family="Plus Jakarta Sans, sans-serif">${t("You")}</text>
        <rect x="15" y="98" width="120" height="38" rx="10" fill="#151515" stroke="#3fcf7a" stroke-opacity="0.6"/>
        <text x="75" y="122" text-anchor="middle" fill="#f4f4f2" font-size="12" font-family="Plus Jakarta Sans, sans-serif">${t("First slot pays")}</text>
        <rect x="165" y="98" width="120" height="38" rx="10" fill="#151515" stroke="#ebcd6c" stroke-opacity="0.6"/>
        <text x="225" y="122" text-anchor="middle" fill="#f4f4f2" font-size="12" font-family="Plus Jakarta Sans, sans-serif">${t("Builds upgrade")}</text>
    </svg>
`;

/** Where every entry so far has gone: sponsors, boards, still held, system */
const flowBar = (data) => {
    const parts = [
        [ "Paid to sponsors", data?.totalReferral ?? 0n, "bg-gold-300" ],
        [ "Paid by boards", data?.totalBoardPaid ?? 0n, "bg-mint-400" ],
        [ "Held for open boards", data?.totalHeld ?? 0n, "bg-mint-700" ],
        [ "To the company", data?.totalFee ?? 0n, "bg-edge-hi" ],
    ];
    const total = parts.reduce((sum, [ , v ]) => sum + v, 0n);
    const pct = (v) => (total > 0n ? Number((v * 10_000n) / total) / 100 : 0);
    return /*html*/`
        <div class="mt-auto pt-8">
            <p class="text-[12px] text-dim">${t("Where every entry so far has gone")}</p>
            <div class="mt-2 flex h-2 overflow-hidden rounded-full bg-edge" aria-hidden="true">
                ${parts.map(([ , v, c ]) => `<div class="${c}" style="width:${pct(v)}%"></div>`).join("")}
            </div>
            <dl class="mt-3 space-y-1.5 text-[12px]">
                ${parts.map(([ label, v, c ]) => /*html*/`
                    <div class="flex items-center justify-between gap-3">
                        <dt class="flex items-center gap-2 text-soft"><span class="size-2 rounded-full ${c}"></span>${t(label)}</dt>
                        <dd class="figure text-text">${pct(v).toFixed(1)}%</dd>
                    </div>
                `).join("")}
            </dl>
        </div>
    `;
};

const features = (data) => /*html*/`
    <section class="${WRAP} pt-20 sm:pt-28">
        ${sectionTitle(t("How it works"), t("A board that pays as it fills"), t("Every ID owns two slots. The contract places new IDs, pays you, and keeps your upgrade balance for each rank."))}
        <div class="mt-12 grid gap-4 lg:grid-cols-3">
            <article class="surface rounded-2xl p-6 lg:col-span-2">
                <h3 class="font-wide text-lg font-medium text-text">${t("Two slots, one rule at every rank")}</h3>
                <p class="mt-2 max-w-lg text-sm leading-relaxed text-soft">${t("When the first slot below an ID fills, you are paid a share of it. Everything else goes into your upgrade balance for that rank, from all your IDs in it. At the upgrade price you move up on your own, or top up the difference and move up now. Some ranks also buy you new IDs that start again.")}</p>
                <div class="mt-6 rounded-xl border border-edge bg-night/50 p-4 sm:p-6"><div class="mx-auto max-w-sm">${miniBoard()}</div></div>
            </article>

            <article class="surface-hi flex flex-col rounded-2xl p-6">
                <h3 class="font-wide text-lg font-medium text-text">${t("Held by the contract")}</h3>
                <p class="mt-2 text-sm leading-relaxed text-soft">${t("Money for boards that are still filling stays in the smart contract. The operator has no function to take it out.")}</p>
                <p class="mt-8 text-[13px] text-soft">${t("Held right now")}</p>
                <p class="mt-1 font-wide text-3xl font-medium text-text">${money(data, data?.totalHeld)}</p>
                ${flowBar(data)}
            </article>

            <article class="surface rounded-2xl p-6">
                <h3 class="font-wide text-lg font-medium text-text">${t("Your invite link")}</h3>
                <p class="mt-2 text-sm leading-relaxed text-soft">${t("People who join with it go under you, left slot first. You receive {percent} of every Rank 1 entry they make: {amount} each.", { percent: percent(data?.referralBps ?? 0), amount: moneyText(data, sponsorShare(data)) })}</p>
                <div class="mt-6 rounded-xl border border-edge bg-night/60 px-3.5 py-3 text-[13px]">
                    <span class="text-dim">${escape(typeof window === "undefined" ? "" : window.location.host)}/?ref=</span><span class="text-mint-300">${t("your ID")}</span>
                </div>
            </article>

            <article class="surface rounded-2xl p-6 lg:col-span-2">
                <h3 class="font-wide text-lg font-medium text-text">${t("{ranks} ranks in {tiers} tiers", { ranks: data?.rankCount || "–", tiers: tierCount(data) || "–" })}</h3>
                <p class="mt-2 max-w-lg text-sm leading-relaxed text-soft">${t("Rank 1 follows your sponsor's link. From Rank 2 up the whole system runs on its own: new IDs take the oldest open slot, in the order they arrive.")}</p>
                <div class="mt-6 flex flex-wrap gap-2">
                    ${[ ...new Set(data?.tiers ?? []) ].map((t, i, all) => /*html*/`
                        <span class="rounded-full border px-3.5 py-1.5 text-[13px] ${i === all.length - 1 ? "border-mint-500/60 bg-mint-400/10 text-mint-200" : "border-edge-hi text-soft"}">${escape(t)}</span>
                    `).join("")}
                </div>
                <a href="#/plan" class="mt-6 inline-block text-sm font-semibold text-mint-300 hover:text-mint-200">${t("See every rank in the plan")}</a>
            </article>
        </div>
    </section>
`;

const closingCta = () => /*html*/`
    <section class="${WRAP} pt-20">
        <div class="surface-hi flex flex-col items-start gap-6 rounded-3xl px-6 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-10">
            <div>
                <h2 class="font-wide text-2xl font-medium text-text sm:text-3xl">${t("Have an invite link?")}</h2>
                <p class="mt-2 text-soft">${t("Open it, connect your wallet and join in two confirmations.")}</p>
            </div>
            <div class="w-full sm:w-auto">${button(t("Join now"), "focusJoin()")}</div>
        </div>
    </section>
`;

/* ------------------------------------ member */

const referralLink = (data) => (typeof window === "undefined" ? "" : `${window.location.origin}${window.location.pathname}?ref=${data?.myId ? memberParam(data.myId) : ""}`);

const memberHero = (data) => {
    const total = (data?.myReferralEarned ?? 0n) + (data?.myBoardEarned ?? 0n);
    const boardPct = total > 0n ? Number(((data?.myBoardEarned ?? 0n) * 10_000n) / total) / 100 : 50;
    return /*html*/`
    <section class="glow-top -mt-24 pt-24">
        <div class="${WRAP} grid items-center gap-10 pb-14 pt-10 sm:pt-14 lg:grid-cols-[1fr_1fr]">
            <div>
                <span class="pill">${t("Account {account}", { account: escape(memberLabel(data.myId)) })}</span>
                <p class="mt-6 text-[15px] text-soft">${t("Total received")}</p>
                <p class="mt-2 font-wide text-5xl font-medium tracking-[-0.02em] text-text sm:text-6xl">${money(data, total)}</p>
                <p class="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-dim"><span class="whitespace-nowrap">${t("Member since {date}", { date: dateOf(data?.myJoinedAt) })}</span>${data?.mySponsor ? `<span class="whitespace-nowrap">${t("Sponsored by {member}", { member: escape(memberLabel(data.mySponsor)) })}</span>` : ""}</p>
                <div class="mt-8 flex flex-wrap gap-3">
                    <a href="#/board" class="inline-flex items-center rounded-lg bg-mint-400 px-5 py-3 text-sm font-semibold text-night shadow-[0_10px_30px_-12px_rgb(63_207_122/0.55)] transition hover:bg-mint-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-400">${t("Open my boards")}</a>
                    <div>${button(t("Copy invite link"), "copyRefLink()", { kind: "ghost", full: false })}</div>
                </div>
            </div>

            <div class="surface rounded-3xl bg-card/60 p-6 sm:p-7">
                ${blockHead(t("Statement"))}
                <div class="mt-5 flex h-2 overflow-hidden rounded-full bg-edge" aria-hidden="true">
                    <div class="bg-mint-400" style="width:${boardPct}%"></div>
                    <div class="flex-1 bg-gold-300"></div>
                </div>
                <dl class="mt-3 divide-y divide-edge">
                    ${row(`<span class="inline-flex items-center gap-2"><span class="size-2 rounded-full bg-mint-400"></span>${t("Board payouts")}</span>`, money(data, data?.myBoardEarned))}
                    ${row(`<span class="inline-flex items-center gap-2"><span class="size-2 rounded-full bg-gold-300"></span>${t("Sponsor payouts")}</span>`, money(data, data?.myReferralEarned))}
                </dl>
                <dl class="mt-4 grid grid-cols-3 gap-2">
                    ${[ [ "Boards", data?.myCycles ?? 0 ], [ "Invited", data?.myDirects ?? 0 ], [ "IDs", data?.myPositions ?? 0 ] ].map(([ label, value ]) => /*html*/`
                        <div class="min-w-0 rounded-xl border border-edge bg-night/50 px-3 py-3">
                            <dt class="truncate text-[12px] text-dim">${t(label)}</dt>
                            <dd class="figure mt-1 text-xl font-semibold text-text">${value.toLocaleString("en-US")}</dd>
                        </div>
                    `).join("")}
                </dl>
                <div class="mt-5 rounded-xl border border-edge bg-night/50 p-3.5">
                    <p class="text-[12px] text-dim">${t("Your invite link. You receive {percent} of every Rank 1 entry of the people who join with it.", { percent: percent(data?.referralBps ?? 0) })}</p>
                    <p data-ref-link class="figure mt-1.5 truncate text-[13px] text-mint-300">${escape(referralLink(data))}</p>
                </div>
            </div>
        </div>
    </section>
    `;
};

/**
 * A three-dot board: your newest ID on top, its two slots below.
 * Gold = you, green = slot taken, dashed = still open, dim = no ID in this rank yet.
 */
const miniTree = (count, filled) => {
    const has = count > 0;
    const slot = (x, isTaken) => isTaken
        ? `<circle cx="${x}" cy="40" r="7" fill="#3fcf7a"/>`
        : `<circle cx="${x}" cy="40" r="6.5" fill="none" stroke="${has ? "#4a4a46" : "#2a2a2a"}" stroke-dasharray="2.5 2.5"/>`;
    return /*html*/`
        <svg viewBox="0 0 64 50" class="h-auto w-full max-w-[4.5rem] shrink-0 lg:w-14" aria-hidden="true">
            <line x1="32" y1="14" x2="14" y2="38" stroke="${has && filled >= 1 ? "#2d8a50" : "#2a2a2a"}" stroke-width="1.5"/>
            <line x1="32" y1="14" x2="50" y2="38" stroke="${has && filled >= 2 ? "#2d8a50" : "#2a2a2a"}" stroke-width="1.5"/>
            ${has ? `<circle cx="32" cy="12" r="8.5" fill="#ebcd6c"/>` : `<circle cx="32" cy="12" r="8" fill="none" stroke="#2a2a2a" stroke-width="1.5"/>`}
            ${slot(14, has && filled >= 1)}
            ${slot(50, has && filled >= 2)}
        </svg>
    `;
};

const SLOT_TEXT = [ "Waiting for its first slot", "First slot filled", "Complete" ];

/** Your boards per rank as small dot trees, one card per tier */
const rankCards = (data) => {
    const counts = data?.myRankCounts ?? [];
    const groups = (data?.tiers ?? []).reduce((list, tier, i) => {
        const last = list.at(-1);
        const cell = { rank: i + 1, count: counts[i] ?? 0, index: data?.myLatestIndex?.[i] ?? 0, filled: data?.myLatestFilled?.[i] ?? 0 };
        if (last && last.tier === tier) last.cells.push(cell);
        else list.push({ tier, cells: [ cell ] });
        return list;
    }, []);
    return /*html*/`
        <section class="${WRAP} pt-6">
            ${blockHead(t("Your boards by rank"), `<span class="inline-flex items-center gap-3 text-[12px]"><span class="inline-flex items-center gap-1.5"><span class="size-2 rounded-full bg-gold-300"></span>${t("You")}</span><span class="inline-flex items-center gap-1.5"><span class="size-2 rounded-full bg-mint-400"></span>${t("Filled")}</span><span class="inline-flex items-center gap-1.5"><span class="size-2 rounded-full border border-dashed border-soft"></span>${t("Open")}</span></span>`)}
            <div class="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                ${groups.map((g, i) => {
                    const held = g.cells.reduce((sum, c) => sum + c.count, 0);
                    const isLastAlone = i === groups.length - 1 && groups.length % 2 === 1;
                    return /*html*/`
                        <div class="${held ? "surface-hi" : "surface"} rounded-2xl p-4 lg:p-3.5 ${isLastAlone ? "sm:col-span-2 lg:col-span-1" : ""}">
                            <div class="flex items-baseline justify-between">
                                <p class="font-wide text-[15px] font-medium text-text">${escape(g.tier)}</p>
                                <p class="text-[12px] text-dim">${plural(held, "ID")}</p>
                            </div>
                            <div class="mt-3 grid grid-cols-3 gap-1.5 lg:grid-cols-1">
                                ${g.cells.map((c) => /*html*/`
                                    <a href="#/board?rank=${c.rank}${c.count ? `&pos=${positionParam(c.rank, c.index)}` : ""}"
                                        title="${c.count ? t("Rank {rank}: {count}. Newest ID {id}: {status}", { rank: c.rank, count: plural(c.count, "ID"), id: positionLabel(c.rank, c.index), status: t(SLOT_TEXT[c.filled] ?? "") }) : t("Rank {rank}: no ID yet", { rank: c.rank })}"
                                        class="flex flex-col items-center gap-1 rounded-xl border px-1.5 pb-2 pt-2.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-400 lg:flex-row lg:gap-3 lg:px-2.5 lg:py-2
                                        ${c.count ? "border-edge-hi bg-night/40 hover:border-mint-500/60" : "border-edge bg-night/30 hover:border-edge-hi"}">
                                        ${miniTree(c.count, c.filled)}
                                        <span class="flex min-w-0 items-baseline gap-1 text-[11px] lg:flex-col lg:items-start lg:gap-0.5">
                                            <span class="whitespace-nowrap ${c.count ? "text-text" : "text-dim"}"><span class="lg:hidden">R${c.rank}</span><span class="hidden lg:inline text-[13px]">Rank ${c.rank}</span>${c.count > 1 ? ` <span class="figure text-gold-200">×${c.count}</span>` : ""}</span>
                                            <span class="hidden truncate text-[11px] text-dim lg:block">${c.count ? t([ "Waiting", "1 of 2 filled", "Complete" ][c.filled] ?? "") : t("No ID yet")}</span>
                                        </span>
                                    </a>
                                `).join("")}
                            </div>
                        </div>
                    `;
                }).join("")}
            </div>
        </section>
    `;
};

/* ------------------------------------ move up (buyRank) */

/** Ranks the member can buy into: the next rank after any rank where they hold an ID */
const buyableRanks = (data) => (data?.myRankCounts ?? []).map((count, i) => (count > 0 && i + 2 <= (data?.rankCount ?? 0) ? i + 2 : 0)).filter(Boolean);

const balanceRow = (data, i) => {
    const balance = data?.myBalances?.[i] ?? 0n;
    const price = data?.upgradeCosts?.[i] ?? 0n;
    const pct = price > 0n ? Math.min(100, Number((balance * 10_000n) / price) / 100) : 0;
    const isLast = i + 1 >= (data?.rankCount ?? 0);
    return /*html*/`
        <li class="py-3">
            <div class="flex items-baseline justify-between gap-3 text-[13px]">
                <span class="whitespace-nowrap text-text">Rank ${i + 1} <span class="text-dim">→ ${isLast ? t("rebirth IDs") : `Rank ${i + 2}`}</span></span>
                <span class="figure whitespace-nowrap text-soft"><span class="text-text">${formatAmount(data, balance)}</span> / ${formatAmount(data, price)}</span>
            </div>
            <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-edge" aria-hidden="true"><div class="h-full rounded-full bg-gradient-to-r from-mint-600 to-mint-300" style="width:${pct}%"></div></div>
        </li>
    `;
};

const upgradePanel = (data) => {
    const options = buyableRanks(data);
    const held = (data?.myRankCounts ?? []).map((count, i) => (count > 0 ? i : -1)).filter((i) => i >= 0);
    const pick = options.at(-1) ?? 0;
    // Starting values for 1 ID of the highest rank on offer; window.updateBuyPreview (ui/main.js) keeps them current
    const each = pick ? data?.upgradeCosts?.[pick - 2] ?? 0n : 0n;
    const pay = pick ? buyPrice(data, pick, 1) : 0n;
    return /*html*/`
        <section class="${WRAP} pt-10">
            ${blockHead(t("Move up a rank"), t("Your upgrade balance pays first. You top up only the difference."))}
            <div class="mt-5 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
                <div class="surface-hi rounded-2xl p-5 sm:p-6">
                    ${options.length ? /*html*/`
                        <label for="buy-rank" class="block text-[13px] font-medium text-text">${t("Buy into")}</label>
                        <select id="buy-rank" data-buy-rank onchange="updateBuyPreview()"
                            class="mt-2 w-full rounded-xl border border-edge-hi bg-night/70 px-3.5 py-3 text-[15px] text-text outline-none focus:border-mint-500 focus:ring-2 focus:ring-mint-500/25">
                            ${options.map((r) => `<option value="${r}" ${r === pick ? "selected" : ""}>Rank ${r} (${escape(data?.tiers?.[r - 1] ?? "")})</option>`).join("")}
                        </select>
                        <label for="buy-count" class="mt-4 block text-[13px] font-medium text-text">${t("How many IDs")}</label>
                        <div class="mt-2 flex items-stretch gap-2">
                            <button type="button" onclick="stepBuyCount(-1)" class="w-12 shrink-0 rounded-xl border border-edge-hi text-lg text-soft hover:border-mint-500 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-400" aria-label="${t("One less")}">−</button>
                            <input id="buy-count" data-buy-count type="number" inputmode="numeric" min="1" max="50" step="1" value="1" oninput="updateBuyPreview()"
                                class="figure w-full min-w-0 rounded-xl border border-edge-hi bg-night/70 px-3.5 py-3 text-center text-[15px] text-text outline-none focus:border-mint-500 focus:ring-2 focus:ring-mint-500/25" />
                            <button type="button" onclick="stepBuyCount(1)" class="w-12 shrink-0 rounded-xl border border-edge-hi text-lg text-soft hover:border-mint-500 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-400" aria-label="${t("One more")}">+</button>
                        </div>
                        <dl class="mt-5 divide-y divide-edge">
                            ${row(t("Price per ID"), `<span data-buy-each class="figure">${moneyText(data, each)}</span>`)}
                            ${row(t("From your balance"), `<span data-buy-balance class="figure text-mint-200">${moneyText(data, each - pay)}</span>`)}
                            ${row(t("You pay now"), `<span data-buy-pay class="figure font-semibold">${moneyText(data, pay)}</span>`)}
                        </dl>
                        <p class="mt-3 text-[12px] leading-relaxed text-dim" data-buy-note>${t("The price per ID includes the next rank, any rebirth IDs of that step, and the company remainder.")}</p>
                        <div class="mt-5">${button(t("Approve and move up"), "doBuyRank()")}</div>
                    ` : /*html*/`
                        <p class="text-sm text-soft">${t("Your first ID is still waiting to be placed. Once it is on a board you can move up from here.")}</p>
                    `}
                </div>
                <div class="surface flex flex-col rounded-2xl p-5 sm:p-6">
                    <p class="text-[13px] text-soft">${t("Upgrade balance by rank")}</p>
                    <ul class="mt-1 divide-y divide-edge">
                        ${held.length ? held.map((i) => balanceRow(data, i)).join("") : `<li class="py-3 text-[13px] text-dim">${t("No ID placed yet.")}</li>`}
                    </ul>
                    <ol class="mt-auto grid gap-2 pt-6 text-[12px] leading-relaxed sm:grid-cols-2">
                        ${[
                            [ "First slot", "The first slot that fills below an ID pays you." ],
                            [ "Balance", "The rest from your IDs in a rank adds up." ],
                            [ "Automatic", "At the upgrade price you move up on your own." ],
                            [ "Now", "Or buy now and pay only the difference." ],
                        ].map(([ title, text ], i) => /*html*/`
                            <li class="flex gap-2.5 rounded-xl border border-edge bg-night/50 p-3">
                                <span class="figure grid size-5 shrink-0 place-items-center rounded-full border border-gold-300/60 text-[10px] font-semibold text-gold-200">${i + 1}</span>
                                <span><span class="font-medium text-text">${t(title)}.</span> <span class="text-soft">${t(text)}</span></span>
                            </li>
                        `).join("")}
                    </ol>
                </div>
            </div>
        </section>
    `;
};

/* ------------------------------------ change wallet (transferWallet) */

const walletInput = (id, label, attr) => /*html*/`
    <label for="${id}" class="mt-4 block text-[13px] font-medium text-text first:mt-0">${t(label)}</label>
    <input id="${id}" ${attr} type="text" autocomplete="off" spellcheck="false" placeholder="0x…"
        class="figure mt-2 w-full rounded-xl border border-edge-hi bg-night/70 px-3.5 py-3 text-[13px] text-text outline-none placeholder:text-dim focus:border-mint-500 focus:ring-2 focus:ring-mint-500/25" />
`;

const walletPanel = (data) => /*html*/`
    <section class="${WRAP} pt-10">
        ${blockHead(t("Change wallet"), t("Move your whole account to another wallet you own."))}
        <div class="mt-5 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
            <div class="surface rounded-2xl p-5 sm:p-6">
                <p class="text-[13px] text-soft">${t("What moves")}</p>
                <ul class="mt-3 space-y-2 text-[13px] leading-relaxed text-soft">
                    ${[
                        t("Your account {account} and your invite link (it stays the same)", { account: escape(memberLabel(data?.myId)) }),
                        "Every ID on every board, and your upgrade balances",
                        "Your sponsor, your team and your earnings history",
                        "All payments from now on go to the new wallet",
                    ].map((text) => `<li class="flex gap-2.5"><span class="mt-[7px] size-1.5 shrink-0 rounded-full bg-mint-400"></span><span>${t(text)}</span></li>`).join("")}
                </ul>
                <p class="mt-5 rounded-xl border border-gold-300/40 bg-gold-300/[0.06] px-3.5 py-3 text-[12px] leading-relaxed text-gold-200">${t("Tokens already in this wallet stay here. Check the new address carefully: once moved, only the new wallet can use the account, and it cannot be undone from this wallet.")}</p>
            </div>
            <div class="surface rounded-2xl p-5 sm:p-6">
                ${walletInput("new-wallet", t("New wallet address"), "data-new-wallet")}
                ${walletInput("new-wallet-again", t("Type it again"), "data-new-wallet-again")}
                <p class="mt-3 text-[12px] leading-relaxed text-dim">${t("The new wallet must never have joined. No payment is needed, only the network fee.")}</p>
                <div class="mt-5">${button(t("Move my account"), "doTransferWallet()", { kind: "ghost" })}</div>
            </div>
        </div>
    </section>
`;

/* ------------------------------------ both */

const queueNotice = (data) => (data?.queued > 0 ? /*html*/`
    <div class="${WRAP} pt-4">
        <div class="flex flex-col gap-3 rounded-xl border border-gold-300/40 bg-gold-300/[0.07] px-4 py-3 text-sm text-gold-200 sm:flex-row sm:items-center sm:justify-between" role="status">
            <p>${t("{count} waiting to be placed. Each sign-up places some of them, or you can place them now for the network fee.", { count: plural(data.queued, "ID") })}</p>
            <div class="sm:w-44">${button(t("Place them now"), "doProcessQueue()", { kind: "ghost", size: "sm", isDisabled: !data?.isConnected })}</div>
        </div>
    </div>
` : "");

const home = (data) => /*html*/`
    ${data?.isMember ? memberHero(data) : visitorHero(data)}
    ${queueNotice(data)}
    ${data?.isMember ? rankCards(data) + upgradePanel(data) + walletPanel(data) + `<div class="pt-16">${statStrip(data)}</div>` : statStrip(data) + features(data) + closingCta()}
`;

const homeLoading = loadingBox;
const homeError = errorBox;

export { home, homeLoading, homeError };
