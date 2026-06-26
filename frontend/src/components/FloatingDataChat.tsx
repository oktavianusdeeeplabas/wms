import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bot, Loader2, MessageCircle, Minimize2, Send, Sparkles, X } from 'lucide-react';
import { client } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

type ChatRole = 'user' | 'assistant';

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

interface EntityListResponse<T = Record<string, unknown>> {
  items?: T[];
  total?: number;
}

interface DataSnapshot {
  generatedAt: string;
  sourceLimits: Record<string, number>;
  totals: Record<string, number>;
  records: Record<string, unknown[]>;
}

const DATA_ENTITIES = [
  'products',
  'inventory_lots',
  'stock_movements',
  'stock_transfers',
  'receiving_documents',
  'receiving_lines',
  'warehouses',
  'zones',
  'bins',
  'branches',
  'suppliers',
] as const;

const ENTITY_LIMIT = 80;

const STARTER_QUESTIONS = [
  'Which products are low on stock?',
  'Summarize today\'s warehouse risks.',
  'What inventory should I prioritize?',
];

const createMessage = (role: ChatRole, content: string): ChatMessage => ({
  id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  role,
  content,
});

const pickFields = (item: Record<string, unknown>) => {
  const keptFields = [
    'id',
    'name',
    'sku',
    'lot_number',
    'document_number',
    'transfer_number',
    'product_id',
    'supplier_id',
    'warehouse_id',
    'zone_id',
    'bin_id',
    'branch_id',
    'from_branch_id',
    'to_branch_id',
    'quantity',
    'expected_quantity',
    'received_quantity',
    'min_stock',
    'reorder_point',
    'movement_type',
    'reference_type',
    'status',
    'category',
    'expiry_date',
    'received_date',
    'requested_date',
    'created_at',
  ];

  return keptFields.reduce<Record<string, unknown>>((acc, field) => {
    if (item[field] !== undefined && item[field] !== null && item[field] !== '') {
      acc[field] = item[field];
    }
    return acc;
  }, {});
};

async function fetchDataSnapshot(): Promise<DataSnapshot> {
  const entries = await Promise.all(
    DATA_ENTITIES.map(async (entity) => {
      const response = await client.entities[entity].query({ limit: ENTITY_LIMIT, sort: '-created_at' });
      const data = response.data as EntityListResponse<Record<string, unknown>>;
      const items = Array.isArray(data?.items) ? data.items : [];
      return [
        entity,
        {
          total: Number(data?.total ?? items.length),
          items: items.map(pickFields),
        },
      ] as const;
    })
  );

  return {
    generatedAt: new Date().toISOString(),
    sourceLimits: Object.fromEntries(DATA_ENTITIES.map((entity) => [entity, ENTITY_LIMIT])),
    totals: Object.fromEntries(entries.map(([entity, value]) => [entity, value.total])),
    records: Object.fromEntries(entries.map(([entity, value]) => [entity, value.items])),
  };
}

function buildChatPrompt(question: string, snapshot: DataSnapshot, pathname: string, history: ChatMessage[]) {
  const recentHistory = history
    .slice(-6)
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join('\n');

  return `Current page: ${pathname}

Recent chat history:
${recentHistory || 'No previous chat yet.'}

Warehouse data snapshot:
${JSON.stringify(snapshot)}

User question:
${question}

Answer using only the warehouse data snapshot when making factual claims. If the data is limited by sampling, say so briefly. Prefer concise operational answers with specific product names, quantities, statuses, locations, dates, and recommended next actions where available.`;
}

