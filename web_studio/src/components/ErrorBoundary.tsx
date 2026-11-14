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
      // Only auto-recover once for genuine missing script chunks, NEVER on network/fetch errors
      const isChunkError = (
        msg.indexOf('Loading chunk') !== -1 ||
        msg.indexOf('dynamically imported module') !== -1
      );
      if (isChunkError) {
        const CHUNK_KEY = '__chunk_recovery_attempted';
        let hasRecovered = false;
        try {
          hasRecovered = sessionStorage.getItem(CHUNK_KEY) === 'true';
        } catch {}
        if (!hasRecovered) {
          try {
            sessionStorage.setItem(CHUNK_KEY, 'true');
          } catch {}
          this.handleHardReset();
          return;
        }
      }
    } catch {}
  }

  // Graceful in-place retry without wiping caches or forcing full-page browser reloads
  private handleReset = () => {
    this.setState({ isResetting: true });
    setTimeout(() => {
      this.setState({ hasError: false, error: null, isResetting: false });
    }, 150);
  };

  // Single bounded automatic chunk recovery reload (strictly preserves recovery flag and user session)
  private handleHardReset = async () => {
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
      // CRITICAL: Ensure the recovery flag is preserved across the reload.
      // Do NOT call sessionStorage.clear() or delete user session data!
      try {
        sessionStorage.setItem('__chunk_recovery_attempted', 'true');
      } catch {}
    } catch {}
    this.setState({ hasError: false, error: null, isResetting: false });
    window.location.reload();
  };

  // Studio recovery: restores the Studio interface without deleting user drafts or saved data
  private handleStudioReset = async () => {
    this.setState({ isResetting: true });
    try {
      // Preserve drafts, saved projects, templates, settings and user data
      if (typeof (window as any).setAppTab === 'function') {
        (window as any).setAppTab('studio');
      }
    } catch {}
    this.setState({ hasError: false, error: null, isResetting: false });
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
