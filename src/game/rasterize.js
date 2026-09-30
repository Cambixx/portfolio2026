/**
 * Turns the page into the game level: the text, boxes, borders and images
 * inside `root` are drawn into a pixel map at half resolution, the whole
 * document tall. Every pixel left in the map is solid ground; the game
 * destroys the level by clearing pixels out of it.
 *
 * The map is binary on purpose: a pixel is either fully there or empty.
 * That gives the level its crisp pixel-art look and makes what you see and
 * what you collide with the same thing. Faint surfaces (glass backgrounds,
 * near-black fills) fall away, so there are no invisible walls.
 */

/** CSS pixels per game pixel. */
export const PIX = 2;

// Anything this dim over the black page is not worth colliding with.
const MIN_ALPHA = 90;
const MIN_LIGHT = 24;
// Borders are 1px hairlines at 10% white on the site; in the level they are
// the platforms, so they are drawn at least this strong.
const MIN_BORDER_ALPHA = 0.32;
const MAX_LEVEL_HEIGHT = 16384;
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'svg', 'CANVAS', 'VIDEO', 'IFRAME', 'TEMPLATE']);

function parseColor(value) {
    if (!value) return null;
    let m = value.match(/^rgba?\(([^)]+)\)/);
    if (m) {
        const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat);
        return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    }
    m = value.match(/^color\(srgb ([^)]+)\)/);
    if (m) {
        const p = m[1].split(/[\s/]+/).filter(Boolean).map(parseFloat);
        return { r: p[0] * 255, g: p[1] * 255, b: p[2] * 255, a: p.length > 3 ? p[3] : 1 };
    }
    return null;
}

/** The colour as it shows over the black page, made opaque. */
function flatten(c, minAlpha = 0) {
    const a = Math.max(c.a, minAlpha);
    return `rgb(${Math.round(c.r * a)}, ${Math.round(c.g * a)}, ${Math.round(c.b * a)})`;
}

const brightness = (c) => Math.max(c.r, c.g, c.b) * c.a;

function radiusOf(cs, w, h) {
    const raw = cs.borderTopLeftRadius;
    const value = raw.endsWith('%') ? (Math.min(w, h) * parseFloat(raw)) / 100 : parseFloat(raw) || 0;
    return Math.min(value, w / 2, h / 2);
}

function transformText(text, mode) {
    if (mode === 'uppercase') return text.toUpperCase();
    if (mode === 'lowercase') return text.toLowerCase();
    if (mode === 'capitalize') return text.charAt(0).toUpperCase() + text.slice(1);
    return text;
}

