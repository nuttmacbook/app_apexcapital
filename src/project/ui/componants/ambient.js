/*
 * YOUR CODE (off-chain, decoration only). The quiet background behind every page:
 *   1. a slow constellation of gold and green points that join into lines and faint polygons
 *   2. a wireframe "apex" peak and light travelling along thin curves at the top of the page
 *   3. a fine film grain over everything
 * It lives outside #app, so page repaints never restart it. No network, no contract calls.
 * Motion stops when the tab is hidden, and is replaced by one still frame for people who ask for reduced motion.
 */

const GOLD = [ 235, 205, 108 ];
const MINT = [ 63, 207, 122 ];
const rgba = ([ r, g, b ], a) => `rgba(${r},${g},${b},${a})`;

/* ------------------------------------ 1. constellation */

function startConstellation(canvas, layer) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pointer = { x: -9999, y: -9999 };
    let width = 0, height = 0, points = [], frame = 0, running = false, link = 120;

    const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        link = width < 640 ? 96 : 130;
        const lite = layer?.classList.contains("ambient-lite");
        const count = Math.round(Math.min(width < 640 ? 34 : 78, (width * height) / 17000) * (lite ? 0.5 : 1));
        points = Array.from({ length: count }, (_, i) => points[i] ?? {
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.22,
            vy: (Math.random() - 0.5) * 0.22,
            r: 0.6 + Math.random() * 1.3,
            color: Math.random() < 0.3 ? GOLD : MINT,
            phase: Math.random() * Math.PI * 2,
        });
    };

    const draw = (t) => {
        ctx.clearRect(0, 0, width, height);
        const near = points.map(() => []);

        // Lines between close points
        for (let i = 0; i < points.length; i++) {
            const a = points[i];
            for (let j = i + 1; j < points.length; j++) {
                const b = points[j];
                const d = Math.hypot(a.x - b.x, a.y - b.y);
                if (d > link) continue;
                near[i].push(j);
                ctx.strokeStyle = rgba(a.color === GOLD && b.color === GOLD ? GOLD : MINT, (1 - d / link) * 0.16);
                ctx.lineWidth = 0.6;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.stroke();
            }
        }

        // Faint facets where three points are all close
        for (let i = 0; i < points.length; i++) {
            const list = near[i];
            for (let m = 0; m < list.length; m++) {
                for (let n = m + 1; n < list.length; n++) {
                    const j = list[m], k = list[n];
                    if (!near[Math.min(j, k)].includes(Math.max(j, k))) continue;
                    const a = points[i], b = points[j], c = points[k];
                    ctx.fillStyle = rgba((i + j + k) % 3 === 0 ? GOLD : MINT, 0.022);
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.lineTo(c.x, c.y);
                    ctx.closePath();
                    ctx.fill();
                }
            }
        }

        // Lines to the pointer, in gold
        for (const p of points) {
            const d = Math.hypot(p.x - pointer.x, p.y - pointer.y);
            if (d > link * 1.4) continue;
            ctx.strokeStyle = rgba(GOLD, (1 - d / (link * 1.4)) * 0.35);
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(pointer.x, pointer.y);
            ctx.stroke();
        }

        // The points, softly twinkling
        for (const p of points) {
            const glow = 0.55 + 0.45 * Math.sin(t / 1400 + p.phase);
            ctx.fillStyle = rgba(p.color, 0.35 + 0.4 * glow);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        }
    };

    const step = (t) => {
        if (!running) return;
        for (const p of points) {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < -20) p.x = width + 20; else if (p.x > width + 20) p.x = -20;
            if (p.y < -20) p.y = height + 20; else if (p.y > height + 20) p.y = -20;
        }
        draw(t);
        frame = requestAnimationFrame(step);
    };

    const play = () => {
        if (still || running || document.hidden) return;
        running = true;
        frame = requestAnimationFrame(step);
    };
    const pause = () => {
        running = false;
        cancelAnimationFrame(frame);
    };

    resize();
    draw(0);
    play();

    let resizeTimer;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => { resize(); draw(performance.now()); }, 120);
    });
    document.addEventListener("visibilitychange", () => (document.hidden ? pause() : play()));
    layer?.addEventListener("ambient-lite", () => { points.length = 0; resize(); });
    window.addEventListener("pointermove", (e) => {
        if (e.pointerType !== "mouse") return;
        pointer.x = e.clientX;
        pointer.y = e.clientY;
    }, { passive: true });
    document.addEventListener("pointerleave", () => { pointer.x = pointer.y = -9999; });
}

