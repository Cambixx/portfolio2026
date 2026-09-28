/**
 * How much of the intro to play on this visit.
 *
 * - 'full'  first visit: the whole sequence.
 * - 'short' returning visitor: straight to the closing warp into the page.
 * - 'none'  the visit lands on a section link (#projects…): that visitor came
 *           for the section, so the page shows at once, already scrolled.
 *
 * Recruiters reopen the same portfolios while shortlisting; the full intro
 * is a first impression, not a toll on every visit.
 */

const SEEN_KEY = 'portfolio:intro-seen';

export function getIntroMode() {
    if (typeof window === 'undefined') return 'full';
    if (window.location.hash.length > 1) return 'none';
    try {
        return localStorage.getItem(SEEN_KEY) ? 'short' : 'full';
    } catch {
        // Storage blocked (private mode, strict settings): treat as a first visit.
        return 'full';
    }
}

export function markIntroSeen() {
    try {
        localStorage.setItem(SEEN_KEY, '1');
    } catch {
        // Storage blocked: the next visit simply plays the full intro again.
    }
}
