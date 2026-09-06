/**
 * Lee la paleta activa desde las variables CSS definidas en
 * `src/styles/palettes.css`, para que los componentes 3D (Three.js) usen
 * exactamente los mismos colores que el resto del sitio sin duplicar valores.
 *
 * La paleta se elige con el atributo `data-palette` de <html>; ver el
 * encabezado de palettes.css.
 */

/**
 * Único punto de JS que repite los colores de la paleta. Solo entra en juego
 * si se lee antes de que el CSS esté aplicado (o sin DOM), algo que no ocurre
 * en la app porque main.jsx importa index.css antes que App.
 *
 * Si cambias `data-palette` en index.html, actualiza también estos valores.
 */
export const DEFAULT_PALETTE = {
    accent: '#FF9F1C',
    accentSoft: '#FFC266',
    accentLight: '#FFC77B',
    accentDim: '#3C270A',
};

export function readPalette() {
    if (typeof window === 'undefined' || !document?.documentElement) return DEFAULT_PALETTE;

    const styles = getComputedStyle(document.documentElement);
    const get = (token, fallback) => styles.getPropertyValue(token).trim() || fallback;

    return {
        accent: get('--accent', DEFAULT_PALETTE.accent),
        accentSoft: get('--accent-soft', DEFAULT_PALETTE.accentSoft),
        accentLight: get('--accent-light', DEFAULT_PALETTE.accentLight),
        accentDim: get('--accent-dim', DEFAULT_PALETTE.accentDim),
    };
}
