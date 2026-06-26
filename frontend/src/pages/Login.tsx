import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { client } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Warehouse, LockKeyhole } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@local.dev');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setLoading(true);
      const response = await client.apiCall.invoke({
        url: '/api/v1/auth/local/login',
        method: 'POST',
        data: { username: email, password },
      });

      const token = response.data?.token as string | undefined;
      if (!token) {
        throw new Error('Token not returned by login endpoint');
      }

      window.localStorage.setItem('token', token);
      toast.success('Login successful');
      navigate('/dashboard', { replace: true });
      window.location.reload();
    } catch (err) {
      console.error('Login failed:', err);
      toast.error('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-xl border-slate-200">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
            <Warehouse className="w-7 h-7" />
          </div>
          <div>
            <CardTitle className="text-2xl text-slate-900">Sign In</CardTitle>
            <p className="text-sm text-slate-500 mt-2">
              Login with email and password
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  placeholder="admin@local.dev"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  placeholder="Enter password"
                />
              </div>
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            <p className="text-xs text-slate-500 text-center">
              Default local admin: <span className="font-medium">admin@local.dev / admin123</span>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
