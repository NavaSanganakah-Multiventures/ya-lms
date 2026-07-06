'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorKey: number;
}

class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorKey: 0,
  };

  public static getDerivedStateFromError(_: Error): Partial<State> {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);

    // Report error to backend
    fetch('/api/report-error', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        url: window.location.href,
        deviceInfo: navigator.userAgent,
        componentStack: errorInfo.componentStack,
      }),
    }).catch(err => console.error('Failed to report error:', err));
  }

  private handleReset = () => {
    this.setState(prev => ({ hasError: false, errorKey: prev.errorKey + 1 }));
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">🙏 क्षमा करें</h1>
            <p className="text-lg text-gray-600 mb-8">
              कुछ तकनीकी समस्या आई है। हमने एडमिन को सूचित कर दिया है।
              कृपया पेज रिफ्रेश करें।
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
              >
                दोबारा कोशिश करें (Retry)
              </button>
              <button
                onClick={() => window.location.reload()}
                className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                पेज रिफ्रेश करें (Reload)
              </button>
            </div>
          </div>
        </div>
      );
    }

    return <React.Fragment key={this.state.errorKey}>{this.props.children}</React.Fragment>;
  }
}

export default GlobalErrorBoundary;
