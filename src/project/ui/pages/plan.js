import { money, moneyText, formatAmount, percent, WRAP, sectionTitle, blockHead, byTier, escape, loadingBox, errorBox } from "../componants/parts";

/*
 * YOUR CODE (off-chain). The marketing plan. Every figure is read from the contract (getPlanView),
 * so this page can never disagree with what the contract pays.
 */

/** "Moves to Rank 4, plus 1 new ID in Rank 1" */
const whenComplete = (r) => {
    const parts = [];
    if (r.next) parts.push(`Moves to Rank ${r.next}`);
    for (const x of r.rebirths) parts.push(`${x.count} new ID${x.count > 1 ? "s" : ""} in Rank ${x.rank}`);
    return parts.length ? parts.join(", plus ") : "–";
};

const tierPay = (g) => g.ranks.reduce((sum, r) => sum + r.firstPayout, 0n);

/** Entry split drawn to scale */
const entrySplit = (data, first) => {
    const sponsor = first.cost - first.inflow;
    const pct = first.cost > 0n ? Number((sponsor * 10_000n) / first.cost) / 100 : 0;
    return /*html*/`
        <section class="surface rounded-3xl p-6 sm:p-8">
            <div class="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-center">
                <div>
                    <p class="text-[13px] text-soft">Rank 1 entry</p>
                    <p class="mt-1 font-wide text-5xl font-medium tracking-[-0.02em] text-text">${money(data, first.cost)}</p>
                    <p class="mt-3 text-sm leading-relaxed text-soft">Split the moment you join. Rebirth IDs that enter Rank 1 later are split the same way.</p>
                </div>
                <div>
                    <div class="flex h-3 overflow-hidden rounded-full bg-edge" role="img" aria-label="${percent(data.referralBps)} to the sponsor, the rest to the board above">
                        <div class="bg-gold-300" style="width:${pct}%"></div>
                        <div class="flex-1 bg-mint-400"></div>
                    </div>
                    <dl class="mt-5 grid gap-3 sm:grid-cols-2">
                        <div class="rounded-2xl border border-edge bg-night/50 p-4">
                            <dt class="flex items-center gap-2 text-[13px] text-soft"><span class="size-2 rounded-full bg-gold-300"></span>To the sponsor, ${percent(data.referralBps)}</dt>
                            <dd class="mt-1 text-2xl font-semibold text-text">${money(data, sponsor)}</dd>
                        </div>
                        <div class="rounded-2xl border border-edge bg-night/50 p-4">
                            <dt class="flex items-center gap-2 text-[13px] text-soft"><span class="size-2 rounded-full bg-mint-400"></span>To the board above</dt>
                            <dd class="mt-1 text-2xl font-semibold text-text">${money(data, first.inflow)}</dd>
                        </div>
                    </dl>
                </div>
            </div>
        </section>
    `;
};

/** One card per tier, the top tier highlighted (like a pricing table) */
const tierCards = (data, groups) => /*html*/`
    <section>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            ${groups.map((g, i) => {
                const isTop = i === groups.length - 1;
                return /*html*/`
                    <article class="${isTop ? "surface-hi" : "surface"} relative flex flex-col rounded-2xl p-5 ${isTop && groups.length % 2 === 1 ? "sm:col-span-2 lg:col-span-1" : ""}">
                        ${isTop ? `<span class="absolute -top-3 left-5 rounded-full bg-mint-400 px-2.5 py-0.5 text-[11px] font-semibold text-night">Highest pay</span>` : ""}
                        <p class="font-wide text-lg font-medium text-text">${escape(g.tier)}</p>
                        <p class="mt-1 text-[12px] text-dim">Ranks ${g.ranks[0].rank} to ${g.ranks.at(-1).rank}</p>
                        <p class="mt-5 truncate text-[12px] text-soft">Board pay (${escape(data.tokenSymbol)})</p>
                        <p class="figure mt-1 whitespace-nowrap font-wide text-[1.6rem] font-medium leading-tight tracking-[-0.01em] ${isTop ? "text-mint-200" : "text-text"}">${formatAmount(data, tierPay(g))}</p>
                        <ul class="mt-5 space-y-2 border-t border-edge pt-4 text-[13px]">
                            ${g.ranks.map((r) => /*html*/`
                                <li class="flex items-baseline justify-between gap-2">
                                    <span class="whitespace-nowrap text-soft">Rank ${r.rank}</span>
                                    <span class="figure whitespace-nowrap text-text">${r.firstPayout > 0n ? `+${formatAmount(data, r.firstPayout)}` : `<span class="text-dim">to upgrade</span>`}</span>
                                </li>
                            `).join("")}
                        </ul>
                        <p class="mt-auto pt-4 text-[12px] leading-relaxed text-dim">Ends with: ${escape(whenComplete(g.ranks.at(-1)).replace(/^M/, "m"))}</p>
                    </article>
                `;
            }).join("")}
        </div>
    </section>
`;

