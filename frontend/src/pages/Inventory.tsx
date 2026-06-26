import { useEffect, useState } from 'react';
import { client } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Search } from 'lucide-react';
import type { InventoryLot, Product, StockMovement, Zone } from '@/lib/types';
import { STATUS_COLORS } from '@/lib/types';

export default function Inventory() {
  const [lots, setLots] = useState<InventoryLot[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [zoneFilter, setZoneFilter] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [lotRes, movementRes, prodRes, zoneRes] = await Promise.all([
          client.entities.inventory_lots.query({ limit: 200, sort: 'expiry_date' }),
          client.entities.stock_movements.query({ limit: 200, sort: '-created_at' }),
          client.entities.products.query({ limit: 200 }),
          client.entities.zones.query({ limit: 100 }),
        ]);
        setLots(lotRes.data?.items || []);
        setMovements(movementRes.data?.items || []);
        setProducts(prodRes.data?.items || []);
        setZones(zoneRes.data?.items || []);
      } catch (err) {
        console.error('Failed to fetch inventory:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getProduct = (id: number) => products.find((p) => p.id === id);
  const getZone = (id: number) => zones.find((z) => z.id === id);
  const getLot = (id: number) => lots.find((l) => l.id === id);

  const today = new Date();
  const getDaysUntilExpiry = (expiryDate: string) => {
    if (!expiryDate) return Infinity;
    return Math.ceil((new Date(expiryDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getExpiryBadge = (days: number) => {
    if (days <= 0) return <Badge className="bg-red-500 text-white text-xs">Expired</Badge>;
    if (days <= 3) return <Badge className="bg-red-100 text-red-800 text-xs">{days}d left</Badge>;
    if (days <= 7) return <Badge className="bg-amber-100 text-amber-800 text-xs">{days}d left</Badge>;
    return <Badge className="bg-emerald-100 text-emerald-800 text-xs">{days}d left</Badge>;
  };

  const filteredLots = lots.filter((lot) => {
    const product = getProduct(lot.product_id);
    const matchesSearch =
      !search ||
      product?.name.toLowerCase().includes(search.toLowerCase()) ||
      lot.lot_number.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lot.status === statusFilter;
    const matchesZone = zoneFilter === 'all' || String(lot.zone_id) === zoneFilter;
    return matchesSearch && matchesStatus && matchesZone;
  });

  const filteredMovements = movements.filter((movement) => {
    const product = getProduct(movement.product_id);
    const lot = getLot(movement.lot_id);
    const fromZone = getZone(movement.from_zone_id);
    const toZone = getZone(movement.to_zone_id);
    const matchesSearch =
      !search ||
      product?.name.toLowerCase().includes(search.toLowerCase()) ||
      product?.sku.toLowerCase().includes(search.toLowerCase()) ||
      lot?.lot_number.toLowerCase().includes(search.toLowerCase()) ||
      movement.movement_type.toLowerCase().includes(search.toLowerCase()) ||
      movement.reference_type.toLowerCase().includes(search.toLowerCase()) ||
      movement.notes?.toLowerCase().includes(search.toLowerCase());
    const matchesZone =
      zoneFilter === 'all' ||
      String(movement.from_zone_id) === zoneFilter ||
      String(movement.to_zone_id) === zoneFilter;
    const matchesStatus = statusFilter === 'all' || lot?.status === statusFilter;
    return matchesSearch && matchesZone && matchesStatus && (fromZone || toZone || product);
  });

  const movementTypeColors: Record<string, string> = {
    inbound: 'bg-emerald-100 text-emerald-800',
    outbound: 'bg-red-100 text-red-800',
    production: 'bg-blue-100 text-blue-800',
    transfer: 'bg-violet-100 text-violet-800',
    qc_hold: 'bg-amber-100 text-amber-800',
    adjustment: 'bg-slate-100 text-slate-700',
  };

  // Summary stats
  const totalActiveLots = lots.filter((l) => l.status === 'active').length;
  const totalQuantity = lots
    .filter((l) => l.status === 'active')
    .reduce((sum, l) => sum + l.quantity, 0);
  const nearExpiry = lots.filter(
    (l) => l.status === 'active' && getDaysUntilExpiry(l.expiry_date) <= 5 && getDaysUntilExpiry(l.expiry_date) >= 0
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-blue-500">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Active Lots</p>
            <p className="text-2xl font-bold text-slate-800">{totalActiveLots}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-emerald-500">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Total Quantity</p>
            <p className="text-2xl font-bold text-slate-800">{totalQuantity.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-red-500">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Near Expiry</p>
            <p className="text-2xl font-bold text-slate-800">{nearExpiry}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Inventory Lots</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search product or lot number..."
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
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Select value={zoneFilter} onValueChange={setZoneFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Zone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Zones</SelectItem>
                {zones.map((z) => (
                  <SelectItem key={z.id} value={String(z.id)}>
                    {z.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left py-2.5 px-3 text-slate-500 font-medium">Product</th>
                  <th className="text-left py-2.5 px-3 text-slate-500 font-medium">Lot #</th>
                  <th className="text-left py-2.5 px-3 text-slate-500 font-medium">Zone</th>
                  <th className="text-right py-2.5 px-3 text-slate-500 font-medium">Qty</th>
                  <th className="text-left py-2.5 px-3 text-slate-500 font-medium">Received</th>
                  <th className="text-left py-2.5 px-3 text-slate-500 font-medium">Expiry</th>
                  <th className="text-left py-2.5 px-3 text-slate-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLots.map((lot, idx) => {
                  const product = getProduct(lot.product_id);
                  const zone = getZone(lot.zone_id);
                  const daysLeft = getDaysUntilExpiry(lot.expiry_date);
                  return (
                    <tr
                      key={lot.id}
                      className={`border-b border-slate-100 hover:bg-slate-50 ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <div>
                          <p className="font-medium text-slate-800">{product?.name || '-'}</p>
                          <p className="text-xs text-slate-400">{product?.sku}</p>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs text-slate-600">{lot.lot_number}</td>
                      <td className="py-2.5 px-3">
                        {zone && (
                          <Badge className={`text-xs ${STATUS_COLORS[zone.temperature_type] || 'bg-gray-100 text-gray-800'}`}>
                            {zone.name}
                          </Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                        {lot.quantity} <span className="text-slate-400 text-xs">{product?.uom}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {lot.received_date ? new Date(lot.received_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="py-2.5 px-3">{getExpiryBadge(daysLeft)}</td>
                      <td className="py-2.5 px-3">
                        <Badge className={`text-xs ${STATUS_COLORS[lot.status] || 'bg-gray-100 text-gray-800'}`}>
                          {lot.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
                {filteredLots.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      No inventory lots found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <CardTitle className="text-base font-semibold">Movement Log</CardTitle>
            <p className="text-sm text-slate-500">{filteredMovements.length} movement item{filteredMovements.length === 1 ? '' : 's'}</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left py-2.5 px-3 text-slate-500 font-medium">Date</th>
                  <th className="text-left py-2.5 px-3 text-slate-500 font-medium">Product</th>
                  <th className="text-left py-2.5 px-3 text-slate-500 font-medium">Lot #</th>
                  <th className="text-left py-2.5 px-3 text-slate-500 font-medium">Movement</th>
                  <th className="text-left py-2.5 px-3 text-slate-500 font-medium">Route</th>
                  <th className="text-right py-2.5 px-3 text-slate-500 font-medium">Qty</th>
                  <th className="text-left py-2.5 px-3 text-slate-500 font-medium">Reference</th>
                  <th className="text-left py-2.5 px-3 text-slate-500 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovements.map((movement, idx) => {
                  const product = getProduct(movement.product_id);
                  const lot = getLot(movement.lot_id);
                  const fromZone = getZone(movement.from_zone_id);
                  const toZone = getZone(movement.to_zone_id);
                  return (
                    <tr
                      key={movement.id}
                      className={`border-b border-slate-100 hover:bg-slate-50 ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                      }`}
                    >
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                        {movement.created_at ? new Date(movement.created_at).toLocaleString() : '-'}
                      </td>
                      <td className="py-2.5 px-3">
                        <p className="font-medium text-slate-800">{product?.name || '-'}</p>
                        <p className="text-xs text-slate-400">{product?.sku}</p>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs text-slate-600">{lot?.lot_number || '-'}</td>
                      <td className="py-2.5 px-3">
                        <Badge className={`text-xs ${movementTypeColors[movement.movement_type] || 'bg-gray-100 text-gray-800'}`}>
                          {movement.movement_type.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 min-w-56">
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <span className="truncate max-w-32">{fromZone?.name || 'External'}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate max-w-32">{toZone?.name || 'External'}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                        {movement.quantity} <span className="text-slate-400 text-xs">{product?.uom}</span>
                      </td>
                      <td className="py-2.5 px-3 text-xs text-slate-500 whitespace-nowrap">
                        {movement.reference_type} #{movement.reference_id}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">{movement.notes || '-'}</td>
                    </tr>
                  );
                })}
                {filteredMovements.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400">
                      No stock movements found
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
