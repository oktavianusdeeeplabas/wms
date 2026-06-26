import { useEffect, useMemo, useState } from 'react';
import { client } from '@/lib/api';
import { loadLocalData, saveLocalData } from '@/lib/local-storage';
import type { Branch, Product, StockTransfer, Warehouse } from '@/lib/types';
import { STATUS_COLORS } from '@/lib/types';
import { exportToPDF, type ReportData } from '@/lib/report-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowRightLeft,
  Boxes,
  PackageCheck,
  Route,
  Search,
  Tags,
  Truck,
  UserRound,
  Plus,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

type PackingStatus = 'picked' | 'packed' | 'sorted' | 'labelled' | 'ready_to_ship';

interface PackingBatch {
  id: number;
  batchNumber: string;
  orderReference: string;
  transferId: number | null;
  productId: number;
  quantity: number;
  customerName: string;
  routeName: string;
  packingType: string;
  shippingNotes: string;
  status: PackingStatus;
  labelGenerated: boolean;
  shippingInfoGenerated: boolean;
  createdAt: string;
}

const STORAGE_KEY = 'wms_packing_sorting_v1';

const FALLBACK_BATCHES: PackingBatch[] = [
  {
    id: 1,
    batchNumber: 'PACK-2026-001',
    orderReference: 'PICK-001',
    transferId: 1,
    productId: 1,
    quantity: 12,
    customerName: 'Jakarta Central Store',
    routeName: 'Route A',
    packingType: 'Cold Box',
    shippingNotes: 'Keep chilled and stack max 2 layers.',
    status: 'sorted',
    labelGenerated: true,
    shippingInfoGenerated: true,
    createdAt: '2026-04-17T07:30:00',
  },
  {
    id: 2,
    batchNumber: 'PACK-2026-002',
    orderReference: 'PICK-004',
    transferId: 2,
    productId: 4,
    quantity: 10,
    customerName: 'Bandung North Outlet',
    routeName: 'Route B',
    packingType: 'Insulated Tote',
    shippingNotes: 'Fragile dairy products.',
    status: 'packed',
    labelGenerated: false,
    shippingInfoGenerated: false,
    createdAt: '2026-04-17T08:20:00',
  },
];

const packingStatusColors: Record<PackingStatus, string> = {
  picked: 'bg-slate-100 text-slate-800',
  packed: 'bg-blue-100 text-blue-800',
  sorted: 'bg-amber-100 text-amber-800',
  labelled: 'bg-violet-100 text-violet-800',
  ready_to_ship: 'bg-emerald-100 text-emerald-800',
};

