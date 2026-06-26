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
  Truck,
  Plus,
  Search,
  ShieldCheck,
  ScanSearch,
  Boxes,
  RefreshCcw,
  Ban,
  FileText,
  Route,
} from 'lucide-react';
import { toast } from 'sonner';

type LoadStatus = 'planned' | 'checked' | 'loading' | 'loaded' | 'cancelled';
type TmsStatus = 'not_synced' | 'queued' | 'synced';

interface LoadingJob {
  id: number;
  transferId: number;
  vehicleNo: string;
  driverName: string;
  tmsReference: string;
  tmsStatus: TmsStatus;
  checkedBy: string;
  loadingCheckPassed: boolean;
  pickBeforeComplete: boolean;
  status: LoadStatus;
  loadedQty: number;
  exchangeQty: number;
  cancelledQty: number;
  notes: string;
  createdAt: string;
}

const STORAGE_KEY = 'wms_loading_jobs_v1';

const FALLBACK_JOBS: LoadingJob[] = [
  {
    id: 1,
    transferId: 1,
    vehicleNo: 'B 9123 WMS',
    driverName: 'Rizal',
    tmsReference: 'TMS-LOAD-001',
    tmsStatus: 'synced',
    checkedBy: 'Wulan',
    loadingCheckPassed: true,
    pickBeforeComplete: true,
    status: 'loading',
    loadedQty: 20,
    exchangeQty: 2,
    cancelledQty: 0,
    notes: 'Fragile load, keep on top layer.',
    createdAt: '2026-04-17T08:00:00',
  },
];

const loadStatusColors: Record<LoadStatus, string> = {
  planned: 'bg-slate-100 text-slate-800',
  checked: 'bg-sky-100 text-sky-800',
  loading: 'bg-amber-100 text-amber-800',
  loaded: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
};

const tmsStatusColors: Record<TmsStatus, string> = {
  not_synced: 'bg-slate-100 text-slate-800',
  queued: 'bg-amber-100 text-amber-800',
  synced: 'bg-emerald-100 text-emerald-800',
};

