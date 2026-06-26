import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  ChefHat,
  PackageCheck,
  Database,
  Ruler,
  FlaskConical,
  Menu,
  X,
  LogOut,
  User,
  Bell,
  Warehouse,
  Building2,
  ArrowLeftRight,
  Truck,
  FileBarChart,
  Sparkles,
  Factory,
  ClipboardCheck,
  Container,
  ActivitySquare,
  Stethoscope,
  Map,
  PackagePlus,
  ChevronDown,
  PackageOpen,
  Users,
  RadioTower,
  CheckCheck,
  Boxes,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/lib/rbac';
import { client } from '@/lib/api';
import FloatingDataChat from '@/components/FloatingDataChat';

interface LayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  path?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  permission?: string;
  children?: NavItem[];
}

interface NavGroup {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  read_at?: string | null;
  created_at?: string | null;
}

const navGroups: NavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: LayoutDashboard,
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/branches', label: 'Branches', icon: Building2, permission: 'dashboard.view' },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: Package,
    items: [
      { path: '/inventory', label: 'Inventory', icon: Package, permission: 'inventory.view' },
      { path: '/rfid-tracking', label: 'RFID Tracking', icon: RadioTower, permission: 'inventory.view' },
      { path: '/cycle-counts', label: 'Cycle Counts', icon: ClipboardCheck, permission: 'inventory.manage' },
      { path: '/receiving', label: 'Receiving', icon: ClipboardList, permission: 'operations.execute' },
      { path: '/transfers', label: 'Transfers', icon: ArrowLeftRight, permission: 'operations.execute' },
      { path: '/loading', label: 'Loading', icon: Truck, permission: 'operations.execute' },
      { path: '/assets', label: 'Assets', icon: Container, permission: 'operations.execute' },
      { path: '/kitting', label: 'Kitting', icon: PackagePlus, permission: 'operations.execute' },
    ],
  },
  {
    id: 'production',
    label: 'Production',
    icon: Factory,
    items: [
      { path: '/bom-recipes', label: 'BOM / Recipes', icon: FlaskConical, permission: 'production.manage' },
      { path: '/manufacturing', label: 'Manufacturing', icon: Factory, permission: 'production.manage' },
      { path: '/production', label: 'Production', icon: ChefHat, permission: 'production.manage' },
      { path: '/picking', label: 'Picking', icon: PackageCheck, permission: 'operations.execute' },
      { path: '/packing-sorting', label: 'Packing & Sorting', icon: PackageOpen, permission: 'operations.execute' },
    ],
  },
  {
    id: 'monitoring',
    label: 'Monitoring',
    icon: ActivitySquare,
    items: [
      { path: '/operation-monitor', label: 'Operation Monitor', icon: ActivitySquare, permission: 'operations.view' },
      { path: '/diagnostic', label: 'Diagnostic', icon: Stethoscope, permission: 'operations.view' },
      { path: '/visualization', label: 'Visualization', icon: Map, permission: 'operations.view' },
      { path: '/reports', label: 'Reports', icon: FileBarChart, permission: 'reports.view' },
      { path: '/ai-analytics', label: 'AI Analytics', icon: Sparkles, permission: 'analytics.view' },
    ],
  },
  {
    id: 'setup',
    label: 'Setup',
    icon: Database,
    items: [
      {
        label: 'Master Data',
        icon: Database,
        permission: 'settings.manage',
        children: [
          { path: '/master-data/products', label: 'Products', icon: Package, permission: 'settings.manage' },
          { path: '/master-data/product-categories', label: 'Product Categories', icon: Database, permission: 'settings.manage' },
          { path: '/master-data/product-sub-categories', label: 'Product Sub Categories', icon: Database, permission: 'settings.manage' },
          { path: '/master-data/brands', label: 'Brands', icon: Database, permission: 'settings.manage' },
          { path: '/master-data/manufacturers', label: 'Manufacturers', icon: Factory, permission: 'settings.manage' },
          { path: '/master-data/product-types', label: 'Product Types', icon: Database, permission: 'settings.manage' },
          { path: '/master-data/item-groups', label: 'Item Groups', icon: Boxes, permission: 'settings.manage' },
          { path: '/master-data/suppliers', label: 'Suppliers', icon: Truck, permission: 'settings.manage' },
          { path: '/master-data/warehouses', label: 'Warehouses', icon: Warehouse, permission: 'settings.manage' },
          { path: '/master-data/zones', label: 'Zones', icon: Map, permission: 'settings.manage' },
          { path: '/master-data/bins', label: 'Bins', icon: Boxes, permission: 'settings.manage' },
          { path: '/master-data/units', label: 'Units', icon: Ruler, permission: 'settings.manage' },
          { path: '/master-data/payment-types', label: 'Payment Types', icon: CreditCard, permission: 'settings.manage' },
        ],
      },
      { path: '/user-management', label: 'User Management', icon: Users, adminOnly: true, permission: 'users.manage' },
    ],
  },
];

