import { moneyText, address, plural, WRAP, pageHead, blockHead, button, pager, escape, loadingBox, errorBox } from "../componants/parts";
import { memberLabel, positionLabel, positionParam, isMasked } from "../componants/ids";

/*
 * YOUR CODE (off-chain). The board of one rank: four levels below the chosen ID, drawn as a tree.
 * The tree is exactly what the contract stores (left and right slot of every ID).
 * `data` comes from getBoardData() in src/project/chain.
 */

// Vertical position of each level inside the tree area, in percent
const ROW_Y = [ 11, 37, 63, 88 ];

/** Where node k (level order) sits: level, x and y in percent */
const placeOf = (k) => {
    const level = Math.floor(Math.log2(k + 1));
    const first = 2 ** level - 1;
    return { level, x: ((2 * (k - first) + 1) / 2 ** (level + 1)) * 100, y: ROW_Y[level] };
};

const STATUS = [ "Waiting", "First slot filled", "Complete" ];

/** Where an ID came from: sign-up, moved up from the rank below, or re-born from a higher rank */
const originOf = (rank, from) => {
    if (!from) return { short: "Joined", long: "Joined with an invite link" };
    if (from === rank - 1) return { short: `From R${from}`, long: `Moved up from Rank ${from}` };
    return { short: `Re-run R${from}`, long: `Re-born from Rank ${from}` };
};

// Ring colours: the ring fills halfway when the first slot is taken, all the way when the board is complete
const RING = [
    "background:#333333",
    "background:conic-gradient(#3fcf7a 0 50%, #333333 50% 100%)",
    "background:#3fcf7a",
];

// One size per level, the same for every node on that level, so the tree stays symmetric
const SIZE = [
    "size-14 sm:size-[72px]",
    "size-[46px] sm:size-[60px]",
    "size-[38px] sm:size-[52px]",
    "size-[28px] sm:size-11",
];

// Text per level: numbers (dev view) or the full 7-character code (production), smaller so it fits the circle
const TEXT = {
    numbers: [ "text-[12px] sm:text-[14px]", "text-[11px] sm:text-[13px]", "text-[10px] sm:text-[12px]", "text-[0px] sm:text-[11px]" ],
    codes: [ "text-[9.5px] sm:text-[12px]", "text-[7.5px] sm:text-[10px]", "text-[0px] sm:text-[8.5px]", "text-[0px] sm:text-[7px]" ],
};

const at = (k) => `left:${placeOf(k).x}%;top:${placeOf(k).y}%`;

/** Legend / status ring drawn small */
const ringIcon = (filled) => /*html*/`<span class="inline-block size-3.5 rounded-full p-[2px]" style="${RING[filled]}"><span class="block size-full rounded-full bg-card"></span></span>`;

/** One ID: a ring (slots taken) around its number. Details are in the tooltip and in the panel under the tree. */
const node = (data, n) => {
    const { level } = placeOf(n.k);
    const isMine = data.viewerId > 0 && n.member === data.viewerId;
    const origin = originOf(data.rank, n.from);
    const tip = `ID ${positionLabel(data.rank, n.index)}, member ${memberLabel(n.member)}${isMine ? " (you)" : ""}, ${STATUS[n.filled] ?? ""}, ${origin.long}`;
    return /*html*/`
        <button type="button" onclick="openBoard(${data.rank}, ${n.index})" style="${at(n.k)}" title="${tip}" aria-label="${tip}"
            class="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-400 focus-visible:ring-offset-4 focus-visible:ring-offset-night">
            <span class="${SIZE[level]} ${TEXT[isMasked() ? "codes" : "numbers"][level]} rounded-full p-[3px] transition group-hover:scale-105 ${n.filled === 2 ? "shadow-[0_0_24px_-4px_rgb(63_207_122/0.5)]" : ""}" style="${RING[n.filled] ?? RING[0]}">
                <span class="figure flex size-full items-center justify-center rounded-full font-semibold ${isMine ? "bg-[#2a2412] text-gold-200" : "bg-card text-text"} ${isMasked() ? "tracking-[-0.02em]" : ""}">${positionLabel(data.rank, n.index, { short: !isMasked() })}</span>
            </span>
            ${isMine ? `<span class="absolute top-full mt-1.5 rounded-full bg-gold-300 px-1.5 text-[10px] font-semibold leading-4 text-night">You</span>` : ""}
        </button>
    `;
};

/** A slot nobody has taken yet */
const openSlot = (n) => {
    const { level } = placeOf(n.k);
    return /*html*/`
        <span style="${at(n.k)}" class="absolute -translate-x-1/2 -translate-y-1/2" aria-label="Open slot">
            <span class="${SIZE[level]} flex items-center justify-center rounded-full border border-dashed border-edge-hi text-dim" aria-hidden="true"><span class="text-[13px] leading-none">+</span></span>
        </span>
    `;
};

