import { TH } from "./th";

/*
 * YOUR CODE (off-chain text). Two languages: English (the text written in the code) and Thai (th.js).
 * t("English text", { name }) returns the text in the chosen language; {name} is filled in after translating.
 * A text that th.js does not have stays in English, so nothing ever shows a raw key.
 * The choice is kept in this browser; the first visit is always English, Thai only after choosing TH.
 */

const KEY = "apex.lang";
const LANGS = [ "en", "th" ];

const firstChoice = () => {
    try {
        const saved = localStorage.getItem(KEY);
        if (LANGS.includes(saved)) return saved;
    } catch {}
    return "en";
};

let current = firstChoice();
if (typeof document !== "undefined") document.documentElement.lang = current;

/** "en" or "th" */
const lang = () => current;

/** Switches the language (the caller redraws the page) */
const setLang = (next) => {
    if (!LANGS.includes(next)) return;
    current = next;
    try { localStorage.setItem(KEY, next); } catch {}
    if (typeof document !== "undefined") document.documentElement.lang = next;
};

/** Text in the chosen language, with {placeholders} filled from `vars` */
const t = (text, vars = null) => {
    const out = current === "th" ? TH[text] ?? text : text;
    return vars ? out.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? "")) : out;
};

/** Locale for dates and numbers written out in words (Gregorian years in Thai too) */
const locale = () => (current === "th" ? "th-TH-u-ca-gregory" : "en-GB");

export { t, lang, setLang, locale };
