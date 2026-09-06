import { motion } from 'motion/react';
import { SectionHeader } from '../components/SectionHeader';
import { useContent, useLanguage } from '../i18n/useLanguage';

const EASE = [0.16, 1, 0.3, 1];

const buildDate = new Date(__BUILD_DATE__);

export function Contact() {
    const data = useContent('contact');
    const site = useContent('site');
    const ui = useContent('ui');
    const { lang } = useLanguage();
    const lastUpdated = buildDate
        .toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { month: 'short', year: 'numeric' })
        .toUpperCase();

    return (
        <section id="contact" className="responsive-section" style={{ paddingBottom: '80px' }}>
            <SectionHeader meta={data.sectionMeta} title={data.title} />

            <motion.div
                className="brutal-card contact-card-main"
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-10% 0px' }}
                transition={{ duration: 0.9, ease: EASE }}
            >
                <div className="contact-grid">
                    <div>
                        <span className="contact-availability">{data.availability}</span>
                        <a href={`mailto:${data.email}`} className="contact-email-link">
                            {data.email}
                        </a>
                        <div>
                            <a href={`mailto:${data.email}`} className="brutal-btn">
                                {data.cta}
                            </a>
                        </div>
                    </div>

                    <div>
                        <span className="contact-social-label">{data.socialLabel}</span>
                        <div className="contact-social-list">
                            {data.social.map((link) => (
                                <a
                                    key={link.url}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mono brutal-tag contact-social-link"
                                >
                                    <span aria-hidden="true">→</span>
                                    {link.path}
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>

            <footer className="site-footer">
                <span>© {buildDate.getFullYear()} — {site.brand} — {site.version}</span>
                <span>{ui.contact.lastUpdated}: {lastUpdated}</span>
            </footer>
        </section>
    );
}