/* ------------------------------------ 2. apex peak and curves (SVG) */

// Low-poly peak: points, then triangles by index. Drawn once, the edges trace themselves in on load.
const PEAK = [ [ 0, 420 ], [ 150, 330 ], [ 260, 380 ], [ 330, 240 ], [ 450, 300 ], [ 520, 40 ], [ 600, 210 ], [ 680, 170 ], [ 760, 300 ], [ 860, 250 ], [ 1000, 420 ], [ 420, 420 ], [ 620, 420 ], [ 520, 330 ] ];
const FACETS = [ [ 0, 1, 11 ], [ 1, 2, 11 ], [ 2, 3, 11 ], [ 3, 4, 11 ], [ 4, 13, 11 ], [ 4, 5, 13 ], [ 5, 6, 13 ], [ 6, 12, 13 ], [ 13, 12, 11 ], [ 6, 7, 12 ], [ 7, 8, 12 ], [ 8, 9, 12 ], [ 9, 10, 12 ], [ 3, 5, 4 ], [ 5, 7, 6 ] ];

const peakSvg = () => {
    const edges = new Set();
    FACETS.forEach(([ a, b, c ]) => [ [ a, b ], [ b, c ], [ a, c ] ].forEach(([ x, y ]) => edges.add([ Math.min(x, y), Math.max(x, y) ].join("-"))));
    const facets = FACETS.map((f, i) => {
        const shade = 0.018 + ((i * 7) % 5) * 0.012;
        return `<polygon points="${f.map((p) => PEAK[p].join(",")).join(" ")}" fill="url(#peak-fill)" fill-opacity="${shade.toFixed(3)}" />`;
    }).join("");
    const lines = [ ...edges ].map((e, i) => {
        const [ a, b ] = e.split("-").map(Number);
        const [ x1, y1 ] = PEAK[a], [ x2, y2 ] = PEAK[b];
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" pathLength="1" style="animation-delay:${(i * 45)}ms" />`;
    }).join("");
    const dots = PEAK.slice(0, 11).map(([ x, y ]) => `<circle cx="${x}" cy="${y}" r="2.2" />`).join("");
    return /*html*/`
        <svg class="ambient-peak" viewBox="0 0 1000 420" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">
            <defs>
                <linearGradient id="peak-line" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stop-color="#ebcd6c" />
                    <stop offset="0.55" stop-color="#3fcf7a" />
                    <stop offset="1" stop-color="#178a48" />
                </linearGradient>
                <linearGradient id="peak-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stop-color="#ebcd6c" />
                    <stop offset="1" stop-color="#3fcf7a" stop-opacity="0" />
                </linearGradient>
                <linearGradient id="peak-fade" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0.45" stop-color="#fff" />
                    <stop offset="1" stop-color="#fff" stop-opacity="0" />
                </linearGradient>
                <mask id="peak-mask"><rect width="1000" height="420" fill="url(#peak-fade)" /></mask>
            </defs>
            <g mask="url(#peak-mask)">
                <g class="ambient-facets">${facets}</g>
                <g class="ambient-edges" stroke="url(#peak-line)">${lines}</g>
                <g class="ambient-nodes">${dots}</g>
                <circle class="ambient-summit" cx="520" cy="40" r="3.5" />
            </g>
        </svg>
    `;
};

// Thin curves sweeping across the top, each with a spark of light travelling along it
const CURVES = [
    "M-50 260 C 260 120, 520 380, 820 210 S 1300 120, 1500 230",
    "M-50 300 C 300 170, 560 420, 860 250 S 1320 170, 1500 280",
    "M-50 340 C 340 230, 600 460, 900 300 S 1340 230, 1500 330",
    "M-50 210 C 220 90, 480 320, 780 170 S 1280 80, 1500 180",
];

// The fade is in the stroke gradients (in page units), not a CSS mask, so the moving sparks stay cheap to draw
const fade = (id, stops) => /*html*/`
    <linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1440" y2="0">
        ${stops.map(([ at, color, alpha ]) => `<stop offset="${at}" stop-color="${color}" stop-opacity="${alpha}" />`).join("")}
    </linearGradient>`;

