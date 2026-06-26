import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { client } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Pencil, Save } from 'lucide-react';
import { toast } from 'sonner';
import { STATUS_COLORS } from '@/lib/types';

type EntityRecord = Record<string, unknown>;
type ProductMode = 'new' | 'view' | 'edit';

type FieldConfig = {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'select' | 'textarea';
  required?: boolean;
  options?: { value: string; label: string }[];
  lookupEntity?: string;
  lookupValueKey?: string;
  lookupLabelKeys?: string[];
  placeholder?: string;
};

const NONE_VALUE = '__none__';

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const temperatureOptions = [
  { value: 'ambient', label: 'Ambient' },
  { value: 'chilled', label: 'Chilled' },
  { value: 'frozen', label: 'Frozen' },
];

const perishableOptions = [
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
];

const sections: { title: string; fields: FieldConfig[] }[] = [
  {
    title: 'General',
    fields: [
      { key: 'sku', label: 'Product Code (SKU)', required: true, placeholder: 'PRD-001' },
      { key: 'name', label: 'Product Name', required: true },
      { key: 'short_name', label: 'Product Short Name' },
      { key: 'barcode', label: 'Barcode' },
      { key: 'qr_code', label: 'QR Code' },
      { key: 'alternate_barcode', label: 'Alternate Barcode' },
      { key: 'status', label: 'Status', type: 'select', options: statusOptions },
    ],
  },
  {
    title: 'Classification',
    fields: [
      { key: 'category', label: 'Product Category', type: 'select', lookupEntity: 'product_categories', lookupValueKey: 'name', lookupLabelKeys: ['name', 'code'] },
      { key: 'sub_category', label: 'Product Sub Category', type: 'select', lookupEntity: 'product_sub_categories', lookupValueKey: 'name', lookupLabelKeys: ['name', 'code'] },
      { key: 'brand', label: 'Brand', type: 'select', lookupEntity: 'brands', lookupValueKey: 'name', lookupLabelKeys: ['name', 'code'] },
      { key: 'manufacturer', label: 'Manufacturer', type: 'select', lookupEntity: 'manufacturers', lookupValueKey: 'name', lookupLabelKeys: ['name', 'code'] },
      { key: 'product_type', label: 'Product Type', type: 'select', lookupEntity: 'product_types', lookupValueKey: 'name', lookupLabelKeys: ['name', 'code'] },
      { key: 'item_group', label: 'Item Group', type: 'select', lookupEntity: 'item_groups', lookupValueKey: 'name', lookupLabelKeys: ['name', 'code'] },
    ],
  },
  {
    title: 'Inventory',
    fields: [
      {
        key: 'uom',
        label: 'Unit',
        type: 'select',
        lookupEntity: 'units',
        lookupValueKey: 'code',
        lookupLabelKeys: ['name', 'code'],
      },
      { key: 'temperature_class', label: 'Temperature Class', type: 'select', options: temperatureOptions },
      { key: 'shelf_life_days', label: 'Shelf Life Days', type: 'number' },
      { key: 'min_stock', label: 'Min Stock', type: 'number' },
      { key: 'max_stock', label: 'Max Stock', type: 'number' },
      { key: 'reorder_point', label: 'Reorder Point', type: 'number' },
      { key: 'is_perishable', label: 'Perishable', type: 'select', options: perishableOptions },
    ],
  },
  {
    title: 'Media & Description',
    fields: [
      { key: 'product_image', label: 'Product Image' },
      { key: 'description', label: 'Product Description', type: 'textarea' },
    ],
  },
];

const allFields = sections.flatMap((section) => section.fields);

function getEmptyForm() {
  return allFields.reduce<Record<string, string>>((acc, field) => {
    acc[field.key] = field.key === 'status' ? 'active' : '';
    return acc;
  }, {});
}

function normalizeValue(field: FieldConfig, value: string) {
  if (value === '' || value === NONE_VALUE) return null;
  if (field.type === 'number') return Number(value);
  if (field.key === 'is_perishable') return value === 'true';
  return value;
}

