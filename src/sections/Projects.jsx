import { RemotionHero } from '../components/RemotionHero';
import data from '../data/projects.json';

export function Projects() {
    return (
        <section id="projects" className="responsive-section">
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

            {/* Showreel */}
            <div className="showreel-container">
                <div className="showreel-video-wrapper">
                    <RemotionHero />
                    <div className="showreel-badge">
                        <div className="badge-dot" />
                        {data.showreel.label}
                    </div>
                </div>
                <div className="showreel-footer">
                    <span className="mono showreel-label">{data.showreel.label}</span>
                    <span className="mono showreel-tech">{data.showreel.techLine}</span>
                </div>
            </div>

            {/* Project List */}
            <div className="project-list">
                {data.items.map((project, i) => (
                    <div
                        key={i}
                        className="project-card-container"
                        onClick={() => project.url && window.open(project.url, '_blank')}
                    >
                        <div className="project-grid">
                            <div className="project-info">
                                <span className="mono project-meta">
                                    {String(i + 1).padStart(2, '0')} / {project.year}
                                </span>
                                <h3 className="project-title-text">
                                    {project.title}
                                </h3>
                            </div>

                            <p className="mono project-desc">
                                {project.description}
                            </p>

                            <div className="project-tech-tags">
                                {project.tech.map((techItem, k) => (
                                    <span key={k} className="brutal-tag">{techItem}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="brutal-divider" />
        </section>
    );
}
