import { useEffect, useState, useRef, useCallback } from 'react';
import { client } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Brain,
  TrendingUp,
  ShieldAlert,
  Loader2,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Info,
  BarChart3,
} from 'lucide-react';
import type {
  Product,
  InventoryLot,
  StockMovement,
  StockTransfer,
  ReceivingDocument,
  Branch,
} from '@/lib/types';
import {
  buildForecastPrompt,
  buildFraudDetectionPrompt,
  type InventoryDataSummary,
} from '@/lib/ai-prompts';

interface AnalysisResult {
  content: string;
  timestamp: Date;
  status: 'idle' | 'loading' | 'streaming' | 'complete' | 'error';
  error?: string;
}

const EMOJI_LIST = [
  '\u{1F534}', // 🔴
  '\u{1F7E1}', // 🟡
  '\u{1F7E2}', // 🟢
  '\u{1F4CA}', // 📊
  '\u{1F4C8}', // 📈
  '\u{1F4C9}', // 📉
  '\u26A0\uFE0F', // ⚠️
  '\u{1F4A1}', // 💡
  '\u{1F6E1}\uFE0F', // 🛡️
  '\u{1F4CB}', // 📋
];

function stripEmojis(text: string): string {
  let result = text;
  for (const emoji of EMOJI_LIST) {
    result = result.split(emoji).join('');
  }
  return result.trim();
}

function extractLeadingEmoji(text: string): string {
  for (const emoji of EMOJI_LIST) {
    if (text.includes(emoji)) return emoji;
  }
  return '\u{1F4CB}'; // 📋 default
}

function parseMarkdownSections(content: string) {
  const sections: { title: string; icon: string; content: string }[] = [];
  const lines = content.split('\n');
  let currentSection: { title: string; icon: string; content: string } | null = null;

  for (const line of lines) {
    const headerMatch = line.match(/^###\s+(.+)/);
    if (headerMatch) {
      if (currentSection) sections.push(currentSection);
      const rawTitle = headerMatch[1];
      const icon = extractLeadingEmoji(rawTitle);
      const title = stripEmojis(rawTitle);
      currentSection = { title, icon, content: '' };
    } else if (currentSection) {
      currentSection.content += line + '\n';
    }
  }
  if (currentSection) sections.push(currentSection);
  return sections;
}

function getSeverityColor(icon: string) {
  switch (icon) {
    case '🔴': return 'border-red-300 bg-red-50';
    case '🟡': return 'border-amber-300 bg-amber-50';
    case '🟢': return 'border-emerald-300 bg-emerald-50';
    case '⚠️': return 'border-orange-300 bg-orange-50';
    case '📈': return 'border-blue-300 bg-blue-50';
    case '📉': return 'border-slate-300 bg-slate-50';
    case '💡': return 'border-violet-300 bg-violet-50';
    case '🛡️': return 'border-indigo-300 bg-indigo-50';
    default: return 'border-slate-200 bg-white';
  }
}

function getSeverityBadge(icon: string) {
  switch (icon) {
    case '🔴': return <Badge className="bg-red-100 text-red-800 text-xs">Critical</Badge>;
    case '🟡': return <Badge className="bg-amber-100 text-amber-800 text-xs">Warning</Badge>;
    case '🟢': return <Badge className="bg-emerald-100 text-emerald-800 text-xs">Info</Badge>;
    case '⚠️': return <Badge className="bg-orange-100 text-orange-800 text-xs">Alert</Badge>;
    default: return null;
  }
}

function AnalysisContent({ result }: { result: AnalysisResult }) {
  if (result.status === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Brain className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-lg font-medium">Ready to Analyze</p>
        <p className="text-sm mt-1">Click "Run Analysis" to start AI-powered analysis</p>
      </div>
    );
  }

  if (result.status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
        <p className="text-slate-600 font-medium">Preparing data for analysis...</p>
      </div>
    );
  }

  if (result.status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-red-500">
        <AlertTriangle className="w-12 h-12 mb-4" />
        <p className="font-medium">Analysis Failed</p>
        <p className="text-sm text-red-400 mt-1">{result.error || 'Unknown error occurred'}</p>
      </div>
    );
  }

  const sections = parseMarkdownSections(result.content);

  if (sections.length === 0 && result.content) {
    return (
      <div className="space-y-4">
        {result.status === 'streaming' && (
          <div className="flex items-center gap-2 text-blue-600 text-sm mb-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>AI is analyzing...</span>
          </div>
        )}
        <Card>
          <CardContent className="p-4">
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-slate-700">
              {result.content}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {result.status === 'streaming' && (
        <div className="flex items-center gap-2 text-blue-600 text-sm mb-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>AI is analyzing your data...</span>
        </div>
      )}
      {sections.map((section, idx) => (
        <Card key={idx} className={`border ${getSeverityColor(section.icon)}`}>
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <span className="text-lg">{section.icon}</span>
                {section.title}
              </CardTitle>
              {getSeverityBadge(section.icon)}
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap text-[13px] leading-relaxed">
              {section.content.trim()}
            </div>
          </CardContent>
        </Card>
      ))}
      {result.status === 'complete' && (
        <div className="flex items-center gap-2 text-emerald-600 text-sm pt-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Analysis complete · {result.timestamp.toLocaleTimeString()}</span>
        </div>
      )}
    </div>
  );
}

