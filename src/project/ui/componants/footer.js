import { settings } from "../../../engine/settings";
import { t } from "../../lang";

/*
 * YOUR CODE (off-chain). The engine adds the footer to every page as text (header + page + footer).
 * It is an object whose toString() builds the HTML, so each repaint uses the current language.
 */

const footerHtml = () => /*html*/`
    <footer class="mt-20 border-t border-edge">
        <div class="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1fr_1.4fr] lg:px-8">
            <div>
                <div class="flex items-center gap-2.5">
                    <img src="/brand-mark.png" alt="" class="h-7 w-auto" />
                    <span class="font-wide text-[15px] font-semibold tracking-[0.04em] text-text">${settings.appName}</span>
                </div>
                <p class="mt-4 max-w-sm text-sm leading-relaxed text-soft">${t(settings.tagline)}</p>
                <a href="#/multi-transfer" class="mt-5 inline-flex text-[13px] text-dim underline-offset-4 hover:text-mint-200 hover:underline">${t("Multi transfer")}</a>
            </div>
            <div class="space-y-3 text-[13px] leading-relaxed text-dim">
                <p>${t("Payments are made by a public smart contract on BNB Smart Chain. Every sign-up and every payout is a transaction anyone can check on the block explorer. The operator cannot move the funds held for open boards.")}</p>
                <p>${t("Earnings depend on new IDs entering the boards. Figures on this site describe what the contract pays when slots fill; they are not a forecast.")}</p>
            </div>
        </div>
    </footer>
`;

const footer = { toString: footerHtml };

export { footer };
