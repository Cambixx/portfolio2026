import { motion } from 'motion/react';
import { SectionHeader } from '../components/SectionHeader';
import data from '../data/education.json';

const EASE = [0.16, 1, 0.3, 1];

export function Education() {
    return (
        <section id="education" className="responsive-section">
            <SectionHeader
                number={data.sectionNumber}
                title={data.title}
                description={data.description}
            />

            <div className="experience-list">
                {data.items.map((item, i) => (
                    <motion.article
                        key={item.line}
                        className="brutal-card experience-card"
                        initial={{ opacity: 0, y: 32 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-10% 0px' }}
                        transition={{ duration: 0.8, ease: EASE, delay: Math.min(i, 3) * 0.06 }}
                    >
                        <div className="experience-grid">
                            <div>
                                <span className="experience-index">{item.line}</span>
                                <h3 className="experience-role">{item.title}</h3>
                                <span className="experience-company">{item.school}</span>
                                <span className="experience-period">{item.period}</span>
                            </div>
                            <p className="experience-description">{item.description}</p>
                        </div>
                    </motion.article>
                ))}

                <motion.div
                    className="brutal-card stack-card"
                    initial={{ opacity: 0, y: 28 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-10% 0px' }}
                    transition={{ duration: 0.8, ease: EASE, delay: 0.12 }}
                >
                    <div className="stack-grid">
                        <span className="stack-label">{data.languages.label}</span>
                        <div className="stack-skills">
                            {data.languages.items.map((lang) => (
                                <span key={lang} className="brutal-tag">{lang}</span>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
