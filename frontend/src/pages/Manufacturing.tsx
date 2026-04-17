import { useEffect, useState } from 'react';
import { client } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Tag,
  Layers,
  Printer,
  Plus,
  Trash2,
  Save,
  Edit2,
  CheckSquare,
  Package,
  ClipboardList,
  Eye,
  X,
} from 'lucide-react';
import type { InventoryLot, LabelTemplate, Product } from '@/lib/types';
import { STATUS_COLORS } from '@/lib/types';

const LABEL_FIELDS = [
  { key: 'product_name', label: 'Product Name' },
  { key: 'sku', label: 'SKU' },
  { key: 'lot_number', label: 'Lot Number' },
  { key: 'batch_number', label: 'Batch Number' },
  { key: 'expiry_date', label: 'Expiry Date' },
  { key: 'received_date', label: 'Received Date' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'uom', label: 'Unit of Measure' },
  { key: 'zone', label: 'Storage Zone' },
  { key: 'supplier', label: 'Supplier' },
  { key: 'barcode', label: 'Barcode (Lot#)' },
  { key: 'qr_code', label: 'QR Code' },
];

const LABEL_SIZES = [
  { label: '100 × 50 mm', w: 100, h: 50 },
  { label: '70 × 40 mm', w: 70, h: 40 },
  { label: '100 × 70 mm', w: 100, h: 70 },
  { label: '50 × 30 mm', w: 50, h: 30 },
  { label: 'A6 (105 × 148 mm)', w: 105, h: 148 },
  { label: 'Custom', w: 0, h: 0 },
];

const TEMPLATE_TYPES = [
  { value: 'product_label', label: 'Product Label' },
  { value: 'case_marking', label: 'Case Marking' },
  { value: 'stacking_label', label: 'Stacking Label' },
  { value: 'production_gi', label: 'Production GI' },
];

// ─── Utility ─────────────────────────────────────────────────────────────────

