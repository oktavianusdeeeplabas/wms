import { useEffect, useMemo, useState } from 'react';
import { client } from '@/lib/api';
import { loadLocalData, saveLocalData } from '@/lib/local-storage';
import type { Bin, InventoryLot, Product } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Minus, PackagePlus, Plus } from 'lucide-react';

interface KitComponent {
  productId: number;
  quantity: number;
}

interface KitDefinition {
  id: number;
  name: string;
  sku: string;
  status: 'draft' | 'active';
  components: KitComponent[];
  storageBinIds: number[];
}

const STORAGE_KEY = 'wms_kits_v1';

export default function Kitting() {
  const [products, setProducts] = useState<Product[]>([]);
  const [lots, setLots] = useState<InventoryLot[]>([]);
  const [bins, setBins] = useState<Bin[]>([]);
  const [kits, setKits] = useState<KitDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [status, setStatus] = useState<'draft' | 'active'>('draft');
  const [components, setComponents] = useState<Array<{ productId: string; quantity: string }>>([
    { productId: '', quantity: '' },
  ]);
  const [selectedBinId, setSelectedBinId] = useState('');
  const [storageBinIds, setStorageBinIds] = useState<number[]>([]);

  useEffect(() => {
    setKits(loadLocalData<KitDefinition[]>(STORAGE_KEY, []));
  }, []);

  useEffect(() => {
    saveLocalData(STORAGE_KEY, kits);
  }, [kits]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productRes, lotRes, binRes] = await Promise.all([
          client.entities.products.query({ limit: 300 }),
          client.entities.inventory_lots.query({ limit: 500 }),
          client.entities.bins.query({ limit: 500 }),
        ]);
        setProducts(productRes.data?.items || []);
        setLots(lotRes.data?.items || []);
        setBins(binRes.data?.items || []);
      } catch (err) {
        console.error('Failed to fetch kitting data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const inventoryByProduct = useMemo(() => {
    const map = new Map<number, number>();
    lots.filter((lot) => lot.status === 'active').forEach((lot) => {
      map.set(lot.product_id, (map.get(lot.product_id) || 0) + lot.quantity);
    });
    return map;
  }, [lots]);

  const getProduct = (id: number) => products.find((product) => product.id === id);
  const getBin = (id: number) => bins.find((bin) => bin.id === id);

  const addComponentRow = () => {
    setComponents((prev) => [...prev, { productId: '', quantity: '' }]);
  };

  const updateComponent = (index: number, field: 'productId' | 'quantity', value: string) => {
    setComponents((prev) => prev.map((row, idx) => (idx === index ? { ...row, [field]: value } : row)));
  };

  const removeComponent = (index: number) => {
    setComponents((prev) => prev.filter((_, idx) => idx !== index));
  };

  const addStorageBin = () => {
    if (!selectedBinId) return;
    const binId = parseInt(selectedBinId, 10);
    setStorageBinIds((prev) => (prev.includes(binId) ? prev : [...prev, binId]));
    setSelectedBinId('');
  };

  const createKit = () => {
    const cleanComponents = components
      .filter((row) => row.productId && row.quantity)
      .map((row) => ({ productId: parseInt(row.productId, 10), quantity: parseFloat(row.quantity) }));

    if (!name || !sku || cleanComponents.length === 0) return;

    const nextKit: KitDefinition = {
      id: Date.now(),
      name,
      sku,
      status,
      components: cleanComponents,
      storageBinIds,
    };

    setKits((prev) => [nextKit, ...prev]);
    setName('');
    setSku('');
    setStatus('draft');
    setComponents([{ productId: '', quantity: '' }]);
    setStorageBinIds([]);
  };

  const getKitAvailability = (kit: KitDefinition) => {
    if (kit.components.length === 0) return 0;
    return Math.floor(
      Math.min(
        ...kit.components.map((component) => {
          const onHand = inventoryByProduct.get(component.productId) || 0;
          return component.quantity > 0 ? onHand / component.quantity : 0;
        })
      )
    );
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-blue-600" />
            Build Kit Definition
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Kit Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Burger Combo Kit" />
            </div>
            <div>
              <Label>Kit SKU</Label>
              <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="KIT-001" />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as 'draft' | 'active')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Components</Label>
            {components.map((row, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_180px_44px] gap-3">
                <Select value={row.productId} onValueChange={(value) => updateComponent(index, 'productId', value)}>
                  <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={String(product.id)}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={row.quantity}
                  onChange={(e) => updateComponent(index, 'quantity', e.target.value)}
                  placeholder="Qty per kit"
                />
                <Button variant="outline" onClick={() => removeComponent(index)} disabled={components.length === 1}>
                  <Minus className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" onClick={addComponentRow}>
              <Plus className="w-4 h-4 mr-2" />
              Add Component
            </Button>
          </div>

          <div className="space-y-3">
            <Label>Storage Locations</Label>
            <div className="flex gap-3">
              <Select value={selectedBinId} onValueChange={setSelectedBinId}>
                <SelectTrigger className="max-w-sm">
                  <SelectValue placeholder="Select storage bin" />
                </SelectTrigger>
                <SelectContent>
                  {bins.map((bin) => (
                    <SelectItem key={bin.id} value={String(bin.id)}>
                      {bin.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={addStorageBin}>Add Location</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {storageBinIds.map((binId) => (
                <Badge key={binId} className="bg-slate-100 text-slate-800">
                  {getBin(binId)?.code || `Bin ${binId}`}
                </Badge>
              ))}
            </div>
          </div>

          <Button className="bg-blue-600 hover:bg-blue-700" onClick={createKit} disabled={!name || !sku}>
            Save Kit
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kit Catalog</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {kits.map((kit) => (
            <div key={kit.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="font-semibold text-slate-800">{kit.name}</p>
                  <p className="text-sm text-slate-500">{kit.sku}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-slate-100 text-slate-800">{kit.status}</Badge>
                  <Badge className={getKitAvailability(kit) > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}>
                    Buildable: {Math.max(0, getKitAvailability(kit))}
                  </Badge>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Components</p>
                  <div className="space-y-2">
                    {kit.components.map((component, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="text-slate-700">{getProduct(component.productId)?.name || component.productId}</span>
                        <span className="text-slate-500">
                          {component.quantity} / on hand {(inventoryByProduct.get(component.productId) || 0).toFixed(0)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Storage Locations</p>
                  <div className="flex flex-wrap gap-2">
                    {kit.storageBinIds.map((binId) => (
                      <Badge key={binId} className="bg-blue-100 text-blue-800">
                        {getBin(binId)?.code || `Bin ${binId}`}
                      </Badge>
                    ))}
                    {kit.storageBinIds.length === 0 && <span className="text-sm text-slate-400">No kit storage bins assigned</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {kits.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              No kits defined yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
