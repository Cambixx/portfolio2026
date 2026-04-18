import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import data from '../data/stack.json';

export function Stack() {
    const titleRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: titleRef,
        offset: ["start 90%", "end 50%"]
    });
    const xEven = useTransform(scrollYProgress, [0, 1], [-200, 0]);
    const xOdd = useTransform(scrollYProgress, [0, 1], [200, 0]);
    const opacityValue = useTransform(scrollYProgress, [0, 0.8], [0, 1]);
    return (
        <section id="stack" className="responsive-section">
            {/* Section Header */}
            <div className="section-header">
                <span className="section-number">{data.sectionNumber}</span>
                <div className="section-title-wrapper">
                    <h2 className="section-title" ref={titleRef}>
                        {data.title.map((line, i) => (
                            <span key={i}>
                                <motion.span
                                    style={{ 
                                        display: 'inline-block',
                                        x: i % 2 === 0 ? xEven : xOdd,
                                        opacity: opacityValue
                                    }}
                                >
                                    {line}
                                </motion.span>
                                {i < data.title.length - 1 && <br />}
                            </span>
                        ))}
                    </h2>
                    <p className="mono section-description">
                        {data.description}
                    </p>
                </div>
                <div className="brutal-divider" style={{ marginTop: '40px' }} />
            </div>

            {/* Skill Categories */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                {data.categories.map((cat, i) => (
                    <div
                        key={i}
                        className="brutal-card"
                        style={{ padding: '30px 40px' }}
                    >
                        <div className="stack-grid">
                            <span className="mono" style={{
                                fontSize: '0.8rem',
                                color: 'var(--accent)',
                                paddingTop: '6px',
                                fontWeight: 600
                            }}>
                                {cat.label}
                            </span>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                {cat.skills.map((skill, k) => (
                                    <span
                                        key={k}
                                        className={`brutal-tag ${skill.highlighted ? 'active' : ''}`}
                                    >
                                        {skill.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="brutal-divider" style={{ marginTop: '80px' }} />
        </section>
    );
}
