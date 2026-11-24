/*
 * YOUR CODE (on-chain, no wallet needed). Money history of one member, per rank, rebuilt from what the contract stores.
 *
 * The contract keeps every ID (rank, index, owner, time, origin) and the two IDs below it, plus each member's upgrade
 * balance per rank. It does not keep a list of payments, and the free RPC cannot read old event logs, so the history
 * is worked out from those facts and the rank's rules:
 *   - an ID taking the left (first) slot of a board pays its owner `firstPayout` in cash, the rest to the owner's balance
 *   - an ID taking the right (second) slot pays `inflow` to the owner's balance
 *   - every new ID in the next rank with origin = this rank used `upgradeCost` of this rank's balance
 *     (automatically when the balance reached the price, or bought with buyRank: balance first, the wallet pays the rest)
 * Auto-upgrades and purchases leave the same IDs behind, so the timeline is replayed in time order to tell them apart.
 * The replay always ends on the balance the contract holds when it is right; when it does not, the rank is marked
 * `exact: false` and only the totals (which are always exact) should be trusted.
 * No transaction hashes: those are only in the event logs.
 */

/**
 * @param {object} input
 *   rules    { [rank]: { cost, inflow, firstPayout, upgradeCost, next, rebirths: [{ rank, count }] } }  amounts BigInt
 *   ids      { [rank]: [{ index, from, createdAt, filled, slots: [ node|null, node|null ] }] }  node = { index, member, account, createdAt }
 *   balances { [rank]: BigInt }  the member's upgrade balance in each rank now
 * @returns {{ ranks: object[], events: object[], totals: object }}
 */
