import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';

/**
 * Shared animated section header.
 * Title lines slide in horizontally from alternating sides as the header
 * scrolls into view. The clip wrapper prevents the offset lines from causing
 * horizontal overflow on narrow viewports.
 */
export function SectionHeader({ number, title, description, divider = true }) {
    const ref = useRef(null);
    const reduce = useReducedMotion();
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ['start 92%', 'end 55%'],
    });

    const distance = reduce ? 0 : 90;
    const xEven = useTransform(scrollYProgress, [0, 1], [-distance, 0]);
    const xOdd = useTransform(scrollYProgress, [0, 1], [distance, 0]);
    const opacity = useTransform(scrollYProgress, [0, 0.7], [0, 1]);
    const descOpacity = useTransform(scrollYProgress, [0.2, 1], [0, 1]);
    const descY = useTransform(scrollYProgress, [0.2, 1], [reduce ? 0 : 16, 0]);

    return (
        <div className="section-header" ref={ref}>
            <span className="section-number">{number}</span>
            <div className="section-title-wrapper">
                <div className="section-title-clip">
                    <h2 className="section-title">
                        {title.map((line, i) => (
                            <span key={line}>
                                <motion.span
                                    className="section-title-line"
                                    style={{ x: i % 2 === 0 ? xEven : xOdd, opacity }}
                                >
                                    {line}
                                </motion.span>
                                {i < title.length - 1 && <br />}
                            </span>
                        ))}
                    </h2>
                </div>
                {description && (
                    <motion.p
                        className="mono section-description"
                        style={{ opacity: descOpacity, y: descY }}
                    >
                        {description}
                    </motion.p>
                )}
            </div>
            {divider && <div className="brutal-divider" style={{ marginTop: '40px' }} />}
        </div>
    );
}
