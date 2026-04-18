import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { RemotionHero } from '../components/RemotionHero';
import { ProjectHoverReveal } from '../components/ProjectHoverReveal';
import data from '../data/projects.json';

export function Projects() {
    const [activeCategory, setActiveCategory] = useState('ALL');
    const [hoveredProject, setHoveredProject] = useState(null);

    const titleRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: titleRef,
        offset: ["start 90%", "end 50%"]
    });
    const xEven = useTransform(scrollYProgress, [0, 1], [-200, 0]);
    const xOdd = useTransform(scrollYProgress, [0, 1], [200, 0]);
    const opacityValue = useTransform(scrollYProgress, [0, 0.8], [0, 1]);

    const categories = useMemo(() => {
        const cats = new Set(data.items.map(item => item.category));
        return ['ALL', ...Array.from(cats)];
    }, []);

    const filteredProjects = useMemo(() => {
        if (activeCategory === 'ALL') return data.items;
        return data.items.filter(item => item.category === activeCategory);
    }, [activeCategory]);

    return (
        <section id="projects" className="responsive-section">
            {/* Section Header */}
            <div className="section-header">
                <span className="section-number">{data.sectionNumber}</span>
                <div className="section-title-wrapper">
                    <h2 className="section-title" ref={titleRef}>
                        {data.title.map((line, i) => (
                            <span key={i}>
                                <motion.span
                                    style={{ 
                                        display: 'inline-block',
                                        x: i % 2 === 0 ? xEven : xOdd,
                                        opacity: opacityValue
                                    }}
                                >
                                    {line}
                                </motion.span>
                                {i < data.title.length - 1 && <br />}
                            </span>
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

            {/* Filters */}
            <div className="project-filters">
                {categories.map((cat) => (
                    <button
                        key={cat}
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
                        <motion.div
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                            key={project.title}
                            className="project-card-container"
                            onClick={() => project.url && window.open(project.url, '_blank')}
                            onMouseEnter={() => setHoveredProject(project)}
                            onMouseLeave={() => setHoveredProject(null)}
                        >
                            <div className="project-grid">
                                <div className="project-info">
                                    <span className="mono project-meta">
                                        {project.category} / {project.year}
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
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Hover Reveal Portal (Desktop Only) */}
            {typeof window !== 'undefined' && window.innerWidth > 768 && (
                <ProjectHoverReveal
                    image={hoveredProject?.image}
                    isActive={!!hoveredProject}
                />
            )}

            <div className="brutal-divider" />
        </section>
    );
}
