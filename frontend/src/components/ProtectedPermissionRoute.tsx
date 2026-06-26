import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, LogIn, KeyRound } from 'lucide-react';
import { hasAnyPermission } from '@/lib/rbac';

interface ProtectedPermissionRouteProps {
  children: React.ReactNode;
  permissions: string[];
  title?: string;
}

const ProtectedPermissionRoute: React.FC<ProtectedPermissionRouteProps> = ({
  children,
  permissions,
  title = 'Insufficient Permissions',
}) => {
  const { user, loading, login } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!hasAnyPermission(user, permissions)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-lg mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <ShieldAlert className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-xl text-gray-900">{title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-gray-600">
              Your account does not have the required permission for this module.
            </p>
            <div className="bg-gray-100 rounded-lg p-3 text-left text-sm text-gray-700">
              <p><strong>User:</strong> {user.email}</p>
              <p><strong>Role:</strong> {user.role}</p>
              <p className="mt-2 flex items-start gap-2">
                <KeyRound className="h-4 w-4 mt-0.5 text-gray-500" />
                <span>Required: {permissions.join(', ')}</span>
              </p>
            </div>
            <div className="space-y-3">
              <Button onClick={login} className="w-full" variant="outline">
                <LogIn className="h-4 w-4 mr-2" />
                Switch account
              </Button>
              <Button onClick={() => window.history.back()} className="w-full" variant="ghost">
                Go back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedPermissionRoute;
