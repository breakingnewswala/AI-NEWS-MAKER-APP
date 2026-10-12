import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends (Component as any) {
  public state: State;
  public props: Props;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in UI component:', error, errorInfo);
  }

  private handleReset = () => {
    (this as any).setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[220px] p-6 m-4 bg-neutral-900 border-2 border-red-500/40 rounded-2xl flex flex-col items-center justify-center text-center space-y-3 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">
            {this.props.fallbackTitle || 'कंपोनेंट लोड करने में समस्या आई'}
          </h3>
          <p className="text-xs text-neutral-400 max-w-md">
            {this.state.error?.message || 'अस्थायी लोड समस्या। कृपया पुनः प्रयास करें।'}
          </p>
          <div className="flex gap-2 pt-2">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-neutral-950 text-xs font-black rounded-xl flex items-center gap-1.5 cursor-pointer shadow transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>पुनः प्रयास करें (Retry)</span>
            </button>
            <button
              onClick={() => {
                this.handleReset();
                try {
                  window.location.hash = 'studio';
                } catch {}
              }}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold rounded-xl cursor-pointer transition-all"
            >
              स्टूडियो रीसेट करें
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