export default function PackingSorting() {
  const [batches, setBatches] = useState<PackingBatch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'route' | 'customer'>('route');
  const [createOpen, setCreateOpen] = useState(false);

  const [formOrderReference, setFormOrderReference] = useState('');
  const [formTransferId, setFormTransferId] = useState('none');
  const [formProductId, setFormProductId] = useState('');
  const [formQuantity, setFormQuantity] = useState('');
  const [formCustomerName, setFormCustomerName] = useState('');
  const [formRouteName, setFormRouteName] = useState('');
  const [formPackingType, setFormPackingType] = useState('Carton Box');
  const [formShippingNotes, setFormShippingNotes] = useState('');

  useEffect(() => {
    setBatches(loadLocalData<PackingBatch[]>(STORAGE_KEY, FALLBACK_BATCHES));
  }, []);

  useEffect(() => {
    saveLocalData(STORAGE_KEY, batches);
  }, [batches]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productRes, branchRes, warehouseRes, transferRes] = await Promise.all([
          client.entities.products.query({ limit: 200 }),
          client.entities.branches.query({ limit: 200 }),
          client.entities.warehouses.query({ limit: 200 }),
          client.entities.stock_transfers.query({ limit: 200, sort: '-created_at' }),
        ]);
        setProducts(productRes.data?.items || []);
        setBranches(branchRes.data?.items || []);
        setWarehouses(warehouseRes.data?.items || []);
        setTransfers(transferRes.data?.items || []);
      } catch (err) {
        console.error('Failed to fetch packing data:', err);
        toast.error('Failed to fetch packing data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const availableTransfers = useMemo(
    () => transfers.filter((transfer) => transfer.status === 'pending' || transfer.status === 'in_transit'),
    [transfers]
  );

  const getProduct = (id: number) => products.find((product) => product.id === id);
  const getTransfer = (id: number | null) => (id ? transfers.find((transfer) => transfer.id === id) : undefined);
  const getBranch = (id: number) => branches.find((branch) => branch.id === id);
  const getWarehouse = (id: number) => warehouses.find((warehouse) => warehouse.id === id);

  const generateBatchNumber = () => `PACK-2026-${String(batches.length + 1).padStart(3, '0')}`;

  const resetForm = () => {
    setFormOrderReference('');
    setFormTransferId('none');
    setFormProductId('');
    setFormQuantity('');
    setFormCustomerName('');
    setFormRouteName('');
    setFormPackingType('Carton Box');
    setFormShippingNotes('');
  };

  const handleCreate = () => {
    if (!formOrderReference || !formProductId || !formQuantity || !formCustomerName || !formRouteName) {
      toast.error('Please complete the required packing fields');
      return;
    }

    const nextBatch: PackingBatch = {
      id: Date.now(),
      batchNumber: generateBatchNumber(),
      orderReference: formOrderReference,
      transferId: formTransferId === 'none' ? null : parseInt(formTransferId, 10),
      productId: parseInt(formProductId, 10),
      quantity: parseFloat(formQuantity),
      customerName: formCustomerName,
      routeName: formRouteName,
      packingType: formPackingType,
      shippingNotes: formShippingNotes,
      status: 'picked',
      labelGenerated: false,
      shippingInfoGenerated: false,
      createdAt: new Date().toISOString(),
    };

    setBatches((prev) => [nextBatch, ...prev]);
    setCreateOpen(false);
    resetForm();
    toast.success('Packing batch created from picking output');
  };

  const updateBatch = (id: number, updater: (current: PackingBatch) => PackingBatch, message: string) => {
    setBatches((prev) => prev.map((batch) => (batch.id === id ? updater(batch) : batch)));
    toast.success(message);
  };

  const buildRouteLabel = (transfer?: StockTransfer) => {
    if (!transfer) return '-';
    const from = `${getBranch(transfer.from_branch_id)?.name || '-'} / ${getWarehouse(transfer.from_warehouse_id)?.name || '-'}`;
    const to = `${getBranch(transfer.to_branch_id)?.name || '-'} / ${getWarehouse(transfer.to_warehouse_id)?.name || '-'}`;
    return `${from} -> ${to}`;
  };

  const buildReport = (batch: PackingBatch, kind: 'label' | 'shipping'): ReportData => {
    const product = getProduct(batch.productId);
    const transfer = getTransfer(batch.transferId);

    if (kind === 'label') {
      return {
        title: 'Packing Label',
        subtitle: `Label for ${batch.batchNumber}`,
        generatedAt: new Date().toLocaleString(),
        columns: [
          { header: 'Batch #', key: 'batch_number' },
          { header: 'Order Ref', key: 'order_reference' },
          { header: 'Product', key: 'product' },
          { header: 'Qty', key: 'quantity' },
          { header: 'Customer', key: 'customer' },
          { header: 'Route', key: 'route' },
          { header: 'Packing Type', key: 'packing_type' },
        ],
        rows: [
          {
            batch_number: batch.batchNumber,
            order_reference: batch.orderReference,
            product: product?.name || '-',
            quantity: batch.quantity,
            customer: batch.customerName,
            route: batch.routeName,
            packing_type: batch.packingType,
          },
        ],
        summary: [
          {
            Status: batch.status.replace('_', ' '),
            Transfer: transfer?.transfer_number || '-',
          },
        ],
      };
    }

    return {
      title: 'Shipping Information',
      subtitle: `Shipping sheet for ${batch.batchNumber}`,
      generatedAt: new Date().toLocaleString(),
      columns: [
        { header: 'Batch #', key: 'batch_number' },
        { header: 'Customer', key: 'customer' },
        { header: 'Route', key: 'route' },
        { header: 'Transfer #', key: 'transfer_number' },
        { header: 'Warehouse Route', key: 'warehouse_route' },
        { header: 'Qty', key: 'quantity' },
        { header: 'Notes', key: 'notes' },
      ],
      rows: [
        {
          batch_number: batch.batchNumber,
          customer: batch.customerName,
          route: batch.routeName,
          transfer_number: transfer?.transfer_number || '-',
          warehouse_route: buildRouteLabel(transfer),
          quantity: batch.quantity,
          notes: batch.shippingNotes || '-',
        },
      ],
      summary: [
        {
          'Ready Status': batch.status === 'ready_to_ship' ? 'Ready to ship' : 'Processing',
          'Packing Type': batch.packingType,
        },
      ],
    };
  };

  const handleGenerateLabel = (batch: PackingBatch) => {
    exportToPDF(buildReport(batch, 'label'));
    updateBatch(
      batch.id,
      (current) => ({
        ...current,
        labelGenerated: true,
        status: current.status === 'ready_to_ship' ? current.status : 'labelled',
      }),
      'Packing label generated'
    );
  };

  const handleGenerateShipping = (batch: PackingBatch) => {
    exportToPDF(buildReport(batch, 'shipping'));
    updateBatch(
      batch.id,
      (current) => ({
        ...current,
        shippingInfoGenerated: true,
        status: current.labelGenerated ? 'ready_to_ship' : current.status,
      }),
      'Shipping information generated'
    );
  };

  const handlePack = (batch: PackingBatch) => {
    updateBatch(batch.id, (current) => ({ ...current, status: 'packed' }), 'Items packed');
  };

  const handleSort = (batch: PackingBatch) => {
    updateBatch(batch.id, (current) => ({ ...current, status: 'sorted' }), `Sorted by ${sortBy}`);
  };

  const filteredBatches = useMemo(() => {
    const normalizedSearch = search.toLowerCase();
    return [...batches]
      .filter((batch) => {
        const product = getProduct(batch.productId);
        const haystack = [
          batch.batchNumber,
          batch.orderReference,
          batch.customerName,
          batch.routeName,
          product?.name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return !search || haystack.includes(normalizedSearch);
      })
      .sort((a, b) => {
        const left = sortBy === 'route' ? a.routeName : a.customerName;
        const right = sortBy === 'route' ? b.routeName : b.customerName;
        return left.localeCompare(right);
      });
  }, [batches, getProduct, search, sortBy]);

  const summary = {
    picked: batches.filter((batch) => batch.status === 'picked').length,
    packed: batches.filter((batch) => batch.status === 'packed').length,
    sorted: batches.filter((batch) => batch.status === 'sorted' || batch.status === 'labelled').length,
    ready: batches.filter((batch) => batch.status === 'ready_to_ship').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="border-l-4 border-slate-500">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Picked Queue</p>
            <p className="text-2xl font-bold text-slate-800">{summary.picked}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-blue-500">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Packed</p>
            <p className="text-2xl font-bold text-slate-800">{summary.packed}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-amber-500">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Sorted</p>
            <p className="text-2xl font-bold text-slate-800">{summary.sorted}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-emerald-500">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Ready to Ship</p>
            <p className="text-2xl font-bold text-slate-800">{summary.ready}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Packing & Sorting</h3>
          <p className="text-sm text-slate-500">Pack picked goods, sort by route or customer, and generate shipping labels</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              New Packing Batch
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Packing Batch</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className="space-y-2">
                <Label>Picking / Order Reference</Label>
                <Input value={formOrderReference} onChange={(e) => setFormOrderReference(e.target.value)} placeholder="PICK-001 or ORD-..." />
              </div>
              <div className="space-y-2">
                <Label>Transfer</Label>
                <Select value={formTransferId} onValueChange={setFormTransferId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No linked transfer</SelectItem>
                    {availableTransfers.map((transfer) => (
                      <SelectItem key={transfer.id} value={String(transfer.id)}>
                        {transfer.transfer_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Product</Label>
                <Select value={formProductId} onValueChange={setFormProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={String(product.id)}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input value={formQuantity} onChange={(e) => setFormQuantity(e.target.value)} placeholder="12" type="number" min="0" />
              </div>
              <div className="space-y-2">
                <Label>Customer</Label>
                <Input value={formCustomerName} onChange={(e) => setFormCustomerName(e.target.value)} placeholder="Customer / outlet name" />
              </div>
              <div className="space-y-2">
                <Label>Route</Label>
                <Input value={formRouteName} onChange={(e) => setFormRouteName(e.target.value)} placeholder="Route A / North Cluster" />
              </div>
              <div className="space-y-2">
                <Label>Packing Type</Label>
                <Select value={formPackingType} onValueChange={setFormPackingType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Carton Box">Carton Box</SelectItem>
                    <SelectItem value="Cold Box">Cold Box</SelectItem>
                    <SelectItem value="Insulated Tote">Insulated Tote</SelectItem>
                    <SelectItem value="Pallet Wrap">Pallet Wrap</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Shipping Notes</Label>
                <Textarea value={formShippingNotes} onChange={(e) => setFormShippingNotes(e.target.value)} placeholder="Special instructions for packing or dispatch" />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">
                  Create Packing Batch
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Search batch, order, customer, route..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={sortBy} onValueChange={(value: 'route' | 'customer') => setSortBy(value)}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="route">Sort by Route</SelectItem>
            <SelectItem value="customer">Sort by Customer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {filteredBatches.map((batch) => {
          const product = getProduct(batch.productId);
          const transfer = getTransfer(batch.transferId);

          return (
            <Card key={batch.id} className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-base text-slate-800">{batch.batchNumber}</CardTitle>
                    <p className="text-sm text-slate-500 mt-1">
                      {batch.orderReference} • {product?.name || 'Unknown Product'}
                    </p>
                  </div>
                  <Badge className={packingStatusColors[batch.status]}>
                    {batch.status.replace('_', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-slate-500 flex items-center gap-2"><UserRound className="w-4 h-4" /> Customer</p>
                    <p className="font-medium text-slate-800 mt-1">{batch.customerName}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-slate-500 flex items-center gap-2"><Route className="w-4 h-4" /> Route</p>
                    <p className="font-medium text-slate-800 mt-1">{batch.routeName}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-slate-500 flex items-center gap-2"><Boxes className="w-4 h-4" /> Packing</p>
                    <p className="font-medium text-slate-800 mt-1">{batch.packingType}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-slate-500 flex items-center gap-2"><Truck className="w-4 h-4" /> Shipping Link</p>
                    <p className="font-medium text-slate-800 mt-1">{transfer?.transfer_number || 'No transfer linked'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <PackageCheck className="w-4 h-4" />
                  <span>{batch.quantity} units packed from picking output</span>
                  {transfer && (
                    <>
                      <ArrowRightLeft className="w-4 h-4" />
                      <Badge className={STATUS_COLORS[transfer.status] || STATUS_COLORS.pending}>
                        transfer {transfer.status}
                      </Badge>
                    </>
                  )}
                </div>

                {batch.shippingNotes && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
                    {batch.shippingNotes}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => handlePack(batch)}>
                    <Boxes className="w-4 h-4 mr-2" />
                    Pack Items
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleSort(batch)}>
                    <Route className="w-4 h-4 mr-2" />
                    Sort by {sortBy === 'route' ? 'Route' : 'Customer'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleGenerateLabel(batch)}>
                    <Tags className="w-4 h-4 mr-2" />
                    Generate Label
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleGenerateShipping(batch)}>
                    <FileText className="w-4 h-4 mr-2" />
                    Shipping Info
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs text-slate-500">
                  <div className="rounded-lg border border-slate-200 p-3">
                    Label: <span className="font-medium text-slate-800">{batch.labelGenerated ? 'Generated' : 'Pending'}</span>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3">
                    Shipping: <span className="font-medium text-slate-800">{batch.shippingInfoGenerated ? 'Generated' : 'Pending'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredBatches.length === 0 && (
        <Card>
          <CardContent className="p-10 text-center text-slate-500">
            No packing batches found. Create a new batch to move goods from picking into packing and sorting.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
