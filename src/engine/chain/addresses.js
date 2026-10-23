/*
 * ENGINE (same in every project, do not edit).
 *
 * Where each contract lives, for every contract in the project.
 *   - Real networks: src/generated/addresses.json, written by dev/engine/deploy-live.mjs after each deploy (committed)
 *   - Local test chain: VITE_LOCAL_ADDRESSES, a JSON map passed by dev/engine/start.mjs while npm run dev runs
 * Contract files call addressOf("<ContractName>"), so a new contract never needs a new setting.
 */

import deployments from "../../generated/addresses.json";
import { settings, addProblem } from "../settings";

const ZERO = "0x0000000000000000000000000000000000000000";

const localAddresses = () => {
    try { return JSON.parse(import.meta.env.VITE_LOCAL_ADDRESSES ?? "{}"); } catch { return {}; }
};

const book = settings.isLocal ? localAddresses() : deployments?.[settings.chain]?.contracts ?? {};

/** Deployed address of a contract on the current network, or the zero address if it is not deployed there */
const addressOf = (name) => {
    const address = book?.[name];
    if (!address && settings.chain) addProblem(`${name} is not deployed on ${settings.chain} yet (src/generated/addresses.json). Run npm run deploy:live -- --send in dev/, or try it locally with npm run dev.`);
    return address ?? ZERO;
};

export { addressOf };
