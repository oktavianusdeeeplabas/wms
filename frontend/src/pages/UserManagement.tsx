import { useEffect, useMemo, useState } from 'react';
import { client } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Users, UserCog, Plus, Search, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

interface ManagedUser {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  branch_id?: number | null;
  warehouse_id?: number | null;
  last_login?: string | null;
  created_at?: string | null;
}

interface BranchOption {
  id: number;
  name: string;
}

interface WarehouseOption {
  id: number;
  name: string;
  branch_id: number;
}

interface RoleDefinition {
  name: string;
  label: string;
  description: string;
  permissions: string[];
  status: string;
}

interface PermissionOverride {
  id: number;
  user_id: string;
  permission: string;
  mode: string;
  created_at?: string | null;
}

interface UserPermissionSummary {
  user_id: string;
  role: string;
  base_permissions: string[];
  effective_permissions: string[];
  overrides: PermissionOverride[];
}

export default function UserManagement() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [draftRoles, setDraftRoles] = useState<Record<string, string>>({});
  const [draftBranches, setDraftBranches] = useState<Record<string, string>>({});
  const [draftWarehouses, setDraftWarehouses] = useState<Record<string, string>>({});
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserPermissions, setSelectedUserPermissions] = useState<UserPermissionSummary | null>(null);
  const [overridePermission, setOverridePermission] = useState('');
  const [overrideMode, setOverrideMode] = useState<'allow' | 'deny'>('allow');

  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formName, setFormName] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('viewer');
  const [formBranchId, setFormBranchId] = useState('all');
  const [formWarehouseId, setFormWarehouseId] = useState('all');

  const [roleName, setRoleName] = useState('');
  const [roleLabel, setRoleLabel] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [roleStatus, setRoleStatus] = useState('active');
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);

  const fetchData = async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        client.apiCall.invoke({ url: '/api/v1/users', method: 'GET' }),
        client.apiCall.invoke({ url: '/api/v1/rbac/roles', method: 'GET' }),
      ]);
      const [branchesRes, warehousesRes] = await Promise.all([
        client.entities.branches.query({ limit: 200 }),
        client.entities.warehouses.query({ limit: 200 }),
      ]);

      const nextUsers = usersRes.data as ManagedUser[];
      const nextRoles = rolesRes.data as RoleDefinition[];
      setUsers(nextUsers);
      setRoles(nextRoles);
      setBranches((branchesRes.data?.items || []) as BranchOption[]);
      setWarehouses((warehousesRes.data?.items || []) as WarehouseOption[]);
      setDraftRoles(
        nextUsers.reduce<Record<string, string>>((acc, user) => {
          acc[user.id] = user.role;
          return acc;
        }, {})
      );
      setDraftBranches(
        nextUsers.reduce<Record<string, string>>((acc, user) => {
          acc[user.id] = user.branch_id ? String(user.branch_id) : 'all';
          return acc;
        }, {})
      );
      setDraftWarehouses(
        nextUsers.reduce<Record<string, string>>((acc, user) => {
          acc[user.id] = user.warehouse_id ? String(user.warehouse_id) : 'all';
          return acc;
        }, {})
      );
    } catch (err) {
      console.error('Failed to fetch RBAC data:', err);
      toast.error('Failed to load user management data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const roleLabels = useMemo(
    () =>
      roles.reduce<Record<string, string>>((acc, role) => {
        acc[role.name] = role.label;
        return acc;
      }, {}),
    [roles]
  );

  const allPermissions = useMemo(
    () => Array.from(new Set(roles.flatMap((role) => role.permissions))).sort(),
    [roles]
  );

  const filteredUsers = users.filter((user) => {
    const haystack = `${user.id} ${user.email} ${user.name || ''} ${user.role}`.toLowerCase();
    return !search || haystack.includes(search.toLowerCase());
  });

  const handleCreateUser = async () => {
    if (!formUsername || !formEmail || !formPassword) {
      toast.error('Username, email, and password are required');
      return;
    }

    try {
      await client.apiCall.invoke({
        url: '/api/v1/users/local',
        method: 'POST',
        data: {
          username: formUsername,
          password: formPassword,
          email: formEmail,
          name: formName || null,
          role: formRole,
          branch_id: formBranchId === 'all' ? null : Number(formBranchId),
          warehouse_id: formWarehouseId === 'all' ? null : Number(formWarehouseId),
        },
      });
      toast.success('Managed user created');
      setCreateOpen(false);
      setFormUsername('');
      setFormEmail('');
      setFormName('');
      setFormPassword('');
      setFormRole('viewer');
      setFormBranchId('all');
      setFormWarehouseId('all');
      setLoading(true);
      await fetchData();
    } catch (err) {
      console.error('Failed to create user:', err);
      toast.error('Failed to create user');
    }
  };

  const handleOpenRoleEditor = (role?: RoleDefinition) => {
    if (role) {
      setRoleName(role.name);
      setRoleLabel(role.label);
      setRoleDescription(role.description || '');
      setRoleStatus(role.status);
      setRolePermissions(role.permissions);
    } else {
      setRoleName('');
      setRoleLabel('');
      setRoleDescription('');
      setRoleStatus('active');
      setRolePermissions([]);
    }
    setRoleOpen(true);
  };

  const handleSaveRole = async () => {
    if (!roleName || !roleLabel) {
      toast.error('Role name and label are required');
      return;
    }

    try {
      await client.apiCall.invoke({
        url: `/api/v1/rbac/roles/${encodeURIComponent(roleName)}`,
        method: 'POST',
        data: {
          label: roleLabel,
          description: roleDescription || null,
          permissions: rolePermissions,
          status: roleStatus,
        },
      });
      toast.success('Role saved');
      setRoleOpen(false);
      setLoading(true);
      await fetchData();
    } catch (err) {
      console.error('Failed to save role:', err);
      toast.error('Failed to save role');
    }
  };

  const loadUserPermissions = async (user: ManagedUser) => {
    try {
      const response = await client.apiCall.invoke({
        url: `/api/v1/rbac/users/${encodeURIComponent(user.id)}/permissions`,
        method: 'GET',
        data: { role: user.role },
      });
      setSelectedUserPermissions(response.data as UserPermissionSummary);
      setSelectedUserId(user.id);
    } catch (err) {
      console.error('Failed to load user permissions:', err);
      toast.error('Failed to load user permissions');
    }
  };

  const handleAddOverride = async (user: ManagedUser) => {
    if (!overridePermission) {
      toast.error('Select a permission to override');
      return;
    }

    try {
      await client.apiCall.invoke({
        url: `/api/v1/rbac/users/${encodeURIComponent(user.id)}/permissions`,
        method: 'PUT',
        data: {
          permission: overridePermission,
          mode: overrideMode,
        },
      });
      toast.success('Permission override saved');
      setOverridePermission('');
      await loadUserPermissions(user);
      setLoading(true);
      await fetchData();
    } catch (err) {
      console.error('Failed to save override:', err);
      toast.error('Failed to save override');
    }
  };

  const handleDeleteOverride = async (user: ManagedUser, permission: string) => {
    try {
      await client.apiCall.invoke({
        url: `/api/v1/rbac/users/${encodeURIComponent(user.id)}/permissions/${encodeURIComponent(permission)}`,
        method: 'DELETE',
      });
      toast.success('Permission override removed');
      await loadUserPermissions(user);
      setLoading(true);
      await fetchData();
    } catch (err) {
      console.error('Failed to delete override:', err);
      toast.error('Failed to delete override');
    }
  };

  const handleUpdateRole = async (user: ManagedUser) => {
    const nextRole = draftRoles[user.id];
    const nextBranch = draftBranches[user.id] || 'all';
    const nextWarehouse = draftWarehouses[user.id] || 'all';
    const nextBranchId = nextBranch === 'all' ? null : Number(nextBranch);
    const nextWarehouseId = nextWarehouse === 'all' ? null : Number(nextWarehouse);
    if (
      (!nextRole || nextRole === user.role) &&
      nextBranchId === (user.branch_id || null) &&
      nextWarehouseId === (user.warehouse_id || null)
    ) {
      toast.message('No user access change to save');
      return;
    }

    try {
      setSavingUserId(user.id);
      await client.apiCall.invoke({
        url: `/api/v1/users/${encodeURIComponent(user.id)}`,
        method: 'PUT',
        data: {
          role: nextRole,
          branch_id: nextBranchId,
          warehouse_id: nextWarehouseId,
        },
      });
      toast.success(`Access updated for ${user.email}`);
      setUsers((prev) =>
        prev.map((item) =>
          item.id === user.id
            ? { ...item, role: nextRole, branch_id: nextBranchId, warehouse_id: nextWarehouseId }
            : item
        )
      );
    } catch (err) {
      console.error('Failed to update user role:', err);
      toast.error('Failed to update user role');
    } finally {
      setSavingUserId(null);
    }
  };

  const summary = {
    users: users.length,
    admin: users.filter((user) => user.role === 'admin').length,
    managers: users.filter((user) => user.role === 'manager').length,
    operators: users.filter((user) => user.role === 'operator').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="border-l-4 border-slate-500">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Managed Users</p>
            <p className="text-2xl font-bold text-slate-800">{summary.users}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-red-500">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Admins</p>
            <p className="text-2xl font-bold text-slate-800">{summary.admin}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-blue-500">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Managers</p>
            <p className="text-2xl font-bold text-slate-800">{summary.managers}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-emerald-500">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Operators</p>
            <p className="text-2xl font-bold text-slate-800">{summary.operators}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">User Management</h3>
          <p className="text-sm text-slate-500">Assign roles, review permissions, and manage WMS user access</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Managed User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>Username</Label>
                <Input value={formUsername} onChange={(e) => setFormUsername(e.target.value)} placeholder="warehouse.manager" />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="user@example.com" />
              </div>
              <div>
                <Label>Name</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Optional display name" />
              </div>
              <div>
                <Label>Password</Label>
                <Input value={formPassword} onChange={(e) => setFormPassword(e.target.value)} type="password" placeholder="Set initial password" />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={formRole} onValueChange={setFormRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.name} value={role.name}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Branch Scope</Label>
                <Select
                  value={formBranchId}
                  onValueChange={(value) => {
                    setFormBranchId(value);
                    setFormWarehouseId('all');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All branches</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={String(branch.id)}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Warehouse Scope</Label>
                <Select value={formWarehouseId} onValueChange={setFormWarehouseId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All warehouses</SelectItem>
                    {warehouses
                      .filter((warehouse) => formBranchId === 'all' || String(warehouse.branch_id) === formBranchId)
                      .map((warehouse) => (
                        <SelectItem key={warehouse.id} value={String(warehouse.id)}>
                          {warehouse.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateUser} className="w-full bg-blue-600 hover:bg-blue-700">
                Save User
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" onClick={() => handleOpenRoleEditor()}>
              <Shield className="w-4 h-4 mr-2" />
              New Role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Role Management</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div>
                <Label>Role Name</Label>
                <Input value={roleName} onChange={(e) => setRoleName(e.target.value)} placeholder="auditor" />
              </div>
              <div>
                <Label>Label</Label>
                <Input value={roleLabel} onChange={(e) => setRoleLabel(e.target.value)} placeholder="Auditor" />
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Input value={roleDescription} onChange={(e) => setRoleDescription(e.target.value)} placeholder="Read-only compliance access" />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={roleStatus} onValueChange={setRoleStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Permissions</Label>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-auto rounded-lg border border-slate-200 p-3">
                  {allPermissions.map((permission) => (
                    <label key={permission} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={rolePermissions.includes(permission)}
                        onChange={(e) =>
                          setRolePermissions((prev) =>
                            e.target.checked
                              ? Array.from(new Set([...prev, permission])).sort()
                              : prev.filter((item) => item !== permission)
                          )
                        }
                      />
                      {permission}
                    </label>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2">
                <Button onClick={handleSaveRole} className="w-full bg-blue-600 hover:bg-blue-700">
                  Save Role
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <CardTitle className="text-base">Users</CardTitle>
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  className="pl-9"
                  placeholder="Search user, email, role..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredUsers.map((user) => (
              <div key={user.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-medium text-slate-800">{user.name || user.email}</p>
                    <p className="text-sm text-slate-500">{user.email}</p>
                    <p className="text-xs text-slate-400 mt-1">ID: {user.id}</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <Badge className="bg-slate-100 text-slate-800">{roleLabels[user.role] || user.role}</Badge>
                    <Button size="sm" variant="outline" onClick={() => loadUserPermissions(user)}>
                      <KeyRound className="w-4 h-4 mr-2" />
                      Permissions
                    </Button>
                    <Select
                      value={draftRoles[user.id] || user.role}
                      onValueChange={(value) =>
                        setDraftRoles((prev) => ({
                          ...prev,
                          [user.id]: value,
                        }))
                      }
                    >
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.name} value={role.name}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={draftBranches[user.id] || 'all'}
                      onValueChange={(value) => {
                        setDraftBranches((prev) => ({
                          ...prev,
                          [user.id]: value,
                        }));
                        setDraftWarehouses((prev) => ({
                          ...prev,
                          [user.id]: 'all',
                        }));
                      }}
                    >
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All branches</SelectItem>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={String(branch.id)}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={draftWarehouses[user.id] || 'all'}
                      onValueChange={(value) =>
                        setDraftWarehouses((prev) => ({
                          ...prev,
                          [user.id]: value,
                        }))
                      }
                    >
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All warehouses</SelectItem>
                        {warehouses
                          .filter(
                            (warehouse) =>
                              (draftBranches[user.id] || 'all') === 'all' ||
                              String(warehouse.branch_id) === draftBranches[user.id]
                          )
                          .map((warehouse) => (
                            <SelectItem key={warehouse.id} value={String(warehouse.id)}>
                              {warehouse.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={() => handleUpdateRole(user)}
                      disabled={savingUserId === user.id}
                    >
                      <UserCog className="w-4 h-4 mr-2" />
                      Save Role
                    </Button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                  <span>Created: {user.created_at ? new Date(user.created_at).toLocaleString() : '-'}</span>
                  <span>Last login: {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}</span>
                  <span>
                    Branch: {branches.find((branch) => branch.id === user.branch_id)?.name || 'All'}
                  </span>
                  <span>
                    Warehouse: {warehouses.find((warehouse) => warehouse.id === user.warehouse_id)?.name || 'All'}
                  </span>
                </div>
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center text-slate-500">
                No users matched your search.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Roles & Permissions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {roles.map((role) => (
              <div key={role.name} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-800">{role.label}</p>
                      <Badge className="bg-slate-100 text-slate-700">{role.name}</Badge>
                      <Button size="sm" variant="ghost" onClick={() => handleOpenRoleEditor(role)}>
                        Edit
                      </Button>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{role.description}</p>
                    <div className="mt-3 flex items-start gap-2 text-xs text-slate-600">
                      <KeyRound className="w-3.5 h-3.5 mt-0.5 text-slate-400" />
                      <span>{role.permissions.join(', ')}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {selectedUserId && selectedUserPermissions && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Permission Overrides for {selectedUserId}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_140px] gap-3">
              <Select value={overridePermission} onValueChange={setOverridePermission}>
                <SelectTrigger>
                  <SelectValue placeholder="Select permission" />
                </SelectTrigger>
                <SelectContent>
                  {allPermissions.map((permission) => (
                    <SelectItem key={permission} value={permission}>
                      {permission}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={overrideMode} onValueChange={(value: 'allow' | 'deny') => setOverrideMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="allow">Allow</SelectItem>
                  <SelectItem value="deny">Deny</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => {
                  const user = users.find((item) => item.id === selectedUserId);
                  if (user) void handleAddOverride(user);
                }}
              >
                Add Override
              </Button>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-800">Effective Permissions</p>
              <p className="text-sm text-slate-500 mt-1">
                {selectedUserPermissions.effective_permissions.join(', ') || 'No permissions'}
              </p>
            </div>

            <div className="space-y-2">
              {selectedUserPermissions.overrides.map((override) => {
                const user = users.find((item) => item.id === selectedUserId);
                return (
                  <div key={override.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                    <div>
                      <p className="font-medium text-slate-800">{override.permission}</p>
                      <p className="text-xs text-slate-500">{override.mode.toUpperCase()}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => user && handleDeleteOverride(user, override.permission)}
                    >
                      Remove
                    </Button>
                  </div>
                );
              })}
              {selectedUserPermissions.overrides.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-slate-500">
                  No user-specific permission overrides.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
