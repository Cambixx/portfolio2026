import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react';
import CircularText from './CircularText';
import site from '../data/site.json';
import './Nav.css';

const EASE = [0.16, 1, 0.3, 1];

export function Nav({ isMobile, ready }) {
    const [active, setActive] = useState('');
    const [hidden, setHidden] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    const { scrollY } = useScroll();

    // Hide on scroll down, show on scroll up
    useMotionValueEvent(scrollY, 'change', (latest) => {
        const prev = scrollY.getPrevious() ?? 0;
        setScrolled(latest > 24);
        if (menuOpen) return;
        setHidden(latest > prev && latest > 160);
    });

    // Active section tracking
    useEffect(() => {
        const ids = site.nav.map((n) => n.href.replace('#', ''));
        const sections = ids.map((id) => document.getElementById(id)).filter(Boolean);
        if (!sections.length) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) setActive(entry.target.id);
                });
            },
            { rootMargin: '-40% 0px -55% 0px', threshold: 0 }
        );
        sections.forEach((s) => observer.observe(s));

        const onTop = () => {
            if (window.scrollY < window.innerHeight * 0.4) setActive('');
        };
        window.addEventListener('scroll', onTop, { passive: true });

        return () => {
            observer.disconnect();
            window.removeEventListener('scroll', onTop);
        };
    }, []);

    // Lock scroll while the mobile menu is open
    useEffect(() => {
        document.documentElement.style.overflow = menuOpen ? 'hidden' : '';
        return () => { document.documentElement.style.overflow = ''; };
    }, [menuOpen]);

    const close = () => setMenuOpen(false);

    return (
        <>
            <motion.header
                className={`nav${scrolled ? ' nav--scrolled' : ''}`}
                initial={{ y: -24, opacity: 0 }}
                animate={{ y: hidden ? -110 : 0, opacity: ready ? 1 : 0 }}
                transition={{ duration: 0.6, ease: EASE }}
            >
                <a href="#hero" className="nav__brand" aria-label="Back to top" onClick={close}>
                    <CircularText
                        text="CARLOS*RÁBAGO*"
                        spinDuration={18}
                        onHover="speedUp"
                        radius={isMobile ? 20 : 26}
                    />
                    <span className="nav__brand-mark mono" aria-hidden="true">CR</span>
                </a>

                {!isMobile && (
                    <nav className="nav__links" aria-label="Primary">
                        {site.nav.map((item) => {
                            const id = item.href.replace('#', '');
                            const isActive = active === id;
                            return (
                                <a
                                    key={item.label}
                                    href={item.href}
                                    className={`nav__link mono${isActive ? ' nav__link--active' : ''}`}
                                    aria-current={isActive ? 'true' : undefined}
                                >
                                    <span className="nav__link-num">{item.num}</span>
                                    <span>{item.label}</span>
                                    {isActive && (
                                        <motion.span
                                            layoutId="nav-active-pill"
                                            className="nav__link-bg"
                                            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                                        />
                                    )}
                                </a>
                            );
                        })}
                    </nav>
                )}

                <div className="nav__right">
                    {!isMobile && (
                        <a href="#contact" className="nav__cta mono">
                            LET'S TALK <span aria-hidden="true">→</span>
                        </a>
                    )}
                    {isMobile && (
                        <button
                            type="button"
                            className={`nav__burger mono${menuOpen ? ' nav__burger--open' : ''}`}
                            onClick={() => setMenuOpen((v) => !v)}
                            aria-expanded={menuOpen}
                            aria-controls="mobile-menu"
                            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                        >
                            <span>{menuOpen ? 'CLOSE' : 'MENU'}</span>
                            <span className="nav__burger-lines" aria-hidden="true">
                                <i /><i />
                            </span>
                        </button>
                    )}
                </div>
            </motion.header>

            <AnimatePresence>
                {isMobile && menuOpen && (
                    <motion.div
                        id="mobile-menu"
                        className="mobile-menu"
                        initial={{ opacity: 0, clipPath: 'inset(0 0 100% 0)' }}
                        animate={{ opacity: 1, clipPath: 'inset(0 0 0% 0)' }}
                        exit={{ opacity: 0, clipPath: 'inset(0 0 100% 0)' }}
                        transition={{ duration: 0.55, ease: EASE }}
                    >
                        <nav className="mobile-menu__links" aria-label="Mobile">
                            {site.nav.map((item, i) => (
                                <motion.a
                                    key={item.label}
                                    href={item.href}
                                    className="mobile-menu__link"
                                    onClick={close}
                                    initial={{ opacity: 0, y: 24 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.15 + i * 0.07, duration: 0.6, ease: EASE }}
                                >
                                    <span className="mobile-menu__num mono">{item.num}</span>
                                    <span>{item.label}</span>
                                </motion.a>
                            ))}
                        </nav>
                        <motion.div
                            className="mobile-menu__footer mono"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                        >
                            <a href="#contact" onClick={close} className="mobile-menu__cta">
                                LET'S TALK →
                            </a>
                            <span>{site.statusBar.text}</span>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
