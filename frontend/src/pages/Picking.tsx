import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, PackageCheck, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { STATUS_COLORS } from '@/lib/types';

interface PickTask {
  id: number;
  task_number: string;
  order_reference: string;
  product_name: string;
  lot_number: string;
  quantity: number;
  zone: string;
  bin: string;
  priority: 'high' | 'medium' | 'low';
  status: string;
  assigned_to: string;
  due_date: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-amber-100 text-amber-800',
  low: 'bg-blue-100 text-blue-800',
};

export default function Picking() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Mock pick tasks
  const [tasks] = useState<PickTask[]>([
    {
      id: 1,
      task_number: 'PICK-001',
      order_reference: 'PO-2026-001',
      product_name: 'Chicken Breast',
      lot_number: 'LOT-2026-001',
      quantity: 30,
      zone: 'Chilled Section',
      bin: 'BIN-B01',
      priority: 'high',
      status: 'in_progress',
      assigned_to: 'Team A',
      due_date: '2026-04-15',
    },
    {
      id: 2,
      task_number: 'PICK-002',
      order_reference: 'PO-2026-002',
      product_name: 'Atlantic Salmon Fillet',
      lot_number: 'LOT-2026-003',
      quantity: 15,
      zone: 'Frozen Section A',
      bin: 'BIN-C01',
      priority: 'high',
      status: 'pending',
      assigned_to: 'Team B',
      due_date: '2026-04-16',
    },
    {
      id: 3,
      task_number: 'PICK-003',
      order_reference: 'PO-2026-003',
      product_name: 'All-Purpose Flour',
      lot_number: 'LOT-2026-008',
      quantity: 50,
      zone: 'Dry Goods Main',
      bin: 'BIN-E01',
      priority: 'medium',
      status: 'completed',
      assigned_to: 'Team A',
      due_date: '2026-04-14',
    },
    {
      id: 4,
      task_number: 'PICK-004',
      order_reference: 'ORD-2026-010',
      product_name: 'Fresh Mozzarella',
      lot_number: 'LOT-2026-006',
      quantity: 10,
      zone: 'Chilled Section',
      bin: 'BIN-B01',
      priority: 'high',
      status: 'pending',
      assigned_to: 'Team C',
      due_date: '2026-04-15',
    },
    {
      id: 5,
      task_number: 'PICK-005',
      order_reference: 'ORD-2026-011',
      product_name: 'Basmati Rice',
      lot_number: 'LOT-2026-004',
      quantity: 25,
      zone: 'Ambient Storage',
      bin: 'BIN-A01',
      priority: 'low',
      status: 'pending',
      assigned_to: 'Team B',
      due_date: '2026-04-17',
    },
  ]);

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      !search ||
      t.task_number.toLowerCase().includes(search.toLowerCase()) ||
      t.product_name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const pendingCount = tasks.filter((t) => t.status === 'pending').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-amber-500">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-amber-500" />
            <div>
              <p className="text-sm text-slate-500">Pending</p>
              <p className="text-2xl font-bold text-slate-800">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-blue-500">
          <CardContent className="p-4 flex items-center gap-3">
            <PackageCheck className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-sm text-slate-500">In Progress</p>
              <p className="text-2xl font-bold text-slate-800">{inProgressCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-emerald-500">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            <div>
              <p className="text-sm text-slate-500">Completed</p>
              <p className="text-2xl font-bold text-slate-800">{completedCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Pick Tasks</h3>
          <p className="text-sm text-slate-500">FEFO-based picking with priority management</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search task or product..."
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
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tasks Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Task #</th>
                  <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Product</th>
                  <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Lot</th>
                  <th className="text-right py-2.5 px-4 text-slate-500 font-medium">Qty</th>
                  <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Location</th>
                  <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Priority</th>
                  <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Status</th>
                  <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Assigned</th>
                  <th className="text-left py-2.5 px-4 text-slate-500 font-medium">Due</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task, idx) => (
                  <tr
                    key={task.id}
                    className={`border-b border-slate-100 hover:bg-slate-50 ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                    }`}
                  >
                    <td className="py-2.5 px-4 font-mono text-xs font-medium text-blue-600">
                      {task.task_number}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-800">{task.product_name}</td>
                    <td className="py-2.5 px-4 font-mono text-xs text-slate-600">{task.lot_number}</td>
                    <td className="py-2.5 px-4 text-right font-medium">{task.quantity}</td>
                    <td className="py-2.5 px-4 text-slate-500 text-xs">
                      {task.zone} / {task.bin}
                    </td>
                    <td className="py-2.5 px-4">
                      <Badge className={`text-xs ${PRIORITY_COLORS[task.priority]}`}>
                        {task.priority === 'high' && <AlertCircle className="w-3 h-3 mr-1" />}
                        {task.priority}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-4">
                      <Badge className={`text-xs ${STATUS_COLORS[task.status] || 'bg-gray-100 text-gray-800'}`}>
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-4 text-slate-500">{task.assigned_to}</td>
                    <td className="py-2.5 px-4 text-slate-500">
                      {new Date(task.due_date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {filteredTasks.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-slate-400">
                      No pick tasks found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}