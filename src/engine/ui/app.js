/*
 * ENGINE (same in every project, do not edit).
 *
 * Runs the page: picks the page from the URL (#/name), reads its data, draws it, redraws when the wallet
 * changes, and runs transactions with toasts. Loads the dev test panel only on the local test chain.
 * src/project/ui/main.js tells it which pages exist; that file is where your project code goes.
 * If a setting is missing, it shows the list of what to fix instead of the page.
 */

import { box, modal, IS_LOCAL } from "../chain/connect";
import { problems } from "../settings";
import { invalidateReads } from "../chain/cache";
import { startPage } from "../chain/rpcMeter";

// Dev tools live in /dev and load only when that folder exists and VITE_CHAIN=local.
// Production builds never include them, and /dev can be left out of a production copy entirely.
const loadDev = Object.values(IS_LOCAL ? import.meta.glob("/dev/engine/web/devMode.js") : {})[0];

/**
 * Starts the app.
 *
 * @param {object} options
 * @param {Record<string, { load: Function, view: Function, loading: string, error: Function }>} options.pages
 *        first one is the default page; #/name opens the others
 * @param {Function} options.header  (data) => html
 * @param {string} options.footer    html
 * @param {object} options.notify    toast functions (src/project/ui/componants/toast.js)
 * @returns {{ refresh: Function, runTx: Function }}
 */
export function startApp({ pages, header, footer, notify }) {
    const root = document.getElementById("app");

    if (problems.length) {
        showProblems(root);
        return { refresh: async () => {}, runTx: async () => {} };
    }
    const names = Object.keys(pages ?? {});

    let wallet = null;
    let lastData = null;
    let paintId = 0;
    let dev = null;

    const activeWallet = () => (dev ? dev.wallet(wallet) : wallet);

    const currentPage = () => {
        const name = window.location.hash.replace(/^#\/?/, "").split("?")[0];
        return pages?.[name] ? name : names[0];
    };

    const paint = (body, data = lastData) => {
        if (!root) return;
        root.innerHTML = header({ ...data, wallet: activeWallet() }) + body + footer + (dev ? dev.panel(data) : "");
    };

    /** Reads the current page's data and redraws it. A newer refresh wins over an older one. */
    async function refresh({ quiet = false, fresh = false } = {}) {
        const id = ++paintId;
        const name = currentPage();
        const page = pages[name];
        if (fresh) invalidateReads();
        startPage(name);
        if (!quiet || !lastData) paint(page.loading, lastData);

        try {
            const data = await page.load(activeWallet());
            if (id !== paintId) return;
            lastData = data;
            paint(page.view(data), data);
        } catch (err) {
            console.error(err);
            if (id !== paintId) return;
            const hint = dev ? await dev.downMessage() : null;
            paint(page.error(hint ?? "The network did not answer. Check your connection and try again."), lastData);
        }
    }

    /** Runs one transaction flow (a project/chain/intereacts function) with toasts, then redraws the page */
    async function runTx(action, success = {}) {
        try {
            notify.pending({ stage: "checking" });
            const current = await box.getCurrentState();
            const signer = current?.address ? current : activeWallet();
            const receipt = await action(signer, { onStep: notify.pending });
            notify.success({ ...success, hash: receipt?.transactionHash ?? receipt?.hash });
            await refresh({ quiet: true });
        } catch (err) {
            console.error(err);
            notify.error(err);
        }
    }

    const devReady = loadDev
        ? loadDev().then((m) => { dev = m.install({ refresh, notify, invalidateReads }); })
            .catch((err) => console.error("dev mode failed to load", err))
        : Promise.resolve();

    window.addEventListener("hashchange", () => refresh());

    // Called on load and whenever the wallet or network changes
    box.safeRenderApp(async (state) => {
        await devReady;
        wallet = state;
        await refresh();
    });

    return { refresh, runTx };
}

/** Opens the wallet's connect / account window */
export const openWallet = () => modal?.open();

/** Shown instead of the page while settings are missing */
function showProblems(root) {
    const escape = (text) => String(text ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
    if (!root) return;
    root.innerHTML = /*html*/`
        <main class="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
            <div class="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-5 text-sm text-amber-100" role="alert">
                <p class="font-semibold">Setup is not finished</p>
                <ul class="mt-2 list-disc space-y-1 pl-5 text-amber-100/90">
                    ${[ ...new Set(problems) ].map((p) => /*html*/`<li>${escape(p)}</li>`).join("")}
                </ul>
                <p class="mt-3 text-amber-200/70">Copy settings/.env.example to settings/.env, fill it in, then restart.</p>
            </div>
        </main>
    `;
}
