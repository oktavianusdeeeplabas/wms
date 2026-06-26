import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { client } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Database, Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { STATUS_COLORS } from '@/lib/types';

type EntityValue = string | number | boolean | number[] | string[] | null | undefined;
type EntityRecord = Record<string, EntityValue>;
type FormValue = string | string[];

type FieldConfig = {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'select' | 'multiselect' | 'textarea';
  required?: boolean;
  options?: { value: string; label: string }[];
  lookupEntity?: string;
  lookupValueKey?: string;
  lookupLabelKeys?: string[];
  placeholder?: string;
};

type EntityConfig = {
  entity: string;
  title: string;
  singular: string;
  fields: FieldConfig[];
  columns: FieldConfig[];
  searchKeys: string[];
  detailBasePath?: string;
};

type MasterDataEntityProps = {
  entityKey: keyof typeof MASTER_DATA_CONFIG;
};

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const temperatureOptions = [
  { value: 'ambient', label: 'Ambient' },
  { value: 'chilled', label: 'Chilled' },
  { value: 'frozen', label: 'Frozen' },
];

const unitTypeOptions = [
  { value: 'count', label: 'Count' },
  { value: 'weight', label: 'Weight' },
  { value: 'volume', label: 'Volume' },
  { value: 'packaging', label: 'Packaging' },
];