export default function FloatingDataChat() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState<DataSnapshot | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage(
      'assistant',
      'Hi, I can answer questions about your WMS data: inventory, lots, receiving, transfers, locations, suppliers, and stock movements.'
    ),
  ]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const snapshotLabel = useMemo(() => {
    if (!snapshot) return 'Data not loaded';
    const time = new Date(snapshot.generatedAt).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `Data refreshed ${time}`;
  }, [snapshot]);

  useEffect(() => {
    if (!open) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, open]);

  useEffect(() => {
    if (!open || snapshot) return;
    void refreshSnapshot(false);
  }, [open, snapshot]);

  const refreshSnapshot = async (showToast = true) => {
    try {
      const nextSnapshot = await fetchDataSnapshot();
      setSnapshot(nextSnapshot);
      if (showToast) toast.success('Chat data refreshed');
      return nextSnapshot;
    } catch (error) {
      console.error('Failed to refresh chat data:', error);
      toast.error('Failed to load chat data');
      return null;
    }
  };

  const sendQuestion = async (questionText: string) => {
    const question = questionText.trim();
    if (!question || loading) return;

    const userMessage = createMessage('user', question);
    const assistantMessage = createMessage('assistant', '');
    const historyBeforeSend = messages;

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput('');
    setLoading(true);

    try {
      const activeSnapshot = snapshot || (await refreshSnapshot(false));
      if (!activeSnapshot) throw new Error('No data snapshot available');

      let accumulated = '';
      await client.ai.gentxt({
        model: 'gpt-4o-mini',
        stream: true,
        messages: [
          {
            role: 'system',
            content:
              'You are a concise WMS data assistant for warehouse operators. Give practical answers grounded in the provided data. Do not invent records.',
          },
          {
            role: 'user',
            content: buildChatPrompt(question, activeSnapshot, location.pathname, historyBeforeSend),
          },
        ],
        onChunk: (chunk: { content?: string }) => {
          accumulated += chunk.content || '';
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantMessage.id ? { ...message, content: accumulated } : message
            )
          );
        },
        onComplete: () => {
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantMessage.id
                ? { ...message, content: accumulated || 'I could not generate an answer from the available data.' }
                : message
            )
          );
        },
        onError: (error: { message?: string }) => {
          throw new Error(error?.message || 'Chat request failed');
        },
        timeout: 120_000,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Chat request failed';
      setMessages((prev) =>
        prev.map((item) =>
          item.id === assistantMessage.id
            ? { ...item, content: `I could not answer that yet. ${message}` }
            : item
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendQuestion(input);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setMinimized(false);
        }}
        className="fixed bottom-5 right-5 z-[70] flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl shadow-blue-900/20 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
        aria-label="Open data chat"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-[70] w-[calc(100vw-2.5rem)] max-w-[420px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl shadow-slate-900/20">
      <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-900 px-4 py-3 text-white">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500">
          <Bot className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">WMS Data Chat</p>
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-200" />}
          </div>
          <p className="truncate text-xs text-slate-300">{snapshotLabel}</p>
        </div>
        <button
          type="button"
          onClick={() => setMinimized((value) => !value)}
          className="rounded-md p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
          aria-label="Minimize data chat"
        >
          <Minimize2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
          aria-label="Close data chat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {!minimized && (
        <>
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
            <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50">
              <Sparkles className="mr-1 h-3 w-3" />
              Ask about live data
            </Badge>
            <button
              type="button"
              onClick={() => void refreshSnapshot(true)}
              className="text-xs font-medium text-slate-500 hover:text-blue-600"
              disabled={loading}
            >
              Refresh data
            </button>
          </div>

          <div className="h-[390px] overflow-y-auto bg-slate-50 px-4 py-3">
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[86%] rounded-lg px-3 py-2 text-sm leading-6 shadow-sm ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'border border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    {message.content ? (
                      <div className="whitespace-pre-wrap break-words">{message.content}</div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-400">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Thinking...
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="border-t border-slate-200 bg-white p-3">
            {messages.length <= 1 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {STARTER_QUESTIONS.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => void sendQuestion(question)}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void sendQuestion(input);
                  }
                }}
                placeholder="Ask about stock, transfers, receiving, suppliers..."
                className="min-h-[44px] max-h-28 resize-none text-sm"
                disabled={loading}
              />
              <Button type="submit" size="icon" disabled={loading || !input.trim()} className="h-11 w-11 bg-blue-600 hover:bg-blue-700">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
