import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedPermissionRoute from './components/ProtectedPermissionRoute';
import Dashboard from './pages/Dashboard';
import Branches from './pages/Branches';
import Inventory from './pages/Inventory';
import RFIDTracking from './pages/RFIDTracking';
import Receiving from './pages/Receiving';
import Transfers from './pages/Transfers';
import Production from './pages/Production';
import Picking from './pages/Picking';
import MasterDataEntity from './pages/MasterDataEntity';
import ProductDetailPage from './pages/ProductDetailPage';
import SuppliersMasterData from './pages/SuppliersMasterData';
import BomRecipes from './pages/BomRecipes';
import Reports from './pages/Reports';
import AIAnalytics from './pages/AIAnalytics';
import Manufacturing from './pages/Manufacturing';
import AuthCallback from './pages/AuthCallback';
import AuthError from './pages/AuthError';
import Login from './pages/Login';
import CycleCounts from './pages/CycleCounts';
import Assets from './pages/Assets';
import OperationMonitor from './pages/OperationMonitor';
import Diagnostic from './pages/Diagnostic';
import Visualization from './pages/Visualization';
import Kitting from './pages/Kitting';
import Loading from './pages/Loading';
import PackingSorting from './pages/PackingSorting';
import UserManagement from './pages/UserManagement';

const queryClient = new QueryClient();

