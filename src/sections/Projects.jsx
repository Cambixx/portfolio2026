import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RemotionHero } from '../components/RemotionHero';
import { ProjectHoverReveal } from '../components/ProjectHoverReveal';
import { SectionHeader } from '../components/SectionHeader';
import data from '../data/projects.json';

export function Projects({ isMobile }) {
    const [activeCategory, setActiveCategory] = useState('ALL');
    const [hoveredProject, setHoveredProject] = useState(null);

    const categories = useMemo(() => {
        const cats = new Set(data.items.map((item) => item.category));
        return ['ALL', ...Array.from(cats)];
    }, []);

    const filteredProjects = useMemo(() => {
        if (activeCategory === 'ALL') return data.items;
        return data.items.filter((item) => item.category === activeCategory);
    }, [activeCategory]);

    return (
        <section id="projects" className="responsive-section">
            <SectionHeader
                number={data.sectionNumber}
                title={data.title}
                description={data.description}
            />

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

            {/* Filters */}
            <div className="project-filters" role="tablist" aria-label="Project categories">
                {categories.map((cat) => (
                    <button
                        key={cat}
                        role="tab"
                        aria-selected={activeCategory === cat}
                        className={`filter-btn mono ${activeCategory === cat ? 'active' : ''}`}
                        onClick={() => setActiveCategory(cat)}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Project List */}
            <div className="project-list">
                <AnimatePresence mode="popLayout">
                    {filteredProjects.map((project, i) => (
                        <motion.article
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.97 }}
                            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: i * 0.03 }}
                            key={project.title}
                            className="project-card-container"
                            onClick={() => project.url && window.open(project.url, '_blank', 'noopener')}
                            onMouseEnter={() => setHoveredProject(project)}
                            onMouseLeave={() => setHoveredProject(null)}
                        >
                            <div className="project-grid">
                                <span className="project-index">
                                    {String(i + 1).padStart(2, '0')}
                                </span>

                                <div className="project-info">
                                    <span className="mono project-meta">
                                        {project.category} / {project.year}
                                    </span>
                                    <h3 className="project-title-text">
                                        {project.title}
                                        <span className="project-title-arrow" aria-hidden="true">↗</span>
                                    </h3>
                                </div>

                                <p className="mono project-desc">
                                    {project.description}
                                </p>

                                <div className="project-tech-tags">
                                    {project.tech.map((techItem) => (
                                        <span key={techItem} className="brutal-tag">{techItem}</span>
                                    ))}
                                </div>
                            </div>
                        </motion.article>
                    ))}
                </AnimatePresence>
            </div>

            {!isMobile && (
                <ProjectHoverReveal
                    image={hoveredProject?.image}
                    isActive={!!hoveredProject}
                />
            )}
        </section>
    );
}
