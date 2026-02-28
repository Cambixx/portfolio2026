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
    const SCROLL_SPEED_MOUSE = 0.0006;
    const SCROLL_SPEED_TOUCH = 0.0012;

    // Start progress based on property (so we can reverse back into it)
    const [progress, setProgress] = useState(initialProgress);
    const touchStartY = useRef(0);
    const isCompleted = useRef(false);

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

                        {/* PHASE 4: JOYFUL TEXT REVEAL */}
                        <motion.g
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{
                                scale: elasticCurve(progress, 0.75, 0.95),
                                opacity: progress > 0.70 ? 1 : 0
                            }}
                        >
                            <text
                                x="0"
                                y="-15"
                                textAnchor="middle"
                                dominantBaseline="central"
                                className="svg-intro-playful__text-main"
                            >
                                CARLOS RÁBAGO
                            </text>
                            <motion.text
                                x="0"
                                y="45"
                                textAnchor="middle"
                                dominantBaseline="central"
                                className="svg-intro-playful__text-sub"
                                animate={{
                                    y: 45 + (1 - curve(progress, 0.85, 0.95)) * 30, // Elastic lower text slide
                                    opacity: curve(progress, 0.85, 0.95)
                                }}
                            >
                                CREATIVE ENGINEER
                            </motion.text>
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
        </motion.div>
    );
}
