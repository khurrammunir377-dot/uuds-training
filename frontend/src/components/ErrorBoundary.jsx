import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.removeItem('uuds_user');
      localStorage.removeItem('uuds_auth_token');
    } catch (e) {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-3xl p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold mb-2">Application Notice</h2>
            <p className="text-xs text-slate-400 mb-4">
              The application encountered a display refresh state. Click below to reload cleanly.
            </p>
            <div className="p-3 bg-slate-950 rounded-xl text-[11px] font-mono text-red-400 mb-6 text-left overflow-auto max-h-24">
              {String(this.state.error?.message || this.state.error)}
            </div>
            <button
              onClick={this.handleReset}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-blue-600/30"
            >
              Reload & Clear Cache
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
