/*
 * ENGINE (same in every project, do not edit).
 *
 * Website settings, read only from settings/.env (Vite). The code has no fallback values:
 * when something is missing, `problems` says what, and the page shows it instead of running.
 */

const env = import.meta.env;

const settings = {
    projectId: env.VITE_PROJECT_ID ?? "",
    chain: env.VITE_CHAIN ?? "",
    appName: env.VITE_APP_NAME ?? "",
    tagline: env.VITE_APP_TAGLINE ?? "",
    siteUrl: env.VITE_SITE_URL ?? "",

    // Only while dev/ runs the local test chain (set by dev/engine/start.mjs, never in settings/.env)
    isLocal: env.VITE_CHAIN === "local",
    localRpc: env.VITE_RPC_URL ?? "",
    localChainId: Number(env.VITE_CHAIN_ID ?? 0),
};

const required = {
    VITE_PROJECT_ID: settings.projectId,
    VITE_CHAIN: settings.chain,
    VITE_APP_NAME: settings.appName,
};
if (settings.isLocal) Object.assign(required, { VITE_RPC_URL: settings.localRpc, VITE_CHAIN_ID: settings.localChainId || "" });

/** Lines describing what is missing; empty when everything is set */
const problems = Object.entries(required)
    .filter(([ , value ]) => !value)
    .map(([ key ]) => `${key} is not set in settings/.env.`);

/** Adds a problem found later (e.g. an unknown network name) */
const addProblem = (text) => problems.push(text);

export { settings, problems, addProblem };
