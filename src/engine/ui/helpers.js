/*
 * ENGINE (same in every project, do not edit).
 *
 * Off-chain helpers the UI uses: number and address formatting, explorer links, telling a rejection
 * from a failure. UI code imports these instead of reaching into engine/chain.
 */

import { formNumber, shortAddress, timestampToUTC, txUrl } from "../chain/connect";
import { isUserReject } from "../chain/txError";

/** Escapes text before it goes into innerHTML (anything that came from the network or a user) */
const escapeHtml = (text) => String(text ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export { formNumber, shortAddress, timestampToUTC, txUrl, isUserReject, escapeHtml };