const parseFields = (raw: string | null): string[] => {
  try {
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

// ─── Label Preview ────────────────────────────────────────────────────────────

function LabelPreview({
  fields,
  widthMm,
  heightMm,
  sampleLot,
  sampleProduct,
}: {
  fields: string[];
  widthMm: number;
  heightMm: number;
  sampleLot?: InventoryLot;
  sampleProduct?: Product;
}) {
  const scale = Math.min(320 / (widthMm || 100), 200 / (heightMm || 50));
  const pw = (widthMm || 100) * scale;
  const ph = (heightMm || 50) * scale;

  const getValue = (key: string): string => {
    if (!sampleLot) {
      const defaults: Record<string, string> = {
        product_name: 'Chicken Breast',
        sku: 'PRD-001',
        lot_number: 'LOT-20240417',
        batch_number: 'BAT-001',
        expiry_date: '2024-04-30',
        received_date: '2024-04-17',
        quantity: '50 kg',
        uom: 'kg',
        zone: 'Chilled Zone A',
        supplier: 'Fresh Farm Co.',
        barcode: '||| ||| || |||',
        qr_code: '▪▪▪▪▪',
      };
      return defaults[key] ?? key;
    }
    switch (key) {
      case 'product_name': return sampleProduct?.name ?? '-';
      case 'sku': return sampleProduct?.sku ?? '-';
      case 'lot_number': return sampleLot.lot_number;
      case 'batch_number': return sampleLot.batch_number ?? '-';
      case 'expiry_date': return sampleLot.expiry_date ? new Date(sampleLot.expiry_date).toLocaleDateString() : '-';
      case 'received_date': return sampleLot.received_date ? new Date(sampleLot.received_date).toLocaleDateString() : '-';
      case 'quantity': return String(sampleLot.quantity);
      case 'uom': return sampleProduct?.uom ?? '-';
      case 'barcode': return '||| ||| || |||';
      case 'qr_code': return '▪▪▪▪▪';
      default: return '-';
    }
  };

  const isBarcode = (key: string) => key === 'barcode';
  const isQr = (key: string) => key === 'qr_code';

  return (
    <div
      className="border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center overflow-hidden"
      style={{ width: pw, height: ph, minWidth: 160, minHeight: 80, position: 'relative' }}
    >
      <div className="w-full h-full p-1 flex flex-col justify-center gap-0.5 overflow-hidden" style={{ fontSize: Math.max(7, scale * 3.5) }}>
        {fields.length === 0 ? (
          <p className="text-slate-300 text-center text-xs">Select fields to preview</p>
        ) : (
          fields.map((key) => {
            const meta = LABEL_FIELDS.find((f) => f.key === key);
            const val = getValue(key);
            if (isBarcode(key)) {
              return (
                <div key={key} className="text-center">
                  <div className="font-mono text-slate-800 tracking-widest" style={{ fontSize: Math.max(8, scale * 5), letterSpacing: '0.15em' }}>
                    {val}
                  </div>
                  <div className="text-slate-500" style={{ fontSize: Math.max(5, scale * 2.5) }}>Barcode</div>
                </div>
              );
            }
            if (isQr(key)) {
              return (
                <div key={key} className="flex justify-center">
                  <div className="border border-slate-400 p-0.5 text-center" style={{ fontSize: Math.max(10, scale * 8) }}>⬛</div>
                </div>
              );
            }
            return (
              <div key={key} className="flex items-baseline gap-0.5 leading-tight truncate">
                <span className="text-slate-400 shrink-0" style={{ fontSize: Math.max(5, scale * 2.5) }}>{meta?.label}:</span>
                <span className="font-medium text-slate-800 truncate" style={{ fontSize: Math.max(6, scale * 3) }}>{val}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'case_marking', label: 'Case Marking', icon: Package },
  { key: 'stacking', label: 'Stacking', icon: Layers },
  { key: 'labelling', label: 'Labelling', icon: Tag },
  { key: 'production_gi', label: 'Production GI', icon: ClipboardList },
];

// ─── Case Marking Tab ─────────────────────────────────────────────────────────

function CaseMarkingTab({ lots, products }: { lots: InventoryLot[]; products: Product[] }) {
  const activeLots = lots.filter((l) => l.status === 'active');
  const getProduct = (id: number) => products.find((p) => p.id === id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Mark cases for active inventory lots</p>
        <Button size="sm" variant="outline">
          <Printer className="w-4 h-4 mr-1" /> Print All
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left py-2.5 px-3 text-slate-500 font-medium">Product</th>
              <th className="text-left py-2.5 px-3 text-slate-500 font-medium">Lot #</th>
              <th className="text-right py-2.5 px-3 text-slate-500 font-medium">Qty</th>
              <th className="text-left py-2.5 px-3 text-slate-500 font-medium">Expiry</th>
              <th className="text-left py-2.5 px-3 text-slate-500 font-medium">Status</th>
              <th className="py-2.5 px-3"></th>
            </tr>
          </thead>
          <tbody>
            {activeLots.slice(0, 50).map((lot, idx) => {
              const product = getProduct(lot.product_id);
              return (
                <tr key={lot.id} className={`border-b border-slate-100 hover:bg-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                  <td className="py-2.5 px-3">
                    <p className="font-medium text-slate-800">{product?.name ?? '-'}</p>
                    <p className="text-xs text-slate-400">{product?.sku}</p>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-xs text-slate-600">{lot.lot_number}</td>
                  <td className="py-2.5 px-3 text-right font-medium">{lot.quantity} <span className="text-slate-400 text-xs">{product?.uom}</span></td>
                  <td className="py-2.5 px-3 text-slate-500 text-xs">
                    {lot.expiry_date ? new Date(lot.expiry_date).toLocaleDateString() : '-'}
                  </td>
                  <td className="py-2.5 px-3">
                    <Badge className={`text-xs ${STATUS_COLORS[lot.status] ?? 'bg-gray-100 text-gray-800'}`}>{lot.status}</Badge>
                  </td>
                  <td className="py-2.5 px-3">
                    <Button size="sm" variant="ghost" className="h-7 px-2">
                      <Printer className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              );
            })}
            {activeLots.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-slate-400">No active lots</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Stacking Tab ─────────────────────────────────────────────────────────────

function StackingTab({ lots, products }: { lots: InventoryLot[]; products: Product[] }) {
  const getProduct = (id: number) => products.find((p) => p.id === id);

  const grouped = lots
    .filter((l) => l.status === 'active')
    .reduce<Record<number, InventoryLot[]>>((acc, lot) => {
      acc[lot.product_id] = acc[lot.product_id] ?? [];
      acc[lot.product_id].push(lot);
      return acc;
    }, {});

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">Stacking instructions grouped by product (FIFO order)</p>
      <div className="grid gap-4">
        {Object.entries(grouped).map(([productId, productLots]) => {
          const product = getProduct(Number(productId));
          const sorted = [...productLots].sort((a, b) =>
            new Date(a.expiry_date ?? '9999').getTime() - new Date(b.expiry_date ?? '9999').getTime()
          );
          const totalQty = sorted.reduce((s, l) => s + l.quantity, 0);
          return (
            <Card key={productId}>
              <CardHeader className="pb-2 pt-3 px-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold text-slate-800">{product?.name ?? `Product #${productId}`}</CardTitle>
                    <p className="text-xs text-slate-400">{product?.sku} · {totalQty} {product?.uom} total</p>
                  </div>
                  <Badge className="text-xs bg-blue-100 text-blue-800">{sorted.length} lots</Badge>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="space-y-1">
                  {sorted.map((lot, i) => (
                    <div key={lot.id} className="flex items-center gap-3 text-xs">
                      <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">{i + 1}</span>
                      <span className="font-mono text-slate-600 w-32">{lot.lot_number}</span>
                      <span className="text-slate-500">Exp: {lot.expiry_date ? new Date(lot.expiry_date).toLocaleDateString() : '-'}</span>
                      <span className="ml-auto font-medium text-slate-800">{lot.quantity} {product?.uom}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {Object.keys(grouped).length === 0 && (
          <div className="text-center py-12 text-slate-400">No active inventory to stack</div>
        )}
      </div>
    </div>
  );
}

// ─── Production GI Tab ────────────────────────────────────────────────────────

function ProductionGITab({ lots, products }: { lots: InventoryLot[]; products: Product[] }) {
  const getProduct = (id: number) => products.find((p) => p.id === id);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const activeLots = lots.filter((l) => l.status === 'active');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Select lots to issue for production</p>
        <Button size="sm" disabled={selected.size === 0}>
          <CheckSquare className="w-4 h-4 mr-1" /> Issue {selected.size > 0 ? `(${selected.size})` : ''}
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="py-2.5 px-3 w-8"></th>
              <th className="text-left py-2.5 px-3 text-slate-500 font-medium">Product</th>
              <th className="text-left py-2.5 px-3 text-slate-500 font-medium">Lot #</th>
              <th className="text-right py-2.5 px-3 text-slate-500 font-medium">Available Qty</th>
              <th className="text-left py-2.5 px-3 text-slate-500 font-medium">Expiry</th>
            </tr>
          </thead>
          <tbody>
            {activeLots.slice(0, 50).map((lot, idx) => {
              const product = getProduct(lot.product_id);
              const checked = selected.has(lot.id);
              return (
                <tr
                  key={lot.id}
                  onClick={() => toggleSelect(lot.id)}
                  className={`border-b border-slate-100 cursor-pointer ${checked ? 'bg-blue-50' : idx % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/50 hover:bg-slate-100'}`}
                >
                  <td className="py-2.5 px-3">
                    <input type="checkbox" checked={checked} onChange={() => toggleSelect(lot.id)} className="rounded" />
                  </td>
                  <td className="py-2.5 px-3">
                    <p className="font-medium text-slate-800">{product?.name ?? '-'}</p>
                    <p className="text-xs text-slate-400">{product?.sku}</p>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-xs text-slate-600">{lot.lot_number}</td>
                  <td className="py-2.5 px-3 text-right font-medium">{lot.quantity} <span className="text-slate-400 text-xs">{product?.uom}</span></td>
                  <td className="py-2.5 px-3 text-slate-500 text-xs">
                    {lot.expiry_date ? new Date(lot.expiry_date).toLocaleDateString() : '-'}
                  </td>
                </tr>
              );
            })}
            {activeLots.length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-slate-400">No active lots available</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Labelling Tab ────────────────────────────────────────────────────────────

function LabellingTab({ lots, products }: { lots: InventoryLot[]; products: Product[] }) {
  const [templates, setTemplates] = useState<LabelTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<LabelTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isPrintPreview, setIsPrintPreview] = useState(false);

  // Form state
  const [tName, setTName] = useState('');
  const [tType, setTType] = useState('product_label');
  const [tSizeIdx, setTSizeIdx] = useState(0);
  const [tCustomW, setTCustomW] = useState(100);
  const [tCustomH, setTCustomH] = useState(50);
  const [tFields, setTFields] = useState<string[]>([]);
  const [printLotId, setPrintLotId] = useState<string>('');

  const getProduct = (id: number) => products.find((p) => p.id === id);

  const activeLots = lots.filter((l) => l.status === 'active');
  const printLot = activeLots.find((l) => String(l.id) === printLotId);
  const printProduct = printLot ? getProduct(printLot.product_id) : undefined;

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await client.entities.label_templates.query({ limit: 100 });
      setTemplates(res.data?.items ?? []);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const openNew = () => {
    setSelectedTemplate(null);
    setTName('');
    setTType('product_label');
    setTSizeIdx(0);
    setTCustomW(100);
    setTCustomH(50);
    setTFields(['product_name', 'lot_number', 'expiry_date']);
    setIsEditing(true);
  };

  const openEdit = (t: LabelTemplate) => {
    setSelectedTemplate(t);
    setTName(t.name);
    setTType(t.template_type);
    const w = t.width_mm ?? 100;
    const h = t.height_mm ?? 50;
    const idx = LABEL_SIZES.findIndex((s) => s.w === w && s.h === h);
    setTSizeIdx(idx >= 0 ? idx : LABEL_SIZES.length - 1);
    setTCustomW(w);
    setTCustomH(h);
    setTFields(parseFields(t.fields_config));
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!tName.trim()) return;
    const size = tSizeIdx === LABEL_SIZES.length - 1 ? { w: tCustomW, h: tCustomH } : LABEL_SIZES[tSizeIdx];
    const payload = {
      name: tName.trim(),
      template_type: tType,
      width_mm: size.w,
      height_mm: size.h,
      fields_config: JSON.stringify(tFields),
      status: 'active',
    };
    try {
      if (selectedTemplate) {
        await client.entities.label_templates.update({ id: String(selectedTemplate.id), data: payload });
      } else {
        await client.entities.label_templates.create({ data: payload });
      }
      await fetchTemplates();
      setIsEditing(false);
    } catch (e) {
      console.error('Failed to save template:', e);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this template?')) return;
    await client.entities.label_templates.delete({ id: String(id) });
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    if (selectedTemplate?.id === id) setSelectedTemplate(null);
  };

  const toggleField = (key: string) => {
    setTFields((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  };

  const currentW = tSizeIdx === LABEL_SIZES.length - 1 ? tCustomW : LABEL_SIZES[tSizeIdx].w;
  const currentH = tSizeIdx === LABEL_SIZES.length - 1 ? tCustomH : LABEL_SIZES[tSizeIdx].h;

  if (isPrintPreview && selectedTemplate) {
    const fields = parseFields(selectedTemplate.fields_config);
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setIsPrintPreview(false)}>
            <X className="w-4 h-4 mr-1" /> Close Preview
          </Button>
          <span className="text-sm font-medium text-slate-700">Print: {selectedTemplate.name}</span>
        </div>
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="text-xs text-slate-500 mb-1 block">Select Lot to Print</label>
                <Select value={printLotId} onValueChange={setPrintLotId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose inventory lot..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeLots.map((lot) => {
                      const p = getProduct(lot.product_id);
                      return (
                        <SelectItem key={lot.id} value={String(lot.id)}>
                          {p?.name} — {lot.lot_number}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-1" /> Print
              </Button>
            </div>
            <div className="flex justify-center pt-4 print:pt-0">
              <LabelPreview
                fields={fields}
                widthMm={selectedTemplate.width_mm ?? 100}
                heightMm={selectedTemplate.height_mm ?? 50}
                sampleLot={printLot}
                sampleProduct={printProduct}
              />
            </div>
            {printLot && (
              <p className="text-center text-xs text-slate-400">
                Showing: {printProduct?.name} · {printLot.lot_number}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
            <X className="w-4 h-4 mr-1" /> Cancel
          </Button>
          <span className="text-sm font-medium text-slate-700">
            {selectedTemplate ? 'Edit Template' : 'New Label Template'}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Template Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Template Name *</label>
                <Input value={tName} onChange={(e) => setTName(e.target.value)} placeholder="e.g. Standard Product Label" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Type</label>
                <Select value={tType} onValueChange={setTType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Label Size</label>
                <Select value={String(tSizeIdx)} onValueChange={(v) => setTSizeIdx(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LABEL_SIZES.map((s, i) => (
                      <SelectItem key={i} value={String(i)}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {tSizeIdx === LABEL_SIZES.length - 1 && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Width (mm)</label>
                    <Input type="number" min={20} max={300} value={tCustomW} onChange={(e) => setTCustomW(Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Height (mm)</label>
                    <Input type="number" min={20} max={300} value={tCustomH} onChange={(e) => setTCustomH(Number(e.target.value))} />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs text-slate-500 mb-2 block">Fields to Display</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {LABEL_FIELDS.map((f) => (
                    <label key={f.key} className="flex items-center gap-2 cursor-pointer rounded p-1.5 hover:bg-slate-50 border border-transparent hover:border-slate-200">
                      <input
                        type="checkbox"
                        checked={tFields.includes(f.key)}
                        onChange={() => toggleField(f.key)}
                        className="rounded"
                      />
                      <span className="text-xs text-slate-700">{f.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Button className="w-full" onClick={handleSave} disabled={!tName.trim()}>
                <Save className="w-4 h-4 mr-1" />
                {selectedTemplate ? 'Update Template' : 'Save Template'}
              </Button>
            </CardContent>
          </Card>

          {/* Right: live preview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Live Preview</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3">
              <p className="text-xs text-slate-400">{currentW} × {currentH} mm</p>
              <LabelPreview
                fields={tFields}
                widthMm={currentW}
                heightMm={currentH}
              />
              <p className="text-xs text-slate-400 text-center">
                {tFields.length} field{tFields.length !== 1 ? 's' : ''} selected
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Design and manage label templates</p>
        <Button size="sm" onClick={openNew}>
          <Plus className="w-4 h-4 mr-1" /> New Template
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
          <Tag className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="font-medium">No label templates yet</p>
          <p className="text-sm mt-1">Create a template to design labels for your products</p>
          <Button size="sm" className="mt-4" onClick={openNew}>
            <Plus className="w-4 h-4 mr-1" /> Create First Template
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => {
            const fields = parseFields(t.fields_config);
            const typeLabel = TEMPLATE_TYPES.find((x) => x.value === t.template_type)?.label ?? t.template_type;
            return (
              <Card key={t.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{t.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{typeLabel}</p>
                    </div>
                    <Badge className={`text-xs ${STATUS_COLORS[t.status ?? 'active'] ?? 'bg-gray-100 text-gray-800'}`}>
                      {t.status}
                    </Badge>
                  </div>

                  <div className="flex justify-center mb-3">
                    <LabelPreview
                      fields={fields}
                      widthMm={t.width_mm ?? 100}
                      heightMm={t.height_mm ?? 50}
                    />
                  </div>

                  <p className="text-xs text-slate-400 text-center mb-3">
                    {t.width_mm ?? 100} × {t.height_mm ?? 50} mm · {fields.length} fields
                  </p>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => { setSelectedTemplate(t); setIsPrintPreview(true); }}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" /> Preview
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit(t)}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(t.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Manufacturing Page ──────────────────────────────────────────────────

export default function Manufacturing() {
  const [activeTab, setActiveTab] = useState('labelling');
  const [lots, setLots] = useState<InventoryLot[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [lotRes, prodRes] = await Promise.all([
          client.entities.inventory_lots.query({ limit: 500, sort: 'expiry_date' }),
          client.entities.products.query({ limit: 200 }),
        ]);
        setLots(lotRes.data?.items ?? []);
        setProducts(prodRes.data?.items ?? []);
      } catch (err) {
        console.error('Failed to fetch manufacturing data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          {activeTab === 'case_marking' && <CaseMarkingTab lots={lots} products={products} />}
          {activeTab === 'stacking' && <StackingTab lots={lots} products={products} />}
          {activeTab === 'labelling' && <LabellingTab lots={lots} products={products} />}
          {activeTab === 'production_gi' && <ProductionGITab lots={lots} products={products} />}
        </CardContent>
      </Card>
    </div>
  );
}
