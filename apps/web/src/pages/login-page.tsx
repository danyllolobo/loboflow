import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router';
import { useAuth } from '../contexts/auth-context';
import { useTheme } from '../contexts/theme-context';
import { LoboFlowLogo } from '../components/logo';
import { Sun, Moon, ArrowRight, Lock, Mail, AlertCircle, ShieldCheck } from 'lucide-react';

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
      setError(err?.message || 'E-mail ou senha incorretos. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col justify-center items-center relative overflow-hidden bg-background px-4">
      {/* Background Radial Glow */}
      <div className="absolute top-[-15%] left-[20%] w-[600px] h-[600px] rounded-full bg-primary/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[20%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[140px] pointer-events-none" />

      {/* Header com Theme Toggle */}
      <div className="absolute top-6 right-6 z-10">
        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="p-2.5 rounded-full border border-border bg-card/80 backdrop-blur-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-all duration-200 shadow-sm"
          title="Alternar tema"
          aria-label="Alternar tema"
        >
          {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      <div className="w-full max-w-md z-10">
        {/* Card de Login Premium com Double-Bezel */}
        <div className="p-8 sm:p-10 rounded-3xl border border-border bg-card shadow-2xl double-bezel space-y-7">
          {/* Logo e Boas-Vindas Comerciais */}
          <div className="text-center space-y-3">
            <div className="flex justify-center mb-2">
              <LoboFlowLogo className="h-11 w-auto" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
              Acesse sua conta
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Gestão de demandas, projetos, equipe e inteligência operacional para sua empresa.
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
              <label className="text-xs font-semibold text-foreground tracking-wide">
                E-mail Corporativo
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@empresa.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-sm shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground tracking-wide">
                  Senha
                </label>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Entre em contato com o administrador da sua organização para redefinir sua senha.');
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
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-sm shadow-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-medium text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-primary/25 flex items-center justify-center gap-2 group cursor-pointer mt-2"
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

          {/* Link para Criar Nova Conta */}
          <div className="text-center text-xs text-muted-foreground pt-4 border-t border-border">
            Sua empresa ainda não possui uma assinatura?{' '}
            <NavLink to="/register" className="text-primary font-semibold hover:underline">
              Começar agora
            </NavLink>
          </div>
        </div>

        {/* Rodapé Comercial Limpo */}
        <div className="mt-8 text-center text-xs text-muted-foreground space-y-1.5">
          <div className="flex items-center justify-center gap-1.5 text-muted-foreground/80">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>Ambiente seguro com criptografia de ponta a ponta</span>
          </div>
          <div>© {new Date().getFullYear()} LoboFlow Technologies. Todos os direitos reservados.</div>
        </div>
      </div>
    </div>
  );
}
