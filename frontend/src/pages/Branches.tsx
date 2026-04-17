import { useEffect, useState } from 'react';
import { client } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Building2,
  Plus,
  Search,
  Pencil,
  Trash2,
  Warehouse as WarehouseIcon,
  MapPin,
  Phone,
  Mail,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Branch, Warehouse } from '@/lib/types';
import { STATUS_COLORS } from '@/lib/types';

export default function Branches() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Branch form
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formStatus, setFormStatus] = useState('active');

  // Warehouse assignment dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [branchRes, whRes] = await Promise.all([
        client.entities.branches.query({ limit: 100 }),
        client.entities.warehouses.query({ limit: 200 }),
      ]);
      setBranches(branchRes.data?.items || []);
      setWarehouses(whRes.data?.items || []);
    } catch (err) {
      console.error('Failed to fetch branches:', err);
    } finally {
      setLoading(false);
    }
  };

  const openForm = (branch?: Branch) => {
    if (branch) {
      setEditing(branch);
      setFormName(branch.name);
      setFormCode(branch.code);
      setFormAddress(branch.address || '');
      setFormContact(branch.contact_name || '');
      setFormPhone(branch.phone || '');
      setFormEmail(branch.email || '');
      setFormStatus(branch.status || 'active');
    } else {
      setEditing(null);
      setFormName('');
      setFormCode('');
      setFormAddress('');
      setFormContact('');
      setFormPhone('');
      setFormEmail('');
      setFormStatus('active');
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName || !formCode) {
      toast.error('Name and Code are required');
      return;
    }
    try {
      const data = {
        name: formName,
        code: formCode,
        address: formAddress,
        contact_name: formContact,
        phone: formPhone,
        email: formEmail,
        status: formStatus,
      };
      if (editing) {
        await client.entities.branches.update({ id: String(editing.id), data });
        toast.success('Branch updated');
      } else {
        await client.entities.branches.create({ data });
        toast.success('Branch created');
      }
      setDialogOpen(false);
      fetchData();
    } catch (err) {
      console.error('Failed to save branch:', err);
      toast.error('Failed to save branch');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await client.entities.branches.delete({ id: String(id) });
      toast.success('Branch deleted');
      fetchData();
    } catch (err) {
      console.error('Failed to delete branch:', err);
      toast.error('Failed to delete branch');
    }
  };

  const openAssignDialog = (branch: Branch) => {
    setSelectedBranch(branch);
    setSelectedWarehouseId('');
    setAssignDialogOpen(true);
  };

  const handleAssignWarehouse = async () => {
    if (!selectedWarehouseId || !selectedBranch) return;
    try {
      await client.entities.warehouses.update({
        id: selectedWarehouseId,
        data: { branch_id: selectedBranch.id },
      });
      toast.success('Warehouse assigned to branch');
      setAssignDialogOpen(false);
      fetchData();
    } catch (err) {
      console.error('Failed to assign warehouse:', err);
      toast.error('Failed to assign warehouse');
    }
  };

  const handleUnassignWarehouse = async (warehouseId: number) => {
    try {
      await client.entities.warehouses.update({
        id: String(warehouseId),
        data: { branch_id: 0 },
      });
      toast.success('Warehouse unassigned');
      fetchData();
    } catch (err) {
      console.error('Failed to unassign warehouse:', err);
      toast.error('Failed to unassign');
    }
  };

  const getWarehousesForBranch = (branchId: number) =>
    warehouses.filter((w) => w.branch_id === branchId);

  const unassignedWarehouses = warehouses.filter(
    (w) => !w.branch_id || w.branch_id === 0
  );

  const filteredBranches = branches.filter((b) => {
    const matchesSearch =
      !search ||
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.code.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeBranches = branches.filter((b) => b.status === 'active').length;
  const totalWarehouses = warehouses.length;
  const assignedWarehouses = warehouses.filter(
    (w) => w.branch_id && w.branch_id > 0
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-blue-500">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Active Branches</p>
              <p className="text-2xl font-bold text-slate-800">{activeBranches}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-emerald-500">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-emerald-100 text-emerald-600">
              <WarehouseIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Warehouses</p>
              <p className="text-2xl font-bold text-slate-800">{totalWarehouses}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-amber-500">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-amber-100 text-amber-600">
              <WarehouseIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Assigned Warehouses</p>
              <p className="text-2xl font-bold text-slate-800">
                {assignedWarehouses} / {totalWarehouses}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search branches..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => openForm()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Branch
        </Button>
      </div>

      {/* Branch Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredBranches.map((branch) => {
          const branchWarehouses = getWarehousesForBranch(branch.id);
          return (
            <Card key={branch.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{branch.name}</CardTitle>
                      <p className="text-xs font-mono text-slate-400">{branch.code}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge className={`text-xs ${STATUS_COLORS[branch.status] || ''}`}>
                      {branch.status}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => openForm(branch)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(branch.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Contact Info */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-500">
                  {branch.address && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{branch.address}</span>
                    </div>
                  )}
                  {branch.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3 flex-shrink-0" />
                      <span>{branch.phone}</span>
                    </div>
                  )}
                  {branch.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{branch.email}</span>
                    </div>
                  )}
                </div>

                {/* Warehouses */}
                <div className="border-t pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-slate-700">
                      Warehouses ({branchWarehouses.length})
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => openAssignDialog(branch)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Assign
                    </Button>
                  </div>
                  {branchWarehouses.length > 0 ? (
                    <div className="space-y-1.5">
                      {branchWarehouses.map((wh) => (
                        <div
                          key={wh.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100"
                        >
                          <div className="flex items-center gap-2">
                            <WarehouseIcon className="w-4 h-4 text-slate-400" />
                            <div>
                              <p className="text-sm font-medium text-slate-700">{wh.name}</p>
                              <p className="text-xs text-slate-400">{wh.code}</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs text-red-500 hover:text-red-700"
                            onClick={() => handleUnassignWarehouse(wh.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-2">
                      No warehouses assigned
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filteredBranches.length === 0 && (
          <div className="col-span-2 text-center py-12 text-slate-400">
            No branches found
          </div>
        )}
      </div>

      {/* Branch Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Branch' : 'Add Branch'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Branch name"
                />
              </div>
              <div>
                <Label>Code *</Label>
                <Input
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  placeholder="BR-XXX"
                />
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <Input
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                placeholder="Full address"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contact Name</Label>
                <Input
                  value={formContact}
                  onChange={(e) => setFormContact(e.target.value)}
                  placeholder="Manager name"
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Phone</Label>
                <Input
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="+1-555-0000"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="branch@example.com"
                />
              </div>
            </div>
            <Button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-700">
              {editing ? 'Update Branch' : 'Create Branch'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Warehouse Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Assign Warehouse to {selectedBranch?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {unassignedWarehouses.length > 0 ? (
              <>
                <div>
                  <Label>Select Warehouse</Label>
                  <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a warehouse..." />
                    </SelectTrigger>
                    <SelectContent>
                      {unassignedWarehouses.map((wh) => (
                        <SelectItem key={wh.id} value={String(wh.id)}>
                          {wh.name} ({wh.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleAssignWarehouse}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={!selectedWarehouseId}
                >
                  Assign Warehouse
                </Button>
              </>
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">
                All warehouses are already assigned to branches.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}