function lookupLabel(
  lookups: Record<string, EntityRecord[]>,
  field: FieldConfig,
  value: unknown
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

function formatValue(
  lookups: Record<string, EntityRecord[]>,
  field: FieldConfig,
  value: unknown
) {
  if (field.key === 'is_perishable' && typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  return lookupLabel(lookups, field, value);
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const mode: ProductMode = !id ? 'new' : window.location.pathname.endsWith('/edit') ? 'edit' : 'view';
  const isReadonly = mode === 'view';
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<EntityRecord | null>(null);
  const [form, setForm] = useState<Record<string, string>>(() => getEmptyForm());
  const [lookups, setLookups] = useState<Record<string, EntityRecord[]>>({});

  const title = mode === 'new' ? 'Add Product' : mode === 'edit' ? 'Edit Product' : 'View Product';
  const productCode = product?.id
    ? `Product ID ${product.id}${product.sku ? ` - ${product.sku}` : ''}`
    : 'New product';

  const lookupEntityNames = useMemo(
    () =>
      Array.from(
        new Set(
          allFields
            .map((field) => field.lookupEntity)
            .filter(Boolean) as string[]
        )
      ),
    []
  );

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        const [productRes, ...lookupResponses] = await Promise.all([
          id ? client.entities.products.get({ id }) : Promise.resolve({ data: null }),
          ...lookupEntityNames.map((entity) => client.entities[entity].query({ limit: 500 })),
        ]);

        if (!mounted) return;

        const loadedProduct = productRes.data as EntityRecord | null;
        setProduct(loadedProduct);
        setLookups(
          lookupEntityNames.reduce<Record<string, EntityRecord[]>>((acc, entity, index) => {
            acc[entity] = ((lookupResponses[index].data as { items?: EntityRecord[] })?.items || []);
            return acc;
          }, {})
        );

        if (loadedProduct) {
          setForm(
            allFields.reduce<Record<string, string>>((acc, field) => {
              const value = loadedProduct[field.key];
              acc[field.key] = value === null || value === undefined ? '' : String(value);
              return acc;
            }, {})
          );
        } else {
          setForm(getEmptyForm());
        }
      } catch (error) {
        console.error('Failed to load product:', error);
        toast.error('Failed to load product');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadData();

    return () => {
      mounted = false;
    };
  }, [id, lookupEntityNames]);

  const handleSave = async () => {
    const missingField = allFields.find((field) => field.required && !form[field.key]);
    if (missingField) {
      toast.error(`${missingField.label} is required`);
      return;
    }

    const payload = allFields.reduce<Record<string, unknown>>((acc, field) => {
      acc[field.key] = normalizeValue(field, form[field.key] || '');
      return acc;
    }, {});

    try {
      setSaving(true);
      if (mode === 'new') {
        const response = await client.entities.products.create({ data: payload });
        const created = response.data as EntityRecord;
        toast.success('Product created');
        navigate(`/master-data/products/${created.id}`);
      } else if (id) {
        await client.entities.products.update({ id, data: payload });
        toast.success('Product updated');
        navigate(`/master-data/products/${id}`);
      }
    } catch (error) {
      console.error('Failed to save product:', error);
      toast.error('Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Button variant="ghost" className="px-0" onClick={() => navigate('/master-data/products')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to products
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            <p className="text-sm text-slate-500">{productCode}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {mode === 'view' && id ? (
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => navigate(`/master-data/products/${id}/edit`)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Product
            </Button>
          ) : (
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : mode === 'new' ? 'Create Product' : 'Update Product'}
            </Button>
          )}
        </div>
      </div>

      {sections.map((section) => (
        <Card key={section.title}>
          <CardHeader>
            <CardTitle className="text-base">{section.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {section.fields.map((field) => {
                const value = form[field.key] || '';
                const lookupOptions = field.lookupEntity
                  ? (lookups[field.lookupEntity] || []).map((item) => ({
                      value: String(item[field.lookupValueKey || 'id']),
                      label: String(lookupLabel(lookups, field, item[field.lookupValueKey || 'id'])),
                    }))
                  : [];
                const options = field.options || lookupOptions;

                if (isReadonly) {
                  const displayValue = formatValue(lookups, field, product?.[field.key]);
                  const isStatus = field.key === 'status' || field.key === 'temperature_class' || field.key === 'product_type';

                  return (
                    <div key={field.key} className={field.type === 'textarea' ? 'space-y-2 xl:col-span-3' : 'space-y-2'}>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{field.label}</p>
                      {isStatus && displayValue && displayValue !== '-' ? (
                        <Badge className={`text-xs ${STATUS_COLORS[String(displayValue)] || 'bg-slate-100 text-slate-700'}`}>
                          {String(displayValue)}
                        </Badge>
                      ) : (
                        <p className="min-h-6 text-sm text-slate-800">{String(displayValue ?? '-')}</p>
                      )}
                    </div>
                  );
                }

                return (
                  <div key={field.key} className={field.type === 'textarea' ? 'space-y-2 xl:col-span-3' : 'space-y-2'}>
                    <Label>
                      {field.label}
                      {field.required ? ' *' : ''}
                    </Label>
                    {field.type === 'select' ? (
                      <Select
                        value={value || NONE_VALUE}
                        onValueChange={(nextValue) =>
                          setForm((prev) => ({ ...prev, [field.key]: nextValue === NONE_VALUE ? '' : nextValue }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {!field.required ? <SelectItem value={NONE_VALUE}>None</SelectItem> : null}
                          {options.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : field.type === 'textarea' ? (
                      <Textarea
                        value={value}
                        placeholder={field.placeholder}
                        onChange={(event) => setForm((prev) => ({ ...prev, [field.key]: event.target.value }))}
                      />
                    ) : (
                      <Input
                        type={field.type === 'number' ? 'number' : 'text'}
                        value={value}
                        placeholder={field.placeholder}
                        onChange={(event) => setForm((prev) => ({ ...prev, [field.key]: event.target.value }))}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {!isReadonly ? (
        <>
          <Separator />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => navigate(id ? `/master-data/products/${id}` : '/master-data/products')}>
              Cancel
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : mode === 'new' ? 'Create Product' : 'Update Product'}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