export const MASTER_DATA_CONFIG = {
  products: {
    entity: 'products',
    title: 'Products',
    singular: 'Product',
    detailBasePath: '/master-data/products',
    searchKeys: [
      'name',
      'sku',
      'short_name',
      'barcode',
      'qr_code',
      'alternate_barcode',
      'category',
      'sub_category',
      'brand',
      'manufacturer',
      'product_type',
      'item_group',
      'uom',
    ],
    fields: [
      { key: 'sku', label: 'Product Code (SKU)', required: true, placeholder: 'PRD-001' },
      { key: 'name', label: 'Product Name', required: true },
      { key: 'short_name', label: 'Product Short Name' },
      { key: 'barcode', label: 'Barcode' },
      { key: 'qr_code', label: 'QR Code' },
      { key: 'alternate_barcode', label: 'Alternate Barcode' },
      { key: 'category', label: 'Product Category', type: 'select', lookupEntity: 'product_categories', lookupValueKey: 'name', lookupLabelKeys: ['name', 'code'] },
      { key: 'sub_category', label: 'Product Sub Category', type: 'select', lookupEntity: 'product_sub_categories', lookupValueKey: 'name', lookupLabelKeys: ['name', 'code'] },
      { key: 'brand', label: 'Brand', type: 'select', lookupEntity: 'brands', lookupValueKey: 'name', lookupLabelKeys: ['name', 'code'] },
      { key: 'manufacturer', label: 'Manufacturer', type: 'select', lookupEntity: 'manufacturers', lookupValueKey: 'name', lookupLabelKeys: ['name', 'code'] },
      { key: 'product_type', label: 'Product Type', type: 'select', lookupEntity: 'product_types', lookupValueKey: 'name', lookupLabelKeys: ['name', 'code'] },
      { key: 'item_group', label: 'Item Group', type: 'select', lookupEntity: 'item_groups', lookupValueKey: 'name', lookupLabelKeys: ['name', 'code'] },
      {
        key: 'uom',
        label: 'Unit',
        type: 'select',
        lookupEntity: 'units',
        lookupValueKey: 'code',
        lookupLabelKeys: ['name', 'code'],
      },
      { key: 'min_stock', label: 'Min Stock', type: 'number' },
      { key: 'reorder_point', label: 'Reorder Point', type: 'number' },
      { key: 'product_image', label: 'Product Image' },
      { key: 'description', label: 'Product Description', type: 'textarea' },
      { key: 'status', label: 'Status', type: 'select', options: statusOptions },
    ],
    columns: [
      { key: 'id', label: 'Product ID', type: 'number' },
      { key: 'sku', label: 'SKU' },
      { key: 'name', label: 'Product Name' },
      { key: 'short_name', label: 'Short Name' },
      { key: 'barcode', label: 'Barcode' },
      { key: 'category', label: 'Category', lookupEntity: 'product_categories', lookupValueKey: 'name', lookupLabelKeys: ['name', 'code'] },
      { key: 'sub_category', label: 'Sub Category', lookupEntity: 'product_sub_categories', lookupValueKey: 'name', lookupLabelKeys: ['name', 'code'] },
      { key: 'brand', label: 'Brand', lookupEntity: 'brands', lookupValueKey: 'name', lookupLabelKeys: ['name', 'code'] },
      { key: 'manufacturer', label: 'Manufacturer', lookupEntity: 'manufacturers', lookupValueKey: 'name', lookupLabelKeys: ['name', 'code'] },
      { key: 'product_type', label: 'Type', lookupEntity: 'product_types', lookupValueKey: 'name', lookupLabelKeys: ['name', 'code'] },
      { key: 'item_group', label: 'Item Group', lookupEntity: 'item_groups', lookupValueKey: 'name', lookupLabelKeys: ['name', 'code'] },
      { key: 'uom', label: 'Unit' },
      { key: 'min_stock', label: 'Min Stock', type: 'number' },
      { key: 'reorder_point', label: 'Reorder', type: 'number' },
      { key: 'status', label: 'Status' },
    ],
  },
  suppliers: {
    entity: 'suppliers',
    title: 'Suppliers',
    singular: 'Supplier',
    searchKeys: ['name', 'code', 'contact_person', 'marketing_name', 'email', 'phone'],
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'code', label: 'Code', required: true },
      { key: 'contact_person', label: 'Contact Person' },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
      { key: 'address', label: 'Address' },
      { key: 'marketing_name', label: 'Marketing Name' },
      { key: 'marketing_phone', label: 'Marketing Phone' },
      { key: 'marketing_email', label: 'Marketing Email' },
      {
        key: 'branch_id',
        label: 'Supplier Branch',
        type: 'select',
        lookupEntity: 'branches',
        lookupValueKey: 'id',
        lookupLabelKeys: ['name', 'code'],
      },
      {
        key: 'warehouse_id',
        label: 'Supplier Warehouse',
        type: 'select',
        lookupEntity: 'warehouses',
        lookupValueKey: 'id',
        lookupLabelKeys: ['name', 'code'],
      },
      { key: 'payment_terms', label: 'Payment Terms' },
      { key: 'lead_time_days', label: 'Lead Time Days', type: 'number' },
      { key: 'tax_number', label: 'Tax Number' },
      { key: 'notes', label: 'Notes' },
      {
        key: 'product_ids',
        label: 'Products Sold',
        type: 'multiselect',
        lookupEntity: 'products',
        lookupValueKey: 'id',
        lookupLabelKeys: ['name', 'sku'],
      },
      { key: 'status', label: 'Status', type: 'select', options: statusOptions },
    ],
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'code', label: 'Code' },
      { key: 'contact_person', label: 'Contact' },
      { key: 'marketing_name', label: 'Marketing' },
      { key: 'branch_id', label: 'Branch', lookupEntity: 'branches', lookupValueKey: 'id', lookupLabelKeys: ['name', 'code'] },
      { key: 'warehouse_id', label: 'Warehouse', lookupEntity: 'warehouses', lookupValueKey: 'id', lookupLabelKeys: ['name', 'code'] },
      { key: 'product_ids', label: 'Products Sold', type: 'multiselect', lookupEntity: 'products', lookupValueKey: 'id', lookupLabelKeys: ['name', 'sku'] },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'status', label: 'Status' },
    ],
  },
  warehouses: {
    entity: 'warehouses',
    title: 'Warehouses',
    singular: 'Warehouse',
    searchKeys: ['name', 'code', 'address', 'detail', 'manager'],
    fields: [
      { key: 'code', label: 'Warehouse ID', required: true, placeholder: 'WH-001' },
      { key: 'name', label: 'Warehouse Name', required: true },
      { key: 'address', label: 'Location' },
      { key: 'capacity', label: 'Capacity', type: 'number' },
      { key: 'manager', label: 'Manager' },
      { key: 'detail', label: 'Detail', type: 'textarea' },
      {
        key: 'branch_id',
        label: 'Branch',
        type: 'select',
        lookupEntity: 'branches',
        lookupValueKey: 'id',
        lookupLabelKeys: ['name', 'code'],
      },
      { key: 'status', label: 'Status', type: 'select', options: statusOptions },
    ],
    columns: [
      { key: 'code', label: 'Warehouse ID' },
      { key: 'name', label: 'Warehouse Name' },
      { key: 'address', label: 'Location' },
      { key: 'capacity', label: 'Capacity', type: 'number' },
      { key: 'manager', label: 'Manager' },
      { key: 'branch_id', label: 'Branch', lookupEntity: 'branches', lookupValueKey: 'id', lookupLabelKeys: ['name', 'code'] },
      { key: 'status', label: 'Status' },
      { key: 'created_at', label: 'Created Date' },
    ],
  },
  zones: {
    entity: 'zones',
    title: 'Zones',
    singular: 'Zone',
    searchKeys: ['name', 'code', 'temperature_type'],
    fields: [
      {
        key: 'warehouse_id',
        label: 'Warehouse',
        type: 'select',
        required: true,
        lookupEntity: 'warehouses',
        lookupValueKey: 'id',
        lookupLabelKeys: ['name', 'code'],
      },
      { key: 'name', label: 'Name', required: true },
      { key: 'code', label: 'Code', required: true },
      { key: 'temperature_type', label: 'Temperature Type', type: 'select', options: temperatureOptions },
      { key: 'status', label: 'Status', type: 'select', options: statusOptions },
    ],
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'code', label: 'Code' },
      { key: 'warehouse_id', label: 'Warehouse', lookupEntity: 'warehouses', lookupValueKey: 'id', lookupLabelKeys: ['name', 'code'] },
      { key: 'temperature_type', label: 'Temperature' },
      { key: 'status', label: 'Status' },
    ],
  },
  bins: {
    entity: 'bins',
    title: 'Bins',
    singular: 'Bin',
    searchKeys: ['name', 'code'],
    fields: [
      {
        key: 'zone_id',
        label: 'Zone',
        type: 'select',
        required: true,
        lookupEntity: 'zones',
        lookupValueKey: 'id',
        lookupLabelKeys: ['name', 'code'],
      },
      { key: 'name', label: 'Name', required: true },
      { key: 'code', label: 'Code', required: true },
      { key: 'capacity', label: 'Capacity', type: 'number' },
      { key: 'status', label: 'Status', type: 'select', options: statusOptions },
    ],
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'code', label: 'Code' },
      { key: 'zone_id', label: 'Zone', lookupEntity: 'zones', lookupValueKey: 'id', lookupLabelKeys: ['name', 'code'] },
      { key: 'capacity', label: 'Capacity', type: 'number' },
      { key: 'status', label: 'Status' },
    ],
  },
  units: {
    entity: 'units',
    title: 'Units',
    singular: 'Unit',
    searchKeys: ['name', 'code', 'symbol', 'unit_type'],
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'code', label: 'Code', required: true },
      { key: 'symbol', label: 'Symbol' },
      { key: 'unit_type', label: 'Type', type: 'select', options: unitTypeOptions },
      { key: 'decimal_places', label: 'Decimal Places', type: 'number' },
      { key: 'base_unit_code', label: 'Base Unit Code' },
      { key: 'conversion_factor', label: 'Conversion Factor', type: 'number' },
      { key: 'status', label: 'Status', type: 'select', options: statusOptions },
    ],
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'code', label: 'Code' },
      { key: 'symbol', label: 'Symbol' },
      { key: 'unit_type', label: 'Type' },
      { key: 'decimal_places', label: 'Decimals', type: 'number' },
      { key: 'base_unit_code', label: 'Base Unit' },
      { key: 'conversion_factor', label: 'Factor', type: 'number' },
      { key: 'status', label: 'Status' },
    ],
  },
  paymentTypes: {
    entity: 'payment_types',
    title: 'Payment Types',
    singular: 'Payment Type',
    searchKeys: ['name', 'code', 'description'],
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'code', label: 'Code', required: true },
      { key: 'description', label: 'Description' },
      { key: 'status', label: 'Status', type: 'select', options: statusOptions },
    ],
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'code', label: 'Code' },
      { key: 'description', label: 'Description' },
      { key: 'status', label: 'Status' },
    ],
  },
  productCategories: {
    entity: 'product_categories',
    title: 'Product Categories',
    singular: 'Product Category',
    searchKeys: ['name', 'code'],
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'code', label: 'Code', required: true },
      { key: 'status', label: 'Status', type: 'select', options: statusOptions },
    ],
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'code', label: 'Code' },
      { key: 'status', label: 'Status' },
    ],
  },
  productSubCategories: {
    entity: 'product_sub_categories',
    title: 'Product Sub Categories',
    singular: 'Product Sub Category',
    searchKeys: ['name', 'code'],
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'code', label: 'Code', required: true },
      { key: 'status', label: 'Status', type: 'select', options: statusOptions },
    ],
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'code', label: 'Code' },
      { key: 'status', label: 'Status' },
    ],
  },
  brands: {
    entity: 'brands',
    title: 'Brands',
    singular: 'Brand',
    searchKeys: ['name', 'code'],
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'code', label: 'Code', required: true },
      { key: 'status', label: 'Status', type: 'select', options: statusOptions },
    ],
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'code', label: 'Code' },
      { key: 'status', label: 'Status' },
    ],
  },
  manufacturers: {
    entity: 'manufacturers',
    title: 'Manufacturers',
    singular: 'Manufacturer',
    searchKeys: ['name', 'code'],
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'code', label: 'Code', required: true },
      { key: 'status', label: 'Status', type: 'select', options: statusOptions },
    ],
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'code', label: 'Code' },
      { key: 'status', label: 'Status' },
    ],
  },
  productTypes: {
    entity: 'product_types',
    title: 'Product Types',
    singular: 'Product Type',
    searchKeys: ['name', 'code'],
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'code', label: 'Code', required: true },
      { key: 'status', label: 'Status', type: 'select', options: statusOptions },
    ],
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'code', label: 'Code' },
      { key: 'status', label: 'Status' },
    ],
  },
  itemGroups: {
    entity: 'item_groups',
    title: 'Item Groups',
    singular: 'Item Group',
    searchKeys: ['name', 'code'],
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'code', label: 'Code', required: true },
      { key: 'status', label: 'Status', type: 'select', options: statusOptions },
    ],
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'code', label: 'Code' },
      { key: 'status', label: 'Status' },
    ],
  },
} satisfies Record<string, EntityConfig>;

