import { motion, useScroll, useSpring, useTransform } from 'motion/react';
import { useEffect, useState } from 'react';

export default function ScrollCompanion() {
    const { scrollYProgress } = useScroll();

    // Smooth the scroll progress
    const smoothProgress = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    // Vertical position of the indicator (from top to bottom)
    const y = useTransform(smoothProgress, [0, 1], ['0%', '100%']);

    // Subtle rotation or scale based on scroll
    const rotate = useTransform(smoothProgress, [0, 1], [0, 360]);

    // Percentage text
    const percentage = useTransform(smoothProgress, p => `${Math.round(p * 100)}%`);

    return (
        <div style={{
            position: 'fixed',
            right: '24px',
            top: '50%',
            transform: 'translateY(-50%)',
            height: '60vh',
            width: '40px',
            zIndex: 90,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            pointerEvents: 'none',
        }}>
            {/* The Track */}
            <div style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                width: '1px',
                background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.1), transparent)',
            }} />

            {/* Scrolling SVG Element */}
            <motion.div
                style={{
                    position: 'absolute',
                    top: y,
                    marginTop: '-20px', // Center the element on the point
                }}
            >
                <svg width="40" height="40" viewBox="0 0 40 40">
                    {/* Glowing point */}
                    <motion.circle
                        cx={20}
                        cy={20}
                        r={2}
                        fill="var(--accent)"
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />

                    {/* Retro-tech brackets */}
                    <motion.path
                        d="M 12 10 L 8 10 L 8 30 L 12 30"
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth="1"
                        style={{ opacity: 0.6 }}
                    />
                    <motion.path
                        d="M 28 10 L 32 10 L 32 30 L 28 30"
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth="1"
                        style={{ opacity: 0.6 }}
                    />

                    {/* Animated Rotating Details */}
                    <motion.g style={{ rotate }}>
                        <motion.line x1={20} y1={5} x2={20} y2={8} stroke="var(--accent)" strokeWidth={0.5} style={{ opacity: 0.3 }} />
                        <motion.line x1={20} y1={32} x2={20} y2={35} stroke="var(--accent)" strokeWidth={0.5} style={{ opacity: 0.3 }} />
                    </motion.g>
                </svg>

                {/* Data readout label */}
                <motion.div style={{
                    position: 'absolute',
                    right: '45px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '9px',
                    color: 'var(--accent)',
                    whiteSpace: 'nowrap',
                    letterSpacing: '0.1em',
                    opacity: 0.5,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end'
                }}>
                    <span>POS_CR_026</span>
                    <motion.span>{percentage}</motion.span>
                </motion.div>
            </motion.div>

            {/* Top and Bottom indicators */}
            <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '8px',
                color: 'rgba(255,255,255,0.2)',
                marginBottom: '-20px'
            }}>00</div>

            <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '8px',
                color: 'rgba(255,255,255,0.2)',
                marginTop: 'auto',
                marginBottom: '-20px'
            }}>99</div>
        </div>
    );
}
