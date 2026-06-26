import { useEffect, useMemo, useState } from 'react';
import { client } from '@/lib/api';
import { loadLocalData, saveLocalData } from '@/lib/local-storage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, ChefHat, Search, Clock, ClipboardList, CheckCircle2, PlayCircle, Eye } from 'lucide-react';
import { toast } from 'sonner';
import type { BomLine, BomRecipe, Product, ProductionOrder } from '@/lib/types';
import { STATUS_COLORS } from '@/lib/types';

const STORAGE_KEY = 'wms_production_orders_v1';

export default function Production() {
  const [products, setProducts] = useState<Product[]>([]);
  const [recipes, setRecipes] = useState<BomRecipe[]>([]);
  const [bomLines, setBomLines] = useState<BomLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);

  // Form state
  const [formProduct, setFormProduct] = useState('');
  const [formQuantity, setFormQuantity] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formNotes, setFormNotes] = useState('');

  useEffect(() => {
    setOrders(loadLocalData<ProductionOrder[]>(STORAGE_KEY, [
      {
        id: 1,
        order_number: 'PO-2026-001',
        product_id: 1,
        quantity: 50,
        status: 'in_progress',
        scheduled_date: '2026-04-15',
        notes: 'Lunch prep - chicken dishes',
        created_at: '2026-04-14T08:00:00',
      },
      {
        id: 2,
        order_number: 'PO-2026-002',
        product_id: 2,
        quantity: 20,
        status: 'pending',
        scheduled_date: '2026-04-16',
        notes: 'Sushi bar preparation',
        created_at: '2026-04-14T09:00:00',
      },
      {
        id: 3,
        order_number: 'PO-2026-003',
        product_id: 7,
        quantity: 100,
        status: 'completed',
        scheduled_date: '2026-04-14',
        notes: 'Bread baking batch',
        created_at: '2026-04-13T06:00:00',
      },
    ]));
  }, []);

  useEffect(() => {
    saveLocalData(STORAGE_KEY, orders);
  }, [orders]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, recipeRes, lineRes] = await Promise.all([
          client.entities.products.query({ limit: 200 }),
          client.entities.bom_recipes.query({ limit: 200 }),
          client.entities.bom_lines.query({ limit: 500 }),
        ]);
        setProducts(prodRes.data?.items || []);
        setRecipes(recipeRes.data?.items || []);
        setBomLines(lineRes.data?.items || []);
      } catch (err) {
        console.error('Failed to fetch products:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getProduct = (id: number) => products.find((p) => p.id === id);
  const getRecipe = (productId: number) => recipes.find((recipe) => recipe.product_id === productId);
  const getRecipeLines = (productId: number) => {
    const recipe = getRecipe(productId);
    return recipe ? bomLines.filter((line) => line.recipe_id === recipe.id) : [];
  };

  const selectedRecipe = formProduct ? getRecipe(parseInt(formProduct, 10)) : undefined;
  const selectedRecipeLines = formProduct ? getRecipeLines(parseInt(formProduct, 10)) : [];

  const generateOrderNumber = () => {
    const next = orders.length + 1;
    return `PO-2026-${String(next).padStart(3, '0')}`;
  };

  const handleCreate = () => {
    if (!formProduct || !formQuantity || !formDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    const nextOrder: ProductionOrder = {
      id: Date.now(),
      order_number: generateOrderNumber(),
      product_id: parseInt(formProduct, 10),
      quantity: parseFloat(formQuantity),
      status: 'pending',
      scheduled_date: formDate,
      notes: formNotes,
      created_at: new Date().toISOString(),
    };

    setOrders((prev) => [nextOrder, ...prev]);
    toast.success('Production order created');
    setCreateOpen(false);
    setFormProduct('');
    setFormQuantity('');
    setFormDate('');
    setFormNotes('');
  };

  const updateStatus = (id: number, status: string) => {
    setOrders((prev) => prev.map((order) => (order.id === id ? { ...order, status } : order)));
    toast.success(`Production order marked ${status.replace('_', ' ')}`);
  };

  const filteredOrders = orders.filter((o) => {
    const product = getProduct(o.product_id);
    return (
      !search ||
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      product?.name.toLowerCase().includes(search.toLowerCase())
    );
  });

  // Summary
  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const inProgressCount = orders.filter((o) => o.status === 'in_progress').length;
  const completedCount = orders.filter((o) => o.status === 'completed').length;
  const recipeCoverage = useMemo(() => {
    if (orders.length === 0) return 0;
    const withRecipe = orders.filter((order) => Boolean(getRecipe(order.product_id))).length;
    return Math.round((withRecipe / orders.length) * 100);
  }, [orders, recipes]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="border-l-4 border-amber-500">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Pending</p>
            <p className="text-2xl font-bold text-slate-800">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-blue-500">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">In Progress</p>
            <p className="text-2xl font-bold text-slate-800">{inProgressCount}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-emerald-500">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Completed</p>
            <p className="text-2xl font-bold text-slate-800">{completedCount}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-violet-500">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Recipe Coverage</p>
            <p className="text-2xl font-bold text-slate-800">{recipeCoverage}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Production Orders</h3>
          <p className="text-sm text-slate-500">Kitchen production scheduling and tracking</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              New Production Order
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Production Order</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>Product *</Label>
                <Select value={formProduct} onValueChange={setFormProduct}>
                  <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  value={formQuantity}
                  onChange={(e) => setFormQuantity(e.target.value)}
                  placeholder="Enter quantity"
                />
              </div>
              <div>
                <Label>Scheduled Date *</Label>
                <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              </div>
              <div>
                <Label>Notes</Label>
                <Input value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Optional notes" />
              </div>
              {formProduct && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700">Recipe & component preview</p>
                    <Badge className={selectedRecipe ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}>
                      {selectedRecipe ? 'Recipe linked' : 'No recipe'}
                    </Badge>
                  </div>
                  {selectedRecipeLines.length > 0 ? (
                    <div className="space-y-1">
                      {selectedRecipeLines.slice(0, 5).map((line) => (
                        <div key={line.id} className="flex items-center justify-between text-xs text-slate-600">
                          <span>{getProduct(line.product_id)?.name || `Product ${line.product_id}`}</span>
                          <span>{line.quantity} {line.unit || ''}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      This order can still be created, but no BOM recipe is linked to the selected product yet.
                    </p>
                  )}
                </div>
              )}
              <Button onClick={handleCreate} className="w-full bg-emerald-600 hover:bg-emerald-700">
                Create Order
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search orders..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Orders */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.7fr] gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredOrders.map((order) => {
          const product = getProduct(order.product_id);
          const hasRecipe = Boolean(getRecipe(order.product_id));
          return (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-mono text-blue-600">{order.order_number}</CardTitle>
                  <Badge className={`text-xs ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'}`}>
                    {order.status.replace('_', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <ChefHat className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-800">{product?.name || '-'}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Quantity: <span className="font-medium text-slate-700">{order.quantity}</span></span>
                  <span>{new Date(order.scheduled_date).toLocaleDateString()}</span>
                </div>
                {order.notes && (
                  <p className="text-xs text-slate-400 truncate">{order.notes}</p>
                )}
                <div className="flex items-center gap-2 pt-2 flex-wrap">
                  <Badge className={hasRecipe ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}>
                    {hasRecipe ? 'BOM linked' : 'No BOM'}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => updateStatus(order.id, 'pending')}>
                    <Clock className="w-3.5 h-3.5 mr-1" />
                    Pending
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => updateStatus(order.id, 'in_progress')}>
                    <PlayCircle className="w-3.5 h-3.5 mr-1" />
                    Start
                  </Button>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => updateStatus(order.id, 'completed')}>
                    Complete
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedOrder(order)}>
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filteredOrders.length === 0 && (
          <div className="col-span-full text-center py-8 text-slate-400">
            No production orders found
          </div>
        )}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Order Detail</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedOrder ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{selectedOrder.order_number}</p>
                  <p className="text-sm text-slate-500">{getProduct(selectedOrder.product_id)?.name || '-'}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-slate-500">Quantity</p>
                    <p className="font-semibold text-slate-800">{selectedOrder.quantity}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-slate-500">Status</p>
                    <Badge className={`mt-1 text-xs ${STATUS_COLORS[selectedOrder.status] || 'bg-gray-100 text-gray-800'}`}>
                      {selectedOrder.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                <div className="text-sm text-slate-600">
                  <p>Scheduled: {new Date(selectedOrder.scheduled_date).toLocaleDateString()}</p>
                  <p>Created: {new Date(selectedOrder.created_at).toLocaleString()}</p>
                </div>
                {selectedOrder.notes && (
                  <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                    {selectedOrder.notes}
                  </div>
                )}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-slate-500" />
                    <p className="text-sm font-medium text-slate-700">Required Components</p>
                  </div>
                  {getRecipeLines(selectedOrder.product_id).length > 0 ? (
                    <div className="space-y-2">
                      {getRecipeLines(selectedOrder.product_id).map((line) => (
                        <div key={line.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm">
                          <span className="text-slate-700">{getProduct(line.product_id)?.name || `Product ${line.product_id}`}</span>
                          <span className="text-slate-500">
                            {(line.quantity * selectedOrder.quantity).toFixed(2)} {line.unit || ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">No BOM recipe linked for this product yet.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400">
                Select an order to inspect its component requirements
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
