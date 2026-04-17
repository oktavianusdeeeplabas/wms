import { useEffect, useState, useCallback } from 'react';
import { client } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  FileSpreadsheet,
  FileDown,
  Search,
  Download,
  ClipboardList,
  AlertTriangle,
  ShieldAlert,
  Package,
  Clock,
  CalendarX,
  RefreshCw,
  ArrowLeftRight,
  ChefHat,
  Utensils,
  Factory,
  Trash2,
  PackageCheck,
  CheckSquare,
  Truck,
  FileCheck,
  Receipt,
  LayoutDashboard,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { exportToPDF, exportToExcel, exportToCSV } from '@/lib/report-utils';
import type { ReportData } from '@/lib/report-utils';
import * as generators from '@/lib/report-generators';
import type {
  Product,
  InventoryLot,
  ReceivingDocument,
  ReceivingLine,
  StockMovement,
  Branch,
  Warehouse,
  Zone,
  Bin,
  Supplier,
  StockTransfer,
  BomRecipe,
  BomLine,
} from '@/lib/types';

interface ReportDef {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ElementType;
  formats: ('pdf' | 'excel' | 'csv')[];
  generator: (data: AllData) => ReportData;
}

interface AllData {
  products: Product[];
  lots: InventoryLot[];
  receivingDocs: ReceivingDocument[];
  receivingLines: ReceivingLine[];
  movements: StockMovement[];
  branches: Branch[];
  warehouses: Warehouse[];
  zones: Zone[];
  bins: Bin[];
  suppliers: Supplier[];
  transfers: StockTransfer[];
  bomRecipes: BomRecipe[];
  bomLines: BomLine[];
}

const REPORT_DEFINITIONS: ReportDef[] = [
  {
    id: 'goods_receipt',
    name: 'Goods Receipt Note',
    description: 'All receiving documents with supplier and warehouse details',
    category: 'Receiving',
    icon: ClipboardList,
    formats: ['pdf', 'excel', 'csv'],
    generator: generators.goodsReceiptNote,
  },
  {
    id: 'discrepancy',
    name: 'Discrepancy Report',
    description: 'Quantity variances between expected and received goods',
    category: 'Receiving',
    icon: AlertTriangle,
    formats: ['pdf', 'excel', 'csv'],
    generator: generators.discrepancyReport,
  },
  {
    id: 'quarantine',
    name: 'Quarantine Report',
    description: 'Quarantined and expired inventory lots',
    category: 'Quality',
    icon: ShieldAlert,
    formats: ['pdf', 'excel'],
    generator: generators.quarantineReport,
  },
  {
    id: 'inventory',
    name: 'Inventory Report',
    description: 'Current stock levels across all products',
    category: 'Inventory',
    icon: Package,
    formats: ['pdf', 'excel', 'csv'],
    generator: generators.inventoryReport,
  },
  {
    id: 'stock_ageing',
    name: 'Stock Ageing Report',
    description: 'Inventory age analysis sorted by FEFO',
    category: 'Inventory',
    icon: Clock,
    formats: ['pdf', 'excel', 'csv'],
    generator: generators.stockAgeingReport,
  },
  {
    id: 'expiry',
    name: 'Expiry Report',
    description: 'Product expiry tracking with alert levels',
    category: 'Inventory',
    icon: CalendarX,
    formats: ['pdf', 'excel', 'csv'],
    generator: generators.expiryReport,
  },
  {
    id: 'replenishment',
    name: 'Replenishment Report',
    description: 'Products below reorder point with suggested quantities',
    category: 'Inventory',
    icon: RefreshCw,
    formats: ['pdf', 'excel', 'csv'],
    generator: generators.replenishmentReport,
  },
  {
    id: 'transfer',
    name: 'Transfer Report',
    description: 'Inter-branch stock transfer records',
    category: 'Transfers',
    icon: ArrowLeftRight,
    formats: ['pdf', 'excel', 'csv'],
    generator: generators.transferReport,
  },
  {
    id: 'bom',
    name: 'BOM Report',
    description: 'Bill of Materials and recipe overview',
    category: 'Production',
    icon: ChefHat,
    formats: ['pdf', 'excel'],
    generator: generators.bomReport,
  },
  {
    id: 'ingredient_consumption',
    name: 'Ingredient Consumption Report',
    description: 'BOM ingredient usage and stock coverage analysis',
    category: 'Production',
    icon: Utensils,
    formats: ['pdf', 'excel', 'csv'],
    generator: generators.ingredientConsumptionReport,
  },
  {
    id: 'production',
    name: 'Production Report',
    description: 'Production-related stock movements',
    category: 'Production',
    icon: Factory,
    formats: ['pdf', 'excel', 'csv'],
    generator: generators.productionReport,
  },
  {
    id: 'wastage',
    name: 'Wastage Report',
    description: 'Expired, quarantined, and written-off inventory',
    category: 'Production',
    icon: Trash2,
    formats: ['pdf', 'excel'],
    generator: generators.wastageReport,
  },
  {
    id: 'picking_list',
    name: 'Picking List',
    description: 'FEFO-prioritized picking list with locations',
    category: 'Dispatch',
    icon: PackageCheck,
    formats: ['pdf', 'excel', 'csv'],
    generator: generators.pickingList,
  },
  {
    id: 'staging_checklist',
    name: 'Staging Checklist',
    description: 'Pre-dispatch staging verification checklist',
    category: 'Dispatch',
    icon: CheckSquare,
    formats: ['pdf', 'excel'],
    generator: generators.stagingChecklist,
  },
  {
    id: 'loading_manifest',
    name: 'Loading Manifest',
    description: 'Vehicle loading checklist for pending transfers',
    category: 'Dispatch',
    icon: Truck,
    formats: ['pdf', 'excel'],
    generator: generators.loadingManifest,
  },
  {
    id: 'delivery_note',
    name: 'Delivery Note',
    description: 'Shipped and delivered transfer records',
    category: 'Dispatch',
    icon: FileCheck,
    formats: ['pdf', 'excel', 'csv'],
    generator: generators.deliveryNote,
  },
  {
    id: 'pod',
    name: 'POD Report',
    description: 'Proof of delivery for confirmed transfers',
    category: 'Dispatch',
    icon: Receipt,
    formats: ['pdf', 'excel'],
    generator: generators.podReport,
  },
  {
    id: 'dashboard_summary',
    name: 'Dashboard Export Summary',
    description: 'Complete WMS overview snapshot with all key metrics',
    category: 'Overview',
    icon: LayoutDashboard,
    formats: ['pdf', 'excel', 'csv'],
    generator: generators.dashboardExportSummary,
  },
];

