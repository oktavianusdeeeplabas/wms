import { useEffect, useMemo, useState } from 'react';
import { client } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Building2, Pencil, Plus, Search, Trash2, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { STATUS_COLORS } from '@/lib/types';

type LookupRecord = {
  id: number;
  name: string;
  code?: string | null;
  sku?: string | null;
};

type Supplier = {
  id: number;
  name: string;
  code: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  marketing_name: string | null;
  marketing_phone: string | null;
  marketing_email: string | null;
  branch_id: number | null;
  warehouse_id: number | null;
  payment_type_id: number | null;
  payment_terms: string | null;
  lead_time_days: number | null;
  tax_number: string | null;
  notes: string | null;
  status: string | null;
  product_ids: number[];
};

type SupplierForm = {
  name: string;
  code: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  marketing_name: string;
  marketing_phone: string;
  marketing_email: string;
  branch_id: string;
  warehouse_id: string;
  payment_type_id: string;
  payment_terms: string;
  lead_time_days: string;
  tax_number: string;
  notes: string;
  status: string;
  product_ids: string[];
};

const emptyForm: SupplierForm = {
  name: '',
  code: '',
  contact_person: '',
  phone: '',
  email: '',
  address: '',
  marketing_name: '',
  marketing_phone: '',
  marketing_email: '',
  branch_id: '',
  warehouse_id: '',
  payment_type_id: '',
  payment_terms: '',
  lead_time_days: '',
  tax_number: '',
  notes: '',
  status: 'active',
  product_ids: [],
};

const toLabel = (record?: LookupRecord) => {
  if (!record) return '-';
  const secondary = record.code || record.sku;
  return secondary ? `${record.name} - ${secondary}` : record.name;
};

