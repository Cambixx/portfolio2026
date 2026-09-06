import { useCallback, useEffect, useMemo, useState } from 'react';
import { CONTENT, DEFAULT_LANGUAGE, LANGUAGES } from './content';
import { LanguageContext } from './useLanguage';

const STORAGE_KEY = 'portfolio-lang';

/**
 * Resolve the initial language: a previously saved choice wins, otherwise we
 * fall back to the browser's preferred language and finally to English.
 * Storage access is wrapped because it throws in some privacy modes.
 */
function detectLanguage() {
    try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (LANGUAGES.includes(saved)) return saved;
    } catch {
        /* storage unavailable — fall through to browser detection */
    }

    const candidates = navigator.languages?.length
        ? navigator.languages
        : [navigator.language];

    for (const tag of candidates) {
        const base = String(tag || '').toLowerCase().split('-')[0];
        if (LANGUAGES.includes(base)) return base;
    }

    return DEFAULT_LANGUAGE;
}

export function LanguageProvider({ children }) {
    const [lang, setLangState] = useState(detectLanguage);

    // Keep the document language in sync so screen readers and search engines
    // announce the right locale.
    useEffect(() => {
        document.documentElement.lang = lang;
    }, [lang]);

    const setLang = useCallback((next) => {
        if (!LANGUAGES.includes(next)) return;
        setLangState(next);
        try {
            window.localStorage.setItem(STORAGE_KEY, next);
        } catch {
            /* preference simply won't persist */
        }
    }, []);

    const toggleLang = useCallback(() => {
        setLang(lang === 'es' ? 'en' : 'es');
    }, [lang, setLang]);

    const value = useMemo(
        () => ({ lang, setLang, toggleLang, content: CONTENT[lang] }),
        [lang, setLang, toggleLang]
    );

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
}
