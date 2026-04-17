import { useEffect, useState } from 'react';
import { client } from '@/lib/api';
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
import { Plus, ChefHat, Search } from 'lucide-react';
import { toast } from 'sonner';
import type { Product } from '@/lib/types';
import { STATUS_COLORS } from '@/lib/types';

interface ProductionOrder {
  id: number;
  order_number: string;
  product_id: number;
  quantity: number;
  status: string;
  scheduled_date: string;
  notes: string;
  created_at: string;
}

export default function Production() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  // Mock production orders (since table not yet created, we show a static view)
  const [orders] = useState<ProductionOrder[]>([
    {
      id: 1,
      order_number: 'PO-2026-001',
      product_id: 1,
      quantity: 50,
      status: 'in_progress',
      scheduled_date: '2026-04-15',
      notes: 'Lunch prep - chicken dishes',
      created_at: '2026-04-14 08:00:00',
    },
    {
      id: 2,
      order_number: 'PO-2026-002',
      product_id: 2,
      quantity: 20,
      status: 'pending',
      scheduled_date: '2026-04-16',
      notes: 'Sushi bar preparation',
      created_at: '2026-04-14 09:00:00',
    },
    {
      id: 3,
      order_number: 'PO-2026-003',
      product_id: 7,
      quantity: 100,
      status: 'completed',
      scheduled_date: '2026-04-14',
      notes: 'Bread baking batch',
      created_at: '2026-04-13 06:00:00',
    },
  ]);

  // Form state
  const [formProduct, setFormProduct] = useState('');
  const [formQuantity, setFormQuantity] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formNotes, setFormNotes] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const prodRes = await client.entities.products.query({ limit: 200 });
        setProducts(prodRes.data?.items || []);
      } catch (err) {
        console.error('Failed to fetch products:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getProduct = (id: number) => products.find((p) => p.id === id);

  const handleCreate = () => {
    if (!formProduct || !formQuantity || !formDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    toast.success('Production order created (demo)');
    setCreateOpen(false);
    setFormProduct('');
    setFormQuantity('');
    setFormDate('');
    setFormNotes('');
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOrders.map((order) => {
          const product = getProduct(order.product_id);
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
    </div>
  );
}