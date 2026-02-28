import { useMemo, useRef, useState, useEffect } from 'react';
import { motion, useAnimation } from 'motion/react';
import './SvgIntro.css';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export default function SvgIntro({ onComplete }) {
    // Escala del scroll reducida drásticamente (de 0.003 a 0.0006) para alargar la experiencia x5
    const SCROLL_SPEED_MOUSE = 0.0004;
    const SCROLL_SPEED_TOUCH = 0.0008;

    const [progress, setProgress] = useState(0);
    const touchStartY = useRef(0);
    const isCompleted = useRef(false);

    // Arrays para elementos generativos
    const dataStreamLines = useMemo(() => Array.from({ length: 40 }), []);
    const hexGrid = useMemo(() => Array.from({ length: 24 }), []);

    const phase = useMemo(() => {
        if (progress < 0.20) return 'ESTABLISHING HANDSHAKE...';
        if (progress < 0.40) return 'INITIALIZING LOGIC GATES...';
        if (progress < 0.60) return 'COMPILING NEURAL PATHWAYS...';
        if (progress < 0.85) return 'DECRYPTING MASTER IDENTITY...';
        if (progress < 0.98) return 'VERIFYING SIGNATURE...';
        return 'ACCESS GRANTED';
    }, [progress]);

    const advanceProgress = (delta) => {
        if (isCompleted.current) return;

        setProgress((prev) => {
            const next = clamp(prev + delta, 0, 1);

            if (next >= 1 && !isCompleted.current) {
                isCompleted.current = true;
                if (onComplete) onComplete();
            }

            return next;
        });
    };

    const handleWheel = (event) => {
        event.preventDefault();
        advanceProgress(event.deltaY * SCROLL_SPEED_MOUSE);
    };

    const handleTouchStart = (event) => {
        touchStartY.current = event.touches[0].clientY;
    };

    const handleTouchMove = (event) => {
        const currentY = event.touches[0].clientY;
        const deltaY = touchStartY.current - currentY;
        touchStartY.current = currentY;

        advanceProgress(deltaY * SCROLL_SPEED_TOUCH);
    };

    // Helper functions for complex progress mapping
    // Generates a value between 0 and 1, starting at 'start' progress and peaking at 'end'
    const curve = (prog, start, end) => {
        if (prog < start) return 0;
        if (prog > end) return 1;
        return (prog - start) / (end - start);
    };

    // Generates a bell curve value (starts at 0, goes to 1, back to 0) between min and max
    const peak = (prog, start, peakObj, end) => {
        if (prog <= start || prog >= end) return 0;
        if (prog < peakObj) return (prog - start) / (peakObj - start);
        return 1 - ((prog - peakObj) / (end - peakObj));
    };


    return (
        <motion.div
            className="svg-intro"
            initial={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{
                opacity: 0,
                scale: 1.5,
                filter: 'blur(30px)',
            }}
            transition={{
                duration: 1.5,
                ease: [0.76, 0, 0.24, 1]
            }}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
        >
            <div className={`svg-intro__noise ${progress > 0.6 && progress < 0.8 ? 'heavy-noise' : ''}`}></div>

            {/* Ocasional Fullscreen Glitch */}
            <motion.div
                className="svg-intro__glitch-overlay"
                style={{
                    opacity: peak(progress, 0.65, 0.7, 0.75) * 0.15
                }}
            />

            <div className="svg-intro__content">
                <svg
                    viewBox="0 0 1200 600"
                    className="svg-intro__main"
                    preserveAspectRatio="xMidYMid meet"
                >
                    <defs>
                        <linearGradient id="intro-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                            <stop offset="50%" stopColor="#5227FF" />
                            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                        </linearGradient>

                        <linearGradient id="intro-grad-vert" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                            <stop offset="50%" stopColor="#5227FF" />
                            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                        </linearGradient>

                        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#5227FF" stopOpacity="0.45" />
                            <stop offset="100%" stopColor="#5227FF" stopOpacity="0" />
                        </radialGradient>

                        <radialGradient id="glow-intense" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
                            <stop offset="20%" stopColor="#5227FF" stopOpacity="0.6" />
                            <stop offset="100%" stopColor="#5227FF" stopOpacity="0" />
                        </radialGradient>

                        <filter id="blur-glow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur in="SourceGraphic" stdDeviation="15" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>

                        <filter id="glitch-split">
                            <feOffset dx={progress > 0.6 && progress < 0.85 ? peak(progress, 0.6, 0.7, 0.8) * 15 : 0} dy="0" in="SourceGraphic" result="red-shift" />
                            <feOffset dx={progress > 0.6 && progress < 0.85 ? peak(progress, 0.6, 0.7, 0.8) * -15 : 0} dy="0" in="SourceGraphic" result="blue-shift" />
                            <feColorMatrix in="red-shift" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="red" />
                            <feColorMatrix in="blue-shift" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="cyan" />
                            <feBlend mode="screen" in="red" in2="cyan" result="color-shift" />
                            <feMerge>
                                <feMergeNode in="color-shift" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>

                        <clipPath id="text-clip">
                            {/* Un rectángulo que crece horizontalmente desde el centro */}
                            <motion.rect
                                x={600 - (curve(progress, 0.65, 0.95) * 600)}
                                y="0"
                                width={curve(progress, 0.65, 0.95) * 1200}
                                height="600"
                            />
                        </clipPath>
                    </defs>

                    {/* BACKGROUND LAYER: FASE 1 - MATRIX LINES */}
                    <motion.g className="data-stream" opacity={peak(progress, 0, 0.3, 0.6)}>
                        {dataStreamLines.map((_, i) => (
                            <motion.path
                                key={`data-${i}`}
                                d={`M ${100 + i * 25} -100 L ${100 + i * 25} 700`}
                                stroke="rgba(255,255,255,0.05)"
                                strokeWidth="2"
                                strokeDasharray="10 30 5 40 20 10"
                                initial={{ strokeDashoffset: Math.random() * 1000 }}
                                animate={{ strokeDashoffset: -10000 }}
                                transition={{ duration: 15 + Math.random() * 20, repeat: Infinity, ease: "linear" }}
                            />
                        ))}
                    </motion.g>

                    {/* BACKGROUND LAYER: FASE 2 - 3D GRID PERSPECTIVE */}
                    <motion.g
                        className="svg-grid-perspective"
                        initial={{ opacity: 0 }}
                        animate={{
                            opacity: peak(progress, 0.1, 0.4, 0.85) * 0.3,
                            y: curve(progress, 0.1, 0.8) * -150,
                            scale: 1 + curve(progress, 0.1, 0.8) * 0.5,
                            rotateX: 45 + curve(progress, 0.3, 0.7) * 45 // fake 3D tilt
                        }}
                        transform="translate(600,300) rotate(45) translate(-600,-300)"
                    >
                        {Array.from({ length: 40 }).map((_, i) => (
                            <path key={`ph-${i}`} d={`M -600 ${i * 30} L 1800 ${i * 30}`} stroke="#5227FF" strokeWidth="0.5" />
                        ))}
                        {Array.from({ length: 40 }).map((_, i) => (
                            <path key={`pv-${i}`} d={`M ${i * 30} -600 L ${i * 30} 1800`} stroke="#5227FF" strokeWidth="0.5" />
                        ))}
                    </motion.g>

                    {/* MID LAYER: FASE 3 - HEXAGONAL DATA CLUSTER */}
                    <motion.g
                        className="hex-cluster"
                        style={{ opacity: peak(progress, 0.2, 0.5, 0.75) }}
                    >
                        {hexGrid.map((_, i) => {
                            const row = Math.floor(i / 6);
                            const col = i % 6;
                            const xOffset = col * 90 + (row % 2 ? 45 : 0) + 330;
                            const yOffset = row * 78 + 150;

                            return (
                                <motion.polygon
                                    key={`hex-${i}`}
                                    points="0,-30 26,-15 26,15 0,30 -26,15 -26,-15"
                                    transform={`translate(${xOffset}, ${yOffset}) scale(${curve(progress, 0.2 + (i * 0.01), 0.4 + (i * 0.01))})`}
                                    fill="rgba(82, 39, 255, 0.05)"
                                    stroke="rgba(255, 255, 255, 0.15)"
                                    strokeWidth="1"
                                />
                            )
                        })}
                    </motion.g>

                    {/* CORE START */}
                    <g transform="translate(600, 300)">
                        {/* Ambient Central Glow */}
                        <motion.circle
                            cx="0" cy="0"
                            r="300"
                            fill={progress > 0.8 ? "url(#glow-intense)" : "url(#glow)"}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{
                                opacity: curve(progress, 0, 0.3) * (1 - curve(progress, 0.9, 1)),
                                scale: 0.5 + curve(progress, 0, 0.5) * 1.5 + (peak(progress, 0.8, 0.9, 1) * 2) // Huge explosion at end
                            }}
                        />

                        {/* FASE 2 & 3: Rotational Security Rings */}
                        {/* Outermost dotted */}
                        <motion.circle
                            r={180 + curve(progress, 0.5, 0.9) * 200}
                            fill="none"
                            stroke="rgba(82, 39, 255, 0.4)"
                            strokeWidth="2"
                            strokeDasharray="2 12"
                            initial={{ rotate: 0 }}
                            animate={{
                                rotate: 360,
                                opacity: peak(progress, 0.1, 0.4, 0.9)
                            }}
                            transition={{ rotate: { duration: 40, repeat: Infinity, ease: "linear" } }}
                        />

                        {/* Thick fragmented ring */}
                        <motion.circle
                            r={140 + curve(progress, 0.4, 0.9) * 150}
                            fill="none"
                            stroke="url(#intro-grad)"
                            strokeWidth="15"
                            strokeDasharray="40 100 10 30 50 150"
                            filter="url(#blur-glow)"
                            initial={{ rotate: 0 }}
                            animate={{
                                rotate: -360,
                                opacity: peak(progress, 0.2, 0.5, 0.85)
                            }}
                            transition={{ rotate: { duration: 25, repeat: Infinity, ease: "linear" } }}
                        />

                        {/* Target reticle rings */}
                        <motion.g opacity={peak(progress, 0.3, 0.6, 0.9)}>
                            <circle r="90" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="5 5" />
                            <path d="M 0 -100 L 0 -80 M 0 100 L 0 80 M -100 0 L -80 0 M 100 0 L 80 0" stroke="white" strokeWidth="2" />
                        </motion.g>

                        {/* FASE 1 & 2: The Core Object (Hyper-pyramid) */}
                        <motion.g
                            animate={{
                                rotateY: progress * 720,
                                rotateZ: progress * 360,
                                scale: curve(progress, 0, 0.3) * (1 - curve(progress, 0.7, 0.85)) * 1.5 // fades out for text
                            }}
                            transition={{ type: "spring", damping: 20 }}
                        >
                            <motion.polygon
                                points="0,-60 52,30 -52,30"
                                fill="rgba(82, 39, 255, 0.1)"
                                stroke="white"
                                strokeWidth="2"
                                filter="url(#blur-glow)"
                            />
                            <motion.polygon
                                points="0,-60 52,30 0,70"
                                fill="rgba(82, 39, 255, 0.3)"
                                stroke="url(#intro-grad-vert)"
                                strokeWidth="1.5"
                            />
                            <motion.polygon
                                points="0,-60 -52,30 0,70"
                                fill="rgba(255, 255, 255, 0.1)"
                                stroke="url(#intro-grad-vert)"
                                strokeWidth="1.5"
                            />
                        </motion.g>
                    </g>
                    {/* CORE END */}


                    {/* FOREGROUND: CIRCUIT BOARD TRACES (FASE 4) */}
                    <motion.g
                        stroke="rgba(82,39,255,0.7)"
                        strokeWidth="2"
                        fill="none"
                        filter="url(#blur-glow)"
                    >
                        {/* Left complex trace */}
                        <motion.path
                            d="M 0 50 L 200 50 L 250 100 L 400 100 L 450 250 L 550 250"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{
                                pathLength: curve(progress, 0.4, 0.7),
                                opacity: peak(progress, 0.4, 0.7, 0.95)
                            }}
                        />
                        <circle cx="550" cy="250" r="4" fill="white" style={{ opacity: progress > 0.65 ? 1 : 0 }} />

                        {/* Right complex trace */}
                        <motion.path
                            d="M 1200 500 L 1000 500 L 950 400 L 800 400 L 750 350 L 650 350"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{
                                pathLength: curve(progress, 0.45, 0.75),
                                opacity: peak(progress, 0.4, 0.75, 0.95)
                            }}
                        />
                        <circle cx="650" cy="350" r="4" fill="white" style={{ opacity: progress > 0.7 ? 1 : 0 }} />
                    </motion.g>

                    {/* MASSIVE GLITCH FRAME SCANNERS */}
                    <motion.rect
                        x="0"
                        y={curve(progress, 0.5, 0.8) * 600}
                        width="1200"
                        height="4"
                        fill="white"
                        filter="url(#blur-glow)"
                        opacity={peak(progress, 0.5, 0.65, 0.8)}
                    />
                    <motion.rect
                        x="0"
                        y={600 - (curve(progress, 0.55, 0.85) * 600)}
                        width="1200"
                        height="2"
                        fill="#5227FF"
                        opacity={peak(progress, 0.55, 0.7, 0.85)}
                    />


                    {/* THE GRAND REVEAL: TEXT (FASE 5 & 6) */}
                    {/* Background Glitch Text */}
                    <text
                        x="50%"
                        y="50%"
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="svg-intro__text glitch-layer"
                        fill="red"
                        opacity={peak(progress, 0.7, 0.75, 0.8) * 0.5}
                        style={{ letterSpacing: '0.2em', transform: 'translateX(10px)' }}
                    >
                        CARLOS RÁBAGO
                    </text>
                    <text
                        x="50%"
                        y="50%"
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="svg-intro__text glitch-layer"
                        fill="cyan"
                        opacity={peak(progress, 0.7, 0.75, 0.8) * 0.5}
                        style={{ letterSpacing: '0.2em', transform: 'translateX(-10px)' }}
                    >
                        CARLOS RÁBAGO
                    </text>

                    {/* Main Text */}
                    <text
                        x="50%"
                        y="50%"
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="svg-intro__text"
                        clipPath="url(#text-clip)"
                        filter="url(#glitch-split)"
                    >
                        <motion.tspan
                            initial={{ opacity: 0, letterSpacing: '4em' }}
                            animate={{
                                opacity: curve(progress, 0.65, 0.8),
                                letterSpacing: `${4 - curve(progress, 0.65, 0.95) * 3.7}em`,
                            }}
                        >
                            CARLOS RÁBAGO
                        </motion.tspan>
                    </text>

                    {/* Sub-text Designation */}
                    <text
                        x="50%"
                        y="58%"
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="svg-intro__subtext mono"
                        clipPath="url(#text-clip)"
                        opacity={curve(progress, 0.8, 0.9)}
                        letterSpacing="1em"
                        fill="var(--accent)"
                        fontSize="14"
                    >
                        CREATIVE ENGINEER // FRONT-END SPECIALIST
                    </text>

                    {/* HIGH DENSITY TECH SUI (Screen UI) DECORATION */}
                    <motion.g
                        className="svg-details"
                        fill="rgba(255,255,255,0.5)"
                        fontFamily="var(--font-mono)"
                        fontSize="10"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: curve(progress, 0.1, 0.3) }}
                    >
                        {/* Top Left Block */}
                        <g transform="translate(40, 40)">
                            <text y="0">SYS.KERNEL_PANIC :: FALSE</text>
                            <text y="15">OVR_CLOCK :: ENABLED</text>
                            <text y="30">MEM_ALLOC :: {Math.floor(progress * 16384)} MB</text>
                            <rect y="40" width="100" height="2" fill="rgba(255,255,255,0.2)" />
                            <motion.rect
                                y="40" width={progress * 100} height="2" fill="#5227FF"
                                filter="url(#blur-glow)"
                            />
                        </g>

                        {/* Bottom Right Block */}
                        <g transform="translate(950, 520)">
                            <text y="0" fill="#5227FF">UID_HASH :: 0x8F9B2A...</text>
                            <text y="15" fill={progress > 0.9 ? "#fff" : "rgba(255,255,255,0.3)"}>
                                {progress > 0.9 ? 'AUTHORIZED' : 'PENDING APPROVAL...'}
                            </text>
                            <motion.path
                                d="M 0 25 L 150 25 L 150 35 L 200 35"
                                stroke="rgba(255,255,255,0.3)"
                                fill="none"
                                strokeDasharray="2 4"
                            />
                        </g>

                        {/* Middle Left Data stream text */}
                        <g transform="translate(40, 300)" opacity="0.3">
                            <text y="0">01000011 01000001 01010010</text>
                            <text y="15">01001100 01001111 01010011</text>
                            <text y="30">00100000 01010010 01000001</text>
                        </g>

                        {/* Top Right Coordinate map */}
                        <g transform="translate(1000, 40)">
                            <path d="M 0 0 L 20 0 L 20 20 L 40 20 L 40 60 L 0 60 Z" fill="rgba(82,39,255,0.1)" stroke="#5227FF" strokeWidth="0.5" />
                            <circle cx="20" cy="30" r="2" fill="white" >
                                <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite" />
                            </circle>
                            <text x="50" y="10">LOC_X: 40.4168</text>
                            <text x="50" y="25">LOC_Y: 3.7038</text>
                        </g>
                    </motion.g>

                    {/* THE VAULT DOOR (Framing Rectangles) */}
                    <motion.rect
                        x="15" y="15" width="1170" height="570"
                        fill="none"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="1"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{
                            pathLength: curve(progress, 0.8, 1),
                            opacity: curve(progress, 0.8, 1),
                        }}
                    />
                    <motion.rect
                        x="10" y="10" width="1180" height="580"
                        fill="none"
                        stroke="#5227FF"
                        strokeWidth="2"
                        filter="url(#blur-glow)"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{
                            pathLength: curve(progress, 0.85, 1),
                            opacity: curve(progress, 0.85, 1) * peak(progress, 0.85, 0.95, 1.1) // Flashes intensely then normalizes
                        }}
                    />
                </svg>

                {/* BOTTOM CONTROL PANEL UI */}
                <div className="svg-intro__control-panel">
                    <motion.div
                        className="svg-intro__status mono"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                    >
                        <span className="blink">●</span>
                        <span className="status-text">{phase}</span>
                        <span className="status-percent">
                            [ {(progress * 100).toFixed(2).padStart(6, '0')}% ]
                        </span>
                    </motion.div>

                    {/* Multi-segmented Progress Bar */}
                    <div className="svg-intro__progress-container complex">
                        <div className="progress-bg"></div>
                        <motion.div
                            className="svg-intro__progress-bar"
                            style={{ scaleX: progress }}
                        />
                        {/* Target ticks */}
                        {[0.2, 0.4, 0.6, 0.85].map(tick => (
                            <div
                                key={`tick-${tick}`}
                                className={`progress-tick ${progress >= tick ? 'active' : ''}`}
                                style={{ left: `${tick * 100}%` }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
