import { Component } from 'react';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Application error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    textAlign: 'center',
                    padding: '2rem',
                    direction: 'rtl',
                }}>
                    <h1 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-4)', color: 'var(--text-primary)' }}>
                        משהו השתבש
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
                        אירעה שגיאה בלתי צפויה. נסה לרענן את הדף.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            padding: 'var(--space-3) var(--space-6)',
                            backgroundColor: 'var(--primary-600)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            fontSize: 'var(--font-size-base)',
                            minHeight: '44px',
                        }}
                    >
                        רענן את הדף
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
