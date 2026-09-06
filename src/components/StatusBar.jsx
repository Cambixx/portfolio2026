import { motion } from 'motion/react';
import { useContent } from '../i18n/useLanguage';
import './StatusBar.css';

export function StatusBar({ bgType, onToggleBg, isMobile, ready }) {
    const site = useContent('site');
    const ui = useContent('ui');
    const nextMode = bgType === 'dotgrid' ? ui.statusBar.field : ui.statusBar.grid;

    return (
        <motion.div
            className="status-bar"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : 16 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.8 }}
        >
            <div className="status-bar__status">
                <span className="status-bar__dot" style={{ background: site.statusBar.color, boxShadow: `0 0 10px ${site.statusBar.color}` }} />
                <span className="status-bar__text mono">{site.statusBar.text}</span>
            </div>

            <button
                type="button"
                onClick={onToggleBg}
                className="status-bar__toggle mono"
                title={ui.statusBar.backgroundTitle}
                aria-label={ui.statusBar.backgroundAria.replace('{mode}', nextMode)}
            >
                <span className="status-bar__toggle-icon" aria-hidden="true">◐</span>
                {!isMobile && <span>{bgType === 'dotgrid' ? ui.statusBar.grid : ui.statusBar.field}</span>}
            </button>
        </motion.div>
    );
}
