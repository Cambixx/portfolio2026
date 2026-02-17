export default function WindowFrame({ children }) {
    return (
        <div className="window-frame-shell">
            <div className="window-frame-content">{children}</div>
        </div>
    );
}