const tree = (data) => {
    const nodes = data.nodes.map((n, k) => ({ ...n, k }));
    const lines = nodes.slice(1).map((n) => {
        const child = placeOf(n.k);
        const parent = placeOf(Math.floor((n.k - 1) / 2));
        return /*html*/`<line x1="${parent.x}" y1="${parent.y}" x2="${child.x}" y2="${child.y}" stroke="${n.exists ? "#2d8a50" : "#2a2a2a"}" stroke-width="1.25" ${n.exists ? "" : `stroke-dasharray="3 4"`}/>`;
    }).join("");
    return /*html*/`
        <div class="relative h-[20rem] w-full sm:h-[26rem]">
            <svg class="tree-lines absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines}</svg>
            ${nodes.map((n) => (n.exists ? node(data, n) : openSlot(n))).join("")}
        </div>
    `;
};

/** The ID at the top of the view, in a few words */
const focusLine = (data) => {
    const top = data.nodes[0];
    if (!top?.exists) return "";
    const isMine = data.viewerId > 0 && top.member === data.viewerId;
    const origin = originOf(data.rank, top.from);
    return /*html*/`
        <dl class="grid grid-cols-2 gap-px border-t border-edge bg-edge text-[13px] sm:grid-cols-4">
            ${[
                [ "Top of this view", `ID ${positionLabel(data.rank, top.index)}` ],
                [ "Owner", isMine ? `You, member ${memberLabel(top.member)}` : `Member ${memberLabel(top.member)}` ],
                [ "Wallet", address(top.account) ],
                [ "Status", `${STATUS[top.filled] ?? ""}, ${origin.short.toLowerCase()}` ],
            ].map(([ label, value ]) => /*html*/`
                <div class="min-w-0 bg-raised px-4 py-3 sm:px-5">
                    <dt class="text-[12px] text-dim">${label}</dt>
                    <dd class="figure mt-0.5 truncate ${isMine && label === "Owner" ? "text-gold-200" : "text-text"}">${value}</dd>
                </div>
            `).join("")}
        </dl>
    `;
};

/** Rank tabs grouped under their tier names */
const rankTabs = (data) => {
    const groups = data.tiers.reduce((list, tier, i) => {
        const last = list.at(-1);
        if (last && last.tier === tier) last.ranks.push(i + 1);
        else list.push({ tier, ranks: [ i + 1 ] });
        return list;
    }, []);
    return /*html*/`
        <div class="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div class="flex min-w-max gap-4" role="tablist" aria-label="Ranks">
                ${groups.map((g) => /*html*/`
                    <div>
                        <p class="mb-1.5 pl-1 text-[12px] text-dim">${escape(g.tier)}</p>
                        <div class="flex gap-1 rounded-xl border border-edge bg-raised p-1">
                            ${g.ranks.map((rank) => {
                                const isActive = rank === data.rank;
                                const mine = data.myRankCounts[rank - 1] ?? 0;
                                return /*html*/`
                                    <a href="#/board?rank=${rank}" role="tab" aria-selected="${isActive}" title="${mine ? `You hold ${plural(mine, "ID")} here` : ""}"
                                        class="figure relative min-w-10 rounded-lg px-3 py-1.5 text-center text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-400
                                        ${isActive ? "bg-mint-400 text-night" : "text-soft hover:bg-white/[0.05] hover:text-text"}">
                                        ${rank}${mine ? /*html*/`<span class="absolute right-1 top-1 size-1.5 rounded-full ${isActive ? "bg-night" : "bg-gold-300"}" aria-hidden="true"></span>` : ""}
                                    </a>
                                `;
                            }).join("")}
                        </div>
                    </div>
                `).join("")}
            </div>
        </div>
    `;
};

const myIds = (data) => {
    if (!data.isConnected) return /*html*/`<p class="pt-4 text-sm text-soft">Connect your wallet to see your own IDs in this rank.</p>`;
    if (!data.myTotal) return /*html*/`<p class="pt-4 text-sm text-soft">You have no ID in Rank ${data.rank} yet.</p>`;
    return /*html*/`
        <div class="flex flex-wrap gap-2 pt-4">
            ${data.myIndices.map((index, i) => {
                const origin = originOf(data.rank, data.myFrom[i]);
                const isFocus = index === data.focus;
                return /*html*/`
                    <a href="#/board?rank=${data.rank}&pos=${positionParam(data.rank, index)}&page=${data.page}" title="${origin.long}"
                        class="inline-flex items-baseline gap-2 rounded-lg border px-3 py-1.5 text-[13px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-400
                        ${isFocus ? "border-gold-300/70 bg-gold-300/10" : "border-edge-hi bg-white/[0.02] hover:border-mint-500/60"}">
                        <span class="figure font-semibold text-text">${positionLabel(data.rank, index)}</span><span class="text-[12px] text-dim">${origin.short}</span>
                    </a>
                `;
            }).join("")}
        </div>
        ${pager({ page: data.page, pageSize: data.pageSize, total: data.myTotal, go: "myIdsPage" })}
    `;
};

