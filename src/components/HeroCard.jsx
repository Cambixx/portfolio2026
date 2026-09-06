import { useState, useRef, useEffect } from 'react';
import './HeroCard.css';

export default function HeroCard({ stats = [], coreStack = [] }) {
    const cardRef = useRef(null);
    const [tilt, setTilt] = useState({ x: 0, y: 0 });
    const [copied, setCopied] = useState(false);
    const [currentTime, setCurrentTime] = useState('');

    // Madrid local time tracker
    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('es-ES', {
                timeZone: 'Europe/Madrid',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
            setCurrentTime(`${timeStr} CET`);
        };
        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, []);

    // 3D perspective tilt effect
    const handleMouseMove = (e) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -8;
        const rotateY = ((x - centerX) / centerX) * 8;

        setTilt({ x: rotateX, y: rotateY });
    };

    const handleMouseLeave = () => {
        setTilt({ x: 0, y: 0 });
    };

    const copyEmail = () => {
        navigator.clipboard.writeText('carlosmiguel40@gmail.com');
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    return (
        <div
            className="hero-card-perspective-wrapper"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <div
                ref={cardRef}
                className="hero-card glass"
                style={{
                    transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                    transition: tilt.x === 0 && tilt.y === 0 ? 'transform 0.5s ease-out' : 'transform 0.1s ease-out'
                }}
            >
                {/* Subtle top glare/gradient line */}
                <div className="hero-card-glow-line" />

                {/* Card Header: Profile Info */}
                <div className="hero-card-header">
                    <div className="hero-avatar-wrapper">
                        <img
                            src="/assets/carlos.png"
                            alt="Carlos Rábago"
                            className="hero-avatar-img"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/assets/logo.jpeg';
                            }}
                        />
                        <span className="hero-avatar-pulse" title="Online / Available" />
                    </div>

                    <div className="hero-card-user-info">
                        <div className="hero-card-name-row">
                            <h3 className="hero-card-name">Carlos Rábago</h3>
                            <span className="hero-card-tag mono">SENIOR</span>
                        </div>
                        <p className="hero-card-role mono">Frontend Developer & Industrial Engineer</p>
                        <div className="hero-card-location mono">
                            <span className="hero-card-loc-icon">◉</span>
                            <span>Madrid, Spain</span>
                            <span className="hero-card-time">{currentTime}</span>
                        </div>
                    </div>
                </div>

                {/* Middle: Live Spec / Status Box */}
                <div className="hero-card-spec-box">
                    <div className="hero-card-spec-header">
                        <span className="mono spec-label">// STATUS & AVAILABILITY</span>
                        <span className="hero-live-badge mono">
                            <span className="live-dot" /> ACTIVE
                        </span>
                    </div>
                    <p className="mono hero-spec-text">
                        Specialized in modern, dynamic and interactive web interfaces — advanced motion with GSAP and Three.js, React architectures and WordPress (Timber/Twig) environments.
                    </p>
                    <div className="hero-card-tech-chips">
                        {(coreStack.length > 0 ? coreStack : ['React', 'JavaScript ES6+', 'GSAP', 'Three.js', 'Framer Motion', 'WordPress']).map((tech, i) => (
                            <span key={i} className="hero-tech-chip mono">
                                {tech}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Stats row */}
                <div className="hero-card-stats-grid">
                    {(stats.length > 0 ? stats : [
                        { value: '05+', label: 'Years Frontend' },
                        { value: '10+', label: 'Brand Projects' },
                        { value: 'ENG', label: 'Industrial Engineer' }
                    ]).map((s, idx) => (
                        <div key={idx} className="hero-card-stat-item">
                            <span className="hero-card-stat-val mono">{s.value}</span>
                            <span className="hero-card-stat-lbl mono">{s.label}</span>
                        </div>
                    ))}
                </div>

                {/* Footer Quick Actions */}
                <div className="hero-card-actions">
                    <button
                        onClick={copyEmail}
                        className="hero-card-action-btn mono copy-btn"
                        aria-live="polite"
                        title="Copy email to clipboard"
                    >
                        <span>{copied ? '✓ COPIED' : 'carlosmiguel40@gmail.com'}</span>
                    </button>
                    <div className="hero-card-socials-mini">
                        <a
                            href="https://www.linkedin.com/in/carlos-miguel-r%C3%A1bago-torcates-2a5447208"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hero-mini-social mono"
                            title="LinkedIn Profile"
                        >
                            IN
                        </a>
                        <a
                            href="tel:+34603728243"
                            className="hero-mini-social mono"
                            title="Call +34 603 728 243"
                        >
                            TEL
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
