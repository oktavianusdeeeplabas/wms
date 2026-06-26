import { useEffect, useMemo, useState } from 'react';
import { client } from '@/lib/api';
import { loadLocalData } from '@/lib/local-storage';
import type { InventoryLot, ReceivingDocument, StockTransfer } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, AlertTriangle, Clock3, ShieldAlert } from 'lucide-react';

interface CycleCountTask {
  id: number;
  status: 'open' | 'investigate' | 'reconciled';
  createdAt: string;
}

interface AssetRecord {
  id: number;
  code: string;
  status: 'available' | 'in_use' | 'in_transit' | 'maintenance';
  lastSeenAt: string;
}

interface MonitorItem {
  id: string;
  area: string;
  title: string;
  detail: string;
  severity: 'critical' | 'warning' | 'info';
}

export default function OperationMonitor() {
  const [receivingDocs, setReceivingDocs] = useState<ReceivingDocument[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [lots, setLots] = useState<InventoryLot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [receivingRes, transferRes, lotRes] = await Promise.all([
          client.entities.receiving_documents.query({ limit: 300, sort: '-created_at' }),
          client.entities.stock_transfers.query({ limit: 300, sort: '-created_at' }),
          client.entities.inventory_lots.query({ limit: 300, sort: 'expiry_date' }),
        ]);
        setReceivingDocs(receivingRes.data?.items || []);
        setTransfers(transferRes.data?.items || []);
        setLots(lotRes.data?.items || []);
      } catch (err) {
        console.error('Failed to load monitor data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const items = useMemo(() => {
    const now = Date.now();
    const cycleCounts = loadLocalData<CycleCountTask[]>('wms_cycle_counts_v1', []);
    const assets = loadLocalData<AssetRecord[]>('wms_assets_v1', []);
    const monitorItems: MonitorItem[] = [];

    receivingDocs.forEach((doc) => {
      const ageDays = Math.floor((now - new Date(doc.created_at || doc.expected_date).getTime()) / 86400000);
      if ((doc.status === 'pending' || doc.status === 'in_progress') && ageDays >= 2) {
        monitorItems.push({
          id: `rec-${doc.id}`,
          area: 'Receiving',
          title: `Receiving ${doc.document_number} is still ${doc.status}`,
          detail: `Open for ${ageDays} day(s). Review dock processing and putaway completion.`,
          severity: ageDays >= 4 ? 'critical' : 'warning',
        });
      }
    });

    transfers.forEach((transfer) => {
      const refDate = transfer.shipped_date || transfer.requested_date || transfer.created_at;
      const ageDays = Math.floor((now - new Date(refDate).getTime()) / 86400000);
      if ((transfer.status === 'pending' || transfer.status === 'in_transit') && ageDays >= 2) {
        monitorItems.push({
          id: `trf-${transfer.id}`,
          area: 'Transfers',
          title: `Transfer ${transfer.transfer_number} may be hanging`,
          detail: `${transfer.status.replace('_', ' ')} for ${ageDays} day(s). Confirm shipment or receipt.`,
          severity: ageDays >= 5 ? 'critical' : 'warning',
        });
      }
    });

    cycleCounts.forEach((task) => {
      const ageDays = Math.floor((now - new Date(task.createdAt).getTime()) / 86400000);
      if (task.status !== 'reconciled' && ageDays >= 1) {
        monitorItems.push({
          id: `cc-${task.id}`,
          area: 'Cycle Count',
          title: `Cycle count task ${task.id} still unresolved`,
          detail: `Open for ${ageDays} day(s). Resolve count variance before it blocks planning.`,
          severity: task.status === 'investigate' ? 'critical' : 'warning',
        });
      }
    });

    lots.forEach((lot) => {
      if (lot.status === 'active' && lot.expiry_date && new Date(lot.expiry_date).getTime() < now) {
        monitorItems.push({
          id: `lot-${lot.id}`,
          area: 'Inventory',
          title: `Expired active lot ${lot.lot_number}`,
          detail: 'This lot is still active in stock and should be quarantined or written off.',
          severity: 'critical',
        });
      }
    });

    assets.forEach((asset) => {
      const ageDays = Math.floor((now - new Date(asset.lastSeenAt).getTime()) / 86400000);
      if (asset.status === 'in_transit' && ageDays >= 3) {
        monitorItems.push({
          id: `asset-${asset.id}`,
          area: 'Assets',
          title: `Asset ${asset.code} has not been seen recently`,
          detail: `Marked in transit with no update for ${ageDays} day(s). Check returnable asset custody.`,
          severity: 'warning',
        });
      }
    });

    return monitorItems.sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 };
      return order[a.severity] - order[b.severity];
    });
  }, [receivingDocs, transfers, lots]);

  const criticalCount = items.filter((item) => item.severity === 'critical').length;
  const warningCount = items.filter((item) => item.severity === 'warning').length;

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
        <Card className="border-l-4 border-red-500">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Critical Issues</p>
            <p className="text-2xl font-bold text-slate-800">{criticalCount}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-amber-500">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Warnings</p>
            <p className="text-2xl font-bold text-slate-800">{warningCount}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-blue-500">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Total Monitored Events</p>
            <p className="text-2xl font-bold text-slate-800">{items.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Operation Monitor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {item.severity === 'critical' ? (
                      <ShieldAlert className="w-4 h-4 text-red-500" />
                    ) : item.severity === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    ) : (
                      <Clock3 className="w-4 h-4 text-blue-500" />
                    )}
                    <p className="font-semibold text-slate-800">{item.title}</p>
                  </div>
                  <p className="text-sm text-slate-600">{item.detail}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className="bg-slate-100 text-slate-700">{item.area}</Badge>
                  <Badge className={item.severity === 'critical' ? 'bg-red-100 text-red-800' : item.severity === 'warning' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}>
                    {item.severity}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="text-center py-10 text-slate-400">
              No hanging operations detected right now
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
