import { motion } from 'motion/react';
import { SectionHeader } from '../components/SectionHeader';
import data from '../data/stack.json';

const EASE = [0.16, 1, 0.3, 1];

export function Stack() {
    return (
        <section id="stack" className="responsive-section">
            <SectionHeader
                number={data.sectionNumber}
                title={data.title}
                description={data.description}
            />

            <div className="stack-list">
                {data.categories.map((cat, i) => (
                    <motion.div
                        key={cat.label}
                        className="brutal-card stack-card"
                        initial={{ opacity: 0, y: 28 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-10% 0px' }}
                        transition={{ duration: 0.8, ease: EASE, delay: i * 0.08 }}
                    >
                        <div className="stack-grid">
                            <span className="stack-label">{cat.label}</span>
                            <div className="stack-skills">
                                {cat.skills.map((skill) => (
                                    <span
                                        key={skill.name}
                                        className={`brutal-tag ${skill.highlighted ? 'active' : ''}`}
                                    >
                                        {skill.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}
