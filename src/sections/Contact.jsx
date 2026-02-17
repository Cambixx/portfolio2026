import data from '../data/contact.json';

export function Contact() {
    return (
        <section id="contact" className="responsive-section" style={{ paddingBottom: '80px' }}>
            {/* Section Header */}
            <div className="section-header">
                <span className="section-number">{data.sectionNumber}</span>
                <h2 className="section-title">
                    {data.title.map((line, i) => (
                        <span key={i}>{line}{i < data.title.length - 1 && <br />}</span>
                    ))}
                </h2>
                <div className="brutal-divider" style={{ marginTop: '40px' }} />
            </div>

            {/* Contact Content — Wrapped in Glass */}
            <div className="brutal-card contact-card-main" style={{ padding: 'clamp(24px, 5vw, 60px)' }}>
                <div className="contact-grid">
                    {/* Left — email + CTA */}
                    <div>
                        <span className="mono" style={{
                            fontSize: '0.75rem',
                            color: 'var(--accent)',
                            display: 'block',
                            marginBottom: '24px',
                            fontWeight: 600,
                            letterSpacing: '0.1em'
                        }}>
                            {data.availability}
                        </span>
                        <a
                            href={`mailto:${data.email}`}
                            className="contact-email-link"
                            style={{
                                fontFamily: 'var(--font-sans)',
                                fontSize: 'clamp(1.5rem, 3.5vw, 3rem)',
                                fontWeight: 700,
                                color: 'white',
                                textDecoration: 'none',
                                letterSpacing: '-0.02em',
                                display: 'block',
                                marginBottom: '40px',
                                transition: 'all 0.3s ease',
                                lineHeight: 1.1
                            }}
                            onMouseEnter={e => {
                                e.target.style.color = 'var(--accent)';
                                e.target.style.transform = 'translateX(10px)';
                            }}
                            onMouseLeave={e => {
                                e.target.style.color = 'white';
                                e.target.style.transform = 'translateX(0)';
                            }}
                        >
                            {data.email}
                        </a>

                        <a href={`mailto:${data.email}`} className="brutal-btn" style={{ backdropFilter: 'blur(10px)' }}>
                            {data.cta}
                        </a>
                    </div>

                    {/* Right — social links */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '10px' }}>
                        <span className="mono" style={{
                            fontSize: '0.75rem',
                            color: 'var(--muted)',
                            marginBottom: '16px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em'
                        }}>
                            {data.socialLabel}
                        </span>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {data.social.map((link, i) => (
                                <a
                                    key={i}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mono brutal-tag"
                                    style={{
                                        fontSize: '0.85rem',
                                        padding: '12px 20px',
                                        textDecoration: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        width: 'fit-content'
                                    }}
                                >
                                    <span style={{ color: 'var(--accent)', fontSize: '1rem' }}>→</span>
                                    {link.path}
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer handles dynamic date/copyright */}
            <div style={{
                marginTop: '120px',
                paddingTop: '24px',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px'
            }}>
                <span className="mono" style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.05em' }}>
                    © {new Date().getFullYear()} — CR.26 — v2.6
                </span>
                <span className="mono" style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.05em' }}>
                    LAST UPDATED: FEB 2026
                </span>
            </div>
        </section>
    );
}