/** The full schedule */
const schedule = (data, groups, total) => /*html*/`
    <section>
        ${blockHead("Full schedule", `Board pay for one ID through every rank <span class="ml-1 whitespace-nowrap font-semibold text-mint-200">${moneyText(data, total)}</span>`)}

        <div class="surface mt-5 hidden overflow-hidden rounded-2xl lg:block">
            <table class="w-full text-sm">
                <thead class="text-left text-[12px] text-dim">
                    <tr class="border-b border-edge">
                        <th scope="col" class="px-5 py-3.5 font-medium">Rank</th>
                        <th scope="col" class="px-4 py-3.5 text-right font-medium">Price</th>
                        <th scope="col" class="px-4 py-3.5 text-right font-medium">First slot pays you</th>
                        <th scope="col" class="whitespace-nowrap px-4 py-3.5 text-right font-medium">Upgrade price</th>
                        <th scope="col" class="px-4 py-3.5 font-medium">The upgrade buys</th>
                        <th scope="col" class="whitespace-nowrap px-5 py-3.5 text-right font-medium">To the company</th>
                    </tr>
                </thead>
                ${groups.map((g) => /*html*/`
                    <tbody>
                        <tr class="bg-white/[0.025]">
                            <th scope="rowgroup" colspan="6" class="px-5 py-2.5 text-left font-wide text-[13px] font-medium text-mint-300">${escape(g.tier)}</th>
                        </tr>
                        ${g.ranks.map((r) => /*html*/`
                            <tr class="border-t border-edge/70">
                                <td class="whitespace-nowrap px-5 py-3"><a href="#/board?rank=${r.rank}" class="font-medium text-text hover:text-mint-200">Rank ${r.rank}</a></td>
                                <td class="whitespace-nowrap px-4 py-3 text-right text-text">${money(data, r.cost)}</td>
                                <td class="whitespace-nowrap px-4 py-3 text-right">${r.firstPayout > 0n ? `<span class="text-mint-200">${money(data, r.firstPayout)}</span> <span class="ml-1 text-[12px] text-dim">${percent(r.payoutBps)}</span>` : `<span class="text-dim">None</span>`}</td>
                                <td class="whitespace-nowrap px-4 py-3 text-right text-text">${money(data, r.upgradeCost)}</td>
                                <td class="px-4 py-3 text-soft">${escape(whenComplete(r))}</td>
                                <td class="whitespace-nowrap px-5 py-3 text-right text-soft">${r.fee > 0n ? money(data, r.fee) : `<span class="text-dim">None</span>`}</td>
                            </tr>
                        `).join("")}
                    </tbody>
                `).join("")}
            </table>
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-2 lg:hidden">
            ${groups.map((g, i) => /*html*/`
                <div class="surface overflow-hidden rounded-2xl ${i === groups.length - 1 && groups.length % 2 === 1 ? "sm:col-span-2" : ""}">
                    <p class="bg-white/[0.025] px-4 py-2.5 font-wide text-[13px] font-medium text-mint-300">${escape(g.tier)}</p>
                    ${g.ranks.map((r) => /*html*/`
                        <dl class="border-t border-edge/70 px-4 py-3 text-[13px]">
                            <div class="flex items-baseline justify-between gap-3">
                                <dt><a href="#/board?rank=${r.rank}" class="text-[15px] font-medium text-text">Rank ${r.rank}</a></dt>
                                <dd class="text-[15px] text-text">${money(data, r.cost)}</dd>
                            </div>
                            <div class="mt-1.5 flex justify-between gap-3"><dt class="text-dim">First slot pays you</dt><dd class="text-right ${r.firstPayout > 0n ? "text-mint-200" : "text-dim"}">${r.firstPayout > 0n ? `${money(data, r.firstPayout)} (${percent(r.payoutBps)})` : "None"}</dd></div>
                            <div class="mt-2 flex justify-between gap-3 border-t border-edge/70 pt-2"><dt class="text-dim">Upgrade price</dt><dd class="text-text">${money(data, r.upgradeCost)}</dd></div>
                            <div class="mt-1"><dt class="text-dim">The upgrade buys</dt><dd class="mt-0.5 text-soft">${escape(whenComplete(r))}</dd></div>
                            ${r.fee > 0n ? /*html*/`<div class="mt-1 flex justify-between gap-3"><dt class="text-dim">To the company</dt><dd class="text-soft">${money(data, r.fee)}</dd></div>` : ""}
                        </dl>
                    `).join("")}
                </div>
            `).join("")}
        </div>
    </section>
`;