const curvesSvg = () => /*html*/`
    <svg class="ambient-curves" viewBox="0 0 1440 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
        <defs>
            ${fade("curve-home", [ [ 0, "#3fcf7a", 0 ], [ 0.44, "#3fcf7a", 0 ], [ 0.62, "#3fcf7a", 0.42 ], [ 0.85, "#ebcd6c", 0.55 ], [ 1, "#ebcd6c", 0 ] ])}
            ${fade("curve-inner", [ [ 0, "#3fcf7a", 0 ], [ 0.55, "#3fcf7a", 0 ], [ 0.75, "#3fcf7a", 0.4 ], [ 0.9, "#ebcd6c", 0.55 ], [ 1, "#ebcd6c", 0 ] ])}
            ${fade("spark-home", [ [ 0, "#f6e7b0", 0 ], [ 0.48, "#f6e7b0", 0 ], [ 0.66, "#f6e7b0", 0.95 ], [ 0.95, "#f6e7b0", 0.95 ], [ 1, "#f6e7b0", 0 ] ])}
            ${fade("spark-inner", [ [ 0, "#f6e7b0", 0 ], [ 0.6, "#f6e7b0", 0 ], [ 0.82, "#f6e7b0", 0.95 ], [ 0.97, "#f6e7b0", 0.95 ], [ 1, "#f6e7b0", 0 ] ])}
        </defs>
        ${CURVES.map((d, i) => /*html*/`
            <path d="${d}" class="curve-base" />
            <path d="${d}" class="curve-spark curve-halo" pathLength="1" style="animation-delay:${-i * 2.6}s; animation-duration:${11 + i * 2}s" />
            <path d="${d}" class="curve-spark" pathLength="1" style="animation-delay:${-i * 2.6}s; animation-duration:${11 + i * 2}s" />
        `).join("")}
    </svg>
`;

/* ------------------------------------ 3. slow devices get a lighter version */

// Counts frames for 1.5 s after the page settles; under 40 per second, the sparks stop and half the points go
function watchSpeed(layer) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setTimeout(() => {
        if (document.hidden) return;
        let frames = 0;
        const start = performance.now();
        const count = (t) => {
            frames++;
            if (t - start < 1500) return requestAnimationFrame(count);
            if ((frames * 1000) / (t - start) < 40) {
                layer.classList.add("ambient-lite");
                layer.dispatchEvent(new Event("ambient-lite"));
            }
        };
        requestAnimationFrame(count);
    }, 2500);
}

/* ------------------------------------ 4. mount once */

function mountAmbient() {
    if (typeof document === "undefined" || document.querySelector(".ambient")) return;
    const layer = document.createElement("div");
    layer.className = "ambient";
    layer.setAttribute("aria-hidden", "true");
    layer.innerHTML = `${curvesSvg()}${peakSvg()}<canvas class="ambient-canvas"></canvas><div class="ambient-grain"></div>`;
    document.body.prepend(layer);

    // The page name on <body data-page>, so the decoration can step back on pages with centred or wide text
    const markPage = () => { document.body.dataset.page = window.location.hash.replace(/^#\/?/, "").split("?")[0] || "home"; };
    markPage();
    window.addEventListener("hashchange", markPage);
    startConstellation(layer.querySelector("canvas"), layer);
    watchSpeed(layer);

    // The top decoration drifts slower than the page, for depth, and fades as the page scrolls
    const top = [ layer.querySelector(".ambient-curves"), layer.querySelector(".ambient-peak") ];
    let ticking = false;
    window.addEventListener("scroll", () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            const y = window.scrollY;
            const fade = Math.max(0, 1 - y / 700);
            top.forEach((el, i) => {
                if (!el) return;
                el.style.transform = `translate3d(0, ${-y * (i ? 0.35 : 0.2)}px, 0)`;
                el.style.opacity = String(fade);
            });
            ticking = false;
        });
    }, { passive: true });
}

/* ------------------------------------ 5. first paint of each page fades in (not on quiet refreshes) */

function watchPageEntry() {
    const app = document.getElementById("app");
    if (!app) return;
    let lastRoute = null;
    let timer;
    new MutationObserver(() => {
        const route = window.location.hash.split("?")[0] || "#/";
        if (route === lastRoute || app.querySelector("[aria-busy=true]") || !app.querySelector("main, section")) return;
        lastRoute = route;
        app.setAttribute("data-enter", "");
        clearTimeout(timer);
        timer = setTimeout(() => app.removeAttribute("data-enter"), 1400);
    }).observe(app, { childList: true });
}

export { mountAmbient, watchPageEntry };
