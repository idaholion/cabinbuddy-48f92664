import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from '@/contexts/AuthContext';
import { useWorkWeekends } from '@/hooks/useWorkWeekends';
import { useFamilyGroups } from '@/hooks/useFamilyGroups';
import { CalendarIcon, Users, AlertTriangle } from 'lucide-react';

interface WorkWeekendProposalFormProps {
  onSuccess?: () => void;
}

export const WorkWeekendProposalForm = ({ onSuccess }: WorkWeekendProposalFormProps) => {
  const { user } = useAuth();
  const { proposeWorkWeekend, loading } = useWorkWeekends();
  const { familyGroups } = useFamilyGroups();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
  });

  // Get user's family group
  const userFamilyGroup = familyGroups.find(fg => 
    fg.lead_email === user?.email || 
    fg.host_members?.some((member: any) => member.email === user?.email)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !formData.title || !formData.start_date || !formData.end_date) {
      return;
    }

    const workWeekendData = {
      ...formData,
      proposer_name: user.user_metadata?.first_name || user.email || 'Unknown',
      proposer_email: user.email || '',
      proposer_family_group: userFamilyGroup?.name,
    };

    const result = await proposeWorkWeekend(workWeekendData);
    
    if (result) {
      setFormData({
        title: '',
        description: '',
        start_date: '',
        end_date: '',
      });
      onSuccess?.();
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Propose Work Weekend
        </CardTitle>
        <div className="flex items-start gap-2 p-3 bg-info/10 border border-info/20 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-info mt-0.5 flex-shrink-0" />
          <div className="text-sm text-info-foreground">
            <p className="font-medium mb-1">How Work Weekends Work:</p>
            <ul className="space-y-1 text-xs">
              <li>• Anyone can propose work weekend dates</li>
              <li>• Supervisor must approve first</li>
              <li>• Affected family groups (with overlapping reservations) must also approve</li>
              <li>• Once fully approved, all organization members are notified</li>
            </ul>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => handleInputChange('end_date', e.target.value)}
                min={formData.start_date}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Work Weekend Title</Label>
            <Input
              id="title"
              placeholder="e.g., Spring Cabin Maintenance"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Describe the work that needs to be done..."
              rows={3}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
            />
          </div>

          {userFamilyGroup && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              Proposing as: {userFamilyGroup.name}
            </div>
          )}

          <Button 
            type="submit" 
            disabled={loading || !formData.title || !formData.start_date || !formData.end_date}
            className="w-full"
          >
            {loading ? 'Proposing...' : 'Propose Work Weekend'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};