/**
 * Sound effects, synthesised with Web Audio: blips from oscillators and
 * blasts from filtered noise, so the game ships without a single audio file.
 */

const VOLUME = 0.35;
const silent = new Proxy({}, { get: (_, key) => (key === 'toggleMute' ? () => true : () => {}) });

export function createSfx() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return silent;

    const ac = new AudioContextClass();
    ac.resume?.();
    const master = ac.createGain();
    master.gain.value = VOLUME;
    master.connect(ac.destination);

    const noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const samples = noise.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;

    const envelope = (vol, dur) => {
        const gain = ac.createGain();
        const t = ac.currentTime;
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        gain.connect(master);
        return gain;
    };

    const blip = ({ f0, f1, dur, vol, type = 'square' }) => {
        const osc = ac.createOscillator();
        const t = ac.currentTime;
        osc.type = type;
        osc.frequency.setValueAtTime(f0, t);
        osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
        osc.connect(envelope(vol, dur));
        osc.start(t);
        osc.stop(t + dur);
    };

    const blast = ({ f0, f1, dur, vol }) => {
        const src = ac.createBufferSource();
        const filter = ac.createBiquadFilter();
        const t = ac.currentTime;
        src.buffer = noise;
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(f0, t);
        filter.frequency.exponentialRampToValueAtTime(f1, t + dur);
        src.connect(filter);
        filter.connect(envelope(vol, dur));
        src.start(t, Math.random() * 0.5);
        src.stop(t + dur);
    };

    // Rapid fire and chain reactions would otherwise stack into a roar.
    const last = {};
    const every = (name, ms) => {
        const now = performance.now();
        if (now - (last[name] ?? 0) < ms) return false;
        last[name] = now;
        return true;
    };

    let muted = false;

    return {
        shot: () => every('shot', 40) && blip({ f0: 900, f1: 220, dur: 0.07, vol: 0.1 }),
        hit: () => every('hit', 30) && blast({ f0: 3000, f1: 600, dur: 0.07, vol: 0.14 }),
        launch: () => blast({ f0: 1400, f1: 300, dur: 0.3, vol: 0.16 }),
        toss: () => blip({ f0: 380, f1: 260, dur: 0.09, vol: 0.08, type: 'triangle' }),
        bounce: () => every('bounce', 70) && blip({ f0: 520, f1: 380, dur: 0.05, vol: 0.06, type: 'triangle' }),
        laser: () => every('laser', 60) && blip({ f0: 1600, f1: 1300, dur: 0.06, vol: 0.035, type: 'sawtooth' }),
        jump: () => blip({ f0: 280, f1: 620, dur: 0.1, vol: 0.07 }),
        boom: (size) => {
            if (!every('boom', 45)) return;
            blast({ f0: 1800, f1: 50, dur: 0.35 + size * 0.015, vol: 0.55 });
            blip({ f0: 140, f1: 35, dur: 0.4, vol: 0.45, type: 'sine' });
        },
        toggleMute() {
            muted = !muted;
            master.gain.value = muted ? 0 : VOLUME;
            return muted;
        },
        close: () => ac.close(),
    };
}
