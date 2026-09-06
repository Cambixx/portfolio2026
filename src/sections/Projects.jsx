import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RemotionHero } from '../components/RemotionHero';
import { SectionHeader } from '../components/SectionHeader';
import { useContent } from '../i18n/useLanguage';

export function Projects({ isMobile }) {
    const data = useContent('projects');
    const ui = useContent('ui');

    // Filter on the stable `categoryKey`, never on the translated label, so the
    // active filter survives a language switch.
    const [activeCategory, setActiveCategory] = useState('all');

    const categories = useMemo(
        () => [{ key: 'all', label: data.filterAllLabel }, ...data.categories],
        [data]
    );

    const filteredProjects = useMemo(() => {
        if (activeCategory === 'all') return data.items;
        return data.items.filter((item) => item.categoryKey === activeCategory);
    }, [activeCategory, data]);

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
            <div className="project-filters" role="tablist" aria-label={ui.projects.categoriesAria}>
                {categories.map((cat) => (
                    <button
                        key={cat.key}
                        role="tab"
                        aria-selected={activeCategory === cat.key}
                        className={`filter-btn mono ${activeCategory === cat.key ? 'active' : ''}`}
                        onClick={() => setActiveCategory(cat.key)}
                    >
                        {cat.label}
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
        </section>
    );
}
