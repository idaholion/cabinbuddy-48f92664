import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Trash2, Edit2 } from 'lucide-react';
import { useBillingCycles, type BillingCycleType, type BillingCycleStatus } from '@/hooks/useBillingCycles';
import { format } from 'date-fns';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export const BillingCyclesManager = () => {
  const { cycles, loading, createCycle, updateCycle, deleteCycle } = useBillingCycles();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    cycle_name: '',
    cycle_type: 'monthly' as BillingCycleType,
    start_date: '',
    end_date: '',
    payment_deadline: '',
    status: 'draft' as BillingCycleStatus,
    auto_send_invoices: false,
  });

  const handleCreate = async () => {
    await createCycle(formData);
    setIsCreateOpen(false);
    setFormData({
      cycle_name: '',
      cycle_type: 'monthly' as BillingCycleType,
      start_date: '',
      end_date: '',
      payment_deadline: '',
      status: 'draft' as BillingCycleStatus,
      auto_send_invoices: false,
    });
  };

  const getStatusColor = (status: BillingCycleStatus) => {
    switch (status) {
      case 'active': return 'default';
      case 'completed': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Billing Cycles
            </CardTitle>
            <CardDescription>Create and manage billing periods</CardDescription>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Cycle
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Billing Cycle</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="cycle_name">Cycle Name</Label>
                  <Input
                    id="cycle_name"
                    value={formData.cycle_name}
                    onChange={(e) => setFormData({ ...formData, cycle_name: e.target.value })}
                    placeholder="e.g., Q4 2024"
                  />
                </div>
                <div>
                  <Label htmlFor="cycle_type">Cycle Type</Label>
                  <Select
                    value={formData.cycle_type}
                    onValueChange={(value) => setFormData({ ...formData, cycle_type: value as BillingCycleType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="end_of_season">End of Season</SelectItem>
                      <SelectItem value="end_of_year">End of Year</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_date">End Date</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="payment_deadline">Payment Deadline</Label>
                    <Input
                      id="payment_deadline"
                      type="date"
                      value={formData.payment_deadline}
                      onChange={(e) => setFormData({ ...formData, payment_deadline: e.target.value })}
                    />
                  </div>
                </div>
                <Button onClick={handleCreate} className="w-full">
                  Create Billing Cycle
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {cycles.map((cycle) => (
            <div key={cycle.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium">{cycle.cycle_name}</div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(cycle.start_date), 'MMM d, yyyy')} - {format(new Date(cycle.end_date), 'MMM d, yyyy')}
                </div>
                <div className="text-xs text-muted-foreground">
                  Payment due: {format(new Date(cycle.payment_deadline), 'MMM d, yyyy')}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={getStatusColor(cycle.status)}>{cycle.status}</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateCycle(cycle.id, { status: cycle.status === 'draft' ? 'active' : 'completed' })}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteCycle(cycle.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {cycles.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No billing cycles yet. Create your first one to get started.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