const filterNavItem = (item: NavItem, user: ReturnType<typeof useAuth>['user']): NavItem | null => {
  const children = item.children
    ?.map((child) => filterNavItem(child, user))
    .filter((child): child is NavItem => Boolean(child));
  const allowed =
    (!item.adminOnly || user?.role === 'admin') &&
    hasPermission(user || null, item.permission);

  if (!allowed && (!children || children.length === 0)) {
    return null;
  }

  return { ...item, children };
};

const flattenNavItems = (items: NavItem[]): NavItem[] =>
  items.flatMap((item) => [
    ...(item.path ? [item] : []),
    ...(item.children ? flattenNavItems(item.children) : []),
  ]);

const navItemIsActive = (item: NavItem, pathname: string) =>
  item.path === pathname || Boolean(item.children?.some((child) => navItemIsActive(child, pathname)));

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, login, logout } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const visibleNavGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items
        .map((item) => filterNavItem(item, user))
        .filter((item): item is NavItem => Boolean(item)),
    }))
    .filter((group) => group.items.length > 0);

  const navItems = visibleNavGroups.flatMap((group) => flattenNavItems(group.items));
  const defaultOpenGroups = visibleNavGroups.reduce<Record<string, boolean>>((acc, group) => {
    acc[group.id] = true;
    return acc;
  }, {});
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(defaultOpenGroups);
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOpenGroups((prev) => ({ ...defaultOpenGroups, ...prev }));
  }, [user?.role]);

  const fetchNotifications = async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      setNotificationsLoading(true);
      const [itemsRes, countRes] = await Promise.all([
        client.apiCall.invoke({ url: '/api/v1/notifications', method: 'GET', params: { limit: 20 } }),
        client.apiCall.invoke({ url: '/api/v1/notifications/unread-count', method: 'GET' }),
      ]);

      setNotifications((itemsRes.data as NotificationItem[]) || []);
      setUnreadCount(Number((countRes.data as { unread_count?: number })?.unread_count || 0));
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  useEffect(() => {
    void fetchNotifications();
    if (!user) return;

    const intervalId = window.setInterval(() => {
      void fetchNotifications();
    }, 30_000);

    return () => window.clearInterval(intervalId);
  }, [user?.id]);

  useEffect(() => {
    const activeGroup = visibleNavGroups.find((group) =>
      group.items.some((item) => navItemIsActive(item, location.pathname))
    );

    if (activeGroup) {
      setOpenGroups((prev) => ({ ...prev, [activeGroup.id]: true }));
    }

    visibleNavGroups.forEach((group) => {
      group.items.forEach((item) => {
        if (item.children?.some((child) => navItemIsActive(child, location.pathname))) {
          setOpenSubmenus((prev) => ({ ...prev, [item.label]: true }));
        }
      });
    });
  }, [location.pathname, user?.role]);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  const toggleGroup = (groupId: string, open: boolean) => {
    setOpenGroups((prev) => ({ ...prev, [groupId]: open }));
  };

  const toggleSubmenu = (label: string) => {
    setOpenSubmenus((prev) => ({ ...prev, [label]: !(prev[label] ?? false) }));
  };

  const markAllNotificationsRead = async () => {
    if (!user || unreadCount === 0) return;

    try {
      await client.apiCall.invoke({ url: '/api/v1/notifications/read-all', method: 'PUT' });
      await fetchNotifications();
    } catch (error) {
      console.error('Failed to mark notifications read:', error);
    }
  };

  const markNotificationRead = async (notification: NotificationItem) => {
    if (notification.read_at) return;

    try {
      await client.apiCall.invoke({
        url: `/api/v1/notifications/${notification.id}/read`,
        method: 'PUT',
      });
      await fetchNotifications();
    } catch (error) {
      console.error('Failed to mark notification read:', error);
    }
  };

  const formatNotificationTime = (value?: string | null) => {
    if (!value) return '';
    return new Date(value).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-[#0F172A] text-white transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } flex flex-col`}
      >
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
            <Warehouse className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Cloud Kitchen</h1>
            <p className="text-xs text-slate-400">Warehouse Management</p>
          </div>
          <button
            className="lg:hidden ml-auto text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto mt-4 px-3 pb-4 space-y-3">
          {visibleNavGroups.map((group) => {
            const GroupIcon = group.icon;
            const isGroupActive = group.items.some((item) => navItemIsActive(item, location.pathname));
            const isOpen = openGroups[group.id] ?? true;

            return (
              <Collapsible
                key={group.id}
                open={isOpen}
                onOpenChange={(open) => toggleGroup(group.id, open)}
              >
                <div className="rounded-xl border border-white/8 bg-white/5">
                  <CollapsibleTrigger asChild>
                    <button
                      className={`flex w-full items-center gap-3 px-3 py-3 text-left transition-colors ${
                        isGroupActive ? 'text-white' : 'text-slate-200 hover:text-white'
                      }`}
                    >
                      <GroupIcon className="w-4 h-4 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{group.label}</p>
                        <p className="text-[11px] text-slate-400">
                          {group.items.length} menu{group.items.length > 1 ? 's' : ''}
                        </p>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-2 pb-2 space-y-1">
                      {group.items.map((item) => {
                        const isActive = navItemIsActive(item, location.pathname);
                        const Icon = item.icon;

                        if (item.children?.length) {
                          const submenuOpen = openSubmenus[item.label] ?? isActive;

                          return (
                            <Collapsible key={item.label} open={submenuOpen}>
                              <CollapsibleTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => toggleSubmenu(item.label)}
                                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                                    isActive
                                      ? 'text-white'
                                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                                  }`}
                                >
                                  <Icon className="w-4 h-4 flex-shrink-0" />
                                  <span className="flex-1">{item.label}</span>
                                  <ChevronDown
                                    className={`w-4 h-4 text-slate-400 transition-transform ${
                                      submenuOpen ? 'rotate-180' : ''
                                    }`}
                                  />
                                </button>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="ml-4 mt-1 space-y-1 border-l border-white/10 pl-3">
                                  {item.children.map((child) => {
                                    const ChildIcon = child.icon;
                                    const isChildActive = location.pathname === child.path;

                                    return (
                                      <Link
                                        key={child.path}
                                        to={child.path || '#'}
                                        onClick={() => setSidebarOpen(false)}
                                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                                          isChildActive
                                            ? 'bg-blue-600 text-white'
                                            : 'text-slate-300 hover:bg-white/10 hover:text-white'
                                        }`}
                                      >
                                        <ChildIcon className="w-4 h-4 flex-shrink-0" />
                                        {child.label}
                                      </Link>
                                    );
                                  })}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          );
                        }

                        return (
                          <Link
                            key={item.path}
                            to={item.path || '#'}
                            onClick={() => setSidebarOpen(false)}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                              isActive
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-300 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            <Icon className="w-4 h-4 flex-shrink-0" />
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </nav>

        {/* User section at bottom */}
        <div className="p-4 border-t border-white/10">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold">
                {(user.name || user.email || 'U')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name || user.email}</p>
              </div>
              <button onClick={handleLogout} className="text-slate-400 hover:text-white">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Button
              onClick={login}
              variant="outline"
              className="w-full border-white/20 text-white hover:bg-white/10"
            >
              <User className="w-4 h-4 mr-2" />
              Sign In
            </Button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden text-slate-600"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-lg font-semibold text-slate-800">
              {navItems.find((item) => item.path === location.pathname)?.label || 'Cloud Kitchen WMS'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <DropdownMenu onOpenChange={(open) => open && fetchNotifications()}>
              <DropdownMenuTrigger asChild>
                <button className="relative text-slate-500 hover:text-slate-700">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 min-w-4 h-4 px-1 flex items-center justify-center text-[10px] bg-red-500 text-white border-0">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-96 p-0">
                <div className="flex items-center justify-between px-4 py-3">
                  <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
                  <button
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 disabled:text-slate-300"
                    disabled={unreadCount === 0}
                    onClick={markAllNotificationsRead}
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                </div>
                <DropdownMenuSeparator className="m-0" />
                <div className="max-h-96 overflow-y-auto p-2">
                  {notificationsLoading && notifications.length === 0 ? (
                    <div className="px-3 py-8 text-center text-sm text-slate-500">
                      Loading notifications...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="px-3 py-8 text-center text-sm text-slate-500">
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <DropdownMenuItem
                        key={notification.id}
                        className="block cursor-pointer rounded-md p-3"
                        onSelect={(event) => {
                          event.preventDefault();
                          void markNotificationRead(notification);
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-1 h-2 w-2 rounded-full ${
                              notification.read_at ? 'bg-slate-300' : 'bg-blue-600'
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium text-slate-900">
                                {notification.title}
                              </p>
                              <span className="shrink-0 text-[11px] text-slate-400">
                                {formatNotificationTime(notification.created_at)}
                              </span>
                            </div>
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                              {notification.message}
                            </p>
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
      {user && <FloatingDataChat />}
    </div>
  );
}
