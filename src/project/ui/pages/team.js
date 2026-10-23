import { address, dateOf, plural, WRAP, pageHead, blockHead, button, pager, escape, loadingBox, errorBox } from "../componants/parts";
import { memberLabel } from "../componants/ids";

/*
 * YOUR CODE (off-chain). Team: who sponsored you, and the people you sponsored (one page at a time).
 * `data` comes from getTeamData() in src/project/chain.
 */

const notMember = (data) => /*html*/`
    <section class="surface max-w-xl rounded-3xl p-6 sm:p-8">
        <p class="font-wide text-lg font-medium text-text">${data?.isConnected ? "This wallet has not joined yet." : "Connect your wallet to see your team."}</p>
        <p class="mt-2 text-sm leading-relaxed text-soft">${data?.isConnected ? "Join on the dashboard with your sponsor's ID. Your team appears here once people join with your link." : "Your sponsor and the people you invited are listed here."}</p>
        <div class="mt-6 max-w-xs">${data?.isConnected
            ? `<a href="#/" class="inline-flex w-full items-center justify-center rounded-lg bg-mint-400 px-5 py-3 text-sm font-semibold text-night hover:bg-mint-300">Go to the dashboard</a>`
            : button("Connect wallet", "openWallet()")}</div>
    </section>
`;

const directs = (data) => {
    if (!data.directsTotal) return /*html*/`<p class="pt-4 text-sm text-soft">Nobody has joined with your link yet. Copy it from the dashboard and send it to the people you invite.</p>`;
    return /*html*/`
        <div class="mt-4 hidden overflow-hidden rounded-2xl border border-edge sm:block">
            <table class="w-full text-sm">
                <thead class="bg-white/[0.025] text-left text-[12px] text-dim">
                    <tr>
                        <th scope="col" class="px-5 py-3 font-medium">Member</th>
                        <th scope="col" class="px-4 py-3 font-medium">Wallet</th>
                        <th scope="col" class="px-4 py-3 font-medium">Joined</th>
                        <th scope="col" class="px-4 py-3 text-right font-medium">Their invites</th>
                        <th scope="col" class="px-5 py-3 text-right font-medium">IDs held</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.directs.map((d) => /*html*/`
                        <tr class="border-t border-edge">
                            <td class="figure px-5 py-3.5 font-semibold text-text">${memberLabel(d.id)}</td>
                            <td class="figure px-4 py-3.5 text-soft">${escape(address(d.account))}</td>
                            <td class="px-4 py-3.5 text-soft">${dateOf(d.joinedAt)}</td>
                            <td class="figure px-4 py-3.5 text-right text-text">${d.directs}</td>
                            <td class="figure px-5 py-3.5 text-right text-mint-200">${d.positions}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>

        <ul class="mt-4 divide-y divide-edge overflow-hidden rounded-2xl border border-edge sm:hidden">
            ${data.directs.map((d) => /*html*/`
                <li class="flex items-center justify-between gap-3 px-4 py-3">
                    <div class="min-w-0">
                        <p class="figure font-semibold text-text">${memberLabel(d.id)}</p>
                        <p class="truncate text-[12px] text-dim"><span class="figure">${escape(address(d.account))}</span>, joined ${dateOf(d.joinedAt)}</p>
                    </div>
                    <div class="shrink-0 text-right text-[12px] text-soft">
                        <p>${plural(d.directs, "invite")}</p>
                        <p class="text-mint-200">${plural(d.positions, "ID")}</p>
                    </div>
                </li>
            `).join("")}
        </ul>
        ${pager({ page: data.page, pageSize: data.pageSize, total: data.directsTotal, go: "teamPage" })}
    `;
};

const team = (data) => /*html*/`
    <div class="glow-top -mt-24 pt-24">
    <main class="${WRAP} flex flex-col gap-8 pt-10 sm:pt-14">
        ${pageHead("Team", "Your team", "Your sponsor share is paid on every Rank 1 entry of the people you invited, including the new IDs their boards create later.")}
        ${!data?.myId ? notMember(data) : /*html*/`
            <dl class="grid gap-3 sm:grid-cols-3">
                <div class="surface rounded-2xl px-5 py-5">
                    <dt class="text-[12px] text-dim">Your account</dt>
                    <dd class="figure mt-1 font-wide text-3xl font-medium text-text">${memberLabel(data.myId)}</dd>
                </div>
                <div class="surface rounded-2xl px-5 py-5">
                    <dt class="text-[12px] text-dim">Your sponsor</dt>
                    <dd class="figure mt-1 font-wide text-3xl font-medium text-text">${data.sponsorId ? memberLabel(data.sponsorId) : "None"}</dd>
                    <dd class="figure mt-1 truncate text-[12px] text-dim">${data.sponsorId ? escape(address(data.sponsorAccount)) : "Top of the system"}</dd>
                </div>
                <div class="surface-hi rounded-2xl px-5 py-5">
                    <dt class="text-[12px] text-soft">People you invited</dt>
                    <dd class="figure mt-1 font-wide text-3xl font-medium text-mint-200">${data.directsTotal.toLocaleString("en-US")}</dd>
                </div>
            </dl>
            <section class="surface rounded-3xl p-5 sm:p-6">
                ${blockHead("Direct invites", data.directsTotal ? plural(data.directsTotal, "member") : "")}
                ${directs(data)}
            </section>
        `}
    </main>
    </div>
`;

const teamLoading = loadingBox;
const teamError = errorBox;

export { team, teamLoading, teamError };