export default function AIAnalytics() {
  const [activeTab, setActiveTab] = useState('forecast');
  const [inventoryData, setInventoryData] = useState<InventoryDataSummary | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  const [forecastResult, setForecastResult] = useState<AnalysisResult>({
    content: '',
    timestamp: new Date(),
    status: 'idle',
  });

  const [fraudResult, setFraudResult] = useState<AnalysisResult>({
    content: '',
    timestamp: new Date(),
    status: 'idle',
  });

  const abortRef = useRef(false);

  // Fetch all inventory data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, lotRes, movRes, transferRes, recRes, branchRes] = await Promise.all([
          client.entities.products.query({ limit: 200 }),
          client.entities.inventory_lots.query({ limit: 200 }),
          client.entities.stock_movements.query({ limit: 200, sort: '-created_at' }),
          client.entities.stock_transfers.query({ limit: 200 }),
          client.entities.receiving_documents.query({ limit: 200 }),
          client.entities.branches.query({ limit: 200 }),
        ]);

        setInventoryData({
          products: (prodRes.data?.items || []).map((p: Product) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            category: p.category,
            min_stock: p.min_stock,
            reorder_point: p.reorder_point,
          })),
          lots: (lotRes.data?.items || []).map((l: InventoryLot) => ({
            product_id: l.product_id,
            quantity: l.quantity,
            expiry_date: l.expiry_date,
            status: l.status,
            received_date: l.received_date,
          })),
          movements: (movRes.data?.items || []).map((m: StockMovement) => ({
            product_id: m.product_id,
            movement_type: m.movement_type,
            quantity: m.quantity,
            created_at: m.created_at,
            reference_type: m.reference_type,
          })),
          transfers: (transferRes.data?.items || []).map((t: StockTransfer) => ({
            product_id: t.product_id,
            from_branch_id: t.from_branch_id,
            to_branch_id: t.to_branch_id,
            quantity: t.quantity,
            status: t.status,
            requested_date: t.requested_date,
          })),
          receivingDocs: (recRes.data?.items || []).map((r: ReceivingDocument) => ({
            supplier_id: r.supplier_id,
            warehouse_id: r.warehouse_id,
            status: r.status,
            expected_date: r.expected_date,
            received_date: r.received_date,
          })),
          branches: (branchRes.data?.items || []).map((b: Branch) => ({
            id: b.id,
            name: b.name,
          })),
        });
      } catch (err) {
        console.error('Failed to fetch data for AI analysis:', err);
      } finally {
        setDataLoading(false);
      }
    };
    fetchData();
  }, []);

  const runForecast = useCallback(async () => {
    if (!inventoryData) return;
    abortRef.current = false;

    setForecastResult({ content: '', timestamp: new Date(), status: 'loading' });

    try {
      const prompt = buildForecastPrompt(inventoryData);
      let accumulated = '';

      setForecastResult(prev => ({ ...prev, status: 'streaming' }));

      await client.ai.gentxt({
        messages: [
          { role: 'system', content: 'You are an expert demand forecasting analyst for cloud kitchen warehouse operations. Provide structured, data-driven analysis.' },
          { role: 'user', content: prompt },
        ],
        model: 'gpt-4o-mini',
        stream: true,
        onChunk: (chunk: { content?: string }) => {
          if (abortRef.current) return;
          accumulated += chunk.content || '';
          setForecastResult(prev => ({ ...prev, content: accumulated }));
        },
        onComplete: () => {
          if (!abortRef.current) {
            setForecastResult(prev => ({
              ...prev,
              content: accumulated,
              status: 'complete',
              timestamp: new Date(),
            }));
          }
        },
        onError: (error: { message?: string }) => {
          setForecastResult(prev => ({
            ...prev,
            status: 'error',
            error: error?.message || 'Failed to generate forecast',
          }));
        },
        timeout: 120_000,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to run forecast analysis';
      setForecastResult(prev => ({
        ...prev,
        status: 'error',
        error: errorMsg,
      }));
    }
  }, [inventoryData]);

  const runFraudDetection = useCallback(async () => {
    if (!inventoryData) return;
    abortRef.current = false;

    setFraudResult({ content: '', timestamp: new Date(), status: 'loading' });

    try {
      const prompt = buildFraudDetectionPrompt(inventoryData);
      let accumulated = '';

      setFraudResult(prev => ({ ...prev, status: 'streaming' }));

      await client.ai.gentxt({
        messages: [
          { role: 'system', content: 'You are an expert fraud detection and anomaly analysis specialist for warehouse operations. Be thorough but avoid false positives.' },
          { role: 'user', content: prompt },
        ],
        model: 'gpt-4o-mini',
        stream: true,
        onChunk: (chunk: { content?: string }) => {
          if (abortRef.current) return;
          accumulated += chunk.content || '';
          setFraudResult(prev => ({ ...prev, content: accumulated }));
        },
        onComplete: () => {
          if (!abortRef.current) {
            setFraudResult(prev => ({
              ...prev,
              content: accumulated,
              status: 'complete',
              timestamp: new Date(),
            }));
          }
        },
        onError: (error: { message?: string }) => {
          setFraudResult(prev => ({
            ...prev,
            status: 'error',
            error: error?.message || 'Failed to run fraud detection',
          }));
        },
        timeout: 120_000,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to run fraud detection';
      setFraudResult(prev => ({
        ...prev,
        status: 'error',
        error: errorMsg,
      }));
    }
  }, [inventoryData]);

  const isAnalyzing = forecastResult.status === 'loading' || forecastResult.status === 'streaming'
    || fraudResult.status === 'loading' || fraudResult.status === 'streaming';

  const dataStats = inventoryData ? {
    products: inventoryData.products.length,
    movements: inventoryData.movements.length,
    transfers: inventoryData.transfers.length,
    receivingDocs: inventoryData.receivingDocs.length,
  } : null;

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
          <p className="text-slate-500">Loading inventory data for analysis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-violet-500" />
            AI Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            AI-powered demand forecasting and fraud detection for your warehouse operations
          </p>
        </div>
      </div>

      {/* Data Summary Cards */}
      {dataStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Products Analyzed', value: dataStats.products, icon: BarChart3, color: 'text-blue-600 bg-blue-100' },
            { label: 'Stock Movements', value: dataStats.movements, icon: TrendingUp, color: 'text-emerald-600 bg-emerald-100' },
            { label: 'Transfers', value: dataStats.transfers, icon: RefreshCw, color: 'text-violet-600 bg-violet-100' },
            { label: 'Receiving Docs', value: dataStats.receivingDocs, icon: Info, color: 'text-amber-600 bg-amber-100' },
          ].map(stat => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="border border-slate-200">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${stat.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">{stat.label}</p>
                    <p className="text-lg font-bold text-slate-800">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="forecast" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Demand Forecast
          </TabsTrigger>
          <TabsTrigger value="fraud" className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            Fraud Detection
          </TabsTrigger>
        </TabsList>

        {/* Forecast Tab */}
        <TabsContent value="forecast" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                    AI Demand Forecasting
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Analyzes stock movements, inventory levels, and consumption patterns to predict future demand
                  </CardDescription>
                </div>
                <Button
                  onClick={runForecast}
                  disabled={isAnalyzing || !inventoryData}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {forecastResult.status === 'loading' || forecastResult.status === 'streaming' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4 mr-2" />
                      Run Analysis
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <AnalysisContent result={forecastResult} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fraud Detection Tab */}
        <TabsContent value="fraud" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-red-500" />
                    AI Fraud Detection
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Scans stock movements, transfers, and receiving records for anomalies and suspicious patterns
                  </CardDescription>
                </div>
                <Button
                  onClick={runFraudDetection}
                  disabled={isAnalyzing || !inventoryData}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {fraudResult.status === 'loading' || fraudResult.status === 'streaming' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-4 h-4 mr-2" />
                      Run Scan
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <AnalysisContent result={fraudResult} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
