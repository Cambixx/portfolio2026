import { useRef, useState, useEffect } from 'react';
import { motion, useSpring, useMotionValue } from 'motion/react';

export function ProjectHoverReveal({ image, isActive }) {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const springConfig = { damping: 25, stiffness: 150 };
    const springX = useSpring(mouseX, springConfig);
    const springY = useSpring(mouseY, springConfig);

    useEffect(() => {
        const handleMouseMove = (e) => {
            mouseX.set(e.clientX);
            mouseY.set(e.clientY);
        };

        if (isActive) {
            window.addEventListener('mousemove', handleMouseMove);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, [isActive, mouseX, mouseY]);

    return (
        <motion.div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '300px',
                aspectRatio: '16/10',
                pointerEvents: 'none',
                zIndex: 999,
                x: springX,
                y: springY,
                translateX: '-50%',
                translateY: '-50%',
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
                opacity: isActive ? 1 : 0,
                scale: isActive ? 1 : 0.8,
                rotate: isActive ? 2 : 0
            }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        >
            <div style={{
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.2)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                background: '#111'
            }}>
                <img
                    src={image}
                    alt="Project Reveal"
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                    }}
                />
            </div>
        </motion.div>
    );
}
