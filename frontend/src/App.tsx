import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Branches from './pages/Branches';
import Inventory from './pages/Inventory';
import Receiving from './pages/Receiving';
import Transfers from './pages/Transfers';
import Production from './pages/Production';
import Picking from './pages/Picking';
import MasterData from './pages/MasterData';
import BomRecipes from './pages/BomRecipes';
import Reports from './pages/Reports';
import AIAnalytics from './pages/AIAnalytics';
import Manufacturing from './pages/Manufacturing';
import AuthCallback from './pages/AuthCallback';
import AuthError from './pages/AuthError';

const queryClient = new QueryClient();

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route
      path="/dashboard"
      element={
        <Layout>
          <Dashboard />
        </Layout>
      }
    />
    <Route
      path="/branches"
      element={
        <Layout>
          <Branches />
        </Layout>
      }
    />
    <Route
      path="/inventory"
      element={
        <Layout>
          <Inventory />
        </Layout>
      }
    />
    <Route
      path="/receiving"
      element={
        <Layout>
          <Receiving />
        </Layout>
      }
    />
    <Route
      path="/transfers"
      element={
        <Layout>
          <Transfers />
        </Layout>
      }
    />
    <Route
      path="/manufacturing"
      element={
        <Layout>
          <Manufacturing />
        </Layout>
      }
    />
    <Route
      path="/production"
      element={
        <Layout>
          <Production />
        </Layout>
      }
    />
    <Route
      path="/picking"
      element={
        <Layout>
          <Picking />
        </Layout>
      }
    />
    <Route
      path="/bom-recipes"
      element={
        <Layout>
          <BomRecipes />
        </Layout>
      }
    />
    <Route
      path="/reports"
      element={
        <Layout>
          <Reports />
        </Layout>
      }
    />
    <Route
      path="/ai-analytics"
      element={
        <Layout>
          <AIAnalytics />
        </Layout>
      }
    />
    <Route
      path="/master-data"
      element={
        <Layout>
          <MasterData />
        </Layout>
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