function getInitialForm(fields: FieldConfig[]) {
  return fields.reduce<Record<string, FormValue>>((acc, field) => {
    acc[field.key] = field.type === 'multiselect' ? [] : field.key === 'status' ? 'active' : '';
    return acc;
  }, {});
}

function normalizeValue(field: FieldConfig, value: FormValue) {
  if (field.type === 'multiselect') {
    return Array.isArray(value) ? value.map((item) => Number(item)).filter(Boolean) : [];
  }
  if (value === '') return null;
  if (Array.isArray(value)) return value;
  if (field.type === 'number') return Number(value);
  if (field.lookupValueKey === 'id') return Number(value);
  return value;
}

function lookupLabel(
  lookups: Record<string, EntityRecord[]>,
  field: FieldConfig,
  value: EntityRecord[string]
) {
  if (!field.lookupEntity || value === null || value === undefined || value === '') {
    return value ?? '-';
  }

  const valueKey = field.lookupValueKey || 'id';
  const match = (lookups[field.lookupEntity] || []).find((item) => String(item[valueKey]) === String(value));
  if (!match) return value;

  return (field.lookupLabelKeys || ['name'])
    .map((key) => match[key])
    .filter(Boolean)
    .join(' - ');
}

function formatCellValue(
  lookups: Record<string, EntityRecord[]>,
  field: FieldConfig,
  value: EntityValue
) {
  if (Array.isArray(value)) {
    if (value.length === 0) return '-';
    return value.map((item) => lookupLabel(lookups, field, item)).join(', ');
  }
  return lookupLabel(lookups, field, value);
}

