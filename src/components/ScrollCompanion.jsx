import { motion, useScroll, useSpring, useTransform } from 'motion/react';
import './ScrollCompanion.css';

/**
 * Slim vertical scroll progress indicator. Desktop only (see CSS).
 */
export default function ScrollCompanion() {
    const { scrollYProgress } = useScroll();

    const smooth = useSpring(scrollYProgress, {
        stiffness: 110,
        damping: 30,
        restDelta: 0.001,
    });

    const top = useTransform(smooth, [0, 1], ['0%', '100%']);
    const rotate = useTransform(smooth, [0, 1], [0, 360]);
    const percentage = useTransform(smooth, (p) => `${Math.round(p * 100).toString().padStart(2, '0')}`);
    const fill = useTransform(smooth, [0, 1], ['0%', '100%']);

    return (
        <div className="scroll-companion" aria-hidden="true">
            <div className="scroll-companion__track">
                <motion.div className="scroll-companion__fill" style={{ height: fill }} />
            </div>

            <motion.div className="scroll-companion__marker" style={{ top }}>
                <svg width="28" height="28" viewBox="0 0 40 40">
                    <motion.circle
                        cx={20}
                        cy={20}
                        r={2.2}
                        fill="var(--accent-soft)"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                    <path d="M 12 10 L 8 10 L 8 30 L 12 30" fill="none" stroke="var(--accent-soft)" strokeWidth="1" opacity="0.7" />
                    <path d="M 28 10 L 32 10 L 32 30 L 28 30" fill="none" stroke="var(--accent-soft)" strokeWidth="1" opacity="0.7" />
                    <motion.g style={{ rotate, originX: '20px', originY: '20px' }}>
                        <line x1={20} y1={4} x2={20} y2={8} stroke="var(--accent-soft)" strokeWidth={0.6} opacity="0.4" />
                        <line x1={20} y1={32} x2={20} y2={36} stroke="var(--accent-soft)" strokeWidth={0.6} opacity="0.4" />
                    </motion.g>
                </svg>
                <motion.span className="scroll-companion__value mono">{percentage}</motion.span>
            </motion.div>
        </div>
    );
}
