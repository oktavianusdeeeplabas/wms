import { useEffect, useMemo, useState } from 'react';
import { client } from '@/lib/api';
import { getAPIBaseURL } from '@/lib/config';
import type { Bin, InventoryLot, Product, UhfReader, UhfTag, UhfTagRead, Zone } from '@/lib/types';
import { STATUS_COLORS } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RadioTower, RefreshCw, ScanLine, Sticker, Tag } from 'lucide-react';
import { toast } from 'sonner';

const entities = (client as any).entities;

export default function RFIDTracking() {
  const [tags, setTags] = useState<UhfTag[]>([]);
  const [reads, setReads] = useState<UhfTagRead[]>([]);
  const [readers, setReaders] = useState<UhfReader[]>([]);
  const [lots, setLots] = useState<InventoryLot[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [bins, setBins] = useState<Bin[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [epc, setEpc] = useState('');
  const [selectedLotId, setSelectedLotId] = useState('');
  const [selectedReaderId, setSelectedReaderId] = useState('');
  const [direction, setDirection] = useState('inbound');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tagRes, readRes, readerRes, lotRes, productRes, zoneRes, binRes] = await Promise.all([
        entities.uhf_tags.query({ limit: 500, sort: '-last_seen_at' }),
        entities.uhf_tag_reads.query({ limit: 100, sort: '-seen_at' }),
        entities.uhf_readers.query({ limit: 100, sort: 'name' }),
        entities.inventory_lots.query({ limit: 500, sort: 'expiry_date' }),
        entities.products.query({ limit: 500 }),
        entities.zones.query({ limit: 200 }),
        entities.bins.query({ limit: 500 }),
      ]);
      setTags(tagRes.data?.items || []);
      setReads(readRes.data?.items || []);
      setReaders(readerRes.data?.items || []);
      setLots(lotRes.data?.items || []);
      setProducts(productRes.data?.items || []);
      setZones(zoneRes.data?.items || []);
      setBins(binRes.data?.items || []);
    } catch (err) {
      console.error('Failed to fetch RFID data:', err);
      toast.error('Failed to load RFID tracking data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const lotsById = useMemo(() => new Map(lots.map((lot) => [lot.id, lot])), [lots]);
  const productsById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const zonesById = useMemo(() => new Map(zones.map((zone) => [zone.id, zone])), [zones]);
  const binsById = useMemo(() => new Map(bins.map((bin) => [bin.id, bin])), [bins]);
  const readersById = useMemo(() => new Map(readers.map((reader) => [reader.id, reader])), [readers]);

  const normalizeEpc = (value: string) => value.toUpperCase().replace(/\s+/g, '');
  const selectedLot = selectedLotId ? lotsById.get(Number(selectedLotId)) : null;
  const activeTags = tags.filter((tag) => tag.status === 'assigned').length;
  const onlineReaders = readers.filter((reader) => reader.status === 'online' || reader.status === 'active').length;
  const unknownReads = reads.filter((read) => !read.tag_id).length;

  const assignSticker = async () => {
    const cleanEpc = normalizeEpc(epc);
    if (!cleanEpc || !selectedLot) {
      toast.error('Select a lot and enter the sticker EPC');
      return;
    }

    setSaving(true);
    try {
      const existing = tags.find((tag) => tag.epc === cleanEpc);
      const payload = {
        epc: cleanEpc,
        sticker_label: `UHF-${cleanEpc.slice(-8)}`,
        product_id: selectedLot.product_id,
        lot_id: selectedLot.id,
        assigned_quantity: selectedLot.quantity,
        current_zone_id: selectedLot.zone_id,
        current_bin_id: selectedLot.bin_id,
        status: 'assigned',
        encoded_at: new Date().toISOString(),
        assigned_at: new Date().toISOString(),
        notes: 'Assigned from RFID Tracking',
      };

      if (existing) {
        await entities.uhf_tags.update({ id: String(existing.id), data: payload });
        toast.success('UHF sticker assignment updated');
      } else {
        await entities.uhf_tags.create({ data: payload });
        toast.success('UHF sticker assigned to lot');
      }

      setEpc('');
      await fetchData();
    } catch (err) {
      console.error('Failed to assign sticker:', err);
      toast.error('Failed to assign UHF sticker');
    } finally {
      setSaving(false);
    }
  };

  const submitRead = async () => {
    const cleanEpc = normalizeEpc(epc);
    if (!cleanEpc || !selectedReaderId) {
      toast.error('Enter an EPC and select a reader');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${getAPIBaseURL()}/api/v1/entities/uhf_tag_reads/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(window.localStorage.getItem('token')
            ? { Authorization: `Bearer ${window.localStorage.getItem('token')}` }
            : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          epc: cleanEpc,
          reader_id: Number(selectedReaderId),
          direction,
          event_type: 'reader_scan',
          rssi: -48 - Math.round(Math.random() * 18),
          read_count: 1 + Math.round(Math.random() * 8),
        }),
      });
      if (!response.ok) throw new Error('Scan rejected');
      toast.success('Reader scan captured');
      await fetchData();
    } catch (err) {
      console.error('Failed to submit reader scan:', err);
      toast.error('Failed to capture reader scan');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (value: string | null) => (value ? new Date(value).toLocaleString() : '-');
  const getProductName = (tag: UhfTag) => {
    const lot = tag.lot_id ? lotsById.get(tag.lot_id) : null;
    const productId = tag.product_id || lot?.product_id;
    return productId ? productsById.get(productId)?.name || '-' : '-';
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
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-l-4 border-blue-500">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Assigned Stickers</p>
            <p className="text-2xl font-bold text-slate-800">{activeTags}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-emerald-500">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Readers Online</p>
            <p className="text-2xl font-bold text-slate-800">{onlineReaders}/{readers.length}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-amber-500">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Read Events</p>
            <p className="text-2xl font-bold text-slate-800">{reads.length}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-red-500">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Unknown EPCs</p>
            <p className="text-2xl font-bold text-slate-800">{unknownReads}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sticker className="w-5 h-5 text-blue-600" />
              Sticker Assignment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>UHF EPC</Label>
              <Input
                value={epc}
                onChange={(event) => setEpc(event.target.value)}
                placeholder="E2801191A5030066F1000003"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>Inventory Lot</Label>
              <Select value={selectedLotId} onValueChange={setSelectedLotId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select lot" />
                </SelectTrigger>
                <SelectContent>
                  {lots.map((lot) => (
                    <SelectItem key={lot.id} value={String(lot.id)}>
                      {lot.lot_number} - {productsById.get(lot.product_id)?.name || 'Product'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={assignSticker} disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700">
              <Tag className="w-4 h-4 mr-2" />
              Assign Sticker
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RadioTower className="w-5 h-5 text-emerald-600" />
              Reader Capture
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Reader</Label>
              <Select value={selectedReaderId} onValueChange={setSelectedReaderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reader" />
                </SelectTrigger>
                <SelectContent>
                  {readers.map((reader) => (
                    <SelectItem key={reader.id} value={String(reader.id)}>
                      {reader.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Direction</Label>
              <Select value={direction} onValueChange={setDirection}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inbound">Inbound</SelectItem>
                  <SelectItem value="outbound">Outbound</SelectItem>
                  <SelectItem value="cycle_count">Cycle Count</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={submitRead} disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-700">
              <ScanLine className="w-4 h-4 mr-2" />
              Capture Read
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Readers</CardTitle>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {readers.map((reader) => (
              <div key={reader.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-800">{reader.name}</p>
                    <p className="text-xs font-mono text-slate-500">{reader.code}</p>
                  </div>
                  <Badge className={STATUS_COLORS[reader.status || ''] || 'bg-slate-100 text-slate-700'}>
                    {reader.status || 'unknown'}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {zonesById.get(reader.zone_id || 0)?.name || '-'} / {binsById.get(reader.bin_id || 0)?.name || '-'}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tracked Stickers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left py-2.5 px-3 text-slate-500 font-medium">EPC</th>
                  <th className="text-left py-2.5 px-3 text-slate-500 font-medium">Item</th>
                  <th className="text-left py-2.5 px-3 text-slate-500 font-medium">Lot</th>
                  <th className="text-left py-2.5 px-3 text-slate-500 font-medium">Location</th>
                  <th className="text-left py-2.5 px-3 text-slate-500 font-medium">Last Seen</th>
                  <th className="text-left py-2.5 px-3 text-slate-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {tags.map((tag) => (
                  <tr key={tag.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono text-xs text-slate-700">{tag.epc}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">{getProductName(tag)}</td>
                    <td className="py-2.5 px-3 text-slate-600">{tag.lot_id ? lotsById.get(tag.lot_id)?.lot_number || '-' : '-'}</td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {zonesById.get(tag.current_zone_id || 0)?.name || '-'} / {binsById.get(tag.current_bin_id || 0)?.name || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">{formatDate(tag.last_seen_at)}</td>
                    <td className="py-2.5 px-3">
                      <Badge className={STATUS_COLORS[tag.status || ''] || 'bg-slate-100 text-slate-700'}>
                        {tag.status || 'unknown'}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {tags.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      No UHF stickers assigned
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Latest Reader Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {reads.slice(0, 12).map((read) => (
              <div key={read.id} className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-mono text-xs text-slate-700">{read.epc}</p>
                  <p className="text-sm text-slate-500">
                    {readersById.get(read.reader_id || 0)?.name || 'Unknown reader'} at {formatDate(read.seen_at)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-slate-100 text-slate-700">{read.direction || 'read'}</Badge>
                  <Badge className="bg-blue-100 text-blue-800">RSSI {read.rssi ?? '-'}</Badge>
                  <Badge className={read.tag_id ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}>
                    {read.tag_id ? 'matched' : 'unknown'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
