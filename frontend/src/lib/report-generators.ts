import type { ReportData, ReportColumn } from './report-utils';
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
} from './types';

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

const now = () => new Date().toLocaleString();
const findName = <T extends { id: number; name: string }>(list: T[], id: number) =>
  list.find((i) => i.id === id)?.name || '-';

// 1. Goods Receipt Note
export function goodsReceiptNote(d: AllData): ReportData {
  const cols: ReportColumn[] = [
    { header: 'Document #', key: 'doc_number', width: 16 },
    { header: 'Supplier', key: 'supplier', width: 20 },
    { header: 'Warehouse', key: 'warehouse', width: 18 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Expected Date', key: 'expected_date', width: 14 },
    { header: 'Received Date', key: 'received_date', width: 14 },
    { header: 'Notes', key: 'notes', width: 24 },
  ];
  const rows = d.receivingDocs.map((doc) => ({
    doc_number: doc.document_number,
    supplier: findName(d.suppliers, doc.supplier_id),
    warehouse: findName(d.warehouses, doc.warehouse_id),
    status: doc.status,
    expected_date: doc.expected_date ? new Date(doc.expected_date).toLocaleDateString() : '-',
    received_date: doc.received_date ? new Date(doc.received_date).toLocaleDateString() : '-',
    notes: doc.notes || '-',
  }));
  return { title: 'Goods Receipt Note', subtitle: 'All receiving documents', generatedAt: now(), columns: cols, rows };
}

// 2. Discrepancy Report
export function discrepancyReport(d: AllData): ReportData {
  const cols: ReportColumn[] = [
    { header: 'Document #', key: 'doc_number', width: 16 },
    { header: 'Product', key: 'product', width: 20 },
    { header: 'Expected Qty', key: 'expected', width: 12 },
    { header: 'Received Qty', key: 'received', width: 12 },
    { header: 'Variance', key: 'variance', width: 12 },
    { header: 'Variance %', key: 'variance_pct', width: 12 },
    { header: 'QC Status', key: 'qc_status', width: 12 },
  ];
  const rows = d.receivingLines
    .filter((l) => l.expected_quantity !== l.received_quantity)
    .map((line) => {
      const doc = d.receivingDocs.find((rd) => rd.id === line.receiving_document_id);
      const variance = line.received_quantity - line.expected_quantity;
      const pct = line.expected_quantity > 0 ? ((variance / line.expected_quantity) * 100).toFixed(1) : '0';
      return {
        doc_number: doc?.document_number || '-',
        product: findName(d.products, line.product_id),
        expected: line.expected_quantity,
        received: line.received_quantity,
        variance,
        variance_pct: `${pct}%`,
        qc_status: line.qc_status || '-',
      };
    });
  return { title: 'Discrepancy Report', subtitle: 'Receiving quantity variances', generatedAt: now(), columns: cols, rows };
}

// 3. Quarantine Report
export function quarantineReport(d: AllData): ReportData {
  const cols: ReportColumn[] = [
    { header: 'Lot #', key: 'lot_number', width: 16 },
    { header: 'Product', key: 'product', width: 20 },
    { header: 'Quantity', key: 'quantity', width: 10 },
    { header: 'Zone', key: 'zone', width: 16 },
    { header: 'Received Date', key: 'received_date', width: 14 },
    { header: 'Expiry Date', key: 'expiry_date', width: 14 },
    { header: 'Status', key: 'status', width: 12 },
  ];
  const rows = d.lots
    .filter((l) => l.status === 'quarantine' || l.status === 'expired')
    .map((lot) => ({
      lot_number: lot.lot_number,
      product: findName(d.products, lot.product_id),
      quantity: lot.quantity,
      zone: findName(d.zones, lot.zone_id),
      received_date: lot.received_date ? new Date(lot.received_date).toLocaleDateString() : '-',
      expiry_date: lot.expiry_date ? new Date(lot.expiry_date).toLocaleDateString() : '-',
      status: lot.status,
    }));
  return { title: 'Quarantine Report', subtitle: 'Quarantined and expired inventory lots', generatedAt: now(), columns: cols, rows };
}

// 4. Inventory Report
export function inventoryReport(d: AllData): ReportData {
  const cols: ReportColumn[] = [
    { header: 'Product', key: 'product', width: 20 },
    { header: 'SKU', key: 'sku', width: 14 },
    { header: 'Category', key: 'category', width: 14 },
    { header: 'Total Qty', key: 'total_qty', width: 10 },
    { header: 'Active Lots', key: 'active_lots', width: 10 },
    { header: 'Unit', key: 'unit', width: 8 },
    { header: 'Reorder Point', key: 'reorder_point', width: 12 },
    { header: 'Status', key: 'stock_status', width: 12 },
  ];
  const rows = d.products.map((p) => {
    const activeLots = d.lots.filter((l) => l.product_id === p.id && l.status === 'active');
    const totalQty = activeLots.reduce((s, l) => s + l.quantity, 0);
    return {
      product: p.name,
      sku: p.sku,
      category: p.category,
      total_qty: totalQty,
      active_lots: activeLots.length,
      unit: p.uom,
      reorder_point: p.reorder_point,
      stock_status: totalQty <= p.reorder_point ? 'LOW STOCK' : totalQty === 0 ? 'OUT OF STOCK' : 'OK',
    };
  });
  const totalItems = rows.reduce((s, r) => s + (r.total_qty as number), 0);
  const lowStock = rows.filter((r) => r.stock_status === 'LOW STOCK').length;
  return {
    title: 'Inventory Report',
    subtitle: 'Current stock levels across all products',
    generatedAt: now(),
    columns: cols,
    rows,
    summary: [{ 'Total Items': totalItems, 'Low Stock Products': lowStock, 'Total Products': rows.length }],
  };
}

// 5. Stock Ageing Report
export function stockAgeingReport(d: AllData): ReportData {
  const cols: ReportColumn[] = [
    { header: 'Product', key: 'product', width: 20 },
    { header: 'Lot #', key: 'lot_number', width: 16 },
    { header: 'Quantity', key: 'quantity', width: 10 },
    { header: 'Received Date', key: 'received_date', width: 14 },
    { header: 'Age (Days)', key: 'age_days', width: 10 },
    { header: 'Expiry Date', key: 'expiry_date', width: 14 },
    { header: 'Days to Expiry', key: 'days_to_expiry', width: 12 },
    { header: 'Zone', key: 'zone', width: 16 },
  ];
  const today = new Date();
  const rows = d.lots
    .filter((l) => l.status === 'active')
    .map((lot) => {
      const recDate = lot.received_date ? new Date(lot.received_date) : null;
      const expDate = lot.expiry_date ? new Date(lot.expiry_date) : null;
      const ageDays = recDate ? Math.floor((today.getTime() - recDate.getTime()) / 86400000) : 0;
      const daysToExpiry = expDate ? Math.ceil((expDate.getTime() - today.getTime()) / 86400000) : 999;
      return {
        product: findName(d.products, lot.product_id),
        lot_number: lot.lot_number,
        quantity: lot.quantity,
        received_date: recDate ? recDate.toLocaleDateString() : '-',
        age_days: ageDays,
        expiry_date: expDate ? expDate.toLocaleDateString() : '-',
        days_to_expiry: daysToExpiry,
        zone: findName(d.zones, lot.zone_id),
      };
    })
    .sort((a, b) => (b.age_days as number) - (a.age_days as number));
  return { title: 'Stock Ageing Report', subtitle: 'Inventory age analysis (FEFO)', generatedAt: now(), columns: cols, rows };
}

// 6. Expiry Report
export function expiryReport(d: AllData): ReportData {
  const cols: ReportColumn[] = [
    { header: 'Product', key: 'product', width: 20 },
    { header: 'Lot #', key: 'lot_number', width: 16 },
    { header: 'Quantity', key: 'quantity', width: 10 },
    { header: 'Expiry Date', key: 'expiry_date', width: 14 },
    { header: 'Days to Expiry', key: 'days_to_expiry', width: 12 },
    { header: 'Alert Level', key: 'alert', width: 12 },
    { header: 'Zone', key: 'zone', width: 16 },
  ];
  const today = new Date();
  const rows = d.lots
    .filter((l) => l.status === 'active' && l.expiry_date)
    .map((lot) => {
      const expDate = new Date(lot.expiry_date);
      const daysToExpiry = Math.ceil((expDate.getTime() - today.getTime()) / 86400000);
      let alert = 'OK';
      if (daysToExpiry <= 0) alert = 'EXPIRED';
      else if (daysToExpiry <= 3) alert = 'CRITICAL';
      else if (daysToExpiry <= 7) alert = 'WARNING';
      return {
        product: findName(d.products, lot.product_id),
        lot_number: lot.lot_number,
        quantity: lot.quantity,
        expiry_date: expDate.toLocaleDateString(),
        days_to_expiry: daysToExpiry,
        alert,
        zone: findName(d.zones, lot.zone_id),
      };
    })
    .sort((a, b) => (a.days_to_expiry as number) - (b.days_to_expiry as number));
  const expired = rows.filter((r) => r.alert === 'EXPIRED').length;
  const critical = rows.filter((r) => r.alert === 'CRITICAL').length;
  return {
    title: 'Expiry Report',
    subtitle: 'Product expiry tracking and alerts',
    generatedAt: now(),
    columns: cols,
    rows,
    summary: [{ Expired: expired, Critical: critical, 'Total Tracked': rows.length }],
  };
}

// 7. Replenishment Report
export function replenishmentReport(d: AllData): ReportData {
  const cols: ReportColumn[] = [
    { header: 'Product', key: 'product', width: 20 },
    { header: 'SKU', key: 'sku', width: 14 },
    { header: 'Current Stock', key: 'current_stock', width: 12 },
    { header: 'Reorder Point', key: 'reorder_point', width: 12 },
    { header: 'Min Stock', key: 'min_stock', width: 10 },
    { header: 'Max Stock', key: 'max_stock', width: 10 },
    { header: 'Suggested Order', key: 'suggested_order', width: 14 },
    { header: 'Unit', key: 'unit', width: 8 },
  ];
  const rows = d.products
    .map((p) => {
      const currentStock = d.lots
        .filter((l) => l.product_id === p.id && l.status === 'active')
        .reduce((s, l) => s + l.quantity, 0);
      return {
        product: p.name,
        sku: p.sku,
        current_stock: currentStock,
        reorder_point: p.reorder_point,
        min_stock: p.min_stock,
        max_stock: p.max_stock,
        suggested_order: currentStock <= p.reorder_point ? Math.max(p.max_stock - currentStock, 0) : 0,
        unit: p.uom,
      };
    })
    .filter((r) => (r.suggested_order as number) > 0)
    .sort((a, b) => (b.suggested_order as number) - (a.suggested_order as number));
  return { title: 'Replenishment Report', subtitle: 'Products requiring reorder', generatedAt: now(), columns: cols, rows };
}

// 8. Transfer Report
export function transferReport(d: AllData): ReportData {
  const cols: ReportColumn[] = [
    { header: 'Transfer #', key: 'transfer_number', width: 16 },
    { header: 'Product', key: 'product', width: 18 },
    { header: 'From Branch', key: 'from_branch', width: 16 },
    { header: 'To Branch', key: 'to_branch', width: 16 },
    { header: 'Quantity', key: 'quantity', width: 10 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Requested', key: 'requested_date', width: 14 },
    { header: 'Shipped', key: 'shipped_date', width: 14 },
    { header: 'Received', key: 'received_date', width: 14 },
  ];
  const rows = d.transfers.map((t) => ({
    transfer_number: t.transfer_number,
    product: findName(d.products, t.product_id),
    from_branch: findName(d.branches, t.from_branch_id),
    to_branch: findName(d.branches, t.to_branch_id),
    quantity: t.quantity,
    status: t.status,
    requested_date: t.requested_date ? new Date(t.requested_date).toLocaleDateString() : '-',
    shipped_date: t.shipped_date ? new Date(t.shipped_date).toLocaleDateString() : '-',
    received_date: t.received_date ? new Date(t.received_date).toLocaleDateString() : '-',
  }));
  return { title: 'Transfer Report', subtitle: 'Inter-branch stock transfers', generatedAt: now(), columns: cols, rows };
}

// 9. BOM Report
export function bomReport(d: AllData): ReportData {
  const cols: ReportColumn[] = [
    { header: 'Recipe', key: 'recipe', width: 20 },
    { header: 'Code', key: 'code', width: 12 },
    { header: 'Output Product', key: 'output_product', width: 18 },
    { header: 'Yield', key: 'yield_qty', width: 10 },
    { header: 'Category', key: 'category', width: 12 },
    { header: 'Ingredients', key: 'ingredient_count', width: 10 },
    { header: 'Prep Time', key: 'prep_time', width: 10 },
    { header: 'Cook Time', key: 'cook_time', width: 10 },
    { header: 'Status', key: 'status', width: 10 },
  ];
  const rows = d.bomRecipes.map((r) => ({
    recipe: r.name,
    code: r.code,
    output_product: findName(d.products, r.product_id),
    yield_qty: `${r.yield_quantity} ${r.yield_unit}`,
    category: r.category,
    ingredient_count: d.bomLines.filter((l) => l.recipe_id === r.id).length,
    prep_time: `${r.prep_time_minutes}m`,
    cook_time: `${r.cook_time_minutes}m`,
    status: r.status,
  }));
  return { title: 'BOM Report', subtitle: 'Bill of Materials / Recipe overview', generatedAt: now(), columns: cols, rows };
}

// 10. Ingredient Consumption Report
export function ingredientConsumptionReport(d: AllData): ReportData {
  const cols: ReportColumn[] = [
    { header: 'Ingredient', key: 'ingredient', width: 20 },
    { header: 'SKU', key: 'sku', width: 14 },
    { header: 'Used In Recipes', key: 'recipe_count', width: 12 },
    { header: 'Total Required Qty', key: 'total_required', width: 14 },
    { header: 'Unit', key: 'unit', width: 8 },
    { header: 'Current Stock', key: 'current_stock', width: 12 },
    { header: 'Coverage', key: 'coverage', width: 12 },
  ];
  const ingredientMap: Record<number, { totalQty: number; recipeCount: number }> = {};
  d.bomLines.forEach((line) => {
    if (!ingredientMap[line.product_id]) {
      ingredientMap[line.product_id] = { totalQty: 0, recipeCount: 0 };
    }
    ingredientMap[line.product_id].totalQty += line.quantity * (1 + (line.wastage_factor || 0));
    ingredientMap[line.product_id].recipeCount += 1;
  });
  const rows = Object.entries(ingredientMap).map(([pid, info]) => {
    const product = d.products.find((p) => p.id === Number(pid));
    const currentStock = d.lots
      .filter((l) => l.product_id === Number(pid) && l.status === 'active')
      .reduce((s, l) => s + l.quantity, 0);
    const coverage = info.totalQty > 0 ? Math.floor(currentStock / info.totalQty) : 0;
    return {
      ingredient: product?.name || '-',
      sku: product?.sku || '-',
      recipe_count: info.recipeCount,
      total_required: Math.round(info.totalQty * 100) / 100,
      unit: product?.uom || '-',
      current_stock: currentStock,
      coverage: `${coverage}x batches`,
    };
  });
  return { title: 'Ingredient Consumption Report', subtitle: 'BOM ingredient usage analysis', generatedAt: now(), columns: cols, rows };
}

// 11. Production Report
export function productionReport(d: AllData): ReportData {
  const cols: ReportColumn[] = [
    { header: 'Movement ID', key: 'id', width: 10 },
    { header: 'Product', key: 'product', width: 20 },
    { header: 'Type', key: 'type', width: 12 },
    { header: 'Quantity', key: 'quantity', width: 10 },
    { header: 'Reference', key: 'reference', width: 16 },
    { header: 'Notes', key: 'notes', width: 24 },
    { header: 'Date', key: 'date', width: 14 },
  ];
  const rows = d.movements
    .filter((m) => m.reference_type === 'production' || m.notes?.toLowerCase().includes('production'))
    .map((m) => ({
      id: m.id,
      product: findName(d.products, m.product_id),
      type: m.movement_type,
      quantity: m.quantity,
      reference: `${m.reference_type || '-'} #${m.reference_id || '-'}`,
      notes: m.notes || '-',
      date: m.created_at ? new Date(m.created_at).toLocaleDateString() : '-',
    }));
  // If no production-specific movements, show all outbound as proxy
  if (rows.length === 0) {
    d.movements
      .filter((m) => m.movement_type === 'outbound')
      .forEach((m) => {
        rows.push({
          id: m.id,
          product: findName(d.products, m.product_id),
          type: m.movement_type,
          quantity: m.quantity,
          reference: `${m.reference_type || '-'} #${m.reference_id || '-'}`,
          notes: m.notes || '-',
          date: m.created_at ? new Date(m.created_at).toLocaleDateString() : '-',
        });
      });
  }
  return { title: 'Production Report', subtitle: 'Production-related stock movements', generatedAt: now(), columns: cols, rows };
}

// 12. Wastage Report
export function wastageReport(d: AllData): ReportData {
  const cols: ReportColumn[] = [
    { header: 'Product', key: 'product', width: 20 },
    { header: 'Lot #', key: 'lot_number', width: 16 },
    { header: 'Quantity', key: 'quantity', width: 10 },
    { header: 'Reason', key: 'reason', width: 16 },
    { header: 'Zone', key: 'zone', width: 16 },
    { header: 'Expiry Date', key: 'expiry_date', width: 14 },
    { header: 'Status', key: 'status', width: 12 },
  ];
  const today = new Date();
  const rows = d.lots
    .filter((l) => l.status === 'expired' || l.status === 'quarantine')
    .map((lot) => {
      const expDate = lot.expiry_date ? new Date(lot.expiry_date) : null;
      const isExpired = expDate && expDate < today;
      return {
        product: findName(d.products, lot.product_id),
        lot_number: lot.lot_number,
        quantity: lot.quantity,
        reason: isExpired ? 'Expired' : 'Quarantined',
        zone: findName(d.zones, lot.zone_id),
        expiry_date: expDate ? expDate.toLocaleDateString() : '-',
        status: lot.status,
      };
    });
  // Also include adjustment movements as potential wastage
  d.movements
    .filter((m) => m.movement_type === 'adjustment' && m.quantity < 0)
    .forEach((m) => {
      rows.push({
        product: findName(d.products, m.product_id),
        lot_number: '-',
        quantity: Math.abs(m.quantity),
        reason: 'Adjustment (loss)',
        zone: '-',
        expiry_date: '-',
        status: 'written_off',
      });
    });
  const totalWasted = rows.reduce((s, r) => s + (r.quantity as number), 0);
  return {
    title: 'Wastage Report',
    subtitle: 'Expired, quarantined, and written-off inventory',
    generatedAt: now(),
    columns: cols,
    rows,
    summary: [{ 'Total Wasted Items': totalWasted, 'Entries': rows.length }],
  };
}

// 13. Picking List
export function pickingList(d: AllData): ReportData {
  const cols: ReportColumn[] = [
    { header: 'Product', key: 'product', width: 20 },
    { header: 'Lot #', key: 'lot_number', width: 16 },
    { header: 'Quantity', key: 'quantity', width: 10 },
    { header: 'Zone', key: 'zone', width: 16 },
    { header: 'Bin', key: 'bin', width: 12 },
    { header: 'Expiry', key: 'expiry_date', width: 14 },
    { header: 'Pick Priority', key: 'priority', width: 12 },
  ];
  const today = new Date();
  const rows = d.lots
    .filter((l) => l.status === 'active')
    .map((lot) => {
      const expDate = lot.expiry_date ? new Date(lot.expiry_date) : null;
      const daysToExpiry = expDate ? Math.ceil((expDate.getTime() - today.getTime()) / 86400000) : 999;
      let priority = 'Normal';
      if (daysToExpiry <= 3) priority = 'URGENT';
      else if (daysToExpiry <= 7) priority = 'High';
      return {
        product: findName(d.products, lot.product_id),
        lot_number: lot.lot_number,
        quantity: lot.quantity,
        zone: findName(d.zones, lot.zone_id),
        bin: findName(d.bins, lot.bin_id),
        expiry_date: expDate ? expDate.toLocaleDateString() : '-',
        priority,
      };
    })
    .sort((a, b) => {
      const order: Record<string, number> = { URGENT: 0, High: 1, Normal: 2 };
      return (order[a.priority as string] || 2) - (order[b.priority as string] || 2);
    });
  return { title: 'Picking List', subtitle: 'FEFO-prioritized picking list', generatedAt: now(), columns: cols, rows };
}

// 14. Staging Checklist
export function stagingChecklist(d: AllData): ReportData {
  const cols: ReportColumn[] = [
    { header: '#', key: 'index', width: 6 },
    { header: 'Product', key: 'product', width: 20 },
    { header: 'Lot #', key: 'lot_number', width: 16 },
    { header: 'Quantity', key: 'quantity', width: 10 },
    { header: 'Zone', key: 'zone', width: 16 },
    { header: 'Temp Type', key: 'temp_type', width: 12 },
    { header: 'Checked', key: 'checked', width: 10 },
  ];
  const rows = d.lots
    .filter((l) => l.status === 'active')
    .slice(0, 50)
    .map((lot, idx) => {
      const zone = d.zones.find((z) => z.id === lot.zone_id);
      return {
        index: idx + 1,
        product: findName(d.products, lot.product_id),
        lot_number: lot.lot_number,
        quantity: lot.quantity,
        zone: zone?.name || '-',
        temp_type: zone?.temperature_type || '-',
        checked: '☐',
      };
    });
  return { title: 'Staging Checklist', subtitle: 'Pre-dispatch staging verification', generatedAt: now(), columns: cols, rows };
}

// 15. Loading Manifest
export function loadingManifest(d: AllData): ReportData {
  const cols: ReportColumn[] = [
    { header: 'Transfer #', key: 'transfer_number', width: 16 },
    { header: 'Product', key: 'product', width: 20 },
    { header: 'Lot #', key: 'lot_number', width: 14 },
    { header: 'Quantity', key: 'quantity', width: 10 },
    { header: 'From', key: 'from', width: 18 },
    { header: 'To', key: 'to', width: 18 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Loaded', key: 'loaded', width: 10 },
  ];
  const rows = d.transfers
    .filter((t) => t.status === 'pending' || t.status === 'in_transit')
    .map((t) => ({
      transfer_number: t.transfer_number,
      product: findName(d.products, t.product_id),
      lot_number: t.lot_number || '-',
      quantity: t.quantity,
      from: `${findName(d.branches, t.from_branch_id)} / ${findName(d.warehouses, t.from_warehouse_id)}`,
      to: `${findName(d.branches, t.to_branch_id)} / ${findName(d.warehouses, t.to_warehouse_id)}`,
      status: t.status,
      loaded: '☐',
    }));
  return { title: 'Loading Manifest', subtitle: 'Vehicle loading checklist for pending/in-transit transfers', generatedAt: now(), columns: cols, rows };
}

// 16. Delivery Note
export function deliveryNote(d: AllData): ReportData {
  const cols: ReportColumn[] = [
    { header: 'Transfer #', key: 'transfer_number', width: 16 },
    { header: 'Product', key: 'product', width: 20 },
    { header: 'Quantity', key: 'quantity', width: 10 },
    { header: 'From Branch', key: 'from_branch', width: 16 },
    { header: 'To Branch', key: 'to_branch', width: 16 },
    { header: 'Shipped Date', key: 'shipped_date', width: 14 },
    { header: 'Notes', key: 'notes', width: 24 },
  ];
  const rows = d.transfers
    .filter((t) => t.status === 'in_transit' || t.status === 'received')
    .map((t) => ({
      transfer_number: t.transfer_number,
      product: findName(d.products, t.product_id),
      quantity: t.quantity,
      from_branch: findName(d.branches, t.from_branch_id),
      to_branch: findName(d.branches, t.to_branch_id),
      shipped_date: t.shipped_date ? new Date(t.shipped_date).toLocaleDateString() : '-',
      notes: t.notes || '-',
    }));
  return { title: 'Delivery Note', subtitle: 'Shipped and delivered transfers', generatedAt: now(), columns: cols, rows };
}

// 17. POD (Proof of Delivery) Report
export function podReport(d: AllData): ReportData {
  const cols: ReportColumn[] = [
    { header: 'Transfer #', key: 'transfer_number', width: 16 },
    { header: 'Product', key: 'product', width: 20 },
    { header: 'Quantity', key: 'quantity', width: 10 },
    { header: 'From', key: 'from', width: 16 },
    { header: 'To', key: 'to', width: 16 },
    { header: 'Shipped', key: 'shipped_date', width: 14 },
    { header: 'Received', key: 'received_date', width: 14 },
    { header: 'Status', key: 'status', width: 12 },
  ];
  const rows = d.transfers
    .filter((t) => t.status === 'received')
    .map((t) => ({
      transfer_number: t.transfer_number,
      product: findName(d.products, t.product_id),
      quantity: t.quantity,
      from: findName(d.branches, t.from_branch_id),
      to: findName(d.branches, t.to_branch_id),
      shipped_date: t.shipped_date ? new Date(t.shipped_date).toLocaleDateString() : '-',
      received_date: t.received_date ? new Date(t.received_date).toLocaleDateString() : '-',
      status: 'Delivered ✓',
    }));
  return { title: 'Proof of Delivery Report', subtitle: 'Confirmed deliveries', generatedAt: now(), columns: cols, rows };
}

// 18. Dashboard Export Summary
export function dashboardExportSummary(d: AllData): ReportData {
  const cols: ReportColumn[] = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 20 },
  ];
  const activeLots = d.lots.filter((l) => l.status === 'active');
  const totalStock = activeLots.reduce((s, l) => s + l.quantity, 0);
  const today = new Date();
  const nearExpiry = activeLots.filter((l) => {
    if (!l.expiry_date) return false;
    const days = Math.ceil((new Date(l.expiry_date).getTime() - today.getTime()) / 86400000);
    return days >= 0 && days <= 5;
  }).length;
  const lowStock = d.products.filter((p) => {
    const qty = activeLots.filter((l) => l.product_id === p.id).reduce((s, l) => s + l.quantity, 0);
    return qty <= p.reorder_point;
  }).length;

  const rows = [
    { metric: 'Total Products', value: d.products.length },
    { metric: 'Total Active Lots', value: activeLots.length },
    { metric: 'Total Stock Quantity', value: totalStock },
    { metric: 'Low Stock Products', value: lowStock },
    { metric: 'Near Expiry Lots (≤5 days)', value: nearExpiry },
    { metric: 'Total Branches', value: d.branches.length },
    { metric: 'Total Warehouses', value: d.warehouses.length },
    { metric: 'Total Zones', value: d.zones.length },
    { metric: 'Total Suppliers', value: d.suppliers.length },
    { metric: 'Receiving Documents', value: d.receivingDocs.length },
    { metric: 'Pending Receiving', value: d.receivingDocs.filter((r) => r.status === 'pending').length },
    { metric: 'Stock Movements (Total)', value: d.movements.length },
    { metric: 'Stock Transfers (Total)', value: d.transfers.length },
    { metric: 'Transfers Pending', value: d.transfers.filter((t) => t.status === 'pending').length },
    { metric: 'Transfers In Transit', value: d.transfers.filter((t) => t.status === 'in_transit').length },
    { metric: 'BOM Recipes', value: d.bomRecipes.length },
    { metric: 'BOM Ingredients', value: d.bomLines.length },
  ];
  return { title: 'Dashboard Export Summary', subtitle: 'Complete WMS overview snapshot', generatedAt: now(), columns: cols, rows };
}