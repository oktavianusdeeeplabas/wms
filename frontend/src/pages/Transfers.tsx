import { useEffect, useState } from 'react';
import { client } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeftRight,
  Plus,
  Search,
  Truck,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import type { StockTransfer, Branch, Warehouse, Product } from '@/lib/types';
import { STATUS_COLORS } from '@/lib/types';

export default function Transfers() {
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Transfer form
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fromBranchId, setFromBranchId] = useState('');
  const [toBranchId, setToBranchId] = useState('');
  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Detail view
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [trfRes, brRes, whRes, prodRes] = await Promise.all([
        client.entities.stock_transfers.query({ limit: 200, sort: '-created_at' }),
        client.entities.branches.query({ limit: 100 }),
        client.entities.warehouses.query({ limit: 200 }),
        client.entities.products.query({ limit: 200 }),
      ]);
      setTransfers(trfRes.data?.items || []);
      setBranches(brRes.data?.items || []);
      setWarehouses(whRes.data?.items || []);
      setProducts(prodRes.data?.items || []);
    } catch (err) {
      console.error('Failed to fetch transfers:', err);
    } finally {
      setLoading(false);
    }
  };

  const getBranch = (id: number) => branches.find((b) => b.id === id);
  const getWarehouse = (id: number) => warehouses.find((w) => w.id === id);
  const getProduct = (id: number) => products.find((p) => p.id === id);

  const getWarehousesForBranch = (branchId: string) =>
    warehouses.filter((w) => String(w.branch_id) === branchId);

  const generateTransferNumber = () => {
    const count = transfers.length + 1;
    return `TRF-2026-${String(count).padStart(3, '0')}`;
  };

  const openCreateForm = () => {
    setFromBranchId('');
    setToBranchId('');
    setFromWarehouseId('');
    setToWarehouseId('');
    setProductId('');
    setQuantity('');
    setLotNumber('');
    setNotes('');
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!fromWarehouseId || !toWarehouseId || !productId || !quantity) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (fromWarehouseId === toWarehouseId) {
      toast.error('Source and destination warehouses must be different');
      return;
    }
    try {
      const data = {
        transfer_number: generateTransferNumber(),
        from_warehouse_id: parseInt(fromWarehouseId),
        to_warehouse_id: parseInt(toWarehouseId),
        from_branch_id: parseInt(fromBranchId) || 0,
        to_branch_id: parseInt(toBranchId) || 0,
        product_id: parseInt(productId),
        quantity: parseFloat(quantity),
        lot_number: lotNumber,
        status: 'pending',
        notes,
      };
      await client.entities.stock_transfers.create({ data });
      toast.success('Transfer request created');
      setDialogOpen(false);
      fetchData();
    } catch (err) {
      console.error('Failed to create transfer:', err);
      toast.error('Failed to create transfer');
    }
  };

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    try {
      const updateData: Record<string, unknown> = { status: newStatus };
      if (newStatus === 'in_transit') {
        updateData.shipped_date = new Date().toISOString();
      } else if (newStatus === 'received') {
        updateData.received_date = new Date().toISOString();
      }
      await client.entities.stock_transfers.update({
        id: String(id),
        data: updateData,
      });
      toast.success(`Transfer ${newStatus.replace('_', ' ')}`);
      fetchData();
    } catch (err) {
      console.error('Failed to update transfer:', err);
      toast.error('Failed to update transfer');
    }
  };

  const openDetail = (transfer: StockTransfer) => {
    setSelectedTransfer(transfer);
    setDetailDialogOpen(true);
  };

  const filteredTransfers = transfers.filter((t) => {
    const product = getProduct(t.product_id);
    const matchesSearch =
      !search ||
      t.transfer_number.toLowerCase().includes(search.toLowerCase()) ||
      product?.name.toLowerCase().includes(search.toLowerCase()) ||
      t.lot_number?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = transfers.filter((t) => t.status === 'pending').length;
  const inTransitCount = transfers.filter((t) => t.status === 'in_transit').length;
  const receivedCount = transfers.filter((t) => t.status === 'received').length;
  const cancelledCount = transfers.filter((t) => t.status === 'cancelled').length;

  const activeBranches = branches.filter((b) => b.status === 'active');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-l-4 border-amber-500">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-amber-500" />
            <div>
              <p className="text-sm text-slate-500">Pending</p>
              <p className="text-2xl font-bold text-slate-800">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-violet-500">
          <CardContent className="p-4 flex items-center gap-3">
            <Truck className="w-8 h-8 text-violet-500" />
            <div>
              <p className="text-sm text-slate-500">In Transit</p>
              <p className="text-2xl font-bold text-slate-800">{inTransitCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-emerald-500">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            <div>
              <p className="text-sm text-slate-500">Received</p>
              <p className="text-2xl font-bold text-slate-800">{receivedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-red-500">
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="w-8 h-8 text-red-500" />
            <div>
              <p className="text-sm text-slate-500">Cancelled</p>
              <p className="text-2xl font-bold text-slate-800">{cancelledCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search transfer #, product, or lot..."
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
              <SelectItem value="in_transit">In Transit</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={openCreateForm}>
          <Plus className="w-4 h-4 mr-2" />
          New Transfer
        </Button>
      </div>

      {/* Transfers Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Transfer #</th>
                  <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Product</th>
                  <th className="text-left py-2.5 px-4 text-slate-500 font-medium">From</th>
                  <th className="text-center py-2.5 px-4 text-slate-500 font-medium"></th>
                  <th className="text-left py-2.5 px-4 text-slate-500 font-medium">To</th>
                  <th className="text-right py-2.5 px-4 text-slate-500 font-medium">Qty</th>
                  <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Status</th>
                  <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Date</th>
                  <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransfers.map((trf, idx) => {
                  const product = getProduct(trf.product_id);
                  const fromBranch = getBranch(trf.from_branch_id);
                  const toBranch = getBranch(trf.to_branch_id);
                  const fromWh = getWarehouse(trf.from_warehouse_id);
                  const toWh = getWarehouse(trf.to_warehouse_id);
                  return (
                    <tr
                      key={trf.id}
                      className={`border-b border-slate-100 hover:bg-slate-50 ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                      }`}
                    >
                      <td className="py-2.5 px-4 font-mono text-xs font-medium text-blue-600">
                        {trf.transfer_number}
                      </td>
                      <td className="py-2.5 px-4">
                        <div>
                          <p className="font-medium text-slate-800">
                            {product?.name || `#${trf.product_id}`}
                          </p>
                          {trf.lot_number && (
                            <p className="text-xs text-slate-400">Lot: {trf.lot_number}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <div>
                          <p className="text-xs font-medium text-slate-700">
                            {fromBranch?.name || 'N/A'}
                          </p>
                          <p className="text-xs text-slate-400">{fromWh?.name || '-'}</p>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <ArrowRight className="w-4 h-4 text-slate-400 mx-auto" />
                      </td>
                      <td className="py-2.5 px-4">
                        <div>
                          <p className="text-xs font-medium text-slate-700">
                            {toBranch?.name || 'N/A'}
                          </p>
                          <p className="text-xs text-slate-400">{toWh?.name || '-'}</p>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium">{trf.quantity}</td>
                      <td className="py-2.5 px-4">
                        <Badge
                          className={`text-xs ${STATUS_COLORS[trf.status] || 'bg-gray-100 text-gray-800'}`}
                        >
                          {trf.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 text-xs">
                        {trf.requested_date
                          ? new Date(trf.requested_date).toLocaleDateString()
                          : trf.created_at
                          ? new Date(trf.created_at).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDetail(trf)}
                            className="h-7"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          {trf.status === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-violet-600 hover:text-violet-800"
                                onClick={() => handleUpdateStatus(trf.id, 'in_transit')}
                              >
                                Ship
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-red-500 hover:text-red-700"
                                onClick={() => handleUpdateStatus(trf.id, 'cancelled')}
                              >
                                Cancel
                              </Button>
                            </>
                          )}
                          {trf.status === 'in_transit' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-emerald-600 hover:text-emerald-800"
                              onClick={() => handleUpdateStatus(trf.id, 'received')}
                            >
                              Receive
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredTransfers.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-slate-400">
                      No transfers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create Transfer Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Stock Transfer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* From */}
            <div className="p-3 bg-slate-50 rounded-lg space-y-3">
              <p className="text-sm font-semibold text-slate-700">From (Source)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Branch</Label>
                  <Select
                    value={fromBranchId}
                    onValueChange={(val) => {
                      setFromBranchId(val);
                      setFromWarehouseId('');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activeBranches.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Warehouse *</Label>
                  <Select value={fromWarehouseId} onValueChange={setFromWarehouseId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select warehouse..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(fromBranchId
                        ? getWarehousesForBranch(fromBranchId)
                        : warehouses
                      ).map((w) => (
                        <SelectItem key={w.id} value={String(w.id)}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* To */}
            <div className="p-3 bg-blue-50 rounded-lg space-y-3">
              <p className="text-sm font-semibold text-blue-700">To (Destination)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Branch</Label>
                  <Select
                    value={toBranchId}
                    onValueChange={(val) => {
                      setToBranchId(val);
                      setToWarehouseId('');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activeBranches.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Warehouse *</Label>
                  <Select value={toWarehouseId} onValueChange={setToWarehouseId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select warehouse..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(toBranchId
                        ? getWarehousesForBranch(toBranchId)
                        : warehouses
                      ).map((w) => (
                        <SelectItem key={w.id} value={String(w.id)}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Product & Quantity */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Product *</Label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select product..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Lot Number</Label>
                <Input
                  value={lotNumber}
                  onChange={(e) => setLotNumber(e.target.value)}
                  placeholder="LOT-XXXX"
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Transfer reason..."
                />
              </div>
            </div>
            <Button onClick={handleCreate} className="w-full bg-blue-600 hover:bg-blue-700">
              <ArrowLeftRight className="w-4 h-4 mr-2" />
              Create Transfer Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Details</DialogTitle>
          </DialogHeader>
          {selectedTransfer && (
            <div className="space-y-4 mt-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-blue-600">
                  {selectedTransfer.transfer_number}
                </span>
                <Badge
                  className={`text-xs ${STATUS_COLORS[selectedTransfer.status] || ''}`}
                >
                  {selectedTransfer.status.replace('_', ' ')}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">From</p>
                  <p className="text-sm font-medium">
                    {getBranch(selectedTransfer.from_branch_id)?.name || 'N/A'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {getWarehouse(selectedTransfer.from_warehouse_id)?.name || '-'}
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-500 mb-1">To</p>
                  <p className="text-sm font-medium">
                    {getBranch(selectedTransfer.to_branch_id)?.name || 'N/A'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {getWarehouse(selectedTransfer.to_warehouse_id)?.name || '-'}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Product</span>
                  <span className="font-medium">
                    {getProduct(selectedTransfer.product_id)?.name || '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Quantity</span>
                  <span className="font-medium">{selectedTransfer.quantity}</span>
                </div>
                {selectedTransfer.lot_number && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Lot Number</span>
                    <span className="font-mono text-xs">{selectedTransfer.lot_number}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Requested</span>
                  <span>
                    {selectedTransfer.requested_date
                      ? new Date(selectedTransfer.requested_date).toLocaleString()
                      : '-'}
                  </span>
                </div>
                {selectedTransfer.shipped_date && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Shipped</span>
                    <span>{new Date(selectedTransfer.shipped_date).toLocaleString()}</span>
                  </div>
                )}
                {selectedTransfer.received_date && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Received</span>
                    <span>{new Date(selectedTransfer.received_date).toLocaleString()}</span>
                  </div>
                )}
                {selectedTransfer.notes && (
                  <div className="pt-2 border-t">
                    <p className="text-slate-500 mb-1">Notes</p>
                    <p className="text-slate-700">{selectedTransfer.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}