export default function MasterDataEntity({ entityKey }: MasterDataEntityProps) {
  const config = MASTER_DATA_CONFIG[entityKey];
  const navigate = useNavigate();
  const [items, setItems] = useState<EntityRecord[]>([]);
  const [lookups, setLookups] = useState<Record<string, EntityRecord[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EntityRecord | null>(null);
  const [form, setForm] = useState<Record<string, FormValue>>(() => getInitialForm(config.fields));

  const lookupEntityNames = useMemo(
    () =>
      Array.from(
        new Set(
          [...config.fields, ...config.columns]
            .map((field) => field.lookupEntity)
            .filter(Boolean) as string[]
        )
      ),
    [config]
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      const [itemsRes, ...lookupResponses] = await Promise.all([
        client.entities[config.entity].query({ limit: 500 }),
        ...lookupEntityNames.map((entity) => client.entities[entity].query({ limit: 500 })),
      ]);

      setItems(((itemsRes.data as { items?: EntityRecord[] })?.items || []));
      setLookups(
        lookupEntityNames.reduce<Record<string, EntityRecord[]>>((acc, entity, index) => {
          acc[entity] = ((lookupResponses[index].data as { items?: EntityRecord[] })?.items || []);
          return acc;
        }, {})
      );
    } catch (error) {
      console.error(`Failed to fetch ${config.title}:`, error);
      toast.error(`Failed to load ${config.title}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [entityKey]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, pageSize, entityKey]);

  const statusValues = useMemo(
    () =>
      Array.from(
        new Set(
          items
            .map((item) => item.status)
            .filter((value): value is string | number | boolean => value !== null && value !== undefined && value !== '')
            .map(String)
        )
      ).sort(),
    [items]
  );

  const filteredItems = items.filter((item) => {
    const query = search.toLowerCase();
    const matchesSearch =
      !search ||
      config.searchKeys.some((key) =>
        String(item[key] ?? '').toLowerCase().includes(query)
      );
    const matchesStatus = statusFilter === 'all' || String(item.status || '') === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pagedItems = filteredItems.slice(pageStart, pageStart + pageSize);

  const openForm = (item?: EntityRecord) => {
    if (item) {
      setEditing(item);
      setForm(
        config.fields.reduce<Record<string, FormValue>>((acc, field) => {
          const value = item[field.key];
          if (field.type === 'multiselect') {
            acc[field.key] = Array.isArray(value) ? value.map((itemValue) => String(itemValue)) : [];
          } else {
            acc[field.key] = value === null || value === undefined ? '' : String(value);
          }
          return acc;
        }, {})
      );
    } else {
      setEditing(null);
      setForm(getInitialForm(config.fields));
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const missingField = config.fields.find((field) => {
      const value = form[field.key];
      return field.required && (Array.isArray(value) ? value.length === 0 : !value);
    });
    if (missingField) {
      toast.error(`${missingField.label} is required`);
      return;
    }

    const data = config.fields.reduce<Record<string, string | number | number[] | null>>((acc, field) => {
      acc[field.key] = normalizeValue(field, form[field.key] ?? '');
      return acc;
    }, {});

    try {
      if (editing?.id) {
        await client.entities[config.entity].update({ id: String(editing.id), data });
        toast.success(`${config.singular} updated`);
      } else {
        await client.entities[config.entity].create({ data });
        toast.success(`${config.singular} created`);
      }
      setDialogOpen(false);
      await fetchData();
    } catch (error) {
      console.error(`Failed to save ${config.singular}:`, error);
      toast.error(`Failed to save ${config.singular}`);
    }
  };

  const handleDelete = async (item: EntityRecord) => {
    if (!item.id) return;
    try {
      await client.entities[config.entity].delete({ id: String(item.id) });
      toast.success(`${config.singular} deleted`);
      await fetchData();
    } catch (error) {
      console.error(`Failed to delete ${config.singular}:`, error);
      toast.error(`Failed to delete ${config.singular}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{config.title}</h1>
          <p className="text-sm text-slate-500">{items.length} records</p>
        </div>
        <Button
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => (config.detailBasePath ? navigate(`${config.detailBasePath}/new`) : openForm())}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add {config.singular}
        </Button>
      </div>

      <Card>
        <CardHeader className="gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4 text-blue-600" />
            Master Data
          </CardTitle>
          <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_140px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={`Search ${config.title.toLowerCase()}...`}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {statusValues.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Rows" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 rows</SelectItem>
                <SelectItem value="25">25 rows</SelectItem>
                <SelectItem value="50">50 rows</SelectItem>
                <SelectItem value="100">100 rows</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  {config.columns.map((column) => (
                    <th
                      key={column.key}
                      className={`px-4 py-2.5 font-medium text-slate-500 ${
                        column.type === 'number' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {column.label}
                    </th>
                  ))}
                  <th className="px-4 py-2.5 text-left font-medium text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedItems.map((item, index) => (
                  <tr
                    key={String(item.id)}
                    className={`border-b border-slate-100 hover:bg-slate-50 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                  >
                    {config.columns.map((column) => {
                      const value = formatCellValue(lookups, column, item[column.key]);
                      const isStatus = column.key === 'status' || column.key === 'temperature_type' || column.key === 'unit_type';

                      return (
                        <td
                          key={column.key}
                          className={`px-4 py-2.5 ${
                            column.type === 'number' ? 'text-right' : 'text-left'
                          }`}
                        >
                          {isStatus && value ? (
                            <Badge className={`text-xs ${STATUS_COLORS[String(value)] || 'bg-slate-100 text-slate-700'}`}>
                              {String(value)}
                            </Badge>
                          ) : (
                            <span className={column.key === 'code' || column.key === 'sku' ? 'font-mono text-xs text-slate-600' : 'text-slate-700'}>
                              {String(value ?? '-')}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1">
                        {config.detailBasePath && item.id ? (
                          <Button variant="ghost" size="sm" onClick={() => navigate(`${config.detailBasePath}/${item.id}`)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            config.detailBasePath && item.id
                              ? navigate(`${config.detailBasePath}/${item.id}/edit`)
                              : openForm(item)
                          }
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={config.columns.length + 1} className="px-4 py-10 text-center text-slate-500">
                      No records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing {filteredItems.length === 0 ? 0 : pageStart + 1}-{Math.min(pageStart + pageSize, filteredItems.length)} of {filteredItems.length}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </Button>
              <span className="min-w-20 text-center">
                Page {safePage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${config.singular}` : `Add ${config.singular}`}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {config.fields.map((field) => {
              const value = form[field.key] ?? (field.type === 'multiselect' ? [] : '');
              const lookupOptions = field.lookupEntity
                ? (lookups[field.lookupEntity] || []).map((item) => ({
                    value: String(item[field.lookupValueKey || 'id']),
                    label: String(lookupLabel(lookups, field, item[field.lookupValueKey || 'id'])),
                  }))
                : [];
              const options = field.options || lookupOptions;

              return (
                <div key={field.key} className="space-y-2">
                  <Label>
                    {field.label}
                    {field.required ? ' *' : ''}
                  </Label>
                  {field.type === 'select' ? (
                    <Select
                      value={String(value)}
                      onValueChange={(nextValue) => setForm((prev) => ({ ...prev, [field.key]: nextValue }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {options.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : field.type === 'multiselect' ? (
                    <div className="max-h-48 overflow-y-auto rounded-md border border-slate-200 p-2">
                      {options.length === 0 ? (
                        <p className="px-2 py-3 text-sm text-slate-500">No options available.</p>
                      ) : (
                        options.map((option) => {
                          const selectedValues = Array.isArray(value) ? value : [];
                          const checked = selectedValues.includes(option.value);

                          return (
                            <label
                              key={option.value}
                              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-slate-50"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(isChecked) =>
                                  setForm((prev) => {
                                    const currentValues = Array.isArray(prev[field.key]) ? prev[field.key] as string[] : [];
                                    return {
                                      ...prev,
                                      [field.key]: isChecked
                                        ? Array.from(new Set([...currentValues, option.value]))
                                        : currentValues.filter((item) => item !== option.value),
                                    };
                                  })
                                }
                              />
                              <span>{option.label}</span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  ) : field.type === 'textarea' ? (
                    <Textarea
                      value={String(value)}
                      placeholder={field.placeholder}
                      onChange={(event) => setForm((prev) => ({ ...prev, [field.key]: event.target.value }))}
                    />
                  ) : (
                    <Input
                      type={field.type === 'number' ? 'number' : 'text'}
                      value={String(value)}
                      placeholder={field.placeholder}
                      onChange={(event) => setForm((prev) => ({ ...prev, [field.key]: event.target.value }))}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <Button onClick={handleSave} className="mt-2 w-full bg-blue-600 hover:bg-blue-700">
            {editing ? `Update ${config.singular}` : `Create ${config.singular}`}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
