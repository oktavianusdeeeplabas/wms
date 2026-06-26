// Cloud Kitchen WMS - TypeScript Interfaces

export interface Product {
  id: number;
  name: string;
  sku: string;
  short_name: string | null;
  barcode: string | null;
  qr_code: string | null;
  alternate_barcode: string | null;
  category: string | null;
  sub_category: string | null;
  brand: string | null;
  manufacturer: string | null;
  product_type: string | null;
  item_group: string | null;
  uom: string | null;
  temperature_class: string | null;
  shelf_life_days: number | null;
  min_stock: number | null;
  max_stock: number | null;
  reorder_point: number | null;
  is_perishable: boolean | null;
  product_image: string | null;
  description: string | null;
  status: string | null;
}

export interface Unit {
  id: number;
  name: string;
  code: string;
  symbol: string | null;
  unit_type: string | null;
  decimal_places: number | null;
  base_unit_code: string | null;
  conversion_factor: number | null;
  status: string | null;
}

export interface Supplier {
  id: number;
  name: string;
  code: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  status: string;
}

export interface Branch {
  id: number;
  name: string;
  code: string;
  address: string;
  contact_name: string;
  phone: string;
  email: string;
  status: string;
  created_at: string;
}

export interface Warehouse {
  id: number;
  name: string;
  code: string;
  address: string;
  detail: string | null;
  capacity: number | null;
  manager: string | null;
  branch_id: number;
  status: string;
  created_at: string;
}

export interface StockTransfer {
  id: number;
  transfer_number: string;
  from_warehouse_id: number;
  to_warehouse_id: number;
  from_branch_id: number;
  to_branch_id: number;
  product_id: number;
  quantity: number;
  lot_number: string;
  status: string;
  requested_date: string;
  shipped_date: string;
  received_date: string;
  notes: string;
  created_at: string;
}

export interface Zone {
  id: number;
  warehouse_id: number;
  name: string;
  code: string;
  temperature_type: string;
  status: string;
}

export interface Bin {
  id: number;
  zone_id: number;
  name: string;
  code: string;
  capacity: number;
  status: string;
}

export interface InventoryLot {
  id: number;
  product_id: number;
  lot_number: string;
  batch_number: string;
  zone_id: number;
  bin_id: number;
  quantity: number;
  received_date: string;
  expiry_date: string;
  status: string;
  supplier_id: number;
  cost_per_unit: number;
}

export interface UhfReader {
  id: number;
  name: string;
  code: string;
  device_identifier: string | null;
  ip_address: string | null;
  antenna_port: number | null;
  zone_id: number | null;
  bin_id: number | null;
  status: string | null;
  last_seen_at: string | null;
  created_at: string | null;
}

export interface UhfTag {
  id: number;
  epc: string;
  tid: string | null;
  sticker_label: string | null;
  product_id: number | null;
  lot_id: number | null;
  assigned_quantity: number | null;
  current_zone_id: number | null;
  current_bin_id: number | null;
  status: string | null;
  encoded_at: string | null;
  assigned_at: string | null;
  last_seen_at: string | null;
  notes: string | null;
  created_at: string | null;
}

export interface UhfTagRead {
  id: number;
  tag_id: number | null;
  epc: string;
  reader_id: number | null;
  zone_id: number | null;
  bin_id: number | null;
  rssi: number | null;
  read_count: number | null;
  direction: string | null;
  event_type: string | null;
  seen_at: string | null;
}

export interface StockMovement {
  id: number;
  product_id: number;
  lot_id: number;
  movement_type: string;
  quantity: number;
  from_zone_id: number;
  from_bin_id: number;
  to_zone_id: number;
  to_bin_id: number;
  reference_type: string;
  reference_id: number;
  notes: string;
  created_at: string;
}

export interface ReceivingDocument {
  id: number;
  document_number: string;
  supplier_id: number;
  warehouse_id: number;
  status: string;
  expected_date: string;
  received_date: string;
  notes: string;
  created_at: string;
}

export interface ReceivingLine {
  id: number;
  receiving_document_id: number;
  product_id: number;
  expected_quantity: number;
  received_quantity: number;
  lot_number: string;
  expiry_date: string;
  qc_status: string;
  notes: string;
}

export interface BomRecipe {
  id: number;
  name: string;
  code: string;
  product_id: number;
  category: string;
  yield_quantity: number;
  yield_unit: string;
  prep_time_minutes: number;
  cook_time_minutes: number;
  version: number;
  status: string;
  notes: string;
  created_at: string;
}

export interface BomLine {
  id: number;
  recipe_id: number;
  product_id: number;
  quantity: number;
  unit: string;
  is_optional: boolean;
  substitution_allowed: boolean;
  wastage_factor: number;
  notes: string;
}

export interface LabelTemplate {
  id: number;
  name: string;
  template_type: string;
  width_mm: number | null;
  height_mm: number | null;
  fields_config: string | null;
  layout_config: string | null;
  status: string | null;
}

export interface ProductionOrder {
  id: number;
  order_number: string;
  product_id: number;
  quantity: number;
  status: string;
  scheduled_date: string;
  notes: string;
  created_at: string;
}

export interface EntityResponse<T> {
  data: {
    items: T[];
    total?: number;
  };
}

export interface SingleEntityResponse<T> {
  data: T;
}

export type StatusType = 'active' | 'inactive' | 'expired' | 'pending' | 'completed' | 'in_progress' | 'accepted' | 'rejected' | 'in_transit' | 'cancelled';

export const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  inactive: 'bg-gray-100 text-gray-800',
  expired: 'bg-red-100 text-red-800',
  pending: 'bg-amber-100 text-amber-800',
  completed: 'bg-emerald-100 text-emerald-800',
  in_progress: 'bg-blue-100 text-blue-800',
  in_transit: 'bg-violet-100 text-violet-800',
  received: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
  assigned: 'bg-blue-100 text-blue-800',
  available: 'bg-slate-100 text-slate-700',
  online: 'bg-emerald-100 text-emerald-800',
  offline: 'bg-red-100 text-red-800',
  accepted: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
  ambient: 'bg-orange-100 text-orange-800',
  chilled: 'bg-sky-100 text-sky-800',
  frozen: 'bg-indigo-100 text-indigo-800',
  draft: 'bg-slate-100 text-slate-800',
  sauce: 'bg-purple-100 text-purple-800',
  main: 'bg-blue-100 text-blue-800',
  dough: 'bg-amber-100 text-amber-800',
  dessert: 'bg-pink-100 text-pink-800',
};
