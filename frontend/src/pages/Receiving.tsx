import { useEffect, useState, lazy, Suspense } from 'react';
import { client } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Eye, Search, ScanLine, Package, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ReceivingDocument, ReceivingLine, Supplier, Warehouse, Product } from '@/lib/types';
import { STATUS_COLORS } from '@/lib/types';

const BarcodeScanner = lazy(() => import('@/components/BarcodeScanner'));

export default function Receiving() {
  const [docs, setDocs] = useState<ReceivingDocument[]>([]);
  const [lines, setLines] = useState<ReceivingLine[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailDoc, setDetailDoc] = useState<ReceivingDocument | null>(null);

  // Scanner state
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [scanResultVisible, setScanResultVisible] = useState(false);

  // Form state
  const [formSupplier, setFormSupplier] = useState('');
  const [formWarehouse, setFormWarehouse] = useState('');
  const [formExpectedDate, setFormExpectedDate] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Scanned line items for new receiving
  const [scannedLines, setScannedLines] = useState<
    { product: Product; quantity: number }[]
  >([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [docRes, lineRes, supRes, whRes, prodRes] = await Promise.all([
        client.entities.receiving_documents.query({ limit: 100, sort: '-created_at' }),
        client.entities.receiving_lines.query({ limit: 200 }),
        client.entities.suppliers.query({ limit: 100 }),
        client.entities.warehouses.query({ limit: 100 }),
        client.entities.products.query({ limit: 200 }),
      ]);
      setDocs(docRes.data?.items || []);
      setLines(lineRes.data?.items || []);
      setSuppliers(supRes.data?.items || []);
      setWarehouses(whRes.data?.items || []);
      setProducts(prodRes.data?.items || []);
    } catch (err) {
      console.error('Failed to fetch receiving data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSupplier = (id: number) => suppliers.find((s) => s.id === id);
  const getWarehouse = (id: number) => warehouses.find((w) => w.id === id);
  const getProduct = (id: number) => products.find((p) => p.id === id);

  const handleScan = (decodedText: string) => {
    const code = decodedText.trim();
    // Look up product by SKU or name
    const found = products.find(
      (p) =>
        p.sku.toLowerCase() === code.toLowerCase() ||
        p.name.toLowerCase() === code.toLowerCase()
    );

    if (found) {
      setScannedProduct(found);
      setScanResultVisible(true);
      toast.success(`Product found: ${found.name}`);

      // Auto-add to scanned lines if not already there
      setScannedLines((prev) => {
        const existing = prev.find((l) => l.product.id === found.id);
        if (existing) {
          return prev.map((l) =>
            l.product.id === found.id ? { ...l, quantity: l.quantity + 1 } : l
          );
        }
        return [...prev, { product: found, quantity: 1 }];
      });
    } else {
      setScannedProduct(null);
      setScanResultVisible(true);
      toast.error(`No product found for code: ${code}`);
    }
  };

  const handleCreate = async () => {
    if (!formSupplier || !formWarehouse || !formExpectedDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      const docNum = `RCV-${new Date().getFullYear()}-${String(docs.length + 6).padStart(3, '0')}`;
      const docRes = await client.entities.receiving_documents.create({
        data: {
          document_number: docNum,
          supplier_id: parseInt(formSupplier),
          warehouse_id: parseInt(formWarehouse),
          status: 'pending',
          expected_date: formExpectedDate,
          received_date: '',
          notes: formNotes,
          created_at: new Date().toISOString(),
        },
      });

      // Create receiving lines from scanned items
      if (scannedLines.length > 0 && docRes.data?.id) {
        for (const line of scannedLines) {
          await client.entities.receiving_lines.create({
            data: {
              receiving_document_id: docRes.data.id,
              product_id: line.product.id,
              expected_quantity: line.quantity,
              received_quantity: 0,
              lot_number: '',
              expiry_date: '',
              qc_status: 'pending',
              notes: 'Added via barcode scan',
            },
          });
        }
      }

      toast.success('Receiving document created');
      setCreateOpen(false);
      resetForm();
      fetchData();
    } catch (err) {
      console.error('Failed to create document:', err);
      toast.error('Failed to create document');
    }
  };

  const resetForm = () => {
    setFormSupplier('');
    setFormWarehouse('');
    setFormExpectedDate('');
    setFormNotes('');
    setScannedLines([]);
    setScannedProduct(null);
    setScanResultVisible(false);
  };

  const removeScannedLine = (productId: number) => {
    setScannedLines((prev) => prev.filter((l) => l.product.id !== productId));
  };

  const updateScannedLineQty = (productId: number, qty: number) => {
    setScannedLines((prev) =>
      prev.map((l) => (l.product.id === productId ? { ...l, quantity: Math.max(1, qty) } : l))
    );
  };

  const filteredDocs = docs.filter((doc) => {
    const matchesSearch =
      !search ||
      doc.document_number.toLowerCase().includes(search.toLowerCase()) ||
      getSupplier(doc.supplier_id)?.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const docLines = detailDoc ? lines.filter((l) => l.receiving_document_id === detailDoc.id) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Receiving Documents</h3>
          <p className="text-sm text-slate-500">Manage inbound deliveries and quality checks</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-blue-200 text-blue-600 hover:bg-blue-50"
            onClick={() => setScannerOpen(true)}
          >
            <ScanLine className="w-4 h-4 mr-2" />
            Scan Barcode
          </Button>
          <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                New Receiving
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Receiving Document</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label>Supplier *</Label>
                  <Select value={formSupplier} onValueChange={setFormSupplier}>
                    <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                    <SelectContent>
                      {suppliers.filter((s) => s.status === 'active').map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Warehouse *</Label>
                  <Select value={formWarehouse} onValueChange={setFormWarehouse}>
                    <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                    <SelectContent>
                      {warehouses.filter((w) => w.status === 'active').map((w) => (
                        <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Expected Date *</Label>
                  <Input type="date" value={formExpectedDate} onChange={(e) => setFormExpectedDate(e.target.value)} />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Input value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Optional notes" />
                </div>

                {/* Scanned Line Items */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Line Items</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      onClick={() => setScannerOpen(true)}
                    >
                      <ScanLine className="w-3.5 h-3.5 mr-1" />
                      Scan to Add
                    </Button>
                  </div>
                  {scannedLines.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {scannedLines.map((line) => (
                        <div
                          key={line.product.id}
                          className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border"
                        >
                          <Package className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">
                              {line.product.name}
                            </p>
                            <p className="text-xs text-slate-400">{line.product.sku}</p>
                          </div>
                          <Input
                            type="number"
                            min={1}
                            value={line.quantity}
                            onChange={(e) =>
                              updateScannedLineQty(line.product.id, parseInt(e.target.value) || 1)
                            }
                            className="w-20 h-8 text-center text-sm"
                          />
                          <span className="text-xs text-slate-400">{line.product.uom}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-600 h-8 w-8 p-0"
                            onClick={() => removeScannedLine(line.product.id)}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 text-center py-3 bg-slate-50 rounded-lg border border-dashed">
                      No items added. Use the scanner to add products.
                    </p>
                  )}
                </div>

                <Button onClick={handleCreate} className="w-full bg-blue-600 hover:bg-blue-700">
                  Create Document {scannedLines.length > 0 && `(${scannedLines.length} items)`}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Scan Result Banner */}
      {scanResultVisible && scannedProduct && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-emerald-800">Product Found via Scan</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2 text-sm">
                  <div>
                    <span className="text-emerald-600">Name:</span>
                    <p className="font-medium text-slate-800">{scannedProduct.name}</p>
                  </div>
                  <div>
                    <span className="text-emerald-600">SKU:</span>
                    <p className="font-mono text-slate-800">{scannedProduct.sku}</p>
                  </div>
                  <div>
                    <span className="text-emerald-600">Category:</span>
                    <p className="text-slate-800">{scannedProduct.category}</p>
                  </div>
                  <div>
                    <span className="text-emerald-600">UOM:</span>
                    <p className="text-slate-800">{scannedProduct.uom ?? '-'}</p>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setScanResultVisible(false)}
                className="text-emerald-600"
              >
                ×
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {scanResultVisible && !scannedProduct && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <ScanLine className="w-5 h-5 text-red-500" />
              <p className="text-sm text-red-700">
                No matching product found. Please check the barcode and try again, or add the product in Master Data first.
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setScanResultVisible(false)}
                className="ml-auto text-red-600"
              >
                ×
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search document or supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Documents Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Document #</th>
                  <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Supplier</th>
                  <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Warehouse</th>
                  <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Expected</th>
                  <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Status</th>
                  <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((doc, idx) => {
                  const supplier = getSupplier(doc.supplier_id);
                  const warehouse = getWarehouse(doc.warehouse_id);
                  return (
                    <tr
                      key={doc.id}
                      className={`border-b border-slate-100 hover:bg-slate-50 ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                      }`}
                    >
                      <td className="py-2.5 px-4 font-mono text-xs font-medium text-blue-600">
                        {doc.document_number}
                      </td>
                      <td className="py-2.5 px-4 text-slate-800">{supplier?.name || '-'}</td>
                      <td className="py-2.5 px-4 text-slate-600">{warehouse?.name || '-'}</td>
                      <td className="py-2.5 px-4 text-slate-500">
                        {doc.expected_date ? new Date(doc.expected_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge className={`text-xs ${STATUS_COLORS[doc.status] || 'bg-gray-100 text-gray-800'}`}>
                          {doc.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4">
                        <Button variant="ghost" size="sm" onClick={() => setDetailDoc(doc)}>
                          <Eye className="w-4 h-4 mr-1" /> View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {filteredDocs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      No receiving documents found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detailDoc} onOpenChange={() => setDetailDoc(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {detailDoc?.document_number} - Receiving Lines
            </DialogTitle>
          </DialogHeader>
          {detailDoc && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Supplier:</span>{' '}
                  <span className="font-medium">{getSupplier(detailDoc.supplier_id)?.name}</span>
                </div>
                <div>
                  <span className="text-slate-500">Warehouse:</span>{' '}
                  <span className="font-medium">{getWarehouse(detailDoc.warehouse_id)?.name}</span>
                </div>
                <div>
                  <span className="text-slate-500">Status:</span>{' '}
                  <Badge className={`text-xs ${STATUS_COLORS[detailDoc.status] || ''}`}>
                    {detailDoc.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <span className="text-slate-500">Notes:</span>{' '}
                  <span>{detailDoc.notes || '-'}</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left py-2 px-3 text-slate-500 font-medium">Product</th>
                      <th className="text-right py-2 px-3 text-slate-500 font-medium">Expected</th>
                      <th className="text-right py-2 px-3 text-slate-500 font-medium">Received</th>
                      <th className="text-left py-2 px-3 text-slate-500 font-medium">Lot #</th>
                      <th className="text-left py-2 px-3 text-slate-500 font-medium">QC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docLines.map((line) => {
                      const product = getProduct(line.product_id);
                      return (
                        <tr key={line.id} className="border-b border-slate-100">
                          <td className="py-2 px-3 font-medium">{product?.name || '-'}</td>
                          <td className="py-2 px-3 text-right">{line.expected_quantity}</td>
                          <td className="py-2 px-3 text-right">{line.received_quantity}</td>
                          <td className="py-2 px-3 font-mono text-xs">{line.lot_number || '-'}</td>
                          <td className="py-2 px-3">
                            <Badge className={`text-xs ${STATUS_COLORS[line.qc_status] || 'bg-gray-100 text-gray-800'}`}>
                              {line.qc_status}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                    {docLines.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-4 text-slate-400">
                          No lines for this document
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Barcode Scanner Modal */}
      {scannerOpen && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
            </div>
          }
        >
          <BarcodeScanner
            onScan={handleScan}
            onClose={() => setScannerOpen(false)}
          />
        </Suspense>
      )}
    </div>
  );
}