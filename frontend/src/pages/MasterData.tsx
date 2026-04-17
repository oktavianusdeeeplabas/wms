import { useEffect, useState } from 'react';
import { client } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Product, Supplier, Warehouse, Zone, Bin } from '@/lib/types';
import { STATUS_COLORS } from '@/lib/types';

export default function MasterData() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [bins, setBins] = useState<Bin[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('products');

  // Product form
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [pName, setPName] = useState('');
  const [pSku, setPSku] = useState('');
  const [pCategory, setPCategory] = useState('');
  const [pUnit, setPUnit] = useState('');
  const [pMinStock, setPMinStock] = useState('');
  const [pReorderPoint, setPReorderPoint] = useState('');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [prodRes, supRes, whRes, zoneRes, binRes] = await Promise.all([
        client.entities.products.query({ limit: 200 }),
        client.entities.suppliers.query({ limit: 200 }),
        client.entities.warehouses.query({ limit: 100 }),
        client.entities.zones.query({ limit: 100 }),
        client.entities.bins.query({ limit: 200 }),
      ]);
      setProducts(prodRes.data?.items || []);
      setSuppliers(supRes.data?.items || []);
      setWarehouses(whRes.data?.items || []);
      setZones(zoneRes.data?.items || []);
      setBins(binRes.data?.items || []);
    } catch (err) {
      console.error('Failed to fetch master data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Product CRUD
  const openProductForm = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setPName(product.name);
      setPSku(product.sku);
      setPCategory(product.category);
      setPUnit(product.uom || '');
      setPMinStock(String(product.min_stock ?? ''));
      setPReorderPoint(String(product.reorder_point ?? ''));
    } else {
      setEditingProduct(null);
      setPName('');
      setPSku('');
      setPCategory('');
      setPUnit('');
      setPMinStock('');
      setPReorderPoint('');
    }
    setProductDialogOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!pName || !pSku) {
      toast.error('Name and SKU are required');
      return;
    }
    try {
      const data = {
        name: pName,
        sku: pSku,
        category: pCategory || null,
        uom: pUnit || null,
        min_stock: parseInt(pMinStock) || null,
        reorder_point: parseInt(pReorderPoint) || null,
        status: editingProduct?.status ?? 'active',
      };
      if (editingProduct) {
        await client.entities.products.update({ id: String(editingProduct.id), data });
        toast.success('Product updated');
      } else {
        await client.entities.products.create({ data });
        toast.success('Product created');
      }
      setProductDialogOpen(false);
      fetchAll();
    } catch (err) {
      console.error('Failed to save product:', err);
      toast.error('Failed to save product');
    }
  };

  const handleDeleteProduct = async (id: number) => {
    try {
      await client.entities.products.delete({ id: String(id) });
      toast.success('Product deleted');
      fetchAll();
    } catch (err) {
      console.error('Failed to delete:', err);
      toast.error('Failed to delete');
    }
  };

  const filterBySearch = <T,>(items: T[], keys: (keyof T)[]) => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter((item) =>
      keys.some((key) => String((item[key] as unknown) ?? '').toLowerCase().includes(q))
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
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="products">Products ({products.length})</TabsTrigger>
            <TabsTrigger value="suppliers">Suppliers ({suppliers.length})</TabsTrigger>
            <TabsTrigger value="warehouses">Warehouses ({warehouses.length})</TabsTrigger>
            <TabsTrigger value="zones">Zones ({zones.length})</TabsTrigger>
            <TabsTrigger value="bins">Bins ({bins.length})</TabsTrigger>
          </TabsList>
          {activeTab === 'products' && (
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => openProductForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-md mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Products Tab */}
        <TabsContent value="products">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Name</th>
                      <th className="text-left py-2.5 px-4 text-slate-500 font-medium">SKU</th>
                      <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Category</th>
                      <th className="text-left py-2.5 px-4 text-slate-500 font-medium">UOM</th>
                      <th className="text-right py-2.5 px-4 text-slate-500 font-medium">Min Stock</th>
                      <th className="text-right py-2.5 px-4 text-slate-500 font-medium">Reorder</th>
                      <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Status</th>
                      <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filterBySearch(products, ['name', 'sku', 'category']).map((p, idx) => (
                      <tr key={p.id} className={`border-b border-slate-100 hover:bg-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                        <td className="py-2.5 px-4 font-medium text-slate-800">{p.name}</td>
                        <td className="py-2.5 px-4 font-mono text-xs text-slate-600">{p.sku}</td>
                        <td className="py-2.5 px-4 text-slate-600">{p.category}</td>
                        <td className="py-2.5 px-4 text-slate-500">{p.uom}</td>
                        <td className="py-2.5 px-4 text-right">{p.min_stock}</td>
                        <td className="py-2.5 px-4 text-right">{p.reorder_point}</td>
                        <td className="py-2.5 px-4">
                          <Badge className={`text-xs ${STATUS_COLORS[p.status] || ''}`}>{p.status}</Badge>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openProductForm(p)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteProduct(p.id)} className="text-red-500 hover:text-red-700">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Name</th>
                      <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Code</th>
                      <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Contact</th>
                      <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Email</th>
                      <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Phone</th>
                      <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filterBySearch(suppliers, ['name', 'code', 'contact_name']).map((s, idx) => (
                      <tr key={s.id} className={`border-b border-slate-100 hover:bg-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                        <td className="py-2.5 px-4 font-medium text-slate-800">{s.name}</td>
                        <td className="py-2.5 px-4 font-mono text-xs text-slate-600">{s.code}</td>
                        <td className="py-2.5 px-4 text-slate-600">{s.contact_name}</td>
                        <td className="py-2.5 px-4 text-slate-500">{s.email}</td>
                        <td className="py-2.5 px-4 text-slate-500">{s.phone}</td>
                        <td className="py-2.5 px-4">
                          <Badge className={`text-xs ${STATUS_COLORS[s.status] || ''}`}>{s.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Warehouses Tab */}
        <TabsContent value="warehouses">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Name</th>
                      <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Code</th>
                      <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Address</th>
                      <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filterBySearch(warehouses, ['name', 'code', 'address']).map((w, idx) => (
                      <tr key={w.id} className={`border-b border-slate-100 hover:bg-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                        <td className="py-2.5 px-4 font-medium text-slate-800">{w.name}</td>
                        <td className="py-2.5 px-4 font-mono text-xs text-slate-600">{w.code}</td>
                        <td className="py-2.5 px-4 text-slate-500">{w.address}</td>
                        <td className="py-2.5 px-4">
                          <Badge className={`text-xs ${STATUS_COLORS[w.status] || ''}`}>{w.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Zones Tab */}
        <TabsContent value="zones">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Name</th>
                      <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Code</th>
                      <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Warehouse</th>
                      <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Temp Type</th>
                      <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filterBySearch(zones, ['name', 'code', 'temperature_type']).map((z, idx) => {
                      const wh = warehouses.find((w) => w.id === z.warehouse_id);
                      return (
                        <tr key={z.id} className={`border-b border-slate-100 hover:bg-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                          <td className="py-2.5 px-4 font-medium text-slate-800">{z.name}</td>
                          <td className="py-2.5 px-4 font-mono text-xs text-slate-600">{z.code}</td>
                          <td className="py-2.5 px-4 text-slate-500">{wh?.name || '-'}</td>
                          <td className="py-2.5 px-4">
                            <Badge className={`text-xs ${STATUS_COLORS[z.temperature_type] || 'bg-gray-100 text-gray-800'}`}>
                              {z.temperature_type}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-4">
                            <Badge className={`text-xs ${STATUS_COLORS[z.status] || ''}`}>{z.status}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bins Tab */}
        <TabsContent value="bins">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Name</th>
                      <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Code</th>
                      <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Zone</th>
                      <th className="text-right py-2.5 px-4 text-slate-500 font-medium">Capacity</th>
                      <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filterBySearch(bins, ['name', 'code']).map((b, idx) => {
                      const zone = zones.find((z) => z.id === b.zone_id);
                      return (
                        <tr key={b.id} className={`border-b border-slate-100 hover:bg-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                          <td className="py-2.5 px-4 font-medium text-slate-800">{b.name}</td>
                          <td className="py-2.5 px-4 font-mono text-xs text-slate-600">{b.code}</td>
                          <td className="py-2.5 px-4 text-slate-500">{zone?.name || '-'}</td>
                          <td className="py-2.5 px-4 text-right">{b.capacity}</td>
                          <td className="py-2.5 px-4">
                            <Badge className={`text-xs ${STATUS_COLORS[b.status] || ''}`}>{b.status}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Product Form Dialog */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name *</Label>
                <Input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="Product name" />
              </div>
              <div>
                <Label>SKU *</Label>
                <Input value={pSku} onChange={(e) => setPSku(e.target.value)} placeholder="PRD-XXX" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Input value={pCategory} onChange={(e) => setPCategory(e.target.value)} placeholder="e.g. Meat, Dairy" />
              </div>
              <div>
                <Label>Unit</Label>
                <Input value={pUnit} onChange={(e) => setPUnit(e.target.value)} placeholder="e.g. kg, liter" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Min Stock</Label>
                <Input type="number" value={pMinStock} onChange={(e) => setPMinStock(e.target.value)} />
              </div>
              <div>
                <Label>Reorder Point</Label>
                <Input type="number" value={pReorderPoint} onChange={(e) => setPReorderPoint(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleSaveProduct} className="w-full bg-blue-600 hover:bg-blue-700">
              {editingProduct ? 'Update Product' : 'Create Product'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}