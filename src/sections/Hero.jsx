import { motion, useReducedMotion } from 'motion/react';
import HeroCard from '../components/HeroCard';
import { useContent } from '../i18n/useLanguage';
import './Hero.css';

const EASE = [0.16, 1, 0.3, 1];

const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
};

const rise = {
    hidden: { opacity: 0, y: 28 },
    show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE } },
};

const lineReveal = {
    hidden: { y: '110%' },
    show: { y: 0, transition: { duration: 1.1, ease: EASE } },
};

const cardIn = {
    hidden: { opacity: 0, y: 40, scale: 0.97 },
    show: { opacity: 1, y: 0, scale: 1, transition: { duration: 1.1, ease: EASE, delay: 0.35 } },
};

export function Hero({ ready }) {
    const hero = useContent('hero');
    const ui = useContent('ui');
    const reduce = useReducedMotion();
    const state = ready || reduce ? 'show' : 'hidden';

    return (
        <section id="hero" className="hero" aria-label={ui.hero.aria}>
            <motion.div
                className="hero-grid"
                variants={container}
                initial="hidden"
                animate={state}
            >
                {/* ── Copy column ── */}
                <div className="hero-content-col">
                    <motion.div className="hero-status-pill mono" variants={rise}>
                        <span className="hero-status-dot" />
                        <span>{hero.badge}</span>
                    </motion.div>

                    <h1 className="hero-title">
                        {hero.title.map((line, index) => (
                            <span
                                key={line}
                                className={`hero-title__line${index === 1 ? ' hero-title__line--accent' : ''}`}
                            >
                                <motion.span className="hero-title__inner" variants={lineReveal}>
                                    {line}
                                </motion.span>
                            </span>
                        ))}
                    </h1>

                    <motion.p className="mono hero-lead-description" variants={rise}>
                        {hero.description}
                    </motion.p>

                    <motion.div className="hero-cta-group" variants={rise}>
                        <a href="#projects" className="hero-primary-btn mono">
                            <span>{ui.hero.primaryCta}</span>
                            <span className="hero-btn-icon" aria-hidden="true">↓</span>
                        </a>
                        <a href="#contact" className="hero-secondary-btn mono">
                            <span>{ui.hero.secondaryCta}</span>
                            <span className="hero-btn-icon" aria-hidden="true">→</span>
                        </a>
                    </motion.div>

                    <motion.div className="hero-meta-strip mono" variants={rise}>
                        <span>{hero.coordinates}</span>
                        <span className="hero-loc-tag">
                            <span className="hero-loc-dot" aria-hidden="true">◉</span>
                            {hero.location}
                        </span>
                    </motion.div>
                </div>

                {/* ── Visual column ── */}
                <motion.div className="hero-visual-col" variants={cardIn}>
                    <HeroCard stats={hero.stats} coreStack={hero.coreStack} />
                </motion.div>
            </motion.div>

            <motion.div
                className="hero-scroll-hint mono"
                initial={{ opacity: 0 }}
                animate={{ opacity: state === 'show' ? 1 : 0 }}
                transition={{ delay: 1.6, duration: 0.8 }}
                aria-hidden="true"
            >
                <span>{ui.hero.scroll}</span>
                <span className="hero-scroll-hint__line" />
            </motion.div>
        </section>
    );
}
