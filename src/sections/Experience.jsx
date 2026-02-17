import data from '../data/experience.json';

export function Experience() {
    return (
        <section id="experience" style={{ padding: '120px 40px', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Section Header */}
            <div style={{ marginBottom: '80px' }}>
                <span className="section-number">{data.sectionNumber}</span>
                <h2 className="section-title">
                    {data.title.map((line, i) => (
                        <span key={i}>{line}{i < data.title.length - 1 && <br />}</span>
                    ))}
                </h2>
                <div className="brutal-divider" style={{ marginTop: '40px' }} />
            </div>

            {/* Timeline */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                {data.items.map((role, i) => (
                    <div
                        key={i}
                        className="brutal-card"
                        style={{
                            padding: '50px 40px',
                            borderTop: 'none',
                            borderLeft: role.isCurrent ? '3px solid var(--accent)' : '1px solid var(--border)',
                            borderRight: '1px solid var(--border)',
                            borderBottom: '1px solid var(--border)',
                            display: 'grid',
                            gridTemplateColumns: '1fr 2fr',
                            gap: '60px',
                            alignItems: 'start'
                        }}
                    >
                        <div>
                            <span className="mono" style={{
                                fontSize: '0.7rem',
                                color: 'rgba(255,255,255,0.15)',
                                display: 'block',
                                marginBottom: '16px'
                            }}>
                                {role.line}
                            </span>
                            <h3 style={{
                                fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '-0.02em',
                                lineHeight: 1.1,
                                marginBottom: '12px'
                            }}>
                                {role.title}
                            </h3>
                            <span className="mono" style={{
                                fontSize: '0.8rem',
                                color: 'var(--muted)',
                                display: 'block',
                                marginBottom: '8px'
                            }}>
                                {role.company}
                            </span>
                            <span className="mono" style={{
                                fontSize: '0.7rem',
                                padding: '4px 10px',
                                border: '1px solid var(--border)',
                                color: role.isCurrent ? 'var(--accent)' : 'var(--muted)',
                                display: 'inline-block'
                            }}>
                                {role.period}
                            </span>
                        </div>

                        <p className="mono" style={{
                            color: 'var(--muted)',
                            fontSize: '0.85rem',
                            lineHeight: '1.8',
                            paddingTop: '28px'
                        }}>
                            {role.description}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
}
