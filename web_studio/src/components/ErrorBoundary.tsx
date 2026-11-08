import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isResetting?: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State;
  public props: Props;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null,
      isResetting: false,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, isResetting: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in UI component:', error, errorInfo);
    try {
      const msg = (error && error.message) ? error.message : '';
      if (
        msg.indexOf('activeCategory') !== -1 ||
        msg.indexOf('Loading chunk') !== -1 ||
        msg.indexOf('dynamically imported module') !== -1 ||
        msg.indexOf('Failed to fetch') !== -1
      ) {
        const lastAutoRecover = sessionStorage.getItem('__auto_boundary_recovered');
        if (!lastAutoRecover) {
          sessionStorage.setItem('__auto_boundary_recovered', 'true');
          this.handleReset();
        }
      }
    } catch {}
  }

  private handleReset = async () => {
    this.setState({ isResetting: true });
    try {
      if ('caches' in window) {
        try {
          const names = await caches.keys();
          await Promise.all(names.map((name) => caches.delete(name)));
        } catch {}
      }
      if ('serviceWorker' in navigator) {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((reg) => reg.unregister()));
        } catch {}
      }
      try {
        sessionStorage.clear();
        localStorage.removeItem('__recovery_reload_attempted');
      } catch {}
    } catch {}
    this.setState({ hasError: false, error: null, isResetting: false });
    const cleanUrl = window.location.origin + window.location.pathname + '?fresh=' + Date.now();
    window.location.replace(cleanUrl);
  };

  private handleStudioReset = async () => {
    this.setState({ isResetting: true });
    try {
      if ('caches' in window) {
        try {
          const names = await caches.keys();
          await Promise.all(names.map((name) => caches.delete(name)));
        } catch {}
      }
      if ('serviceWorker' in navigator) {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((reg) => reg.unregister()));
        } catch {}
      }
      try {
        sessionStorage.clear();
        localStorage.removeItem('active_app_tab');
        localStorage.removeItem('news_studio_draft');
        localStorage.removeItem('__recovery_reload_attempted');
      } catch {}
      if (typeof (window as any).setAppTab === 'function') {
        (window as any).setAppTab('home');
      }
    } catch {}
    this.setState({ hasError: false, error: null, isResetting: false });
    window.location.replace(window.location.origin + '/?fresh=' + Date.now());
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
              disabled={this.state.isResetting}
              className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-60 text-neutral-950 text-xs font-black rounded-xl flex items-center gap-1.5 cursor-pointer shadow transition-all"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${this.state.isResetting ? 'animate-spin' : ''}`} />
              <span>{this.state.isResetting ? 'रीसेट हो रहा है...' : 'पुनः प्रयास करें (Retry)'}</span>
            </button>
            <button
              onClick={this.handleStudioReset}
              disabled={this.state.isResetting}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-60 text-neutral-200 text-xs font-bold rounded-xl cursor-pointer transition-all"
            >
              {this.state.isResetting ? 'सफाई जारी है...' : 'स्टूडियो रीसेट करें'}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
