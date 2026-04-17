import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { client } from '@/lib/api';
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  ChefHat,
  PackageCheck,
  Database,
  FlaskConical,
  Menu,
  X,
  LogOut,
  User,
  Bell,
  Warehouse,
  Building2,
  ArrowLeftRight,
  FileBarChart,
  Sparkles,
  Factory,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/branches', label: 'Branches', icon: Building2 },
  { path: '/inventory', label: 'Inventory', icon: Package },
  { path: '/receiving', label: 'Receiving', icon: ClipboardList },
  { path: '/transfers', label: 'Transfers', icon: ArrowLeftRight },
  { path: '/bom-recipes', label: 'BOM / Recipes', icon: FlaskConical },
  { path: '/manufacturing', label: 'Manufacturing', icon: Factory },
  { path: '/production', label: 'Production', icon: ChefHat },
  { path: '/picking', label: 'Picking', icon: PackageCheck },
  { path: '/ai-analytics', label: 'AI Analytics', icon: Sparkles },
  { path: '/reports', label: 'Reports', icon: FileBarChart },
  { path: '/master-data', label: 'Master Data', icon: Database },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await client.auth.me();
        if (res?.data) {
          setUser(res.data);
        }
      } catch {
        // Not logged in
      }
    };
    checkAuth();
  }, []);

  const handleLogin = async () => {
    await client.auth.toLogin();
  };

  const handleLogout = async () => {
    await client.auth.logout();
    setUser(null);
    window.location.href = '/';
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
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#0F172A] text-white transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
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

        <nav className="mt-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User section at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
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
              onClick={handleLogin}
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
            <button className="relative text-slate-500 hover:text-slate-700">
              <Bell className="w-5 h-5" />
              <Badge className="absolute -top-1 -right-1 w-4 h-4 p-0 flex items-center justify-center text-[10px] bg-red-500 text-white border-0">
                3
              </Badge>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}