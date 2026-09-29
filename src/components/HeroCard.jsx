import { useState, useRef, useEffect } from 'react';
import { useReducedMotion } from 'motion/react';
import { useContent, useLanguage } from '../i18n/useLanguage';
import './HeroCard.css';

const MONOGRAM = 'CR';

// Resting pose. Constant, so re-renders (clock, copy feedback) never
// overwrite the tilt written imperatively below.
const REST_STYLE = {
    transform: 'perspective(1200px) rotateX(0deg) rotateY(0deg)',
    transition: 'transform .6s var(--ease-out)',
};

export default function HeroCard({ stats = [], coreStack = [] }) {
    const ui = useContent('ui');
    const contact = useContent('contact');
    const { lang } = useLanguage();
    const reduce = useReducedMotion();
    const cardRef = useRef(null);
    const tiltFrame = useRef(0);
    const [copied, setCopied] = useState(false);
    const [currentTime, setCurrentTime] = useState('');

    // Madrid local time tracker
    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            setCurrentTime(now.toLocaleTimeString(lang === 'es' ? 'es-ES' : 'en-GB', {
                timeZone: 'Europe/Madrid',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
            }));
        };
        updateTime();
        // Sin segundos, basta con refrescar cada 30 s.
        const interval = setInterval(updateTime, 30000);
        return () => clearInterval(interval);
    }, [lang]);

    // Tilt sutil en perspectiva; se anula si el usuario pide menos movimiento.
    // Se escribe directamente en el estilo, como mucho una vez por frame:
    // pasar por el estado re-renderizaría la tarjeta en cada mousemove.
    const applyTilt = (x, y) => {
        const card = cardRef.current;
        if (!card) return;
        card.style.transform = `perspective(1200px) rotateX(${x}deg) rotateY(${y}deg)`;
        card.style.transition = x === 0 && y === 0 ? REST_STYLE.transition : 'transform .15s ease-out';
    };

    const handleMouseMove = (e) => {
        if (!cardRef.current || reduce) return;
        const { clientX, clientY } = e;
        cancelAnimationFrame(tiltFrame.current);
        tiltFrame.current = requestAnimationFrame(() => {
            const rect = cardRef.current.getBoundingClientRect();
            applyTilt(
                ((clientY - rect.top - rect.height / 2) / (rect.height / 2)) * -4,
                ((clientX - rect.left - rect.width / 2) / (rect.width / 2)) * 4
            );
        });
    };

    const handleMouseLeave = () => {
        cancelAnimationFrame(tiltFrame.current);
        applyTilt(0, 0);
    };

    useEffect(() => () => cancelAnimationFrame(tiltFrame.current), []);

    const copyEmail = () => {
        navigator.clipboard.writeText(contact.email);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const stack = coreStack.length > 0 ? coreStack : ['React', 'GSAP', 'Three.js', 'WordPress'];

    return (
        <div
            className="hero-card-perspective-wrapper"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <article
                ref={cardRef}
                className="hero-card glass"
                style={REST_STYLE}
            >
                <header className="hc-head">
                    <span className="hc-monogram" aria-hidden="true">{MONOGRAM}</span>
                    <div className="hc-id">
                        <p className="hc-name">Carlos Rábago</p>
                        <p className="hc-role mono">{ui.heroCard.role}</p>
                    </div>
                </header>

                <div className="hc-meta mono">
                    <span className="hc-status">
                        <span className="hc-dot" aria-hidden="true" />
                        {ui.heroCard.liveBadge}
                    </span>
                    <span className="hc-meta-right">
                        {ui.heroCard.location}
                        <time className="hc-time">{currentTime}</time>
                    </span>
                </div>

                <p className="hc-spec">{ui.heroCard.specText}</p>

                <ul className="hc-stack mono">
                    {stack.map((tech) => (
                        <li key={tech}>{tech}</li>
                    ))}
                </ul>

                <dl className="hc-stats">
                    {stats.map((s) => (
                        <div key={s.label} className="hc-stat">
                            <dt className="hc-stat-val">{s.value}</dt>
                            <dd className="hc-stat-lbl mono">{s.label}</dd>
                        </div>
                    ))}
                </dl>

                <footer className="hc-actions">
                    <button
                        type="button"
                        onClick={copyEmail}
                        className="hc-mail mono"
                        aria-live="polite"
                        title={ui.heroCard.copyTitle}
                    >
                        <span className="hc-mail-text">
                            {copied ? ui.heroCard.copied : contact.email}
                        </span>
                        <span className="hc-mail-icon" aria-hidden="true">
                            {copied ? '✓' : '⧉'}
                        </span>
                    </button>

                    <div className="hc-links">
                        <a
                            href={contact.social[0].url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hc-link mono"
                            title={ui.heroCard.linkedinTitle}
                            aria-label={ui.heroCard.linkedinTitle}
                        >
                            IN
                        </a>
                        <a
                            href={contact.social[1].url}
                            className="hc-link mono"
                            title={ui.heroCard.phoneTitle}
                            aria-label={ui.heroCard.phoneTitle}
                        >
                            TEL
                        </a>
                        <a
                            href={contact.cv.url}
                            download
                            className="hc-link mono"
                            title={ui.heroCard.cvTitle}
                            aria-label={ui.heroCard.cvTitle}
                        >
                            CV
                        </a>
                    </div>
                </footer>
            </article>
        </div>
    );
}