export function buildHistory({ rules, ids, balances }) {
    const rankList = Object.keys(rules).map(Number).sort((a, b) => a - b);
    const ranks = [];
    const events = [];

    // IDs this member got, by rank and by origin, sorted by index (the order the contract placed them)
    const own = (rank) => (ids[rank] ?? []).slice().sort((a, b) => a.index - b.index);

    for (const rank of rankList) {
        const rule = rules[rank];
        const mine = own(rank);
        const price = rule.upgradeCost;

        // Where one upgrade of this rank lands: the next rank (one ID), or for the last rank its first rebirth rank
        const target = rule.next ? { rank: rule.next, per: 1 } : (rule.rebirths?.[0] ? { rank: rule.rebirths[0].rank, per: rule.rebirths[0].count } : null);

        /* money that came into this rank: one entry per ID below one of this member's IDs */
        const ins = [];
        for (const id of mine) {
            id.slots.forEach((node, k) => {
                if (!node) return;
                const left = k === 0;
                const cash = left ? rule.firstPayout : 0n;
                ins.push({
                    kind: "in", t: node.createdAt, rank, board: id.index, slot: left ? "left" : "right",
                    payer: node, cash, balance: rule.inflow - cash,
                });
            });
        }
        ins.sort((a, b) => a.t - b.t || a.payer.index - b.payer.index);

        /* upgrades out of this rank, grouped by time; newIds = every ID made by this rank's upgrades at that time */
        const madeFrom = rankList.flatMap((r) => own(r).filter((p) => p.from === rank && !(p.index === 0 && p.from === 0)).map((p) => ({ rank: r, index: p.index, t: p.createdAt })));
        const units = new Map();
        if (target) {
            for (const p of own(target.rank)) if (p.from === rank) units.set(p.createdAt, (units.get(p.createdAt) ?? 0) + 1 / target.per);
        }

        /* replay: at each moment a purchase (if any) comes first, then the IDs placed below, each of which may auto-upgrade */
        const times = [ ...new Set([ ...ins.map((e) => e.t), ...units.keys() ]) ].sort((a, b) => a - b);
        let balance = 0n;
        let pending = 0;          // auto-upgrades whose new IDs the queue placed later
        let exact = true;
        let toppedUp = 0n;
        let used = 0n;
        const rankEvents = [];

        for (const t of times) {
            const here = ins.filter((e) => e.t === t);
            let upgrades = Math.round(units.get(t) ?? 0);
            const late = Math.min(pending, upgrades);
            pending -= late;
            upgrades -= late;

            let chosen = null;
            for (let bought = 0; bought <= upgrades && !chosen; bought++) {
                let bal = balance;
                let paid = 0n;
                let fromBalance = 0n;
                if (bought > 0) {
                    const need = price * BigInt(bought);
                    if (need < bal) continue;
                    fromBalance = bal;
                    paid = need - bal;
                    bal = 0n;
                }
                let autos = 0;
                const after = [];
                for (const e of here) {
                    bal += e.balance;
                    let auto = 0;
                    if (price > 0n && bal >= price) { bal -= price; autos += 1; auto = 1; }
                    after.push({ e, bal, auto });
                }
                if (autos === upgrades - bought) chosen = { bought, paid, fromBalance, bal, after, autos };
            }
            if (!chosen) {
                // Not explained by one purchase + auto-upgrades: keep the replay going and flag the rank
                exact = false;
                let bal = balance;
                const after = [];
                let autos = 0;
                for (const e of here) {
                    bal += e.balance;
                    let auto = 0;
                    if (price > 0n && bal >= price) { bal -= price; autos += 1; auto = 1; }
                    after.push({ e, bal, auto });
                }
                if (autos > upgrades) pending += autos - upgrades;
                chosen = { bought: Math.max(0, upgrades - autos), paid: 0n, fromBalance: 0n, bal, after, autos };
            }

            const born = madeFrom.filter((p) => p.t === t);
            const nextBorn = target ? born.filter((p) => p.rank === target.rank) : [];
            let given = 0;
            const take = (count) => {
                // the next-rank IDs of these upgrades, and every rebirth ID made at the same moment goes with the first group
                const list = nextBorn.slice(given * (target?.per ?? 1), (given + count) * (target?.per ?? 1));
                const extra = given === 0 ? born.filter((p) => !target || p.rank !== target.rank) : [];
                given += count;
                return [ ...list, ...extra ].map(({ rank: r, index }) => ({ rank: r, index }));
            };

            if (chosen.bought > 0) {
                toppedUp += chosen.paid;
                used += price * BigInt(chosen.bought);
                rankEvents.push({ kind: "buy", t, rank, count: chosen.bought, fromBalance: chosen.fromBalance, fromWallet: chosen.paid, price, balanceAfter: 0n, newIds: take(chosen.bought) });
            }
            for (const { e, bal, auto } of chosen.after) {
                rankEvents.push({ ...e, balanceAfter: auto ? bal + price : bal });
                if (auto) {
                    used += price;
                    rankEvents.push({ kind: "auto", t, rank, count: 1, used: price, balanceAfter: bal, newIds: take(1) });
                }
            }
            balance = chosen.bal;
        }

        const now = balances[rank] ?? 0n;
        if (balance !== now || pending > 0) exact = false;

        // Totals that are always right, whatever the replay found
        const cashIn = ins.reduce((s, e) => s + e.cash, 0n);
        const balanceIn = ins.reduce((s, e) => s + e.balance, 0n);
        const upgradesOut = target ? Math.round([ ...units.values() ].reduce((s, n) => s + n, 0)) : 0;
        const usedTotal = price * BigInt(upgradesOut);
        const toppedUpTotal = now + usedTotal - balanceIn;

        /* this member's IDs that entered this rank (sign-up, start ID, upgrade, rebirth) */
        for (const p of mine) rankEvents.push({ kind: "new", t: p.createdAt, rank, index: p.index, from: p.from, isStart: p.index === 0 && p.from === 0 });

        if (mine.length || ins.length || upgradesOut) {
            ranks.push({
                rank, ids: mine.length, cashIn, balanceIn,
                toppedUp: toppedUpTotal, used: usedTotal, upgrades: upgradesOut,
                balance: now, upgradeCost: price, exact: exact && toppedUp === toppedUpTotal && used === usedTotal,
                events: rankEvents,
            });
            events.push(...rankEvents);
        }
    }

    // Newest first; inside one moment keep the replay order (purchase, IDs below, auto-upgrade, new IDs)
    const order = { buy: 0, in: 1, auto: 2, new: 3 };
    const sorted = (list) => list.map((e, i) => ({ e, i })).sort((a, b) => b.e.t - a.e.t || order[a.e.kind] - order[b.e.kind] || a.i - b.i).map(({ e }) => e);
    for (const r of ranks) r.events = sorted(r.events);

    const totals = ranks.reduce((s, r) => ({
        cashIn: s.cashIn + r.cashIn, balanceIn: s.balanceIn + r.balanceIn, toppedUp: s.toppedUp + r.toppedUp,
        held: s.held + r.balance, ids: s.ids + r.ids,
    }), { cashIn: 0n, balanceIn: 0n, toppedUp: 0n, held: 0n, ids: 0 });

    return { ranks, events: sorted(events), totals };
}
