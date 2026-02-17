import data from '../data/stack.json';

export function Stack() {
    return (
        <section id="stack" className="responsive-section">
            {/* Section Header */}
            <div className="section-header">
                <span className="section-number">{data.sectionNumber}</span>
                <div className="section-title-wrapper">
                    <h2 className="section-title">
                        {data.title.map((line, i) => (
                            <span key={i}>{line}{i < data.title.length - 1 && <br />}</span>
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
