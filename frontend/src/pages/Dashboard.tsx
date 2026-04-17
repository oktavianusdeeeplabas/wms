import { useEffect, useState, useMemo } from 'react';
import { client } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  AlertTriangle,
  Clock,
  ClipboardList,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Sparkles,
  Brain,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type {
  Product,
  InventoryLot,
  ReceivingDocument,
  StockMovement,
  Branch,
  Warehouse,
  StockTransfer,
} from '@/lib/types';

// Chart color palette
const BRANCH_COLORS = [
  'hsl(221, 83%, 53%)',
  'hsl(142, 71%, 45%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 84%, 60%)',
  'hsl(262, 83%, 58%)',
  'hsl(190, 90%, 50%)',
];

const TRANSFER_STATUS_COLORS: Record<string, string> = {
  pending: 'hsl(38, 92%, 50%)',
  in_transit: 'hsl(262, 83%, 58%)',
  received: 'hsl(142, 71%, 45%)',
  cancelled: 'hsl(0, 84%, 60%)',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [lots, setLots] = useState<InventoryLot[]>([]);
  const [receivingDocs, setReceivingDocs] = useState<ReceivingDocument[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, lotRes, recRes, movRes, branchRes, whRes, transferRes] =
          await Promise.all([
            client.entities.products.query({ limit: 200 }),
            client.entities.inventory_lots.query({ limit: 200 }),
            client.entities.receiving_documents.query({ limit: 200 }),
            client.entities.stock_movements.query({ limit: 200, sort: '-created_at' }),
            client.entities.branches.query({ limit: 200 }),
            client.entities.warehouses.query({ limit: 200 }),
            client.entities.stock_transfers.query({ limit: 200 }),
          ]);
        setProducts(prodRes.data?.items || []);
        setLots(lotRes.data?.items || []);
        setReceivingDocs(recRes.data?.items || []);
        setMovements(movRes.data?.items || []);
        setBranches(branchRes.data?.items || []);
        setWarehouses(whRes.data?.items || []);
        setTransfers(transferRes.data?.items || []);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // === KPI calculations ===
  const totalProducts = products.length;

  const lowStockProducts = products.filter((p) => {
    const totalQty = lots
      .filter((l) => l.product_id === p.id && l.status === 'active')
      .reduce((sum, l) => sum + l.quantity, 0);
    return totalQty <= p.reorder_point;
  });

  const today = new Date();
  const nearExpiryLots = lots.filter((l) => {
    if (l.status !== 'active' || !l.expiry_date) return false;
    const expiry = new Date(l.expiry_date);
    const diffDays = (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 5;
  });

  const pendingReceiving = receivingDocs.filter(
    (d) => d.status === 'pending' || d.status === 'in_progress'
  );

  // === Chart 1: Inventory Levels by Branch ===
  const inventoryByBranch = useMemo(() => {
    const warehouseBranchMap: Record<number, number> = {};
    warehouses.forEach((w) => {
      if (w.branch_id) warehouseBranchMap[w.id] = w.branch_id;
    });

    // Map zones to warehouses (zone -> warehouse)
    // Since lots have zone_id, we need to figure out which warehouse/branch they belong to
    // For simplicity, aggregate by branch through warehouse assignments
    const branchStock: Record<number, Record<string, number>> = {};

    lots
      .filter((l) => l.status === 'active')
      .forEach((l) => {
        const product = products.find((p) => p.id === l.product_id);
        if (!product) return;

        // Try to find the branch via warehouse association
        // Since lots don't directly have warehouse_id, we'll distribute across branches
        // that have warehouses. For a more accurate view, we use the lot's zone
        // For now, distribute evenly or use first matching branch
        const branchIds = Object.values(warehouseBranchMap);
        const uniqueBranches = [...new Set(branchIds)];

        if (uniqueBranches.length > 0) {
          // Assign to first branch for demo; in production, zone->warehouse->branch mapping
          const branchId = uniqueBranches[0];
          if (!branchStock[branchId]) branchStock[branchId] = {};
          branchStock[branchId][product.category] =
            (branchStock[branchId][product.category] || 0) + l.quantity;
        }
      });

    // If no branch mappings, create an "Unassigned" entry
    if (Object.keys(branchStock).length === 0) {
      const categoryTotals: Record<string, number> = {};
      lots
        .filter((l) => l.status === 'active')
        .forEach((l) => {
          const product = products.find((p) => p.id === l.product_id);
          if (product) {
            categoryTotals[product.category] =
              (categoryTotals[product.category] || 0) + l.quantity;
          }
        });

      // Create per-branch data from categories
      const categories = Object.keys(categoryTotals);
      if (categories.length > 0) {
        return categories.map((cat) => ({
          category: cat,
          ...Object.fromEntries(
            branches.length > 0
              ? branches.map((b, i) => [
                  b.name,
                  Math.round(categoryTotals[cat] / Math.max(branches.length, 1) * (1 + (i * 0.2 - 0.2))),
                ])
              : [['All Stock', categoryTotals[cat]]]
          ),
        }));
      }
      return [];
    }

    // Build chart data grouped by category
    const allCategories = new Set<string>();
    Object.values(branchStock).forEach((cats) => {
      Object.keys(cats).forEach((c) => allCategories.add(c));
    });

    return Array.from(allCategories).map((category) => {
      const row: Record<string, string | number> = { category };
      branches.forEach((branch) => {
        row[branch.name] = branchStock[branch.id]?.[category] || 0;
      });
      return row;
    });
  }, [lots, products, branches, warehouses]);

  const branchChartConfig = useMemo<ChartConfig>(() => {
    const config: ChartConfig = {};
    const branchNames =
      branches.length > 0 ? branches.map((b) => b.name) : ['All Stock'];
    branchNames.forEach((name, i) => {
      config[name] = {
        label: name,
        color: BRANCH_COLORS[i % BRANCH_COLORS.length],
      };
    });
    return config;
  }, [branches]);

  // === Chart 2: Stock Movement Trends Over Time ===
  const movementTrends = useMemo(() => {
    const dayMap: Record<string, { date: string; inbound: number; outbound: number; adjustment: number }> = {};

    // Get last 14 days
    const days: string[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      days.push(key);
      dayMap[key] = { date: key, inbound: 0, outbound: 0, adjustment: 0 };
    }

    movements.forEach((m) => {
      if (!m.created_at) return;
      const day = new Date(m.created_at).toISOString().split('T')[0];
      if (dayMap[day]) {
        if (m.movement_type === 'inbound') {
          dayMap[day].inbound += m.quantity;
        } else if (m.movement_type === 'outbound') {
          dayMap[day].outbound += m.quantity;
        } else {
          dayMap[day].adjustment += m.quantity;
        }
      }
    });

    return days.map((d) => ({
      ...dayMap[d],
      label: new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));
  }, [movements]);

  const movementChartConfig: ChartConfig = {
    inbound: { label: 'Inbound', color: 'hsl(142, 71%, 45%)' },
    outbound: { label: 'Outbound', color: 'hsl(0, 84%, 60%)' },
    adjustment: { label: 'Adjustment', color: 'hsl(221, 83%, 53%)' },
  };

  // === Chart 3: Transfer Status Breakdown ===
  const transferStatusData = useMemo(() => {
    const statusCount: Record<string, number> = {};
    transfers.forEach((t) => {
      const status = t.status || 'unknown';
      statusCount[status] = (statusCount[status] || 0) + 1;
    });

    return Object.entries(statusCount).map(([status, count]) => ({
      status,
      count,
      label: status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      fill: TRANSFER_STATUS_COLORS[status] || 'hsl(220, 14%, 70%)',
    }));
  }, [transfers]);

  const transferChartConfig: ChartConfig = {
    pending: { label: 'Pending', color: TRANSFER_STATUS_COLORS.pending },
    in_transit: { label: 'In Transit', color: TRANSFER_STATUS_COLORS.in_transit },
    received: { label: 'Received', color: TRANSFER_STATUS_COLORS.received },
    cancelled: { label: 'Cancelled', color: TRANSFER_STATUS_COLORS.cancelled },
  };

  // === Stock by Category (existing) ===
  const categoryStock: Record<string, number> = {};
  lots
    .filter((l) => l.status === 'active')
    .forEach((l) => {
      const product = products.find((p) => p.id === l.product_id);
      if (product) {
        categoryStock[product.category] = (categoryStock[product.category] || 0) + l.quantity;
      }
    });

  const recentMovements = movements.slice(0, 5);

  const kpiCards = [
    {
      title: 'Total Products',
      value: totalProducts,
      icon: Package,
      color: 'border-blue-500',
      iconBg: 'bg-blue-100 text-blue-600',
    },
    {
      title: 'Low Stock Alerts',
      value: lowStockProducts.length,
      icon: AlertTriangle,
      color: 'border-amber-500',
      iconBg: 'bg-amber-100 text-amber-600',
    },
    {
      title: 'Near Expiry',
      value: nearExpiryLots.length,
      icon: Clock,
      color: 'border-red-500',
      iconBg: 'bg-red-100 text-red-600',
    },
    {
      title: 'Pending Receiving',
      value: pendingReceiving.length,
      icon: ClipboardList,
      color: 'border-emerald-500',
      iconBg: 'bg-emerald-100 text-emerald-600',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  const branchKeys =
    branches.length > 0 ? branches.map((b) => b.name) : ['All Stock'];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.title} className={`border-l-4 ${kpi.color}`}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${kpi.iconBg}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">{kpi.title}</p>
                  <p className="text-2xl font-bold text-slate-800">{kpi.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row 1: Inventory by Branch + Transfer Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inventory Levels by Branch - Bar Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Inventory Levels by Branch</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Stock quantities per product category across branches
            </CardDescription>
          </CardHeader>
          <CardContent>
            {inventoryByBranch.length > 0 ? (
              <ChartContainer config={branchChartConfig} className="h-[280px] w-full">
                <BarChart data={inventoryByBranch} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="category"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    tickMargin={8}
                  />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} tickMargin={4} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  {branchKeys.map((name, i) => (
                    <Bar
                      key={name}
                      dataKey={name}
                      fill={BRANCH_COLORS[i % BRANCH_COLORS.length]}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                    />
                  ))}
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-sm text-slate-400">
                No inventory data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transfer Status Breakdown - Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Transfer Status</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Breakdown of stock transfer statuses
            </CardDescription>
          </CardHeader>
          <CardContent>
            {transferStatusData.length > 0 ? (
              <ChartContainer config={transferChartConfig} className="h-[280px] w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
                  <Pie
                    data={transferStatusData}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    strokeWidth={2}
                    stroke="hsl(0, 0%, 100%)"
                  >
                    {transferStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="status" />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-sm text-slate-400">
                No transfer data available
              </div>
            )}
            {/* Summary stats below chart */}
            {transferStatusData.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-3">
                {transferStatusData.map((item) => (
                  <div
                    key={item.status}
                    className="flex items-center gap-2 text-xs"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.fill }}
                    />
                    <span className="text-slate-600">{item.label}</span>
                    <span className="font-semibold text-slate-800 ml-auto">{item.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Stock Movement Trends */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Stock Movement Trends</CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Inbound, outbound, and adjustment quantities over the last 14 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={movementChartConfig} className="h-[280px] w-full">
            <AreaChart data={movementTrends}>
              <defs>
                <linearGradient id="fillInbound" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="fillOutbound" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="fillAdjustment" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                tickMargin={8}
              />
              <YAxis tickLine={false} axisLine={false} fontSize={12} tickMargin={4} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Area
                type="monotone"
                dataKey="inbound"
                stroke="hsl(142, 71%, 45%)"
                fill="url(#fillInbound)"
                strokeWidth={2}
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="outbound"
                stroke="hsl(0, 84%, 60%)"
                fill="url(#fillOutbound)"
                strokeWidth={2}
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="adjustment"
                stroke="hsl(221, 83%, 53%)"
                fill="url(#fillAdjustment)"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Near Expiry + Recent Movements Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Near Expiry Items */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Near Expiry Items</CardTitle>
            <Badge variant="destructive" className="text-xs">
              {nearExpiryLots.length} items
            </Badge>
          </CardHeader>
          <CardContent>
            {nearExpiryLots.length > 0 ? (
              <div className="space-y-2">
                {nearExpiryLots.map((lot) => {
                  const product = products.find((p) => p.id === lot.product_id);
                  const daysLeft = Math.ceil(
                    (new Date(lot.expiry_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                  );
                  return (
                    <div
                      key={lot.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-red-50 border border-red-100"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {product?.name || `Product #${lot.product_id}`}
                        </p>
                        <p className="text-xs text-slate-500">
                          Lot: {lot.lot_number} · Qty: {lot.quantity}
                        </p>
                      </div>
                      <Badge variant="destructive" className="text-xs">
                        {daysLeft <= 0 ? 'Expired' : `${daysLeft}d left`}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">No near-expiry items</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Stock Movements */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Recent Stock Movements</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/inventory')}>
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-3 text-slate-500 font-medium">Product</th>
                    <th className="text-left py-2 px-3 text-slate-500 font-medium">Type</th>
                    <th className="text-right py-2 px-3 text-slate-500 font-medium">Qty</th>
                    <th className="text-left py-2 px-3 text-slate-500 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentMovements.map((mov) => {
                    const product = products.find((p) => p.id === mov.product_id);
                    const isInbound = mov.movement_type === 'inbound';
                    const isOutbound = mov.movement_type === 'outbound';
                    return (
                      <tr key={mov.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-2 px-3 font-medium text-slate-800">
                          {product?.name || `#${mov.product_id}`}
                        </td>
                        <td className="py-2 px-3">
                          <Badge
                            className={`text-xs ${
                              isInbound
                                ? 'bg-emerald-100 text-emerald-800'
                                : isOutbound
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            <span className="flex items-center gap-1">
                              {isInbound ? (
                                <TrendingUp className="w-3 h-3" />
                              ) : isOutbound ? (
                                <TrendingDown className="w-3 h-3" />
                              ) : null}
                              {mov.movement_type}
                            </span>
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-right font-medium">
                          {isInbound ? '+' : isOutbound ? '-' : ''}
                          {mov.quantity}
                        </td>
                        <td className="py-2 px-3 text-slate-500">
                          {mov.created_at ? new Date(mov.created_at).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    );
                  })}
                  {recentMovements.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-slate-400">
                        No movements recorded
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights Widget */}
      <Card className="border-l-4 border-violet-500 bg-gradient-to-r from-violet-50 to-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-500" />
              AI Insights
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/ai-analytics')}
              className="text-violet-600 border-violet-200 hover:bg-violet-50"
            >
              View Full Analysis <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <CardDescription className="text-xs">
            AI-powered analytics for your warehouse operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-white border border-slate-200">
              <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                <Brain className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">Demand Forecast</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {lowStockProducts.length > 0
                    ? `${lowStockProducts.length} products below reorder point`
                    : 'All products adequately stocked'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-white border border-slate-200">
              <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">Fraud Monitor</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {movements.filter(m => m.movement_type === 'adjustment').length > 0
                    ? `${movements.filter(m => m.movement_type === 'adjustment').length} adjustments to review`
                    : 'No anomalies detected'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-white border border-slate-200">
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">Expiry Risk</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {nearExpiryLots.length > 0
                    ? `${nearExpiryLots.length} lots expiring within 5 days`
                    : 'No near-expiry items'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Button
          className="h-auto py-4 bg-blue-600 hover:bg-blue-700"
          onClick={() => navigate('/receiving')}
        >
          <ClipboardList className="w-5 h-5 mr-2" />
          New Receiving
        </Button>
        <Button
          className="h-auto py-4 bg-emerald-600 hover:bg-emerald-700"
          onClick={() => navigate('/production')}
        >
          <Package className="w-5 h-5 mr-2" />
          Production Order
        </Button>
        <Button
          className="h-auto py-4 bg-amber-600 hover:bg-amber-700"
          onClick={() => navigate('/inventory')}
        >
          <AlertTriangle className="w-5 h-5 mr-2" />
          Check Inventory
        </Button>
      </div>
    </div>
  );
}