import { RemotionHero } from '../components/RemotionHero';
import data from '../data/projects.json';

export function Projects() {
    return (
        <section id="projects" style={{ padding: '120px 40px', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Section Header */}
            <div style={{ marginBottom: '80px' }}>
                <span className="section-number">{data.sectionNumber}</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px' }}>
                    <h2 className="section-title">
                        {data.title.map((line, i) => (
                            <span key={i}>{line}{i < data.title.length - 1 && <br />}</span>
                        ))}
                    </h2>
                    <p className="mono" style={{ maxWidth: '380px', color: 'var(--muted)', lineHeight: '1.7', fontSize: '0.85rem' }}>
                        {data.description}
                    </p>
                </div>
                <div className="brutal-divider" style={{ marginTop: '40px' }} />
            </div>

            {/* Showreel */}
            <div style={{ marginBottom: '100px' }}>
                <div style={{
                    width: '100%',
                    aspectRatio: '16/9',
                    maxHeight: '700px',
                    position: 'relative',
                    border: '2px solid var(--border)',
                    overflow: 'hidden'
                }}>
                    <RemotionHero />
                    <div style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        padding: '6px 14px',
                        fontSize: '0.7rem',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 400,
                        color: 'var(--muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        border: '1px solid var(--border)',
                        background: 'rgba(255, 255, 255, 0.03)',
                        backdropFilter: 'blur(10px)'
                    }}>
                        <div style={{ width: 5, height: 5, background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }} />
                        {data.showreel.label}
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                    <span className="mono" style={{ fontSize: '0.8rem', color: 'white' }}>{data.showreel.label}</span>
                    <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{data.showreel.techLine}</span>
                </div>
            </div>

            {/* Project List */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                {data.items.map((project, i) => (
                    <div
                        key={i}
                        className="project-card"
                        style={{
                            padding: '50px 0',
                            borderTop: '1px solid var(--border)',
                            cursor: project.url ? 'pointer' : 'default',
                            display: 'grid',
                            gridTemplateColumns: '1fr 2fr 1fr',
                            gap: '40px',
                            alignItems: 'center',
                            transition: 'all 0.3s'
                        }}
                        onClick={() => project.url && window.open(project.url, '_blank')}
                    >
                        <div>
                            <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--accent)', display: 'block', marginBottom: '12px' }}>
                                {String(i + 1).padStart(2, '0')} / {project.year}
                            </span>
                            <h3 style={{
                                fontSize: 'clamp(1.5rem, 3vw, 2.2rem)',
                                fontWeight: 700,
                                letterSpacing: '-0.02em',
                                textTransform: 'uppercase',
                                lineHeight: 1
                            }}>
                                {project.title}
                            </h3>
                        </div>

                        <p className="mono" style={{
                            color: 'var(--muted)',
                            fontSize: '0.85rem',
                            lineHeight: '1.7'
                        }}>
                            {project.description}
                        </p>

                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            {project.tech.map((t, k) => (
                                <span key={k} className="brutal-tag">{t}</span>
                            ))}
                        </div>
                    </div>
                ))}
                <div className="brutal-divider" />
            </div>
        </section>
    );
}
