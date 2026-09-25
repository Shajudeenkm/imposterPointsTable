import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React Error Boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', 
          justifyContent: 'center', height: '100vh', padding: '20px', textAlign: 'center'
        }}>
          <img src="/Image/logo-icon.png" alt="Logo" style={{ width: 64, marginBottom: 20, filter: 'grayscale(1)' }} />
          <h2>Oops! Something went wrong.</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
            A rendering error occurred. Don't worry, your game data is safe.
          </p>
          <button 
            className="btn btn-primary" 
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;