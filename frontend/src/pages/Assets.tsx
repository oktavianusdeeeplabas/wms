import { useEffect, useMemo, useState } from 'react';
import { loadLocalData, saveLocalData } from '@/lib/local-storage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Archive, Package2, Search, Truck } from 'lucide-react';

interface AssetRecord {
  id: number;
  code: string;
  type: string;
  status: 'available' | 'in_use' | 'in_transit' | 'maintenance';
  currentLocation: string;
  assignee: string;
  lastSeenAt: string;
  notes: string;
}

const STORAGE_KEY = 'wms_assets_v1';

export default function Assets() {
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [code, setCode] = useState('');
  const [type, setType] = useState('pallet');
  const [status, setStatus] = useState<AssetRecord['status']>('available');
  const [currentLocation, setCurrentLocation] = useState('');
  const [assignee, setAssignee] = useState('');
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setAssets(loadLocalData<AssetRecord[]>(STORAGE_KEY, []));
  }, []);

  useEffect(() => {
    saveLocalData(STORAGE_KEY, assets);
  }, [assets]);

  const createAsset = () => {
    if (!code || !currentLocation) return;

    const nextAsset: AssetRecord = {
      id: Date.now(),
      code,
      type,
      status,
      currentLocation,
      assignee,
      lastSeenAt: new Date().toISOString(),
      notes,
    };

    setAssets((prev) => [nextAsset, ...prev]);
    setCode('');
    setType('pallet');
    setStatus('available');
    setCurrentLocation('');
    setAssignee('');
    setNotes('');
  };

  const updateStatus = (id: number, nextStatus: AssetRecord['status']) => {
    setAssets((prev) =>
      prev.map((asset) =>
        asset.id === id ? { ...asset, status: nextStatus, lastSeenAt: new Date().toISOString() } : asset
      )
    );
  };

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const q = search.toLowerCase();
      return (
        !search ||
        asset.code.toLowerCase().includes(q) ||
        asset.currentLocation.toLowerCase().includes(q) ||
        asset.assignee.toLowerCase().includes(q)
      );
    });
  }, [assets, search]);

  const availableCount = assets.filter((asset) => asset.status === 'available').length;
  const transitCount = assets.filter((asset) => asset.status === 'in_transit').length;
  const maintenanceCount = assets.filter((asset) => asset.status === 'maintenance').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-emerald-500">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Available Assets</p>
            <p className="text-2xl font-bold text-slate-800">{availableCount}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-violet-500">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">In Transit</p>
            <p className="text-2xl font-bold text-slate-800">{transitCount}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-amber-500">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Maintenance</p>
            <p className="text-2xl font-bold text-slate-800">{maintenanceCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-blue-600" />
            Register Returnable Asset
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label>Asset Code</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="PALLET-001" />
            </div>
            <div>
              <Label>Asset Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pallet">Pallet</SelectItem>
                  <SelectItem value="container">Container</SelectItem>
                  <SelectItem value="crate">Crate</SelectItem>
                  <SelectItem value="tray">Tray</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as AssetRecord['status'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="in_use">In Use</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Current Location</Label>
              <Input value={currentLocation} onChange={(e) => setCurrentLocation(e.target.value)} placeholder="Warehouse A / Dock 2" />
            </div>
            <div>
              <Label>Assigned To</Label>
              <Input value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="Driver or team" />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Condition, custody notes, return instructions" />
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={createAsset} disabled={!code || !currentLocation}>
            Register Asset
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Package2 className="w-5 h-5 text-slate-700" />
            Asset Registry
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search asset code, location, or assignee" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredAssets.map((asset) => (
              <Card key={asset.id} className="border border-slate-200">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">{asset.code}</p>
                      <p className="text-sm text-slate-500 capitalize">{asset.type}</p>
                    </div>
                    <Badge className="bg-slate-100 text-slate-800 capitalize">{asset.status.replace('_', ' ')}</Badge>
                  </div>
                  <div className="text-sm text-slate-600 space-y-1">
                    <p>Location: {asset.currentLocation}</p>
                    <p>Assignee: {asset.assignee || 'Unassigned'}</p>
                    <p>Last Seen: {new Date(asset.lastSeenAt).toLocaleString()}</p>
                  </div>
                  {asset.notes && <p className="text-sm text-slate-500">{asset.notes}</p>}
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => updateStatus(asset.id, 'available')}>
                      Available
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => updateStatus(asset.id, 'in_use')}>
                      In Use
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => updateStatus(asset.id, 'in_transit')}>
                      <Truck className="w-3.5 h-3.5 mr-1" />
                      Transit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => updateStatus(asset.id, 'maintenance')}>
                      Service
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredAssets.length === 0 && (
              <div className="col-span-full text-center py-8 text-slate-400">
                No assets recorded yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
