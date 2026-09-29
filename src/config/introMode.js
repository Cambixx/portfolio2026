/**
 * Whether to play the intro on this visit.
 *
 * - 'full'  every visit: the whole sequence.
 * - 'none'  the visit lands on a section link (#projects…): that visitor came
 *           for the section, so the page shows at once, already scrolled.
 */
export function getIntroMode() {
    if (typeof window === 'undefined') return 'full';
    return window.location.hash.length > 1 ? 'none' : 'full';
}
