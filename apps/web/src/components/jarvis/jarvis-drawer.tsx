import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  Bot,
  User,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../contexts/auth-context';
import { api } from '../../lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolExecution?: {
    tool: string;
    level: 1 | 2 | 3;
    status: 'succeeded' | 'pending_confirmation' | 'cancelled';
    details?: string;
  };
  references?: { type: string; id: string; label: string }[];
}

export function JarvisDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Olá, ${user?.name || ''}! Eu sou o Jarvis, seu assistente de inteligência operacional no LoboFlow. Como posso otimizar seu dia hoje?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const quickPrompts = [
    'Quais são minhas prioridades hoje?',
    'Quais tarefas estão atrasadas?',
    'Resuma o progresso dos projetos',
    'Quem da equipe está sobrecarregado?',
  ];

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || isProcessing) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);

    try {
      const response: any = await api.post('/ai/chat', {
        conversationId,
        message: text,
      });

      if (response?.conversationId) {
        setConversationId(response.conversationId);
      }

      if (response?.message) {
        setMessages((prev) => [
          ...prev,
          {
            id: response.message.id,
            role: 'assistant',
            content: response.message.content,
            toolExecution: response.message.toolExecution,
            references: response.message.references,
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Não foi possível processar a solicitação no momento: ${err.message || 'Verifique a conexão com o servidor.'}`,
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
    >
      <div className="w-full sm:w-[480px] h-full bg-card border-l border-border shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-sky-500 to-cyan-400 text-white flex items-center justify-center shadow-md">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">Jarvis</span>
              <span className="text-[10px] font-semibold bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded-full border border-sky-500/20">
                IA Operacional
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Assistente multi-provedor (Gemini / OpenAI)</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={m.id}
              className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                  isUser
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                }`}
              >
                {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
              </div>

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  isUser
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : 'bg-secondary/60 text-foreground border border-border/60 rounded-tl-sm'
                }`}
              >
                {/* Indicador de Tool Execution */}
                {m.toolExecution && (
                  <div className="mb-2 p-2 rounded-lg bg-background/60 border border-border/80 text-xs flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-sky-400" />
                    <span className="font-mono text-[11px] text-muted-foreground truncate">
                      Ferramenta: <strong className="text-foreground">{m.toolExecution.tool}</strong> (Nível {m.toolExecution.level})
                    </span>
                    <span className="ml-auto text-emerald-400 text-[10px] flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="h-3 w-3" /> Executada
                    </span>
                  </div>
                )}

                <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>

                {/* Referências */}
                {m.references && m.references.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-border/40 flex flex-wrap gap-1.5">
                    {m.references.map((ref) => (
                      <span
                        key={ref.id}
                        className="text-[11px] bg-background/80 px-2 py-0.5 rounded-md border border-border text-muted-foreground flex items-center gap-1 font-medium"
                      >
                        <ArrowRight className="h-2.5 w-2.5 text-sky-400" /> {ref.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isProcessing && (
          <div className="flex gap-3 items-center text-xs text-muted-foreground">
            <div className="h-7 w-7 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Bot className="h-3.5 w-3.5 animate-spin" />
            </div>
            <span>Jarvis analisando base de dados da organização...</span>
          </div>
        )}
      </div>

      {/* Prompts Rápidos Sugeridos */}
      <div className="p-3 border-t border-border/60 bg-secondary/10 flex flex-wrap gap-1.5">
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p)}
            className="text-xs bg-background/80 hover:bg-secondary px-2.5 py-1 rounded-full border border-border/80 text-muted-foreground hover:text-foreground transition-all flex items-center gap-1"
          >
            <Sparkles className="h-2.5 w-2.5 text-sky-400" />
            <span>{p}</span>
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 border-t border-border flex gap-2 items-center bg-card"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pergunte ao Jarvis ou solicite uma ação..."
          className="flex-1 bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 text-foreground placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          disabled={!input.trim() || isProcessing}
          className="h-10 w-10 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white flex items-center justify-center transition-colors flex-shrink-0 shadow-md"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
      </div>
    </div>
  );
}
