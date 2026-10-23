import { shortAddress } from "../../../engine/ui/helpers";
import { settings } from "../../../engine/settings";

/*
 * YOUR CODE (off-chain). Floating top bar: brand, page links, wallet button. On small screens the links move to a second row.
 */

const LINKS = [
    { page: "home", label: "Dashboard", href: "#/" },
    { page: "plan", label: "Plan", href: "#/plan" },
    { page: "board", label: "Board", href: "#/board" },
    { page: "team", label: "Team", href: "#/team" },
];

const currentPage = () => (typeof window === "undefined" ? "home" : window.location.hash.replace(/^#\/?/, "").split("?")[0] || "home");

const navLink = (link, isActive) => /*html*/`
    <a href="${link.href}" ${isActive ? `aria-current="page"` : ""}
        class="shrink-0 rounded-lg px-3 py-1.5 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-400
        ${isActive ? "bg-white/[0.07] font-medium text-text" : "text-soft hover:text-text"}">
        ${link.label}
    </a>
`;

const header = (data) => {
    const wallet = data?.wallet?.address;
    const isConnected = Boolean(wallet);
    const isDemo = Boolean(data?.wallet?.isDemo);
    const page = currentPage();
    const nav = LINKS.map((l) => navLink(l, l.page === page)).join("");

    return /*html*/`
    <header class="sticky top-0 z-30 px-3 pt-3 sm:px-4">
        <div class="mx-auto w-full max-w-6xl rounded-2xl border border-edge bg-night/75 shadow-[0_20px_50px_-30px_rgb(0_0_0/0.9)] backdrop-blur-md">
            <div class="flex items-center justify-between gap-3 px-3 py-2 sm:px-4">
                <a href="#/" class="flex min-w-0 items-center gap-2.5 rounded-lg py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-400">
                    <img src="/brand-mark.png" alt="" class="h-6 w-auto shrink-0 sm:h-7" />
                    <span class="truncate font-wide text-[14px] font-semibold tracking-[0.04em] text-text sm:text-[15px]">${settings.appName}</span>
                </a>

                <nav class="hidden items-center gap-1 md:flex" aria-label="Pages">${nav}</nav>

                <button type="button" onclick="openWallet()"
                    class="inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-400
                    ${isConnected ? "border border-edge-hi bg-white/[0.03] text-text hover:border-mint-500" : "border border-mint-500/60 bg-mint-400/10 text-mint-200 hover:bg-mint-400/20"}"
                    aria-label="${isConnected ? "Wallet menu" : "Connect wallet"}">
                    ${isConnected ? /*html*/`<span class="size-1.5 rounded-full bg-mint-400 shadow-[0_0_8px] shadow-mint-400" aria-hidden="true"></span><span class="figure text-[12px]">${shortAddress(wallet)}</span>${isDemo ? `<span class="hidden text-dim sm:inline">demo</span>` : ""}` : "Connect wallet"}
                </button>
            </div>
            <nav class="flex gap-1 overflow-x-auto border-t border-edge px-2 py-1.5 md:hidden" aria-label="Pages">${nav}</nav>
        </div>
    </header>
    `;
};

export { header };
