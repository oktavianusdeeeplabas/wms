import { useEffect, useMemo, useState } from 'react';
import { client } from '@/lib/api';
import type { Bin, InventoryLot, Product, StockTransfer, Warehouse, Zone } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, CheckCircle2, CircleAlert, RefreshCw, Stethoscope } from 'lucide-react';

interface DiagnosticCheck {
  key: string;
  title: string;
  severity: 'critical' | 'warning' | 'info';
  issueCount: number;
  summary: string;
}

export default function Diagnostic() {
  const [products, setProducts] = useState<Product[]>([]);
  const [lots, setLots] = useState<InventoryLot[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [bins, setBins] = useState<Bin[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRunAt, setLastRunAt] = useState<Date | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productRes, lotRes, warehouseRes, zoneRes, binRes, transferRes] = await Promise.all([
          client.entities.products.query({ limit: 500 }),
          client.entities.inventory_lots.query({ limit: 500 }),
          client.entities.warehouses.query({ limit: 300 }),
          client.entities.zones.query({ limit: 400 }),
          client.entities.bins.query({ limit: 800 }),
          client.entities.stock_transfers.query({ limit: 300 }),
        ]);
        setProducts(productRes.data?.items || []);
        setLots(lotRes.data?.items || []);
        setWarehouses(warehouseRes.data?.items || []);
        setZones(zoneRes.data?.items || []);
        setBins(binRes.data?.items || []);
        setTransfers(transferRes.data?.items || []);
      } catch (err) {
        console.error('Failed to fetch diagnostic data:', err);
      } finally {
        setLoading(false);
        setLastRunAt(new Date());
      }
    };
    fetchData();
  }, []);

  const checks = useMemo<DiagnosticCheck[]>(() => {
    const now = Date.now();
    const binsByZone = new Set(zones.map((zone) => zone.id));
    const transfersWithLoop = transfers.filter((transfer) => transfer.from_warehouse_id === transfer.to_warehouse_id).length;
    const lotsWithoutLocation = lots.filter((lot) => !lot.zone_id || !lot.bin_id).length;
    const expiredActive = lots.filter((lot) => lot.status === 'active' && lot.expiry_date && new Date(lot.expiry_date).getTime() < now).length;
    const productsMissingPlanning = products.filter((product) => !product.uom || product.reorder_point == null).length;
    const binsWithoutZone = bins.filter((bin) => !binsByZone.has(bin.zone_id)).length;
    const warehousesWithoutBranch = warehouses.filter((warehouse) => !warehouse.branch_id).length;

    return [
      {
        key: 'expired',
        title: 'Expired active lots',
        severity: expiredActive > 0 ? 'critical' : 'info',
        issueCount: expiredActive,
        summary: expiredActive > 0 ? 'Expired stock is still active and may be picked.' : 'No expired active lots detected.',
      },
      {
        key: 'planning',
        title: 'Products missing planning data',
        severity: productsMissingPlanning > 0 ? 'warning' : 'info',
        issueCount: productsMissingPlanning,
        summary: productsMissingPlanning > 0 ? 'Some products have no UOM or reorder point.' : 'Planning master data looks complete.',
      },
      {
        key: 'location',
        title: 'Lots without a full location',
        severity: lotsWithoutLocation > 0 ? 'warning' : 'info',
        issueCount: lotsWithoutLocation,
        summary: lotsWithoutLocation > 0 ? 'Some lots are missing zone or bin assignment.' : 'All lots have zone and bin references.',
      },
      {
        key: 'transfer_loop',
        title: 'Transfer route conflicts',
        severity: transfersWithLoop > 0 ? 'warning' : 'info',
        issueCount: transfersWithLoop,
        summary: transfersWithLoop > 0 ? 'Some transfers use the same source and destination warehouse.' : 'No transfer loop issues detected.',
      },
      {
        key: 'bin_integrity',
        title: 'Bin-zone integrity',
        severity: binsWithoutZone > 0 ? 'critical' : 'info',
        issueCount: binsWithoutZone,
        summary: binsWithoutZone > 0 ? 'Some bins reference zones that do not exist.' : 'Bin to zone references are valid.',
      },
      {
        key: 'warehouse_branch',
        title: 'Warehouse branch mapping',
        severity: warehousesWithoutBranch > 0 ? 'warning' : 'info',
        issueCount: warehousesWithoutBranch,
        summary: warehousesWithoutBranch > 0 ? 'Some warehouses are not assigned to a branch.' : 'All warehouses are assigned to a branch.',
      },
    ];
  }, [products, lots, warehouses, zones, bins, transfers]);

  const healthScore = Math.max(0, 100 - checks.reduce((score, check) => {
    if (check.severity === 'critical') return score + check.issueCount * 10;
    if (check.severity === 'warning') return score + check.issueCount * 5;
    return score;
  }, 0));

  const rerun = () => setLastRunAt(new Date());

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-blue-500">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Health Score</p>
            <p className="text-2xl font-bold text-slate-800">{healthScore}/100</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-red-500">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Critical Findings</p>
            <p className="text-2xl font-bold text-slate-800">{checks.filter((check) => check.severity === 'critical' && check.issueCount > 0).length}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-emerald-500">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Last Run</p>
            <p className="text-lg font-semibold text-slate-800">{lastRunAt ? lastRunAt.toLocaleTimeString() : '-'}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-blue-600" />
            Warehouse Diagnostic
          </CardTitle>
          <Button variant="outline" onClick={rerun}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Diagnostic
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4">
          {checks.map((check) => (
            <div key={check.key} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    {check.issueCount === 0 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <CircleAlert className="w-4 h-4 text-amber-500" />
                    )}
                    <p className="font-semibold text-slate-800">{check.title}</p>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{check.summary}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-slate-100 text-slate-700">{check.issueCount} issue(s)</Badge>
                  <Badge className={check.severity === 'critical' ? 'bg-red-100 text-red-800' : check.severity === 'warning' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}>
                    {check.severity}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-slate-600" />
              Recommended next pass
            </div>
            Review critical inventory issues first, then clean master data fields so replenishment and analytics stay trustworthy.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
