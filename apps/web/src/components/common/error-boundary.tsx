import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou um erro não tratado:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[300px] bg-background text-foreground animate-in fade-in duration-200">
          <div className="h-12 w-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mb-4 shadow-sm">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="text-base font-bold text-foreground mb-1">
            {this.props.fallbackTitle || 'Ops! Algo deu errado ao carregar esta área'}
          </h2>
          <p className="text-xs text-muted-foreground max-w-md mb-5 leading-relaxed">
            {this.props.fallbackMessage ||
              'Identificamos uma falha inesperada na interface. Clique abaixo para restabelecer a página.'}
          </p>
          {this.state.error && (
            <div className="mb-4 p-2.5 bg-secondary/50 rounded-lg border border-border/80 text-[11px] font-mono text-muted-foreground max-w-lg overflow-x-auto text-left">
              {this.state.error.message}
            </div>
          )}
          <button
            onClick={this.handleReset}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-xs flex items-center gap-2 cursor-pointer transition-all"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Recarregar Página</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