export default function Loading() {
  const [jobs, setJobs] = useState<LoadingJob[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const [formTransferId, setFormTransferId] = useState('');
  const [formVehicleNo, setFormVehicleNo] = useState('');
  const [formDriverName, setFormDriverName] = useState('');
  const [formTmsReference, setFormTmsReference] = useState('');
  const [formCheckedBy, setFormCheckedBy] = useState('');
  const [formLoadingCheckPassed, setFormLoadingCheckPassed] = useState('yes');
  const [formPickBeforeComplete, setFormPickBeforeComplete] = useState('yes');
  const [formNotes, setFormNotes] = useState('');

  useEffect(() => {
    setJobs(loadLocalData<LoadingJob[]>(STORAGE_KEY, FALLBACK_JOBS));
  }, []);

  useEffect(() => {
    saveLocalData(STORAGE_KEY, jobs);
  }, [jobs]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [transferRes, productRes, warehouseRes, branchRes] = await Promise.all([
          client.entities.stock_transfers.query({ limit: 200, sort: '-created_at' }),
          client.entities.products.query({ limit: 200 }),
          client.entities.warehouses.query({ limit: 200 }),
          client.entities.branches.query({ limit: 100 }),
        ]);
        setTransfers(transferRes.data?.items || []);
        setProducts(productRes.data?.items || []);
        setWarehouses(warehouseRes.data?.items || []);
        setBranches(branchRes.data?.items || []);
      } catch (err) {
        console.error('Failed to fetch loading data:', err);
        toast.error('Failed to fetch loading data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getTransfer = (id: number) => transfers.find((transfer) => transfer.id === id);
  const getProduct = (id: number) => products.find((product) => product.id === id);
  const getWarehouse = (id: number) => warehouses.find((warehouse) => warehouse.id === id);
  const getBranch = (id: number) => branches.find((branch) => branch.id === id);

  const availableTransfers = useMemo(
    () => transfers.filter((transfer) => transfer.status === 'pending' || transfer.status === 'in_transit'),
    [transfers]
  );

  const generateLoadNumber = () => `LOAD-2026-${String(jobs.length + 1).padStart(3, '0')}`;

  const resetForm = () => {
    setFormTransferId('');
    setFormVehicleNo('');
    setFormDriverName('');
    setFormTmsReference('');
    setFormCheckedBy('');
    setFormLoadingCheckPassed('yes');
    setFormPickBeforeComplete('yes');
    setFormNotes('');
  };

  const handleCreate = () => {
    if (!formTransferId || !formVehicleNo || !formDriverName) {
      toast.error('Please fill in transfer, vehicle, and driver');
      return;
    }

    const nextJob: LoadingJob = {
      id: Date.now(),
      transferId: parseInt(formTransferId, 10),
      vehicleNo: formVehicleNo,
      driverName: formDriverName,
      tmsReference: formTmsReference || generateLoadNumber(),
      tmsStatus: formTmsReference ? 'queued' : 'not_synced',
      checkedBy: formCheckedBy,
      loadingCheckPassed: formLoadingCheckPassed === 'yes',
      pickBeforeComplete: formPickBeforeComplete === 'yes',
      status: formLoadingCheckPassed === 'yes' ? 'checked' : 'planned',
      loadedQty: 0,
      exchangeQty: 0,
      cancelledQty: 0,
      notes: formNotes,
      createdAt: new Date().toISOString(),
    };

    setJobs((prev) => [nextJob, ...prev]);
    resetForm();
    setCreateOpen(false);
    toast.success('Loading job created');
  };

  const updateJob = (id: number, updater: (job: LoadingJob) => LoadingJob, message: string) => {
    setJobs((prev) => prev.map((job) => (job.id === id ? updater(job) : job)));
    toast.success(message);
  };

  const handleLoadingCheck = (job: LoadingJob) => {
    updateJob(
      job.id,
      (current) => ({
        ...current,
        loadingCheckPassed: true,
        status: current.status === 'cancelled' ? 'cancelled' : 'checked',
      }),
      'Loading check passed'
    );
  };

  const handleStartLoading = (job: LoadingJob) => {
    updateJob(
      job.id,
      (current) => ({
        ...current,
        status: current.status === 'cancelled' ? 'cancelled' : 'loading',
      }),
      'Loading started'
    );
  };

  const handleLoadMore = (job: LoadingJob) => {
    const transfer = getTransfer(job.transferId);
    if (!transfer) {
      toast.error('Transfer not found');
      return;
    }

    const remaining = Math.max(transfer.quantity - job.loadedQty - job.cancelledQty, 0);
    if (remaining <= 0) {
      toast.error('No remaining quantity to load');
      return;
    }

    const increment = Math.min(remaining, Math.max(1, Math.ceil(transfer.quantity * 0.25)));
    updateJob(
      job.id,
      (current) => {
        const nextLoaded = current.loadedQty + increment;
        const completedQty = transfer.quantity - current.cancelledQty;
        return {
          ...current,
          loadedQty: nextLoaded,
          status: nextLoaded >= completedQty ? 'loaded' : 'loading',
        };
      },
      `Loaded ${increment} units`
    );
  };

  const handleExchange = (job: LoadingJob) => {
    const transfer = getTransfer(job.transferId);
    if (!transfer) {
      toast.error('Transfer not found');
      return;
    }

    const remaining = Math.max(transfer.quantity - job.exchangeQty - job.cancelledQty, 0);
    if (remaining <= 0) {
      toast.error('No quantity left to exchange');
      return;
    }

    updateJob(
      job.id,
      (current) => ({
        ...current,
        exchangeQty: current.exchangeQty + 1,
        status: current.status === 'planned' ? 'loading' : current.status,
      }),
      'Damaged item exchanged'
    );
  };

  const handleCancelLoad = (job: LoadingJob) => {
    const transfer = getTransfer(job.transferId);
    if (!transfer) {
      toast.error('Transfer not found');
      return;
    }

    const remaining = Math.max(transfer.quantity - job.loadedQty - job.cancelledQty, 0);
    if (remaining <= 0) {
      toast.error('No quantity left to cancel');
      return;
    }

    const cancelQty = Math.min(remaining, Math.max(1, Math.ceil(remaining / 2)));
    updateJob(
      job.id,
      (current) => {
        const nextCancelled = current.cancelledQty + cancelQty;
        const totalLoaded = current.loadedQty;
        const fullyCancelled = totalLoaded === 0 && nextCancelled >= transfer.quantity;
        return {
          ...current,
          cancelledQty: nextCancelled,
          status: fullyCancelled ? 'cancelled' : current.status,
        };
      },
      `Cancelled ${cancelQty} units`
    );
  };

  const handleSyncTms = (job: LoadingJob) => {
    updateJob(
      job.id,
      (current) => ({
        ...current,
        tmsStatus: 'synced',
        tmsReference: current.tmsReference || generateLoadNumber(),
      }),
      'TMS sync completed'
    );
  };

  const buildRouteLabel = (transfer: StockTransfer) => {
    const fromBranch = getBranch(transfer.from_branch_id)?.name || '-';
    const fromWarehouse = getWarehouse(transfer.from_warehouse_id)?.name || '-';
    const toBranch = getBranch(transfer.to_branch_id)?.name || '-';
    const toWarehouse = getWarehouse(transfer.to_warehouse_id)?.name || '-';
    return `${fromBranch} / ${fromWarehouse} -> ${toBranch} / ${toWarehouse}`;
  };

  const buildReport = (job: LoadingJob, kind: 'manifest' | 'delivery-note' | 'security-pass'): ReportData | null => {
    const transfer = getTransfer(job.transferId);
    if (!transfer) return null;

    const product = getProduct(transfer.product_id);
    const route = buildRouteLabel(transfer);

    if (kind === 'manifest') {
      return {
        title: 'Loading Manifest',
        subtitle: `Vehicle ${job.vehicleNo} for ${transfer.transfer_number}`,
        generatedAt: new Date().toLocaleString(),
        columns: [
          { header: 'Transfer #', key: 'transfer_number' },
          { header: 'Product', key: 'product' },
          { header: 'Vehicle', key: 'vehicle' },
          { header: 'Driver', key: 'driver' },
          { header: 'Planned Qty', key: 'planned_qty' },
          { header: 'Loaded Qty', key: 'loaded_qty' },
          { header: 'Exchange Qty', key: 'exchange_qty' },
          { header: 'Cancelled Qty', key: 'cancelled_qty' },
          { header: 'Route', key: 'route' },
        ],
        rows: [
          {
            transfer_number: transfer.transfer_number,
            product: product?.name || '-',
            vehicle: job.vehicleNo,
            driver: job.driverName,
            planned_qty: transfer.quantity,
            loaded_qty: job.loadedQty,
            exchange_qty: job.exchangeQty,
            cancelled_qty: job.cancelledQty,
            route,
          },
        ],
        summary: [
          {
            Status: job.status,
            'Loading Check': job.loadingCheckPassed ? 'Passed' : 'Pending',
            'Pick & Load': job.pickBeforeComplete ? 'Enabled' : 'No',
            TMS: job.tmsStatus,
          },
        ],
      };
    }

    if (kind === 'delivery-note') {
      return {
        title: 'Delivery Note',
        subtitle: `Dispatch note for ${transfer.transfer_number}`,
        generatedAt: new Date().toLocaleString(),
        columns: [
          { header: 'Transfer #', key: 'transfer_number' },
          { header: 'Product', key: 'product' },
          { header: 'Lot #', key: 'lot' },
          { header: 'Loaded Qty', key: 'loaded_qty' },
          { header: 'From', key: 'from' },
          { header: 'To', key: 'to' },
          { header: 'Vehicle', key: 'vehicle' },
          { header: 'Driver', key: 'driver' },
        ],
        rows: [
          {
            transfer_number: transfer.transfer_number,
            product: product?.name || '-',
            lot: transfer.lot_number || '-',
            loaded_qty: Math.max(job.loadedQty - job.exchangeQty, 0),
            from: `${getBranch(transfer.from_branch_id)?.name || '-'} / ${getWarehouse(transfer.from_warehouse_id)?.name || '-'}`,
            to: `${getBranch(transfer.to_branch_id)?.name || '-'} / ${getWarehouse(transfer.to_warehouse_id)?.name || '-'}`,
            vehicle: job.vehicleNo,
            driver: job.driverName,
          },
        ],
        summary: [
          {
            Notes: job.notes || '-',
            'Checked By': job.checkedBy || '-',
          },
        ],
      };
    }

    return {
      title: 'Security Pass',
      subtitle: `Gate pass for vehicle ${job.vehicleNo}`,
      generatedAt: new Date().toLocaleString(),
      columns: [
        { header: 'Vehicle', key: 'vehicle' },
        { header: 'Driver', key: 'driver' },
        { header: 'Transfer #', key: 'transfer_number' },
        { header: 'Route', key: 'route' },
        { header: 'TMS Ref', key: 'tms_ref' },
        { header: 'Check Status', key: 'check_status' },
        { header: 'Issued At', key: 'issued_at' },
      ],
      rows: [
        {
          vehicle: job.vehicleNo,
          driver: job.driverName,
          transfer_number: transfer.transfer_number,
          route,
          tms_ref: job.tmsReference || '-',
          check_status: job.loadingCheckPassed ? 'Approved' : 'Hold',
          issued_at: new Date().toLocaleString(),
        },
      ],
      summary: [
        {
          Status: job.status,
          'Security Notes': job.notes || '-',
        },
      ],
    };
  };

  const handleExport = (job: LoadingJob, kind: 'manifest' | 'delivery-note' | 'security-pass') => {
    const report = buildReport(job, kind);
    if (!report) {
      toast.error('Transfer data is missing for this loading job');
      return;
    }

    exportToPDF(report);
    toast.success('Document generated');
  };

  const filteredJobs = jobs.filter((job) => {
    const transfer = getTransfer(job.transferId);
    const product = transfer ? getProduct(transfer.product_id) : undefined;
    const haystack = [
      transfer?.transfer_number,
      product?.name,
      job.vehicleNo,
      job.driverName,
      job.tmsReference,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return !search || haystack.includes(search.toLowerCase());
  });

  const summary = {
    total: jobs.length,
    loadingCheck: jobs.filter((job) => job.loadingCheckPassed).length,
    active: jobs.filter((job) => job.status === 'loading').length,
    synced: jobs.filter((job) => job.tmsStatus === 'synced').length,
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
            <p className="text-sm text-slate-500">Total Loads</p>
            <p className="text-2xl font-bold text-slate-800">{summary.total}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-sky-500">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Loading Checks</p>
            <p className="text-2xl font-bold text-slate-800">{summary.loadingCheck}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-amber-500">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Active Loading</p>
            <p className="text-2xl font-bold text-slate-800">{summary.active}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-emerald-500">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">TMS Synced</p>
            <p className="text-2xl font-bold text-slate-800">{summary.synced}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Loading Operations</h3>
          <p className="text-sm text-slate-500">Truck loading, manifest, and dispatch document control</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              New Loading
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Loading Job</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Transfer</Label>
                <Select value={formTransferId} onValueChange={setFormTransferId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select transfer" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTransfers.map((transfer) => {
                      const product = getProduct(transfer.product_id);
                      return (
                        <SelectItem key={transfer.id} value={String(transfer.id)}>
                          {transfer.transfer_number} - {product?.name || 'Unknown Product'}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Vehicle No</Label>
                <Input value={formVehicleNo} onChange={(e) => setFormVehicleNo(e.target.value)} placeholder="B 1234 ABC" />
              </div>
              <div className="space-y-2">
                <Label>Driver</Label>
                <Input value={formDriverName} onChange={(e) => setFormDriverName(e.target.value)} placeholder="Driver name" />
              </div>
              <div className="space-y-2">
                <Label>TMS Reference</Label>
                <Input value={formTmsReference} onChange={(e) => setFormTmsReference(e.target.value)} placeholder="Optional TMS ref" />
              </div>
              <div className="space-y-2">
                <Label>Checked By</Label>
                <Input value={formCheckedBy} onChange={(e) => setFormCheckedBy(e.target.value)} placeholder="Operator name" />
              </div>
              <div className="space-y-2">
                <Label>Loading Check</Label>
                <Select value={formLoadingCheckPassed} onValueChange={setFormLoadingCheckPassed}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Passed</SelectItem>
                    <SelectItem value="no">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Pick & Load</Label>
                <Select value={formPickBeforeComplete} onValueChange={setFormPickBeforeComplete}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Allowed</SelectItem>
                    <SelectItem value="no">Not Allowed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Notes</Label>
                <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Special loading instructions" />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">
                  Create Loading Job
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          className="pl-9"
          placeholder="Search transfer, truck, driver, TMS ref..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {filteredJobs.map((job) => {
          const transfer = getTransfer(job.transferId);
          const product = transfer ? getProduct(transfer.product_id) : undefined;
          const plannedQty = transfer?.quantity || 0;
          const effectiveLoaded = Math.max(job.loadedQty - job.cancelledQty, 0);
          const progress = plannedQty > 0 ? Math.min((effectiveLoaded / plannedQty) * 100, 100) : 0;

          return (
            <Card key={job.id} className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-base text-slate-800">
                      {transfer?.transfer_number || 'Unlinked Transfer'}
                    </CardTitle>
                    <p className="text-sm text-slate-500 mt-1">
                      {product?.name || 'Unknown Product'} • {job.vehicleNo} • {job.driverName}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className={loadStatusColors[job.status]}>{job.status.replace('_', ' ')}</Badge>
                    <Badge className={tmsStatusColors[job.tmsStatus]}>{job.tmsStatus.replace('_', ' ')}</Badge>
                    <Badge className={STATUS_COLORS[transfer?.status || 'pending'] || STATUS_COLORS.pending}>
                      transfer {transfer?.status || 'pending'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-slate-500">Route</p>
                    <p className="font-medium text-slate-800 mt-1">{transfer ? buildRouteLabel(transfer) : '-'}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-slate-500">TMS Reference</p>
                    <p className="font-medium text-slate-800 mt-1">{job.tmsReference || '-'}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-slate-500">Loading Check</p>
                    <p className="font-medium text-slate-800 mt-1">
                      {job.loadingCheckPassed ? `Passed by ${job.checkedBy || 'operator'}` : 'Pending'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-slate-500">Pick & Load</p>
                    <p className="font-medium text-slate-800 mt-1">
                      {job.pickBeforeComplete ? 'Allowed before picking completion' : 'Requires picking completion'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Loading Progress</span>
                    <span className="font-medium text-slate-800">
                      {effectiveLoaded} / {plannedQty}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-blue-600" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="rounded-lg border border-slate-200 p-3">
                    <p className="text-slate-500">Loaded</p>
                    <p className="text-lg font-semibold text-slate-800">{job.loadedQty}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3">
                    <p className="text-slate-500">Exchange</p>
                    <p className="text-lg font-semibold text-slate-800">{job.exchangeQty}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3">
                    <p className="text-slate-500">Cancelled</p>
                    <p className="text-lg font-semibold text-slate-800">{job.cancelledQty}</p>
                  </div>
                </div>

                {job.notes && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
                    {job.notes}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleLoadingCheck(job)}>
                    <ScanSearch className="w-4 h-4 mr-2" />
                    Loading Check
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleStartLoading(job)}>
                    <Boxes className="w-4 h-4 mr-2" />
                    Pick & Load
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleLoadMore(job)}>
                    <Truck className="w-4 h-4 mr-2" />
                    Load More
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleExchange(job)}>
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    Exchange
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleCancelLoad(job)}>
                    <Ban className="w-4 h-4 mr-2" />
                    Cancel Load
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleSyncTms(job)}>
                    <Route className="w-4 h-4 mr-2" />
                    TMS Integration
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                  <Button size="sm" className="bg-slate-800 hover:bg-slate-900" onClick={() => handleExport(job, 'manifest')}>
                    <FileText className="w-4 h-4 mr-2" />
                    Manifest
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => handleExport(job, 'delivery-note')}>
                    <FileText className="w-4 h-4 mr-2" />
                    Delivery Note
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => handleExport(job, 'security-pass')}>
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Security Pass
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredJobs.length === 0 && (
        <Card>
          <CardContent className="p-10 text-center text-slate-500">
            No loading jobs found. Create a new loading plan to start truck dispatch operations.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