export default function SuppliersMasterData() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [branches, setBranches] = useState<LookupRecord[]>([]);
  const [warehouses, setWarehouses] = useState<LookupRecord[]>([]);
  const [products, setProducts] = useState<LookupRecord[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<LookupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState<'list' | 'form'>('list');
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState<SupplierForm>(emptyForm);
  const [productSearch, setProductSearch] = useState('');
  const [marketingEnabled, setMarketingEnabled] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [branchDialogOpen, setBranchDialogOpen] = useState(false);
  const [warehouseDialogOpen, setWarehouseDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [paymentTypeDialogOpen, setPaymentTypeDialogOpen] = useState(false);
  const [branchDraft, setBranchDraft] = useState({ name: '', code: '' });
  const [warehouseDraft, setWarehouseDraft] = useState({ name: '', code: '', address: '' });
  const [productDraft, setProductDraft] = useState({ name: '', sku: '', category: '', uom: '' });
  const [paymentTypeDraft, setPaymentTypeDraft] = useState({ name: '', code: '', description: '' });

  const branchById = useMemo(
    () => new Map(branches.map((branch) => [String(branch.id), branch])),
    [branches]
  );
  const warehouseById = useMemo(
    () => new Map(warehouses.map((warehouse) => [String(warehouse.id), warehouse])),
    [warehouses]
  );
  const productById = useMemo(
    () => new Map(products.map((product) => [String(product.id), product])),
    [products]
  );
  const paymentTypeById = useMemo(
    () => new Map(paymentTypes.map((paymentType) => [String(paymentType.id), paymentType])),
    [paymentTypes]
  );
  const selectedProducts = useMemo(
    () => form.product_ids.map((id) => productById.get(id)).filter((product): product is LookupRecord => Boolean(product)),
    [form.product_ids, productById]
  );
  const visibleProducts = useMemo(() => {
    const query = productSearch.toLowerCase();
    if (!query) return products;
    return products.filter((product) =>
      [product.name, product.code, product.sku].some((value) =>
        String(value || '').toLowerCase().includes(query)
      )
    );
  }, [products, productSearch]);
  const availableProducts = useMemo(
    () => visibleProducts.filter((product) => !form.product_ids.includes(String(product.id))),
    [form.product_ids, visibleProducts]
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      const [supplierRes, branchRes, warehouseRes, productRes, paymentTypeRes] = await Promise.all([
        client.entities.suppliers.query({ limit: 500 }),
        client.entities.branches.query({ limit: 500 }),
        client.entities.warehouses.query({ limit: 500 }),
        client.entities.products.query({ limit: 500 }),
        client.entities.payment_types.query({ limit: 500 }),
      ]);

      setSuppliers((supplierRes.data as { items?: Supplier[] })?.items || []);
      setBranches((branchRes.data as { items?: LookupRecord[] })?.items || []);
      setWarehouses((warehouseRes.data as { items?: LookupRecord[] })?.items || []);
      setProducts((productRes.data as { items?: LookupRecord[] })?.items || []);
      setPaymentTypes((paymentTypeRes.data as { items?: LookupRecord[] })?.items || []);
    } catch (error) {
      console.error('Failed to load suppliers:', error);
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, branchFilter, warehouseFilter, pageSize]);

  const statusValues = useMemo(
    () =>
      Array.from(
        new Set(
          suppliers
            .map((supplier) => supplier.status)
            .filter((value): value is string => Boolean(value))
        )
      ).sort(),
    [suppliers]
  );

  const filteredSuppliers = suppliers.filter((supplier) => {
    const query = search.toLowerCase();
    const matchesSearch =
      !search ||
      [
        supplier.name,
        supplier.code,
        supplier.contact_person,
        supplier.marketing_name,
        supplier.email,
        supplier.phone,
      ].some((value) => String(value || '').toLowerCase().includes(query));
    const matchesStatus = statusFilter === 'all' || supplier.status === statusFilter;
    const matchesBranch = branchFilter === 'all' || String(supplier.branch_id || '') === branchFilter;
    const matchesWarehouse = warehouseFilter === 'all' || String(supplier.warehouse_id || '') === warehouseFilter;
    return matchesSearch && matchesStatus && matchesBranch && matchesWarehouse;
  });

  const totalPages = Math.max(1, Math.ceil(filteredSuppliers.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pagedSuppliers = filteredSuppliers.slice(pageStart, pageStart + pageSize);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setProductSearch('');
    setMarketingEnabled(false);
    setLocationEnabled(false);
    setMode('form');
  };

  const openEdit = (supplier: Supplier) => {
    setEditing(supplier);
    setForm({
      name: supplier.name || '',
      code: supplier.code || '',
      contact_person: supplier.contact_person || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      marketing_name: supplier.marketing_name || '',
      marketing_phone: supplier.marketing_phone || '',
      marketing_email: supplier.marketing_email || '',
      branch_id: supplier.branch_id ? String(supplier.branch_id) : '',
      warehouse_id: supplier.warehouse_id ? String(supplier.warehouse_id) : '',
      payment_type_id: supplier.payment_type_id ? String(supplier.payment_type_id) : '',
      payment_terms: supplier.payment_terms || '',
      lead_time_days: supplier.lead_time_days === null || supplier.lead_time_days === undefined ? '' : String(supplier.lead_time_days),
      tax_number: supplier.tax_number || '',
      notes: supplier.notes || '',
      status: supplier.status || 'active',
      product_ids: (supplier.product_ids || []).map(String),
    });
    setProductSearch('');
    setMarketingEnabled(Boolean(supplier.marketing_name || supplier.marketing_phone || supplier.marketing_email));
    setLocationEnabled(Boolean(supplier.branch_id || supplier.warehouse_id));
    setMode('form');
  };

  const updateForm = (key: keyof SupplierForm, value: string | string[]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateMarketingField = (
    key: 'marketing_name' | 'marketing_phone' | 'marketing_email',
    value: string
  ) => {
    setMarketingEnabled(true);
    updateForm(key, value);
  };

  const addProduct = (productId: string) => {
    setForm((prev) => ({
      ...prev,
      product_ids: Array.from(new Set([...prev.product_ids, productId])),
    }));
  };

  const removeProduct = (productId: string) => {
    setForm((prev) => ({
      ...prev,
      product_ids: prev.product_ids.filter((id) => id !== productId),
    }));
  };

  const clearMarketing = () => {
    setForm((prev) => ({
      ...prev,
      marketing_name: '',
      marketing_phone: '',
      marketing_email: '',
    }));
    setMarketingEnabled(false);
  };

  const clearLocation = () => {
    setForm((prev) => ({
      ...prev,
      branch_id: '',
      warehouse_id: '',
    }));
    setLocationEnabled(false);
  };

  const handleCreateBranch = async () => {
    if (!branchDraft.name || !branchDraft.code) {
      toast.error('Branch name and code are required');
      return;
    }

    try {
      const response = await client.entities.branches.create({
        data: {
          name: branchDraft.name,
          code: branchDraft.code,
          status: 'active',
        },
      });
      const branch = response.data as LookupRecord;
      setBranches((prev) => [branch, ...prev]);
      updateForm('branch_id', String(branch.id));
      setLocationEnabled(true);
      setBranchDraft({ name: '', code: '' });
      setBranchDialogOpen(false);
      toast.success('Branch created and selected');
    } catch (error) {
      console.error('Failed to create branch:', error);
      toast.error('Failed to create branch');
    }
  };

  const handleCreateWarehouse = async () => {
    if (!warehouseDraft.name || !warehouseDraft.code) {
      toast.error('Warehouse name and code are required');
      return;
    }

    try {
      const response = await client.entities.warehouses.create({
        data: {
          name: warehouseDraft.name,
          code: warehouseDraft.code,
          address: warehouseDraft.address || null,
          branch_id: form.branch_id ? Number(form.branch_id) : null,
          status: 'active',
        },
      });
      const warehouse = response.data as LookupRecord;
      setWarehouses((prev) => [warehouse, ...prev]);
      updateForm('warehouse_id', String(warehouse.id));
      setLocationEnabled(true);
      setWarehouseDraft({ name: '', code: '', address: '' });
      setWarehouseDialogOpen(false);
      toast.success('Warehouse created and selected');
    } catch (error) {
      console.error('Failed to create warehouse:', error);
      toast.error('Failed to create warehouse');
    }
  };

  const handleCreateProduct = async () => {
    if (!productDraft.name || !productDraft.sku) {
      toast.error('Product name and SKU are required');
      return;
    }

    try {
      const response = await client.entities.products.create({
        data: {
          name: productDraft.name,
          sku: productDraft.sku,
          category: productDraft.category || null,
          uom: productDraft.uom || null,
          status: 'active',
        },
      });
      const product = response.data as LookupRecord;
      setProducts((prev) => [product, ...prev]);
      addProduct(String(product.id));
      setProductDraft({ name: '', sku: '', category: '', uom: '' });
      setProductDialogOpen(false);
      toast.success('Product created and linked');
    } catch (error) {
      console.error('Failed to create product:', error);
      toast.error('Failed to create product');
    }
  };

  const handleCreatePaymentType = async () => {
    if (!paymentTypeDraft.name || !paymentTypeDraft.code) {
      toast.error('Payment type name and code are required');
      return;
    }

    try {
      const response = await client.entities.payment_types.create({
        data: {
          name: paymentTypeDraft.name,
          code: paymentTypeDraft.code,
          description: paymentTypeDraft.description || null,
          status: 'active',
        },
      });
      const paymentType = response.data as LookupRecord;
      setPaymentTypes((prev) => [paymentType, ...prev]);
      updateForm('payment_type_id', String(paymentType.id));
      setPaymentTypeDraft({ name: '', code: '', description: '' });
      setPaymentTypeDialogOpen(false);
      toast.success('Payment type created and selected');
    } catch (error) {
      console.error('Failed to create payment type:', error);
      toast.error('Failed to create payment type');
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.code) {
      toast.error('Name and code are required');
      return;
    }

    const payload = {
      name: form.name,
      code: form.code,
      contact_person: form.contact_person || null,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      marketing_name: marketingEnabled ? form.marketing_name || null : null,
      marketing_phone: marketingEnabled ? form.marketing_phone || null : null,
      marketing_email: marketingEnabled ? form.marketing_email || null : null,
      branch_id: locationEnabled && form.branch_id ? Number(form.branch_id) : null,
      warehouse_id: locationEnabled && form.warehouse_id ? Number(form.warehouse_id) : null,
      payment_type_id: form.payment_type_id ? Number(form.payment_type_id) : null,
      payment_terms: form.payment_terms || null,
      lead_time_days: form.lead_time_days ? Number(form.lead_time_days) : null,
      tax_number: form.tax_number || null,
      notes: form.notes || null,
      status: form.status || 'active',
      product_ids: form.product_ids.map(Number),
    };

    try {
      if (editing) {
        await client.entities.suppliers.update({ id: String(editing.id), data: payload });
        toast.success('Supplier updated');
      } else {
        await client.entities.suppliers.create({ data: payload });
        toast.success('Supplier created');
      }
      await fetchData();
      setMode('list');
    } catch (error) {
      console.error('Failed to save supplier:', error);
      toast.error('Failed to save supplier');
    }
  };

  const handleDelete = async (supplier: Supplier) => {
    try {
      await client.entities.suppliers.delete({ id: String(supplier.id) });
      toast.success('Supplier deleted');
      await fetchData();
    } catch (error) {
      console.error('Failed to delete supplier:', error);
      toast.error('Failed to delete supplier');
    }
  };

  const productSummary = (supplier: Supplier) => {
    if (!supplier.product_ids?.length) return '-';
    return supplier.product_ids
      .map((id) => toLabel(productById.get(String(id))))
      .join(', ');
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  if (mode === 'form') {
    return (
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Button variant="ghost" className="mb-2 px-0" onClick={() => setMode('list')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to suppliers
            </Button>
            <h1 className="text-2xl font-bold text-slate-900">
              {editing ? 'Edit Supplier' : 'Add Supplier'}
            </h1>
            <p className="text-sm text-slate-500">{editing ? editing.code : 'Create supplier profile'}</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSave}>
            {editing ? 'Update Supplier' : 'Create Supplier'}
          </Button>
        </div>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="marketing">Marketing</TabsTrigger>
            <TabsTrigger value="location">Branch & Warehouse</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">General Information</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input value={form.name} onChange={(event) => updateForm('name', event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Code *</Label>
                  <Input value={form.code} onChange={(event) => updateForm('code', event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Contact Person</Label>
                  <Input value={form.contact_person} onChange={(event) => updateForm('contact_person', event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(event) => updateForm('phone', event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={form.email} onChange={(event) => updateForm('email', event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(value) => updateForm('status', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Address</Label>
                  <Textarea value={form.address} onChange={(event) => updateForm('address', event.target.value)} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Payment Type</Label>
                    <Button variant="outline" size="sm" onClick={() => setPaymentTypeDialogOpen(true)}>
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      New
                    </Button>
                  </div>
                  <Select
                    value={form.payment_type_id || 'none'}
                    onValueChange={(value) => updateForm('payment_type_id', value === 'none' ? '' : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No payment type</SelectItem>
                      {paymentTypes.map((paymentType) => (
                        <SelectItem key={paymentType.id} value={String(paymentType.id)}>
                          {toLabel(paymentType)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Payment Terms</Label>
                  <Input value={form.payment_terms} onChange={(event) => updateForm('payment_terms', event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Lead Time Days</Label>
                  <Input type="number" value={form.lead_time_days} onChange={(event) => updateForm('lead_time_days', event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Tax Number</Label>
                  <Input value={form.tax_number} onChange={(event) => updateForm('tax_number', event.target.value)} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={(event) => updateForm('notes', event.target.value)} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="marketing">
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-3">
                <CardTitle className="text-base">Marketing Contact</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setMarketingEnabled(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Marketing
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearMarketing}>
                    Clear Marketing
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={form.marketing_name}
                    placeholder="Marketing contact name"
                    onChange={(event) => updateMarketingField('marketing_name', event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={form.marketing_phone}
                    placeholder="Marketing phone"
                    onChange={(event) => updateMarketingField('marketing_phone', event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={form.marketing_email}
                    placeholder="Marketing email"
                    onChange={(event) => updateMarketingField('marketing_email', event.target.value)}
                  />
                </div>
                {!marketingEnabled && (
                  <div className="rounded-md border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500 sm:col-span-3">
                    Fill any field or click Add Marketing to attach a marketing contact.
                  </div>
                )}
                <div className="flex justify-end sm:col-span-3">
                  <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSave}>
                    {editing ? 'Update Marketing' : 'Save Marketing'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="location">
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-3">
                <CardTitle className="text-base">Branch & Warehouse</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setLocationEnabled(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Location
                  </Button>
                  {locationEnabled ? (
                    <Button variant="outline" size="sm" onClick={clearLocation}>
                      Clear Location
                    </Button>
                  ) : null}
                  <Button variant="outline" size="sm" onClick={() => setBranchDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Branch
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setWarehouseDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Warehouse
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                {locationEnabled ? (
                  <>
                    <div className="space-y-2">
                      <Label>Supplier Branch</Label>
                      <Select
                        value={form.branch_id || 'none'}
                        onValueChange={(value) => updateForm('branch_id', value === 'none' ? '' : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select branch" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No branch</SelectItem>
                          {branches.map((branch) => (
                            <SelectItem key={branch.id} value={String(branch.id)}>
                              {toLabel(branch)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Supplier Warehouse</Label>
                      <Select
                        value={form.warehouse_id || 'none'}
                        onValueChange={(value) => updateForm('warehouse_id', value === 'none' ? '' : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select warehouse" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No warehouse</SelectItem>
                          {warehouses.map((warehouse) => (
                            <SelectItem key={warehouse.id} value={String(warehouse.id)}>
                              {toLabel(warehouse)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end sm:col-span-2">
                      <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSave}>
                        {editing ? 'Update Branch & Warehouse' : 'Save Branch & Warehouse'}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="rounded-md border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 sm:col-span-2">
                    No branch or warehouse. Click Add Location, New Branch, or New Warehouse to assign one.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <Card>
              <CardHeader className="gap-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="text-base">Products Sold</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="w-fit bg-blue-100 text-blue-800">
                      {form.product_ids.length} selected
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => setProductDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      New Product
                    </Button>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={handleSave}>
                      {editing ? 'Update Products' : 'Save Products'}
                    </Button>
                  </div>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={productSearch}
                    onChange={(event) => setProductSearch(event.target.value)}
                    placeholder="Search products..."
                    className="pl-9"
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-slate-700">Selected Products</div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {selectedProducts.map((product) => (
                      <div key={product.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 p-3">
                        <span className="text-sm text-slate-700">{toLabel(product)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => removeProduct(String(product.id))}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    {selectedProducts.length === 0 && (
                      <div className="rounded-md border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 sm:col-span-2 lg:col-span-3">
                        No selected products.
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-sm font-medium text-slate-700">Available Products</div>
                <div className="grid max-h-[420px] gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                  {availableProducts.map((product) => {
                    const value = String(product.id);

                    return (
                      <div
                        key={product.id}
                        className="flex items-start justify-between gap-3 rounded-md border border-slate-200 p-3 hover:bg-slate-50"
                      >
                        <span className="text-sm text-slate-700">{toLabel(product)}</span>
                        <Button size="sm" variant="outline" onClick={() => addProduct(value)}>
                          <Plus className="mr-1 h-3.5 w-3.5" />
                          Add
                        </Button>
                      </div>
                    );
                  })}
                  {availableProducts.length === 0 && (
                    <div className="rounded-md border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 sm:col-span-2 lg:col-span-3">
                      No products found.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={branchDialogOpen} onOpenChange={setBranchDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Branch</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={branchDraft.name} onChange={(event) => setBranchDraft((prev) => ({ ...prev, name: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Code *</Label>
                <Input value={branchDraft.code} onChange={(event) => setBranchDraft((prev) => ({ ...prev, code: event.target.value }))} />
              </div>
            </div>
            <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleCreateBranch}>
              Create and Select Branch
            </Button>
          </DialogContent>
        </Dialog>

        <Dialog open={warehouseDialogOpen} onOpenChange={setWarehouseDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Warehouse</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={warehouseDraft.name} onChange={(event) => setWarehouseDraft((prev) => ({ ...prev, name: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Code *</Label>
                <Input value={warehouseDraft.code} onChange={(event) => setWarehouseDraft((prev) => ({ ...prev, code: event.target.value }))} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Address</Label>
                <Textarea value={warehouseDraft.address} onChange={(event) => setWarehouseDraft((prev) => ({ ...prev, address: event.target.value }))} />
              </div>
            </div>
            <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleCreateWarehouse}>
              Create and Select Warehouse
            </Button>
          </DialogContent>
        </Dialog>

        <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Product</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={productDraft.name} onChange={(event) => setProductDraft((prev) => ({ ...prev, name: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>SKU *</Label>
                <Input value={productDraft.sku} onChange={(event) => setProductDraft((prev) => ({ ...prev, sku: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input value={productDraft.category} onChange={(event) => setProductDraft((prev) => ({ ...prev, category: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input value={productDraft.uom} onChange={(event) => setProductDraft((prev) => ({ ...prev, uom: event.target.value }))} />
              </div>
            </div>
            <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleCreateProduct}>
              Create and Link Product
            </Button>
          </DialogContent>
        </Dialog>

        <Dialog open={paymentTypeDialogOpen} onOpenChange={setPaymentTypeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Payment Type</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={paymentTypeDraft.name} onChange={(event) => setPaymentTypeDraft((prev) => ({ ...prev, name: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Code *</Label>
                <Input value={paymentTypeDraft.code} onChange={(event) => setPaymentTypeDraft((prev) => ({ ...prev, code: event.target.value }))} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Description</Label>
                <Textarea value={paymentTypeDraft.description} onChange={(event) => setPaymentTypeDraft((prev) => ({ ...prev, description: event.target.value }))} />
              </div>
            </div>
            <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleCreatePaymentType}>
              Create and Select Payment Type
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Suppliers</h1>
          <p className="text-sm text-slate-500">{suppliers.length} records</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Supplier
        </Button>
      </div>

      <Card>
        <CardHeader className="gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Truck className="h-4 w-4 text-blue-600" />
            Supplier Master
          </CardTitle>
          <div className="grid gap-3 xl:grid-cols-[minmax(220px,1fr)_170px_190px_210px_140px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search suppliers..."
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
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
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All branches</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={String(branch.id)}>
                    {toLabel(branch)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Warehouse" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All warehouses</SelectItem>
                {warehouses.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={String(warehouse.id)}>
                    {toLabel(warehouse)}
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
                  <th className="px-4 py-2.5 text-left font-medium text-slate-500">Name</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-500">Code</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-500">Contact</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-500">Marketing</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-500">Branch</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-500">Warehouse</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-500">Payment Type</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-500">Products Sold</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-500">Status</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedSuppliers.map((supplier, index) => (
                  <tr
                    key={supplier.id}
                    className={`border-b border-slate-100 hover:bg-slate-50 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                  >
                    <td className="px-4 py-2.5 font-medium text-slate-800">{supplier.name}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{supplier.code}</td>
                    <td className="px-4 py-2.5 text-slate-600">{supplier.contact_person || '-'}</td>
                    <td className="px-4 py-2.5 text-slate-600">{supplier.marketing_name || '-'}</td>
                    <td className="px-4 py-2.5 text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        {toLabel(branchById.get(String(supplier.branch_id)))}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{toLabel(warehouseById.get(String(supplier.warehouse_id)))}</td>
                    <td className="px-4 py-2.5 text-slate-600">{toLabel(paymentTypeById.get(String(supplier.payment_type_id)))}</td>
                    <td className="max-w-xs px-4 py-2.5 text-slate-600">
                      <span className="line-clamp-2">{productSummary(supplier)}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge className={`text-xs ${STATUS_COLORS[supplier.status || ''] || ''}`}>{supplier.status}</Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(supplier)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleDelete(supplier)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredSuppliers.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-slate-500">
                      No suppliers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing {filteredSuppliers.length === 0 ? 0 : pageStart + 1}-{Math.min(pageStart + pageSize, filteredSuppliers.length)} of {filteredSuppliers.length}
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
    </div>
  );
}
