import { useState, useRef, useEffect } from 'react';
import { useReducedMotion } from 'motion/react';
import { useContent, useLanguage } from '../i18n/useLanguage';
import './HeroCard.css';

const MONOGRAM = 'CR';

export default function HeroCard({ stats = [], coreStack = [] }) {
    const ui = useContent('ui');
    const contact = useContent('contact');
    const { lang } = useLanguage();
    const reduce = useReducedMotion();
    const cardRef = useRef(null);
    const [tilt, setTilt] = useState({ x: 0, y: 0 });
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
    const handleMouseMove = (e) => {
        if (!cardRef.current || reduce) return;
        const rect = cardRef.current.getBoundingClientRect();
        const rotateX = ((e.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * -4;
        const rotateY = ((e.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * 4;
        setTilt({ x: rotateX, y: rotateY });
    };

    const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

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
                style={{
                    transform: `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                    transition: tilt.x === 0 && tilt.y === 0
                        ? 'transform .6s var(--ease-out)'
                        : 'transform .15s ease-out',
                }}
            >
                <header className="hc-head">
                    <span className="hc-monogram" aria-hidden="true">{MONOGRAM}</span>
                    <div className="hc-id">
                        <h3 className="hc-name">
                            Carlos Rábago
                            <span className="hc-tag mono">{ui.heroCard.tag}</span>
                        </h3>
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
                        >
                            IN
                        </a>
                        <a
                            href={contact.social[1].url}
                            className="hc-link mono"
                            title={ui.heroCard.phoneTitle}
                        >
                            TEL
                        </a>
                    </div>
                </footer>
            </article>
        </div>
    );
}
