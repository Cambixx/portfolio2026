/**
 * State shared between the intro and the particle field. The intro drives
 * the field while it is on screen, so both are one continuous animation:
 * dust → core → burst → the name → the hero grid.
 *
 * Plain mutable values are read every frame, so they never trigger a React
 * render. Only the name points need a subscription, because the field has to
 * rebuild its geometry once they arrive.
 */
export const fieldState = {
    /** True until the intro hands the field over to the page scroll. */
    introActive: true,
    /** Formation the intro wants on screen: 0 dust, 1 core, 2 burst, 3 name, 4 hero grid. */
    introTarget: 0,
    /** Seconds the field takes to reach `introTarget`. */
    introDuration: 0,
    /** How it travels there: { ease, scatter, arcZ } (see ScrollField). */
    introMotion: {},
    /** Light sweep across the name, 0 → 1 left to right; outside (0, 1) it is off. */
    sweep: 0,
    /** Shake strength: builds as the core charges, decays after the blast. */
    shake: 0,
    /** Pre-blast fizz on the core, 0 → 1. */
    charge: 0,
    /** Overall field opacity, so the intro can bring it up from black. */
    opacity: 1,
    /** Sampled pixels of the intro name, as normalised [x, y, …] pairs (y down). */
    namePoints: null,
};

const listeners = new Set();

export function setNamePoints(points) {
    fieldState.namePoints = points;
    listeners.forEach((listener) => listener());
}

export function subscribeNamePoints(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export const getNamePoints = () => fieldState.namePoints;

/** Sends the field to an intro formation over `duration` seconds. */
export function introGoTo(target, duration, motion = {}) {
    fieldState.introTarget = target;
    fieldState.introDuration = duration;
    fieldState.introMotion = motion;
}

/** Hands the field straight to the page, for visits that play no intro. */
export function skipIntro() {
    fieldState.introActive = false;
    fieldState.opacity = 1;
}