/** IDs placed per rank as bars (live) */
const activity = (data, ranks) => {
    const max = Math.max(1, ...ranks.map((r) => r.positions));
    return /*html*/`
        <section class="surface rounded-3xl p-6 sm:p-8">
            ${blockHead("Activity by rank", "IDs placed so far, live from the contract")}
            <div class="mt-8 flex h-48 items-end gap-1.5 sm:gap-2.5" role="img" aria-label="IDs placed per rank">
                ${ranks.map((r) => /*html*/`
                    <div class="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                        <span class="figure text-[10px] text-soft sm:text-[11px]">${r.positions.toLocaleString("en-US")}</span>
                        <div class="w-full rounded-t-md bg-gradient-to-t from-mint-700 to-mint-400" style="height:${Math.max(3, (r.positions / max) * 100)}%"></div>
                    </div>
                `).join("")}
            </div>
            <div class="mt-2 flex gap-1.5 border-t border-edge pt-2 sm:gap-2.5">
                ${ranks.map((r) => `<span class="figure min-w-0 flex-1 text-center text-[10px] text-dim sm:text-[11px]">${r.rank}</span>`).join("")}
            </div>
        </section>
    `;
};

const plan = (data) => {
    const ranks = data?.ranks ?? [];
    if (!ranks.length) return errorBox("The contract returned no ranks.");
    const groups = byTier(ranks);
    const total = ranks.reduce((sum, r) => sum + r.firstPayout, 0n);
    return /*html*/`
    <div class="glow-top -mt-24 pt-24">
        <main class="${WRAP} flex flex-col gap-10 pb-6 pt-12 sm:gap-14 sm:pt-16">
            ${sectionTitle("The plan", `${ranks.length} ranks, ${groups.length} tiers, one rule`, "Every ID owns two slots. The first slot to fill pays you; the rest builds your upgrade balance for that rank, across all your IDs in it. Reach the upgrade price and you move up on your own, or top up the difference and move up now. Every figure below is read from the smart contract.")}
            ${entrySplit(data, ranks[0])}
            ${tierCards(data, groups)}
            ${schedule(data, groups, total)}
            ${activity(data, ranks)}
        </main>
    </div>
    `;
};

const planLoading = loadingBox;
const planError = errorBox;

export { plan, planLoading, planError };
