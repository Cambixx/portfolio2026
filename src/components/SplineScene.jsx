import React, { Suspense, lazy } from 'react';

const Spline = lazy(() => import('@splinetool/react-spline'));

/**
 * ErrorBoundary - Catch Spline runtime errors
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Spline Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#050505',
          color: 'rgba(255,255,255,0.2)',
          fontSize: '0.8rem'
        }}>
          3D Scene Unavailable
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * SplineScene - A lazy-loaded Spline scene component with Error Boundary.
 */
export function SplineScene({ scene, className, onLoad }) {
  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
            }}
          >
            <LoadingSpinner />
          </div>
        }
      >
        <Spline scene={scene} className={className} onLoad={onLoad} />
      </Suspense>
    </ErrorBoundary>
  );
}

function LoadingSpinner() {
  return (
    <span
      style={{
        width: 40,
        height: 40,
        border: '3px solid rgba(255, 255, 255, 0.1)',
        borderTopColor: '#fff',
        borderRadius: '50%',
        animation: 'spline-spin 0.8s linear infinite',
      }}
    />
  );
}

if (typeof document !== 'undefined') {
  const styleId = 'spline-scene-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes spline-spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }
}