const facts = (data) => [
    [ "Price", moneyText(data, data.cost) ],
    [ "First slot pays", data.firstPayout > 0n ? moneyText(data, data.firstPayout) : "None" ],
    [ "Upgrade", data.next ? `Moves to Rank ${data.next}` : "Last rank" ],
    [ "IDs in this rank", data.positionCount.toLocaleString("en-US") ],
];

const board = (data) => /*html*/`
    <div class="glow-top -mt-24 pt-24">
    <main class="${WRAP} flex flex-col gap-8 pt-10 sm:pt-14">
        ${pageHead(escape(data.tier), `Rank ${data.rank} board`, data.rank === 1
            ? "Rank 1 follows the invite link: new members go under their sponsor, left slot first, then down the sponsor's team. Select any ID to view the board below it."
            : "This rank runs on its own for the whole system: new IDs enter in the order they arrive and take the oldest open slot. Select any ID to view the board below it.")}

        ${rankTabs(data)}

        <section class="surface overflow-hidden rounded-3xl">
            <dl class="grid grid-cols-2 gap-px bg-edge md:grid-cols-4">
                ${facts(data).map(([ label, value ], i) => /*html*/`
                    <div class="min-w-0 bg-raised px-4 py-4 sm:px-5">
                        <dt class="text-[12px] text-dim">${label}</dt>
                        <dd class="figure mt-1 truncate font-semibold ${i === 1 && data.firstPayout > 0n ? "text-mint-200" : "text-text"}">${value}</dd>
                    </div>
                `).join("")}
            </dl>

            <div class="flex flex-wrap items-center gap-2 border-t border-edge px-4 pt-4 sm:px-5">
                ${button("Top of rank", `openBoard(${data.rank}, 0)`, { kind: "ghost", full: false, size: "sm", isDisabled: data.focus === 0 })}
                ${button("Up one level", `openBoard(${data.rank}, ${data.parent ?? 0})`, { kind: "ghost", full: false, size: "sm", isDisabled: data.parent === null })}
                ${data.myTotal ? button("My first ID", `openBoard(${data.rank}, ${data.myIndices[0] ?? 0})`, { kind: "ghost", full: false, size: "sm" }) : ""}
                <form class="ml-auto flex items-center gap-2" onsubmit="event.preventDefault(); openBoard(${data.rank}, this.pos.value)">
                    <label for="board-pos" class="text-[13px] text-soft">Go to ID</label>
                    <input id="board-pos" name="pos" type="text" autocomplete="off" spellcheck="false" ${isMasked() ? `maxlength="9"` : `inputmode="numeric"`} placeholder="${positionLabel(data.rank, data.focus).replace(/^#/, "")}"
                        class="figure ${isMasked() ? "w-32 uppercase" : "w-24"} rounded-lg border border-edge-hi bg-night/70 px-3 py-2 text-sm text-text outline-none placeholder:text-dim focus:border-mint-500 focus:ring-2 focus:ring-mint-500/25" />
                </form>
            </div>

            <div class="px-2 pb-2 pt-2 sm:px-4">${tree(data)}</div>

            ${focusLine(data)}

            <div class="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-edge px-4 py-3.5 text-[12px] text-soft sm:px-5">
                <span class="flex items-center gap-2">${ringIcon(0)} Waiting</span>
                <span class="flex items-center gap-2">${ringIcon(1)} First slot filled, paid</span>
                <span class="flex items-center gap-2">${ringIcon(2)} Both slots filled</span>
                <span class="flex items-center gap-2"><span class="rounded-full bg-gold-300 px-1.5 text-[10px] font-semibold leading-4 text-night">You</span> Your ID</span>
            </div>
        </section>

        <section class="surface rounded-3xl p-5 sm:p-6">
            ${blockHead(`Your IDs in Rank ${data.rank}`, data.myTotal ? plural(data.myTotal, "ID") : "")}
            ${myIds(data)}
        </section>
    </main>
    </div>
`;

const boardLoading = loadingBox;
const boardError = errorBox;

export { board, boardLoading, boardError };
