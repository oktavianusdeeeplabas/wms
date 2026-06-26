import { useEffect, useMemo, useState } from 'react';
import { client } from '@/lib/api';
import type { Bin, Branch, InventoryLot, Warehouse, Zone } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Map as MapIcon, Warehouse as WarehouseIcon } from 'lucide-react';

export default function Visualization() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [bins, setBins] = useState<Bin[]>([]);
  const [lots, setLots] = useState<InventoryLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchFilter, setBranchFilter] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [branchRes, warehouseRes, zoneRes, binRes, lotRes] = await Promise.all([
          client.entities.branches.query({ limit: 200 }),
          client.entities.warehouses.query({ limit: 200 }),
          client.entities.zones.query({ limit: 400 }),
          client.entities.bins.query({ limit: 800 }),
          client.entities.inventory_lots.query({ limit: 500 }),
        ]);
        setBranches(branchRes.data?.items || []);
        setWarehouses(warehouseRes.data?.items || []);
        setZones(zoneRes.data?.items || []);
        setBins(binRes.data?.items || []);
        setLots(lotRes.data?.items || []);
      } catch (err) {
        console.error('Failed to fetch visualization data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const zonesByWarehouse = useMemo(() => {
    const map = new Map<number, Zone[]>();
    zones.forEach((zone) => {
      map.set(zone.warehouse_id, [...(map.get(zone.warehouse_id) || []), zone]);
    });
    return map;
  }, [zones]);

  const binsByZone = useMemo(() => {
    const map = new Map<number, Bin[]>();
    bins.forEach((bin) => {
      map.set(bin.zone_id, [...(map.get(bin.zone_id) || []), bin]);
    });
    return map;
  }, [bins]);

  const qtyByBin = useMemo(() => {
    const map = new Map<number, number>();
    lots.forEach((lot) => {
      map.set(lot.bin_id, (map.get(lot.bin_id) || 0) + lot.quantity);
    });
    return map;
  }, [lots]);

  const visibleWarehouses = warehouses.filter((warehouse) => branchFilter === 'all' || String(warehouse.branch_id) === branchFilter);

  const occupancyTone = (binId: number, capacity: number) => {
    const qty = qtyByBin.get(binId) || 0;
    const ratio = capacity > 0 ? qty / capacity : 0;
    if (ratio >= 0.9) return 'bg-red-100 border-red-300 text-red-800';
    if (ratio >= 0.6) return 'bg-amber-100 border-amber-300 text-amber-800';
    return 'bg-emerald-100 border-emerald-300 text-emerald-800';
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
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <MapIcon className="w-5 h-5 text-blue-600" />
            Warehouse Block Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-4">
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Filter by branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={String(branch.id)}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Badge className="bg-emerald-100 text-emerald-800">Low Load</Badge>
              <Badge className="bg-amber-100 text-amber-800">Medium Load</Badge>
              <Badge className="bg-red-100 text-red-800">High Load</Badge>
            </div>
          </div>

          <div className="space-y-6">
            {visibleWarehouses.map((warehouse) => (
              <Card key={warehouse.id} className="border border-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <WarehouseIcon className="w-4 h-4 text-slate-600" />
                    {warehouse.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {(zonesByWarehouse.get(warehouse.id) || []).map((zone) => (
                    <div key={zone.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-semibold text-slate-800">{zone.name}</p>
                          <p className="text-xs text-slate-500">{zone.code}</p>
                        </div>
                        <Badge className="bg-slate-100 text-slate-700 capitalize">{zone.temperature_type}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {(binsByZone.get(zone.id) || []).map((bin) => {
                          const qty = qtyByBin.get(bin.id) || 0;
                          return (
                            <div key={bin.id} className={`rounded-lg border p-3 ${occupancyTone(bin.id, bin.capacity)}`}>
                              <p className="font-semibold text-sm">{bin.code}</p>
                              <p className="text-xs mt-1">Qty: {qty.toFixed(0)}</p>
                              <p className="text-xs">Cap: {bin.capacity}</p>
                            </div>
                          );
                        })}
                        {(binsByZone.get(zone.id) || []).length === 0 && (
                          <div className="col-span-full text-sm text-slate-400">No bins mapped</div>
                        )}
                      </div>
                    </div>
                  ))}
                  {(zonesByWarehouse.get(warehouse.id) || []).length === 0 && (
                    <div className="text-sm text-slate-400">No zones available for this warehouse</div>
                  )}
                </CardContent>
              </Card>
            ))}
            {visibleWarehouses.length === 0 && (
              <div className="text-center py-10 text-slate-400">
                No warehouses available for the selected branch
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
