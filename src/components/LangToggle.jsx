import { motion } from 'motion/react';
import { useLanguage } from '../i18n/useLanguage';
import { LANGUAGES } from '../i18n/content';
import './LangToggle.css';

/**
 * Two-state ES/EN switch. The active pill slides between options via a shared
 * layoutId, matching the nav's active-link treatment.
 */
export function LangToggle({ variant = 'nav', onSelect }) {
    const { lang, setLang, content } = useLanguage();
    const labelId = `lang-toggle-label-${variant}`;

    return (
        <div
            className={`lang-toggle lang-toggle--${variant}`}
            role="group"
            aria-labelledby={labelId}
        >
            <span id={labelId} className="sr-only">
                {content.ui.langToggle.label}
            </span>

            {LANGUAGES.map((code) => {
                const isActive = lang === code;
                return (
                    <button
                        key={code}
                        type="button"
                        className={`lang-toggle__btn mono${isActive ? ' lang-toggle__btn--active' : ''}`}
                        onClick={() => {
                            setLang(code);
                            onSelect?.();
                        }}
                        aria-pressed={isActive}
                        lang={code}
                    >
                        {isActive && (
                            <motion.span
                                layoutId={`lang-toggle-pill-${variant}`}
                                className="lang-toggle__pill"
                                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                            />
                        )}
                        <span className="lang-toggle__code">{code.toUpperCase()}</span>
                    </button>
                );
            })}
        </div>
    );
}
