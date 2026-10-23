import { money, WRAP, pageHead, blockHead, button, row, escape, loadingBox, errorBox } from "../componants/parts";

/*
 * YOUR CODE (off-chain). Multi transfer: the company wallet (or anyone) splits an amount equally between a list of wallets.
 * The money goes straight from the sender's wallet to each wallet; it never sits in the contract.
 * The summary updates while typing (window.updateDividendPreview in ui/main.js); nothing is sent until the button.
 */

const dividend = (data) => /*html*/`
    <div class="glow-top -mt-24 pt-24">
    <main class="${WRAP} flex flex-col gap-8 pt-10 sm:pt-14">
        ${pageHead("Tools", "Multi transfer", "Split an amount equally between a list of wallets. It is paid straight from your wallet to each of them in one transaction; nothing stays in the contract.")}

        <div class="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <section class="surface rounded-3xl p-5 sm:p-7">
                ${blockHead("Wallets and amount")}
                <label for="dividend-wallets" class="mt-5 block text-[13px] font-medium text-text">Wallets, one per line</label>
                <textarea id="dividend-wallets" data-dividend-wallets rows="8" wrap="off" spellcheck="false" oninput="updateDividendPreview()" placeholder="0x…&#10;0x…"
                    class="figure mt-2 w-full resize-y rounded-xl border border-edge-hi bg-night/70 px-3.5 py-3 text-[11.5px] leading-relaxed text-text outline-none placeholder:text-dim focus:border-mint-500 focus:ring-2 focus:ring-mint-500/25 sm:text-[13px]"></textarea>

                <label for="dividend-amount" class="mt-5 block text-[13px] font-medium text-text">Total to send, in ${escape(data?.tokenSymbol)}</label>
                <input id="dividend-amount" data-dividend-amount type="text" inputmode="decimal" autocomplete="off" oninput="updateDividendPreview()" placeholder="1000"
                    class="figure mt-2 w-full rounded-xl border border-edge-hi bg-night/70 px-3.5 py-3 text-[15px] text-text outline-none placeholder:text-dim focus:border-mint-500 focus:ring-2 focus:ring-mint-500/25" />

                <div class="mt-6">${data?.isConnected ? button("Approve and send", "doDividend()") : button("Connect wallet", "openWallet()")}</div>
                <p class="mt-3 text-[12px] leading-relaxed text-dim">Your wallet asks twice the first time: once to allow exactly this amount, then to confirm. Units that do not divide evenly stay in your wallet.</p>
            </section>

            <section class="surface rounded-3xl p-5 sm:p-7">
                ${blockHead("Summary")}
                <dl class="mt-3 divide-y divide-edge">
                    ${row("Wallets", `<span data-dividend-count class="figure">0</span>`)}
                    ${row("Each wallet receives", `<span data-dividend-share class="figure text-mint-200">–</span>`)}
                    ${row("Total sent", `<span data-dividend-total class="figure">–</span>`)}
                    ${row("Stays in your wallet", `<span data-dividend-rest class="figure text-soft">–</span>`)}
                    ${row("In your wallet", data?.isConnected ? money(data, data?.walletBalance) : "Not connected")}
                </dl>
                <p data-dividend-problem class="mt-4 hidden rounded-xl border border-loss/40 bg-loss/[0.06] px-3.5 py-2.5 text-[13px] text-loss" role="alert"></p>
            </section>
        </div>
    </main>
    </div>
`;

const dividendLoading = loadingBox;
const dividendError = errorBox;

export { dividend, dividendLoading, dividendError };
