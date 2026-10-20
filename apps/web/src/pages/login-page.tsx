import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router';
import { useAuth } from '../contexts/auth-context';
import { useTheme } from '../contexts/theme-context';
import { LoboFlowLogo } from '../components/logo';
import { Sun, Moon, ArrowRight, Lock, Mail, AlertCircle, Sparkles } from 'lucide-react';

export function LoginPage() {
  const { login } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Falha ao autenticar. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('LoboFlow@2026!');
  };

  return (
    <div className="min-h-screen w-screen flex flex-col justify-center items-center relative overflow-hidden bg-background px-4">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />

      {/* Header com Theme Toggle */}
      <div className="absolute top-6 right-6 z-10">
        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="p-2.5 rounded-xl border border-border bg-card/60 backdrop-blur-md hover:bg-accent/40 text-muted-foreground hover:text-foreground transition-all duration-200"
          title="Alternar tema"
          aria-label="Alternar tema"
        >
          {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      <div className="w-full max-w-md z-10">
        {/* Card de Login */}
        <div className="p-8 rounded-2xl border border-border/80 bg-card/80 backdrop-blur-xl shadow-2xl space-y-6">
          {/* Logo e Boas-Vindas */}
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <LoboFlowLogo className="h-10 w-auto" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-heading">
              Bem-vindo ao LoboFlow
            </h1>
            <p className="text-sm text-muted-foreground">
              Acesse o centro de comando e produtividade da sua empresa
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                E-mail Profissional
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@empresa.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Senha
                </label>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Entre em contato com o administrador da sua organização para resetar sua senha.');
                  }}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Esqueceu a senha?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl font-medium text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all duration-200 shadow-md hover:shadow-primary/25 flex items-center justify-center gap-2 group cursor-pointer"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Entrar na Plataforma</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Atalho de Credencial Rápida para Demonstração */}
          <div className="pt-2 border-t border-border/60">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span className="flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500" /> Acesso Rápido de Testes:
              </span>
              <button
                type="button"
                onClick={() => handleFillDemo('admin@loboads.com.br')}
                className="text-primary hover:underline font-medium"
              >
                Preencher LoboAds
              </button>
            </div>
          </div>

          {/* Link para Criar Nova Conta */}
          <div className="text-center text-xs text-muted-foreground">
            Sua empresa ainda não usa o LoboFlow?{' '}
            <NavLink to="/register" className="text-primary font-semibold hover:underline">
              Criar nova conta
            </NavLink>
          </div>
        </div>

        {/* Rodapé institucional */}
        <div className="mt-8 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} LoboFlow. Arquitetura Multi-Tenant com Isolamento Físico.
        </div>
      </div>
    </div>
  );
}
