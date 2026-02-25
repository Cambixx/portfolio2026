import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import './SvgIntro.css';

export default function SvgIntro({ onComplete }) {
    const [phase, setPhase] = useState('drawing'); // drawing, scaling, finishing

    useEffect(() => {
        // Timeline of the animation
        const timer1 = setTimeout(() => setPhase('scaling'), 2000);
        const timer2 = setTimeout(() => {
            setPhase('finishing');
            setTimeout(() => {
                if (onComplete) onComplete();
            }, 1000);
        }, 3200);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
        };
    }, [onComplete]);

    return (
        <motion.div
            className="svg-intro"
            initial={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{
                opacity: 0,
                scale: 1.4,
                filter: 'blur(25px)',
            }}
            transition={{
                duration: 1.5,
                ease: [0.76, 0, 0.24, 1]
            }}
        >
            <div className="svg-intro__content">
                <svg
                    viewBox="0 0 1000 400"
                    className="svg-intro__main"
                >
                    <defs>
                        <linearGradient id="intro-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="white" />
                            <stop offset="50%" stopColor="#5227FF" />
                            <stop offset="100%" stopColor="white" />
                        </linearGradient>
                    </defs>

                    {/* Stylized line */}
                    <motion.path
                        d="M 100 200 L 900 200"
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth="1"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1.5, ease: "easeInOut" }}
                    />

                    <text
                        x="50%"
                        y="50%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="svg-intro__text"
                    >
                        <motion.tspan
                            initial={{ opacity: 0, letterSpacing: '0.8em' }}
                            animate={{ opacity: 1, letterSpacing: '0.3em' }}
                            transition={{ duration: 2, ease: [0.215, 0.61, 0.355, 1] }}
                        >
                            CARLOS RÁBAGO
                        </motion.tspan>
                    </text>

                    {/* Animated frame/border */}
                    <motion.rect
                        x="50" y="50" width="900" height="300"
                        fill="none"
                        stroke="url(#intro-grad)"
                        strokeWidth="2"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{
                            pathLength: 1,
                            opacity: phase === 'finishing' ? 0 : 1,
                        }}
                        transition={{
                            pathLength: { duration: 2, ease: "easeInOut" },
                            opacity: { duration: 0.5 }
                        }}
                    />
                </svg>

                <motion.div
                    className="svg-intro__status mono"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    <span className="blink">●</span>
                    {phase === 'drawing' && "INITIALIZING SYSTEM..."}
                    {phase === 'scaling' && "REVEALING INTERFACE..."}
                    {phase === 'finishing' && "ACCESS GRANTED"}
                </motion.div>
            </div>
        </motion.div>
    );
}
