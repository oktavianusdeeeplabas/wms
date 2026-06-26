import { useEffect, useMemo, useState } from 'react';
import { client } from '@/lib/api';
import { loadLocalData, saveLocalData } from '@/lib/local-storage';
import type { Bin, InventoryLot, Product, Zone } from '@/lib/types';
import { STATUS_COLORS } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ClipboardCheck, Minus, Plus, Search, Target, TriangleAlert } from 'lucide-react';

type CycleCountStatus = 'open' | 'investigate' | 'reconciled';

interface CycleCountTask {
  id: number;
  lotId: number;
  productId: number;
  zoneId: number;
  binId: number;
  systemQty: number;
  countedQty: number;
  variance: number;
  status: CycleCountStatus;
  createdAt: string;
  notes: string;
}

const STORAGE_KEY = 'wms_cycle_counts_v1';

export default function CycleCounts() {
  const [lots, setLots] = useState<InventoryLot[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [bins, setBins] = useState<Bin[]>([]);
  const [tasks, setTasks] = useState<CycleCountTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLotId, setSelectedLotId] = useState('');
  const [countedQty, setCountedQty] = useState('');
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    setTasks(loadLocalData<CycleCountTask[]>(STORAGE_KEY, []));
  }, []);

  useEffect(() => {
    saveLocalData(STORAGE_KEY, tasks);
  }, [tasks]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [lotRes, prodRes, zoneRes, binRes] = await Promise.all([
          client.entities.inventory_lots.query({ limit: 500, sort: 'expiry_date' }),
          client.entities.products.query({ limit: 300 }),
          client.entities.zones.query({ limit: 200 }),
          client.entities.bins.query({ limit: 500 }),
        ]);
        setLots(lotRes.data?.items || []);
        setProducts(prodRes.data?.items || []);
        setZones(zoneRes.data?.items || []);
        setBins(binRes.data?.items || []);
      } catch (err) {
        console.error('Failed to fetch cycle count data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getProduct = (id: number) => products.find((p) => p.id === id);
  const getZone = (id: number) => zones.find((z) => z.id === id);
  const getBin = (id: number) => bins.find((b) => b.id === id);
  const selectedLot = lots.find((lot) => String(lot.id) === selectedLotId);

  const createTask = () => {
    if (!selectedLot || countedQty === '') return;

    const counted = parseFloat(countedQty);
    const systemQty = selectedLot.quantity;
    const variance = counted - systemQty;

    const nextTask: CycleCountTask = {
      id: Date.now(),
      lotId: selectedLot.id,
      productId: selectedLot.product_id,
      zoneId: selectedLot.zone_id,
      binId: selectedLot.bin_id,
      systemQty,
      countedQty: counted,
      variance,
      status: variance === 0 ? 'reconciled' : 'investigate',
      createdAt: new Date().toISOString(),
      notes,
    };

    setTasks((prev) => [nextTask, ...prev]);
    setSelectedLotId('');
    setCountedQty('');
    setNotes('');
  };

  const updateStatus = (id: number, status: CycleCountStatus) => {
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, status } : task)));
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const product = getProduct(task.productId);
      const bin = getBin(task.binId);
      const matchesSearch =
        !search ||
        product?.name.toLowerCase().includes(search.toLowerCase()) ||
        bin?.code.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tasks, search, statusFilter, products, bins]);

  const openTasks = tasks.filter((task) => task.status === 'open').length;
  const investigateTasks = tasks.filter((task) => task.status === 'investigate').length;
  const resolvedTasks = tasks.filter((task) => task.status === 'reconciled').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-sky-500">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Open Counts</p>
            <p className="text-2xl font-bold text-slate-800">{openTasks}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-amber-500">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Need Investigation</p>
            <p className="text-2xl font-bold text-slate-800">{investigateTasks}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-emerald-500">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Reconciled</p>
            <p className="text-2xl font-bold text-slate-800">{resolvedTasks}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-blue-600" />
            Create Cycle Count
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Inventory Lot</Label>
              <Select value={selectedLotId} onValueChange={setSelectedLotId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select lot" />
                </SelectTrigger>
                <SelectContent>
                  {lots.map((lot) => {
                    const product = getProduct(lot.product_id);
                    const bin = getBin(lot.bin_id);
                    return (
                      <SelectItem key={lot.id} value={String(lot.id)}>
                        {product?.name || 'Unknown'} · {lot.lot_number} · {bin?.code || 'No bin'}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>System Quantity</Label>
              <Input value={selectedLot ? String(selectedLot.quantity) : ''} disabled />
            </div>
            <div>
              <Label>Counted Quantity</Label>
              <Input
                type="number"
                value={countedQty}
                onChange={(e) => setCountedQty(e.target.value)}
                placeholder="Enter counted quantity"
              />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Document observed issues, damaged packs, or recount details"
            />
          </div>
          {selectedLot && countedQty !== '' && (
            <div className="flex items-center gap-3 text-sm">
              <Badge className={parseFloat(countedQty) - selectedLot.quantity === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}>
                Variance: {(parseFloat(countedQty) - selectedLot.quantity).toFixed(2)}
              </Badge>
              <span className="text-slate-500">
                {getZone(selectedLot.zone_id)?.name} / {getBin(selectedLot.bin_id)?.code}
              </span>
            </div>
          )}
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={createTask} disabled={!selectedLot || countedQty === ''}>
            <Plus className="w-4 h-4 mr-2" />
            Save Count Task
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-slate-700" />
            Count Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by product or bin"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="investigate">Investigate</SelectItem>
                <SelectItem value="reconciled">Reconciled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left py-2.5 px-3 text-slate-500 font-medium">Product</th>
                  <th className="text-left py-2.5 px-3 text-slate-500 font-medium">Location</th>
                  <th className="text-right py-2.5 px-3 text-slate-500 font-medium">System</th>
                  <th className="text-right py-2.5 px-3 text-slate-500 font-medium">Counted</th>
                  <th className="text-right py-2.5 px-3 text-slate-500 font-medium">Variance</th>
                  <th className="text-left py-2.5 px-3 text-slate-500 font-medium">Status</th>
                  <th className="text-left py-2.5 px-3 text-slate-500 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task, idx) => {
                  const product = getProduct(task.productId);
                  const zone = getZone(task.zoneId);
                  const bin = getBin(task.binId);
                  return (
                    <tr
                      key={task.id}
                      className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                    >
                      <td className="py-2.5 px-3">
                        <p className="font-medium text-slate-800">{product?.name || '-'}</p>
                        <p className="text-xs text-slate-400">{new Date(task.createdAt).toLocaleString()}</p>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{zone?.name} / {bin?.code}</td>
                      <td className="py-2.5 px-3 text-right">{task.systemQty}</td>
                      <td className="py-2.5 px-3 text-right">{task.countedQty}</td>
                      <td className="py-2.5 px-3 text-right">
                        <Badge className={task.variance === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}>
                          {task.variance > 0 ? '+' : ''}{task.variance}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge className={STATUS_COLORS[task.status] || 'bg-gray-100 text-gray-800'}>
                          {task.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => updateStatus(task.id, 'open')}>
                            Open
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => updateStatus(task.id, 'investigate')}>
                            <TriangleAlert className="w-3.5 h-3.5 mr-1" />
                            Review
                          </Button>
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => updateStatus(task.id, 'reconciled')}>
                            Reconcile
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredTasks.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      No cycle count tasks yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
