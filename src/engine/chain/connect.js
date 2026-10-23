/*
 * ENGINE (same in every project, do not edit). Wallet modal, network, read RPC, kitbox utils.
 * Every value comes from settings/.env through src/engine/settings.js; nothing is written here.
 * The modal theme comes from src/project/ui/theme.js (design, not a setting).
 */

import { kitbox, chain, utils } from "kitbox";
import { settings, problems, addProblem } from "../settings";
import { WALLET_THEME } from "../../project/ui/theme";

const box = new kitbox();

const IS_LOCAL = settings.isLocal;
const LOCAL_RPC = settings.localRpc;
const LOCAL_CHAIN_ID = settings.localChainId;

/** The test chain started by dev/ (npm run dev) */
const localChain = () => chain.defineChain({
    id: LOCAL_CHAIN_ID,
    caipNetworkId: `eip155:${LOCAL_CHAIN_ID}`,
    chainNamespace: "eip155",
    name: "Local test chain",
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
    rpcUrls: { default: { http: [ LOCAL_RPC ] } },
    // kitbox reads an explorer URL from the first network
    blockExplorers: { default: { name: "Local", url: LOCAL_RPC } },
});

// VITE_CHAIN names a network kitbox knows (bsc, bscTestnet, ...)
const NETWORK = IS_LOCAL ? (LOCAL_RPC ? localChain() : null) : chain?.[settings.chain] ?? null;
if (!NETWORK && settings.chain) addProblem(`VITE_CHAIN=${settings.chain} is not a network kitbox knows (try bsc or bscTestnet).`);

// Only set up the wallet modal when the settings are complete; otherwise the page shows what is missing
const modal = problems.length ? null : box.createModal(settings.projectId, [ NETWORK ], "dark", WALLET_THEME);

const { shortAddress, formNumber, timestampToUTC, delay } = utils;

/** RPC for reads: the wallet's when it has one, otherwise the network's own public RPC */
const readRpc = () => {
    if (IS_LOCAL) return LOCAL_RPC;
    try { return box.getCurrentRpc(); } catch { return NETWORK?.rpcUrls?.default?.http?.[0]; }
};

/** Explorer link for a transaction, or null on the local chain */
const txUrl = (hash) => {
    const explorer = NETWORK?.blockExplorers?.default?.url;
    return hash && explorer && !IS_LOCAL ? `${explorer}/tx/${hash}` : null;
};

export { box, modal, NETWORK, IS_LOCAL, LOCAL_RPC, LOCAL_CHAIN_ID, readRpc, txUrl, shortAddress, formNumber, timestampToUTC, delay };