const CATEGORIES = ['All', 'Overview', 'Receiving', 'Inventory', 'Quality', 'Production', 'Transfers', 'Dispatch'];

const CATEGORY_COLORS: Record<string, string> = {
  Overview: 'bg-slate-100 text-slate-700',
  Receiving: 'bg-blue-100 text-blue-700',
  Inventory: 'bg-emerald-100 text-emerald-700',
  Quality: 'bg-red-100 text-red-700',
  Production: 'bg-amber-100 text-amber-700',
  Transfers: 'bg-violet-100 text-violet-700',
  Dispatch: 'bg-cyan-100 text-cyan-700',
};

export default function Reports() {
  const [allData, setAllData] = useState<AllData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [
          prodRes, lotRes, recDocRes, recLineRes, movRes,
          branchRes, whRes, zoneRes, binRes, supRes,
          trfRes, bomRes, bomLineRes,
        ] = await Promise.all([
          client.entities.products.query({ limit: 500 }),
          client.entities.inventory_lots.query({ limit: 500 }),
          client.entities.receiving_documents.query({ limit: 500 }),
          client.entities.receiving_lines.query({ limit: 500 }),
          client.entities.stock_movements.query({ limit: 500, sort: '-created_at' }),
          client.entities.branches.query({ limit: 200 }),
          client.entities.warehouses.query({ limit: 200 }),
          client.entities.zones.query({ limit: 200 }),
          client.entities.bins.query({ limit: 200 }),
          client.entities.suppliers.query({ limit: 200 }),
          client.entities.stock_transfers.query({ limit: 500 }),
          client.entities.bom_recipes.query({ limit: 200 }),
          client.entities.bom_lines.query({ limit: 500 }),
        ]);
        setAllData({
          products: prodRes.data?.items || [],
          lots: lotRes.data?.items || [],
          receivingDocs: recDocRes.data?.items || [],
          receivingLines: recLineRes.data?.items || [],
          movements: movRes.data?.items || [],
          branches: branchRes.data?.items || [],
          warehouses: whRes.data?.items || [],
          zones: zoneRes.data?.items || [],
          bins: binRes.data?.items || [],
          suppliers: supRes.data?.items || [],
          transfers: trfRes.data?.items || [],
          bomRecipes: bomRes.data?.items || [],
          bomLines: bomLineRes.data?.items || [],
        });
      } catch (err) {
        console.error('Failed to fetch report data:', err);
        toast.error('Failed to load report data');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const handleExport = useCallback(
    (report: ReportDef, format: 'pdf' | 'excel' | 'csv') => {
      if (!allData) return;
      setGenerating(`${report.id}-${format}`);
      try {
        const data = report.generator(allData);
        if (format === 'pdf') exportToPDF(data);
        else if (format === 'excel') exportToExcel(data);
        else exportToCSV(data);
        toast.success(`${report.name} exported as ${format.toUpperCase()}`);
      } catch (err) {
        console.error('Export failed:', err);
        toast.error(`Failed to export ${report.name}`);
      } finally {
        setTimeout(() => setGenerating(null), 500);
      }
    },
    [allData]
  );

  const filteredReports = REPORT_DEFINITIONS.filter((r) => {
    const matchesSearch =
      !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || r.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Group by category for display
  const groupedReports: Record<string, ReportDef[]> = {};
  filteredReports.forEach((r) => {
    if (!groupedReports[r.category]) groupedReports[r.category] = [];
    groupedReports[r.category].push(r);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">Reports & Export</h2>
        <p className="text-sm text-slate-500 mt-1">
          Generate and download reports in PDF, Excel, or CSV format
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-l-4 border-blue-500">
          <CardContent className="p-3">
            <p className="text-xs text-slate-500">Available Reports</p>
            <p className="text-xl font-bold text-slate-800">{REPORT_DEFINITIONS.length}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-emerald-500">
          <CardContent className="p-3">
            <p className="text-xs text-slate-500">Data Records</p>
            <p className="text-xl font-bold text-slate-800">
              {allData
                ? allData.products.length +
                  allData.lots.length +
                  allData.movements.length +
                  allData.transfers.length
                : 0}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-amber-500">
          <CardContent className="p-3">
            <p className="text-xs text-slate-500">Categories</p>
            <p className="text-xl font-bold text-slate-800">{CATEGORIES.length - 1}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-violet-500">
          <CardContent className="p-3">
            <p className="text-xs text-slate-500">Export Formats</p>
            <p className="text-xl font-bold text-slate-800">3</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search reports..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Report Cards grouped by category */}
      {Object.entries(groupedReports).map(([category, reports]) => (
        <div key={category} className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge className={`text-xs font-medium ${CATEGORY_COLORS[category] || 'bg-gray-100 text-gray-700'}`}>
              {category}
            </Badge>
            <span className="text-xs text-slate-400">{reports.length} reports</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {reports.map((report) => {
              const Icon = report.icon;
              return (
                <Card
                  key={report.id}
                  className="hover:shadow-md transition-shadow border border-slate-200"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-slate-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-slate-800 truncate">
                          {report.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                          {report.description}
                        </p>
                      </div>
                    </div>

                    {/* Export buttons */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                      <span className="text-xs text-slate-400 mr-auto">
                        <Download className="w-3 h-3 inline mr-1" />
                        Export:
                      </span>
                      {report.formats.includes('pdf') && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2.5 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                          onClick={() => handleExport(report, 'pdf')}
                          disabled={generating === `${report.id}-pdf`}
                        >
                          {generating === `${report.id}-pdf` ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <FileText className="w-3 h-3 mr-1" />
                          )}
                          PDF
                        </Button>
                      )}
                      {report.formats.includes('excel') && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2.5 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                          onClick={() => handleExport(report, 'excel')}
                          disabled={generating === `${report.id}-excel`}
                        >
                          {generating === `${report.id}-excel` ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <FileSpreadsheet className="w-3 h-3 mr-1" />
                          )}
                          Excel
                        </Button>
                      )}
                      {report.formats.includes('csv') && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2.5 text-xs text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          onClick={() => handleExport(report, 'csv')}
                          disabled={generating === `${report.id}-csv`}
                        >
                          {generating === `${report.id}-csv` ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <FileDown className="w-3 h-3 mr-1" />
                          )}
                          CSV
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {filteredReports.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No reports match your search</p>
        </div>
      )}
    </div>
  );
}