export function rasterizePage(root) {
    const scrollY = window.scrollY;
    const cssWidth = document.documentElement.clientWidth;
    const cssHeight = document.documentElement.scrollHeight;
    const width = Math.ceil(cssWidth / PIX);
    const height = Math.min(Math.ceil(cssHeight / PIX), MAX_LEVEL_HEIGHT);
    const maxFillArea = window.innerWidth * window.innerHeight * 0.6;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    // Draw in CSS pixels, straight from client rects, and land in document space.
    ctx.scale(1 / PIX, 1 / PIX);
    ctx.translate(0, scrollY);
    ctx.textBaseline = 'alphabetic';

    const styles = new Map();
    const range = document.createRange();

    const drawBox = (cs, r) => {
        const radius = radiusOf(cs, r.width, r.height);
        const bg = parseColor(cs.backgroundColor);
        if (bg && brightness(bg) >= 40 && r.width * r.height < maxFillArea) {
            ctx.fillStyle = flatten(bg);
            ctx.beginPath();
            ctx.roundRect(r.left, r.top, r.width, r.height, radius);
            ctx.fill();
        }

        const sides = ['Top', 'Right', 'Bottom', 'Left'].map((side) => ({
            w: parseFloat(cs[`border${side}Width`]) || 0,
            c: parseColor(cs[`border${side}Color`]),
            on: cs[`border${side}Style`] !== 'none',
        }));
        const shown = (s) => s.on && s.w > 0 && s.c && s.c.a > 0;
        if (!sides.some(shown)) return;

        // At least one game pixel, or the line vanishes at half resolution.
        const line = (s) => Math.max(s.w, PIX);
        if (sides.every(shown)) {
            const lw = line(sides[0]);
            ctx.strokeStyle = flatten(sides[0].c, MIN_BORDER_ALPHA);
            ctx.lineWidth = lw;
            ctx.beginPath();
            ctx.roundRect(r.left + lw / 2, r.top + lw / 2, r.width - lw, r.height - lw, Math.max(0, radius - lw / 2));
            ctx.stroke();
            return;
        }
        const [top, right, bottom, left] = sides;
        const edge = (s, x, y, w, h) => {
            if (!shown(s)) return;
            ctx.fillStyle = flatten(s.c, MIN_BORDER_ALPHA);
            ctx.fillRect(x, y, w, h);
        };
        edge(top, r.left, r.top, r.width, line(top));
        edge(bottom, r.left, r.bottom - line(bottom), r.width, line(bottom));
        edge(left, r.left, r.top, line(left), r.height);
        edge(right, r.right - line(right), r.top, line(right), r.height);
    };

    const drawImage = (img, cs, r) => {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(r.left, r.top, r.width, r.height, radiusOf(cs, r.width, r.height));
        ctx.clip();
        if (img.complete && img.naturalWidth) {
            // object-fit: cover, which is how the site shows its images.
            const scale = Math.max(r.width / img.naturalWidth, r.height / img.naturalHeight);
            const sw = r.width / scale, sh = r.height / scale;
            try {
                ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, r.left, r.top, r.width, r.height);
            } catch {
                // A cross-origin image without CORS would taint the level; leave the block plain.
            }
        }
        // Lift the darkest tones just above the cut-off, so an image stays one
        // solid block instead of breaking up wherever it is dark.
        ctx.globalCompositeOperation = 'lighten';
        ctx.fillStyle = 'rgb(30, 30, 30)';
        ctx.fillRect(r.left, r.top, r.width, r.height);
        ctx.restore();
    };

    // Gradient text (the hero title) is painted by an ancestor's background.
    const gradientFill = (el) => {
        for (let node = el, depth = 0; node && depth < 4; node = node.parentElement, depth++) {
            const cs = styles.get(node) ?? getComputedStyle(node);
            const clip = cs.backgroundClip || cs.webkitBackgroundClip;
            if (clip === 'text' && cs.backgroundImage.includes('gradient')) {
                const stops = [...cs.backgroundImage.matchAll(/rgba?\([^)]+\)/g)].map((m) => parseColor(m[0]));
                if (!stops.length) return null;
                const r = node.getBoundingClientRect();
                const g = ctx.createLinearGradient(r.left, 0, r.right, 0);
                stops.forEach((c, i) => g.addColorStop(stops.length > 1 ? i / (stops.length - 1) : 0, flatten(c)));
                return g;
            }
        }
        return null;
    };

    const drawText = (node) => {
        const el = node.parentElement;
        const cs = styles.get(el);
        if (!cs || cs.visibility !== 'visible') return;
        const color = parseColor(cs.webkitTextFillColor) ?? parseColor(cs.color);
        const fill = color && color.a > 0 ? flatten(color) : gradientFill(el);
        if (!fill) return;

        ctx.fillStyle = fill;
        ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        if ('letterSpacing' in ctx) ctx.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;

        // Word by word, each at the spot the browser laid it out.
        for (const m of node.data.matchAll(/\S+/g)) {
            range.setStart(node, m.index);
            range.setEnd(node, m.index + m[0].length);
            const r = range.getClientRects()[0];
            if (!r || r.width < 1) continue;
            const word = transformText(m[0], cs.textTransform);
            const metrics = ctx.measureText(word);
            const ascent = metrics.fontBoundingBoxAscent;
            const descent = metrics.fontBoundingBoxDescent;
            const baseline = r.top + (r.height - (ascent + descent)) / 2 + ascent;
            ctx.fillText(word, r.left, baseline, r.width + 2);
        }
    };

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                return node.data.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            }
            if (SKIP_TAGS.has(node.tagName)) return NodeFilter.FILTER_REJECT;
            const cs = getComputedStyle(node);
            if (cs.display === 'none' || cs.position === 'fixed') return NodeFilter.FILTER_REJECT;
            styles.set(node, cs);
            return NodeFilter.FILTER_ACCEPT;
        },
    });

    // Tree order is paint order closely enough: boxes, then what sits in them.
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (node.nodeType === Node.TEXT_NODE) {
            drawText(node);
            continue;
        }
        const cs = styles.get(node);
        if (cs.visibility !== 'visible') continue;
        const r = node.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        drawBox(cs, r);
        if (node.tagName === 'IMG') drawImage(node, cs, r);
    }

    const image = ctx.getImageData(0, 0, width, height);
    const data = image.data;
    const px = new Uint32Array(data.buffer);
    let solid = 0;
    for (let i = 0; i < px.length; i++) {
        const o = i * 4;
        if (data[o + 3] < MIN_ALPHA || Math.max(data[o], data[o + 1], data[o + 2]) < MIN_LIGHT) {
            px[i] = 0;
        } else {
            data[o + 3] = 255;
            solid++;
        }
    }

    return { px, width, height, solid };
}
