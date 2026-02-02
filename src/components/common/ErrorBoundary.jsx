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
                    <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#1f2937' }}>
                        משהו השתבש
                    </h1>
                    <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
                        אירעה שגיאה בלתי צפויה. נסה לרענן את הדף.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            padding: '0.75rem 1.5rem',
                            backgroundColor: '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '1rem',
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
