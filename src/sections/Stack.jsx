import data from '../data/stack.json';

export function Stack() {
    return (
        <section id="stack" style={{ padding: '120px 40px', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Section Header */}
            <div style={{ marginBottom: '80px' }}>
                <span className="section-number">{data.sectionNumber}</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px' }}>
                    <h2 className="section-title">
                        {data.title.map((line, i) => (
                            <span key={i}>{line}{i < data.title.length - 1 && <br />}</span>
                        ))}
                    </h2>
                    <p className="mono" style={{ maxWidth: '380px', color: 'var(--muted)', fontSize: '0.85rem', lineHeight: '1.7' }}>
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
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '180px 1fr',
                            gap: '40px',
                            alignItems: 'start',
                            padding: '30px 40px'
                        }}
                    >
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
                ))}
            </div>

            <div className="brutal-divider" style={{ marginTop: '80px' }} />
        </section>
    );
}
