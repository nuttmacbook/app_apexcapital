import { addProblem } from "../../../engine/settings";

/*
 * YOUR CODE (off-chain). How member numbers and ID numbers are shown.
 *
 * The contract numbers members 1, 2, 3 … and the IDs in each rank 0, 1, 2 … In production the site never
 * shows those numbers: each one is shown as a 7-character code (e.g. 7KQ2M9X) that looks random,
 * and invite links carry the code. The code turns back into the number in the browser, so everything works
 * the same. Member codes and ID codes of each rank are different, so codes cannot be compared.
 *
 * Settings (settings/.env):
 *   VITE_APP_MODE  production = codes everywhere, numbers in links are refused
 *                  dev        = real numbers by default and a switch to preview the codes (kept in this browser)
 *   VITE_ID_KEY    the secret-looking text that shapes the codes. Choose it once before launch and never change it:
 *                  a new key gives every member a new code, and every invite link already shared stops working.
 *
 * This hides the order from visitors; it is not a lock. The numbers stay public on chain (BscScan, events),
 * and the key is part of the public site.
 */

const env = import.meta.env;
const MODE = String(env.VITE_APP_MODE ?? "");
const KEY = String(env.VITE_ID_KEY ?? "");
const VIEW_KEY = "apex.idView";

if (MODE !== "production" && MODE !== "dev") addProblem("VITE_APP_MODE in settings/.env must be production or dev.");
if (KEY.length < 16) addProblem("VITE_ID_KEY in settings/.env must be at least 16 characters (choose it once, never change it).");

/* ------------------------------------ the code: a keyed shuffle of 30-bit numbers, then base 32 + a check letter */

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";   // Crockford base 32: no I, L, O, U
const HALF = 15;
const MASK = (1 << HALF) - 1;
const LIMIT = 2 ** (HALF * 2);

/** 32-bit mix of the key, a domain ("m" = members, "p3" = IDs of rank 3), a round and a value */
const mix = (domain, round, value) => {
    let h = 0x811c9dc5;
    const text = `${KEY}|${domain}|${round}`;
    for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
    h = Math.imul(h ^ value, 0x5bd1e995);
    h ^= h >>> 15;
    h = Math.imul(h, 0x27d4eb2d);
    return (h ^ (h >>> 13)) >>> 0;
};

// Feistel network: always reversible, so every number has exactly one code and every code one number
const shuffle = (domain, n) => {
    let left = Math.floor(n / (MASK + 1));
    let right = n & MASK;
    for (let round = 0; round < 4; round++) [ left, right ] = [ right, (left ^ mix(domain, round, right)) & MASK ];
    return left * (MASK + 1) + right;
};

const unshuffle = (domain, n) => {
    let left = Math.floor(n / (MASK + 1));
    let right = n & MASK;
    for (let round = 3; round >= 0; round--) [ left, right ] = [ (right ^ mix(domain, round, left)) & MASK, left ];
    return left * (MASK + 1) + right;
};

const check = (domain, digits) => ALPHABET[(digits.reduce((sum, d, i) => sum + d * (i + 3), 0) + mix(domain, 9, digits.length)) % 32];

const encode = (domain, n) => {
    const value = shuffle(domain, n);
    const digits = Array.from({ length: 6 }, (_, i) => Math.floor(value / 32 ** (5 - i)) % 32);
    return digits.map((d) => ALPHABET[d]).join("") + check(domain, digits);
};

/** Code → number, or null when it is not a valid code (typos are caught by the check letter) */
const decode = (domain, code) => {
    const clean = String(code ?? "").trim().toUpperCase().replace(/[\s-]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
    if (!/^[0-9A-HJKMNP-TV-Z]{7}$/.test(clean)) return null;
    const digits = [ ...clean.slice(0, 6) ].map((c) => ALPHABET.indexOf(c));
    if (check(domain, digits) !== clean[6]) return null;
    return unshuffle(domain, digits.reduce((sum, d) => sum * 32 + d, 0));
};

/* ------------------------------------ which view */

const isDev = () => MODE === "dev";

/** True when numbers are shown as codes: always in production, by choice in dev */
const isMasked = () => {
    if (!isDev()) return true;
    try { return localStorage.getItem(VIEW_KEY) === "codes"; } catch { return false; }
};

/** dev only: switch between real numbers and codes */
const toggleIdView = () => {
    if (!isDev()) return;
    try { localStorage.setItem(VIEW_KEY, isMasked() ? "numbers" : "codes"); } catch {}
};

/* ------------------------------------ what pages use */

const inRange = (n) => Number.isInteger(n) && n >= 0 && n < LIMIT;
const posDomain = (rank) => `p${Number(rank) || 1}`;

/** Member number → what the page shows: "7KQ2M9X" (codes) or "#12" (numbers) */
const memberLabel = (id) => (!inRange(Number(id)) ? "" : isMasked() ? encode("m", Number(id)) : `#${Number(id)}`);

/** ID in a rank → "N4D0QXA" or "#7"; `short` gives the first 4 characters for the small circles of the board */
const positionLabel = (rank, index, { short = false } = {}) => {
    if (!inRange(Number(index))) return "";
    if (!isMasked()) return short ? String(Number(index)) : `#${Number(index)}`;
    const code = encode(posDomain(rank), Number(index));
    return short ? code.slice(0, 4) : code;
};

/** Member number → what goes after ?ref= in an invite link */
const memberParam = (id) => (isMasked() ? encode("m", Number(id)) : String(Number(id)));

/** ID in a rank → what goes after pos= in a board link */
const positionParam = (rank, index) => (isMasked() ? encode(posDomain(rank), Number(index)) : String(Number(index)));

/** Text from a link or an input → member number, or null. Plain numbers are accepted in dev only. */
const parseMember = (text) => {
    const raw = String(text ?? "").trim().replace(/^#/, "");
    if (isDev() && /^\d+$/.test(raw)) return Number(raw);
    return decode("m", raw);
};

/** Text from a link or an input → ID number in `rank`, or null. Plain numbers are accepted in dev only. */
const parsePosition = (rank, text) => {
    const raw = String(text ?? "").trim().replace(/^#/, "");
    if (isDev() && /^\d+$/.test(raw)) return Number(raw);
    return decode(posDomain(rank), raw);
};

export { isDev, isMasked, toggleIdView, memberLabel, positionLabel, memberParam, positionParam, parseMember, parsePosition };
