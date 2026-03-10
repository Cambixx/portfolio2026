import { useEffect, useMemo, useRef, useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'motion/react';
import './SvgIntro.css';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// Google-esque vibrant colors + Brand Accent
const colors = {
    primary: "#5227FF",
    red: "#FF3366",
    yellow: "#FFD500",
    cyan: "#00E5FF",
    green: "#00E676"
};

const palette = [colors.cyan, colors.yellow, colors.red, colors.green];

const RenderShape = ({ type, radius, fill, animate, ...props }) => {
    if (type === 'square') {
        return <motion.rect x={-radius} y={-radius} width={radius * 2} height={radius * 2} rx={radius / 3} fill={fill} animate={animate} {...props} />;
    }
    if (type === 'triangle') {
        return <motion.polygon points={`0,${-radius * 1.2} ${radius * 1.1},${radius * 0.8} ${-radius * 1.1},${radius * 0.8}`} fill={fill} animate={animate} {...props} />;
    }
    if (type === 'cross') {
        const w = radius * 0.4;
        return <motion.path d={`M${-w},${-radius} L${w},${-radius} L${w},${-w} L${radius},${-w} L${radius},${w} L${w},${w} L${w},${radius} L${-w},${radius} L${-w},${w} L${-radius},${w} L${-radius},${-w} L${-w},${-w} Z`} fill={fill} animate={animate} {...props} />;
    }
    // Default circle
    return <motion.circle cx={0} cy={0} r={radius} fill={fill} animate={animate} {...props} />;
};

export default function SvgIntro({ onComplete, initialProgress = 0 }) {
    // Scroll speed significantly reduced to lengthen the experience
    const SCROLL_SPEED_MOUSE = 0.00045;
    const SCROLL_SPEED_TOUCH = 0.0012;

    // Start progress based on property (so we can reverse back into it)
    const [progress, setProgress] = useState(initialProgress);
    const [isMobile, setIsMobile] = useState(false);
    const touchStartY = useRef(0);
    const isCompleted = useRef(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // More complex, phased friendly messages
    const phase = useMemo(() => {
        if (progress < 0.15) return 'Waking up the canvas...';
        if (progress < 0.35) return 'Gathering colors...';
        if (progress < 0.55) return 'Fusing ideas together...';
        if (progress < 0.80) return 'Expanding creativity...';
        return 'Ready!';
    }, [progress]);

    const advanceProgress = (delta) => {
        if (isCompleted.current) return;

        setProgress((prev) => clamp(prev + delta, 0, 1));
    };

    useEffect(() => {
        if (progress >= 1 && !isCompleted.current) {
            isCompleted.current = true;
            if (onComplete) onComplete();
        }
    }, [progress, onComplete]);

    const handleWheel = (event) => {
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

    // Helper mapping functions
    const curve = (prog, start, end) => {
        if (prog < start) return 0;
        if (prog > end) return 1;
        const t = (prog - start) / (end - start);
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const elasticCurve = (prog, start, end) => {
        if (prog < start) return 0;
        if (prog > end) return 1;
        const x = (prog - start) / (end - start);
        const c4 = (2 * Math.PI) / 3;
        return x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
    };

    const peak = (prog, start, peakObj, end) => {
        if (prog <= start || prog >= end) return 0;
        if (prog < peakObj) {
            const t = (prog - start) / (peakObj - start);
            return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        }
        const t = (prog - peakObj) / (end - peakObj);
        return 1 - (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
    };

    // Data-driven complex background elements (Orbiting satellites)
    const smallBlobs = useMemo(() => {
        const types = ['circle', 'square', 'triangle', 'cross'];
        return Array.from({ length: 16 }).map((_, i) => ({
            id: i,
            color: palette[i % 4],
            radius: 8 + (i % 6),
            angleOffset: (i / 16) * Math.PI * 2,
            distance: 250 + (i % 3) * 60,
            rotationSpeed: 6 + (i % 5),
            entryDelay: (i % 4) * 0.05,
            shapeType: types[i % 4]
        }));
    }, []);

    const ambientRings = useMemo(() => {
        return Array.from({ length: 4 }).map((_, i) => ({
            id: i,
            radius: 50 + i * 100,
            dash: 10 + i * 15,
            speed: i % 2 === 0 ? 1 : -1
        }));
    }, []);

    const scrambledData = useMemo(() => {
        const name = "CARLOS RÁBAGO";
        return name.split("").map(() => ({
            offsetX: (Math.random() - 0.5) * 80, // Reduced spread
            offsetY: (Math.random() - 0.5) * 50,
            rotation: (Math.random() - 0.5) * 90, // Keep the twist
            delayFactor: Math.random()
        }));
    }, []);

    return (
        <motion.div
            className="svg-intro-playful"
            initial={{ opacity: 1, scale: 1 }}
            exit={{
                opacity: 0,
                scale: 0.8,
                filter: 'blur(10px)',
            }}
            transition={{ duration: 0.6, ease: "backIn" }}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
        >
            <div className="svg-intro-playful__content">
                <svg
                    viewBox="0 0 1200 600"
                    className="svg-intro-playful__main"
                    preserveAspectRatio="xMidYMid meet"
                >
                    <defs>
                        <filter id="goo">
                            <feGaussianBlur in="SourceGraphic" stdDeviation="15" result="blur" />
                            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 25 -9" result="goo" />
                            <feBlend in="SourceGraphic" in2="goo" />
                        </filter>
                    </defs>

                    {/* VITAL FIX: Use standard `<g>` wrapper to define the 0,0 center. */}
                    {/* motion elements inside can use cx, cy, or rotate around this local 0,0 without overwriting coordinate space */}
                    <g transform="translate(600, 300)">

                        {/* PHASE 1: Ambient Decorative Rings */}
                        <motion.g opacity={curve(progress, 0, 0.4) * (1 - curve(progress, 0.6, 0.7))}>
                            {ambientRings.map(ring => (
                                <motion.circle
                                    key={`ring-${ring.id}`}
                                    cx={0}
                                    cy={0}
                                    r={ring.radius}
                                    fill="none"
                                    stroke="rgba(255,255,255,0.03)"
                                    strokeWidth="2"
                                    strokeDasharray={`${ring.dash} ${ring.dash * 2}`}
                                    animate={{ rotate: progress * 180 * ring.speed }}
                                />
                            ))}
                        </motion.g>

                        {/* PHASE 1 & 2: THE GOOEY DOTS SATELLITES */}
                        <motion.g filter="url(#goo)">

                            {/* Central Receiver Drop */}
                            <motion.circle
                                cx={0}
                                cy={0}
                                r="55"
                                fill={colors.primary}
                                animate={{
                                    cx: 0,
                                    cy: 0,
                                    scale: curve(progress, 0.45, 0.55) * (1 - curve(progress, 0.55, 0.65)),
                                }}
                            />

                            {/* 4 Main Core Dots Spiraling In */}
                            {palette.map((color, i) => {
                                const angle = (i * Math.PI) / 2;
                                const types = ['circle', 'square', 'triangle', 'cross'];
                                const radius = 30 + (i % 2) * 12;
                                return (
                                    <RenderShape
                                        key={`main-${i}`}
                                        type={types[i]}
                                        radius={radius}
                                        fill={color}
                                        animate={{
                                            x: Math.cos(angle + progress * 5) * (200 * (1 - curve(progress, 0.2, 0.6))),
                                            y: Math.sin(angle + progress * 5) * (200 * (1 - curve(progress, 0.2, 0.6))),
                                            scale: elasticCurve(progress, i * 0.05, i * 0.05 + 0.2) * (1 - curve(progress, 0.5, 0.65)),
                                            rotate: progress * (i % 2 === 0 ? 180 : -180)
                                        }}
                                    />
                                );
                            })}

                            {/* 16 Small Satellites Spiraling In */}
                            {smallBlobs.map((blob) => (
                                <RenderShape
                                    key={`blob-${blob.id}`}
                                    type={blob.shapeType}
                                    radius={blob.radius}
                                    fill={blob.color}
                                    animate={{
                                        x: Math.cos(blob.angleOffset + progress * blob.rotationSpeed) * (blob.distance * (1 - curve(progress, 0.2, 0.6))),
                                        y: Math.sin(blob.angleOffset + progress * blob.rotationSpeed) * (blob.distance * (1 - curve(progress, 0.2, 0.6))),
                                        scale: elasticCurve(progress, blob.entryDelay, blob.entryDelay + 0.2) * (1 - curve(progress, 0.5, 0.65)),
                                        rotate: progress * 360 * (blob.id % 2 === 0 ? 1 : -1)
                                    }}
                                />
                            ))}
                        </motion.g>

                        {/* PHASE 2.5: Collission Shockwaves (Ripples) */}
                        <motion.circle
                            cx={0}
                            cy={0}
                            r="120"
                            fill="none"
                            stroke={colors.primary}
                            strokeWidth="4"
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{
                                opacity: peak(progress, 0.45, 0.52, 0.6),
                                scale: curve(progress, 0.45, 0.6) * 3
                            }}
                        />
                        <motion.circle
                            cx={0}
                            cy={0}
                            r="150"
                            fill="none"
                            stroke={colors.cyan}
                            strokeWidth="2"
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{
                                opacity: peak(progress, 0.5, 0.55, 0.65),
                                scale: curve(progress, 0.5, 0.65) * 4
                            }}
                        />

                        {/* PHASE 3: ORGANIC BLOOM (Background Wave/Blob) */}
                        <motion.circle
                            cx="0"
                            cy="0"
                            r="60"
                            fill={colors.primary}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{
                                scale: elasticCurve(progress, 0.60, 0.85) * 40,
                                opacity: progress > 0.60 ? clamp(1 - (progress - 0.95) * 20, 0, 1) : 0
                            }}
                        />

                        {/* PHASE 4: SPECTACULAR TEXT REVEAL */}
                        <motion.g
                            initial={{ opacity: 0 }}
                            animate={{
                                opacity: progress > 0.62 ? 1 : 0
                            }}
                        >
                            {(() => {
                                const name = "CARLOS RÁBAGO";
                                const letters = name.split("");
                                return (
                                    <g transform="translate(0, -15)">
                                        {/* SVG Glow Filter for the text */}
                                        <defs>
                                            <filter id="textGlow" x="-50%" y="-50%" width="200%" height="200%">
                                                <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                                                <feMerge>
                                                    <feMergeNode in="blur" />
                                                    <feMergeNode in="SourceGraphic" />
                                                </feMerge>
                                            </filter>
                                            <filter id="glitchFlicker">
                                                <feFlood floodColor="var(--accent)" floodOpacity="0.3" />
                                                <feComposite in2="SourceGraphic" operator="in" />
                                                <feMerge>
                                                    <feMergeNode />
                                                    <feMergeNode in="SourceGraphic" />
                                                </feMerge>
                                            </filter>
                                        </defs>

                                        {isMobile ? (
                                            /* Simple Reverted Animation for Mobile */
                                            <motion.text
                                                x="0"
                                                y="0"
                                                dy="0.35em"
                                                textAnchor="middle"
                                                className="svg-intro-playful__text-main"
                                                fontSize="70"
                                                animate={{
                                                    opacity: curve(progress, 0.70, 0.85) * (1 - curve(progress, 0.96, 1.0))
                                                }}
                                            >
                                                CARLOS RÁBAGO
                                            </motion.text>
                                        ) : (
                                            <>
                                                {/* === SPARK PARTICLES along the stroke path === */}
                                                {letters.map((char, i) => {
                                                    const letterDelay = i * 0.012;
                                                    const drawInProg = curve(progress, 0.65 + letterDelay, 0.82 + letterDelay);
                                                    const exitProg = curve(progress, 0.90, 0.98);
                                                    const targetX = (i - 6) * 48;

                                                    // Only show sparks while drawing
                                                    if (drawInProg <= 0 || drawInProg >= 1) return null;

                                                    // Generate 3 sparks per active letter
                                                    return Array.from({ length: 3 }).map((_, s) => {
                                                        const sparkAngle = (drawInProg * Math.PI * 4) + (s * Math.PI * 0.7);
                                                        const sparkDist = 15 + s * 8;
                                                        const sparkX = targetX + Math.cos(sparkAngle) * sparkDist;
                                                        const sparkY = Math.sin(sparkAngle) * sparkDist;
                                                        const sparkSize = 1.5 - s * 0.4;
                                                        return (
                                                            <motion.circle
                                                                key={`spark-${i}-${s}`}
                                                                cx={sparkX}
                                                                cy={sparkY}
                                                                r={sparkSize}
                                                                fill={s === 0 ? '#ffffff' : 'var(--accent)'}
                                                                animate={{
                                                                    opacity: (1 - drawInProg) * (1 - exitProg) * 0.8,
                                                                }}
                                                            />
                                                        );
                                                    });
                                                })}

                                                {/* === GLITCH / GHOST LAYER (offset colored copies) === */}
                                                {letters.map((char, i) => {
                                                    const letterDelay = i * 0.012;
                                                    const drawInProg = curve(progress, 0.65 + letterDelay, 0.82 + letterDelay);
                                                    const settleProg = curve(progress, 0.78 + letterDelay, 0.86 + letterDelay);
                                                    const exitProg = curve(progress, 0.90, 0.98);
                                                    const targetX = (i - 6) * 48;

                                                    // Glitch offset shrinks to 0 as letter settles
                                                    const glitchX = (1 - settleProg) * (Math.sin(i * 7.3) * 12);
                                                    const glitchY = (1 - settleProg) * (Math.cos(i * 5.1) * 8);
                                                    const glitchOpacity = drawInProg * (1 - settleProg) * 0.4 * (1 - exitProg);

                                                    if (glitchOpacity <= 0.01) return null;
                                                    return (
                                                        <motion.text
                                                            key={`glitch-${i}`}
                                                            x={targetX + glitchX}
                                                            y={glitchY}
                                                            dy="0.35em"
                                                            textAnchor="middle"
                                                            className="svg-intro-playful__text-main"
                                                            fontSize="75"
                                                            style={{
                                                                fill: 'var(--accent)',
                                                                mixBlendMode: 'screen',
                                                            }}
                                                            animate={{
                                                                opacity: glitchOpacity,
                                                            }}
                                                        >
                                                            {char}
                                                        </motion.text>
                                                    );
                                                })}

                                                {/* === MAIN LETTERS with stroke draw + fill + glow === */}
                                                {letters.map((char, i) => {
                                                    const letterDelay = i * 0.012;
                                                    const drawInProg = curve(progress, 0.65 + letterDelay, 0.82 + letterDelay);
                                                    const pathLength = 500;
                                                    const dashOffset = pathLength * (1 - drawInProg);
                                                    const fillInProg = curve(progress, 0.78 + letterDelay, 0.88 + letterDelay);

                                                    // Exit: each letter disperses outward and fades
                                                    const outDelay = (letters.length - 1 - i) * 0.004;
                                                    const exitProg = curve(progress, 0.90 + outDelay, 0.98);

                                                    const finalOpacity = (drawInProg > 0 ? 1 : 0) * (1 - exitProg);
                                                    const finalFillOpacity = fillInProg * (1 - exitProg);

                                                    // Exit: dispersal with blur feel
                                                    const scale = 1 + (exitProg * 0.3); // Slight zoom UP on exit
                                                    const exitY = exitProg * ((i % 2 === 0 ? -1 : 1) * 30); // scatter vertically

                                                    const targetX = (i - 6) * 48;

                                                    // Glow intensity peaks when stroke is being drawn
                                                    const glowIntensity = drawInProg > 0 && drawInProg < 1;

                                                    return (
                                                        <motion.text
                                                            key={`char-${i}`}
                                                            x={targetX}
                                                            y={exitY}
                                                            dy="0.35em"
                                                            textAnchor="middle"
                                                            className="svg-intro-playful__text-main"
                                                            fontSize="75"
                                                            filter={glowIntensity ? 'url(#textGlow)' : 'none'}
                                                            style={{
                                                                stroke: '#ffffff',
                                                                strokeWidth: 0.75,
                                                                strokeDasharray: pathLength,
                                                            }}
                                                            animate={{
                                                                strokeDashoffset: dashOffset,
                                                                fillOpacity: finalFillOpacity,
                                                                opacity: finalOpacity,
                                                                scale: scale,
                                                            }}
                                                        >
                                                            {char}
                                                        </motion.text>
                                                    );
                                                })}

                                                {/* === UNDERLINE / SCAN LINE that sweeps left to right === */}
                                                {(() => {
                                                    const scanProg = curve(progress, 0.68, 0.85);
                                                    const scanExitProg = curve(progress, 0.90, 0.96);
                                                    if (scanProg <= 0) return null;
                                                    const lineWidth = 620; // total span of text
                                                    const scanX = -lineWidth / 2 + scanProg * lineWidth;
                                                    return (
                                                        <motion.g animate={{ opacity: (scanProg > 0 ? 0.6 : 0) * (1 - scanExitProg) }}>
                                                            {/* Main scan line */}
                                                            <motion.line
                                                                x1={-lineWidth / 2}
                                                                y1={38}
                                                                x2={scanX}
                                                                y2={38}
                                                                stroke="var(--accent)"
                                                                strokeWidth={1.5}
                                                            />
                                                            {/* Glowing head of the scan */}
                                                            <motion.circle
                                                                cx={scanX}
                                                                cy={38}
                                                                r={3}
                                                                fill="#ffffff"
                                                                animate={{
                                                                    opacity: scanProg < 1 ? [0.5, 1, 0.5] : 0,
                                                                }}
                                                                transition={{ duration: 0.3, repeat: Infinity }}
                                                            />
                                                        </motion.g>
                                                    );
                                                })()}
                                            </>
                                        )}
                                    </g>
                                );
                            })()}

                            {/* Subtitle with dramatic sweep-in */}
                            <motion.text
                                x="0"
                                y="55"
                                dy="0.35em"
                                textAnchor="middle"
                                className="svg-intro-playful__text-sub"
                                fontSize="18"
                                animate={{
                                    y: isMobile ? 55 : 55 + (1 - curve(progress, 0.85, 0.95)) * 25,
                                    opacity: curve(progress, 0.85, 0.95) * (1 - curve(progress, 0.96, 1.0)),
                                }}
                            >
                                CREATIVE ENGINEER
                            </motion.text>

                            {/* Decorative brackets around subtitle */}
                            {!isMobile && (() => {
                                const subReveal = curve(progress, 0.86, 0.94);
                                const subExit = curve(progress, 0.96, 1.0);
                                if (subReveal <= 0) return null;
                                return (
                                    <motion.g animate={{ opacity: subReveal * (1 - subExit) }}>
                                        <motion.line x1={-130} y1={50} x2={-130} y2={68} stroke="var(--accent)" strokeWidth={1} />
                                        <motion.line x1={130} y1={50} x2={130} y2={68} stroke="var(--accent)" strokeWidth={1} />
                                    </motion.g>
                                );
                            })()}
                        </motion.g>


                    </g>
                </svg>

                {/* BOTTOM PLAYFUL STATUS */}
                <motion.div
                    className="svg-intro-playful__panel"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="status-indicator">
                        <motion.div
                            className="status-dot"
                            animate={{
                                backgroundColor: [colors.cyan, colors.yellow, colors.red, colors.green, colors.primary],
                            }}
                            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                        />
                        <span>{phase}</span>
                    </div>

                    <div className="progress-track">
                        <motion.div
                            className="progress-fill"
                            style={{
                                scaleX: progress,
                                backgroundColor: progress > 0.75 ? '#fff' : colors.cyan
                            }}
                        />
                    </div>
                </motion.div>
            </div>

            {/* Subtle Scroll Indicator */}
            <motion.div
                className="scroll-indicator"
                initial={{ opacity: 0, x: "-50%", y: "-40%" }}
                animate={{
                    opacity: progress > 0.05 ? 0 : 1,
                    x: "-50%",
                    y: progress > 0.05 ? "-40%" : "-50%"
                }}
                transition={{ duration: 0.6 }}
            >
                <div className="scroll-indicator__text">SCROLL TO BEGIN</div>
                <div className="scroll-indicator__mouse">
                    <div className="scroll-indicator__wheel" />
                </div>
            </motion.div>
        </motion.div >
    );
}