const withPermission = (permission: string, element: JSX.Element) => (
  <ProtectedPermissionRoute permissions={[permission]}>
    {element}
  </ProtectedPermissionRoute>
);

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route path="/login" element={<Login />} />
    <Route
      path="/dashboard"
      element={
        withPermission(
          'dashboard.view',
          <Layout>
            <Dashboard />
          </Layout>
        )
      }
    />
    <Route
      path="/branches"
      element={
        withPermission(
          'dashboard.view',
          <Layout>
            <Branches />
          </Layout>
        )
      }
    />
    <Route
      path="/inventory"
      element={
        withPermission(
          'inventory.view',
          <Layout>
            <Inventory />
          </Layout>
        )
      }
    />
    <Route
      path="/rfid-tracking"
      element={
        withPermission(
          'inventory.view',
          <Layout>
            <RFIDTracking />
          </Layout>
        )
      }
    />
    <Route
      path="/cycle-counts"
      element={
        withPermission(
          'inventory.manage',
          <Layout>
            <CycleCounts />
          </Layout>
        )
      }
    />
    <Route
      path="/receiving"
      element={
        withPermission(
          'operations.execute',
          <Layout>
            <Receiving />
          </Layout>
        )
      }
    />
    <Route
      path="/transfers"
      element={
        withPermission(
          'operations.execute',
          <Layout>
            <Transfers />
          </Layout>
        )
      }
    />
    <Route
      path="/loading"
      element={
        withPermission(
          'operations.execute',
          <Layout>
            <Loading />
          </Layout>
        )
      }
    />
    <Route
      path="/assets"
      element={
        withPermission(
          'operations.execute',
          <Layout>
            <Assets />
          </Layout>
        )
      }
    />
    <Route
      path="/manufacturing"
      element={
        withPermission(
          'production.manage',
          <Layout>
            <Manufacturing />
          </Layout>
        )
      }
    />
    <Route
      path="/production"
      element={
        withPermission(
          'production.manage',
          <Layout>
            <Production />
          </Layout>
        )
      }
    />
    <Route
      path="/picking"
      element={
        withPermission(
          'operations.execute',
          <Layout>
            <Picking />
          </Layout>
        )
      }
    />
    <Route
      path="/packing-sorting"
      element={
        withPermission(
          'operations.execute',
          <Layout>
            <PackingSorting />
          </Layout>
        )
      }
    />
    <Route
      path="/bom-recipes"
      element={
        withPermission(
          'production.manage',
          <Layout>
            <BomRecipes />
          </Layout>
        )
      }
    />
    <Route
      path="/operation-monitor"
      element={
        withPermission(
          'operations.view',
          <Layout>
            <OperationMonitor />
          </Layout>
        )
      }
    />
    <Route
      path="/diagnostic"
      element={
        withPermission(
          'operations.view',
          <Layout>
            <Diagnostic />
          </Layout>
        )
      }
    />
    <Route
      path="/visualization"
      element={
        withPermission(
          'operations.view',
          <Layout>
            <Visualization />
          </Layout>
        )
      }
    />
    <Route
      path="/kitting"
      element={
        withPermission(
          'operations.execute',
          <Layout>
            <Kitting />
          </Layout>
        )
      }
    />
    <Route
      path="/reports"
      element={
        withPermission(
          'reports.view',
          <Layout>
            <Reports />
          </Layout>
        )
      }
    />
    <Route
      path="/ai-analytics"
      element={
        withPermission(
          'analytics.view',
          <Layout>
            <AIAnalytics />
          </Layout>
        )
      }
    />
    <Route
      path="/master-data"
      element={<Navigate to="/master-data/units" replace />}
    />
    <Route
      path="/master-data/products"
      element={
        withPermission(
          'settings.manage',
          <Layout>
            <MasterDataEntity entityKey="products" />
          </Layout>
        )
      }
    />
    <Route
      path="/master-data/product-categories"
      element={
        withPermission(
          'settings.manage',
          <Layout>
            <MasterDataEntity entityKey="productCategories" />
          </Layout>
        )
      }
    />
    <Route
      path="/master-data/product-sub-categories"
      element={
        withPermission(
          'settings.manage',
          <Layout>
            <MasterDataEntity entityKey="productSubCategories" />
          </Layout>
        )
      }
    />
    <Route
      path="/master-data/brands"
      element={
        withPermission(
          'settings.manage',
          <Layout>
            <MasterDataEntity entityKey="brands" />
          </Layout>
        )
      }
    />
    <Route
      path="/master-data/manufacturers"
      element={
        withPermission(
          'settings.manage',
          <Layout>
            <MasterDataEntity entityKey="manufacturers" />
          </Layout>
        )
      }
    />
    <Route
      path="/master-data/product-types"
      element={
        withPermission(
          'settings.manage',
          <Layout>
            <MasterDataEntity entityKey="productTypes" />
          </Layout>
        )
      }
    />
    <Route
      path="/master-data/item-groups"
      element={
        withPermission(
          'settings.manage',
          <Layout>
            <MasterDataEntity entityKey="itemGroups" />
          </Layout>
        )
      }
    />
    <Route
      path="/master-data/products/new"
      element={
        withPermission(
          'settings.manage',
          <Layout>
            <ProductDetailPage />
          </Layout>
        )
      }
    />
    <Route
      path="/master-data/products/:id"
      element={
        withPermission(
          'settings.manage',
          <Layout>
            <ProductDetailPage />
          </Layout>
        )
      }
    />
    <Route
      path="/master-data/products/:id/edit"
      element={
        withPermission(
          'settings.manage',
          <Layout>
            <ProductDetailPage />
          </Layout>
        )
      }
    />
    <Route
      path="/master-data/suppliers"
      element={
        withPermission(
          'settings.manage',
          <Layout>
            <SuppliersMasterData />
          </Layout>
        )
      }
    />
    <Route
      path="/master-data/warehouses"
      element={
        withPermission(
          'settings.manage',
          <Layout>
            <MasterDataEntity entityKey="warehouses" />
          </Layout>
        )
      }
    />
    <Route
      path="/master-data/zones"
      element={
        withPermission(
          'settings.manage',
          <Layout>
            <MasterDataEntity entityKey="zones" />
          </Layout>
        )
      }
    />
    <Route
      path="/master-data/bins"
      element={
        withPermission(
          'settings.manage',
          <Layout>
            <MasterDataEntity entityKey="bins" />
          </Layout>
        )
      }
    />
    <Route
      path="/master-data/units"
      element={
        withPermission(
          'settings.manage',
          <Layout>
            <MasterDataEntity entityKey="units" />
          </Layout>
        )
      }
    />
    <Route
      path="/master-data/payment-types"
      element={
        withPermission(
          'settings.manage',
          <Layout>
            <MasterDataEntity entityKey="paymentTypes" />
          </Layout>
        )
      }
    />
    <Route
      path="/user-management"
      element={
        <ProtectedPermissionRoute permissions={['users.manage']}>
          <Layout>
            <UserManagement />
          </Layout>
        </ProtectedPermissionRoute>
      }
    />
    <Route path="/auth/callback" element={<AuthCallback />} />
    <Route path="/auth/error" element={<AuthError />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
export { AppRoutes };
