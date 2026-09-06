import { motion } from 'motion/react';
import { SectionHeader } from '../components/SectionHeader';
import data from '../data/experience.json';

const EASE = [0.16, 1, 0.3, 1];

export function Experience() {
    return (
        <section id="experience" className="responsive-section">
            <SectionHeader number={data.sectionNumber} title={data.title} />

            <div className="experience-list">
                {data.items.map((role, i) => (
                    <motion.article
                        key={role.line}
                        className={`brutal-card experience-card${role.isCurrent ? ' experience-card--current' : ''}`}
                        initial={{ opacity: 0, y: 32 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-10% 0px' }}
                        transition={{ duration: 0.8, ease: EASE, delay: Math.min(i, 3) * 0.06 }}
                    >
                        <div className="experience-grid">
                            <div>
                                <span className="experience-index">{role.line}</span>
                                <h3 className="experience-role">{role.title}</h3>
                                <span className="experience-company">{role.company}</span>
                                <span className="experience-period">{role.period}</span>
                            </div>
                            <div>
                                <p className="experience-description">{role.description}</p>
                                {role.highlights?.length > 0 && (
                                    <ul className="experience-highlights">
                                        {role.highlights.map((point) => (
                                            <li key={point}>{point}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </motion.article>
                ))}
            </div>
        </section>
    );
}
