import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus } from 'lucide-react';
import { unformatPhoneNumber } from '@/lib/phone-utils';

interface CreateOrganizationDialogProps {
  onOrganizationCreated?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export const CreateOrganizationDialog = ({ 
  onOrganizationCreated, 
  open: externalOpen, 
  onOpenChange: externalOnOpenChange, 
  trigger 
}: CreateOrganizationDialogProps) => {
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Use external open state if provided, otherwise use internal
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    admin_name: '',
    admin_email: '',
    admin_phone: '',
    treasurer_name: '',
    treasurer_email: '',
    treasurer_phone: '',
    calendar_keeper_name: '',
    calendar_keeper_email: '',
    calendar_keeper_phone: '',
  });

  const generateOrgCode = () => {
    const words = [
      'CASTLE', 'BRIDGE', 'GARDEN', 'LAUNCH', 'MARKET', 'NATURE',
      'BRIGHT', 'FRIEND', 'TRAVEL', 'WONDER', 'PLANET', 'SMOOTH',
      'SILVER', 'GOLDEN', 'SIMPLE', 'STRONG', 'GENTLE', 'GLOBAL',
      'MASTER', 'WISDOM', 'BREATH', 'HEALTH', 'SUNSET', 'FUTURE',
      'SPIRIT', 'ENERGY', 'STABLE', 'FAMOUS', 'LEGACY', 'SAFETY'
    ];
    return words[Math.floor(Math.random() * words.length)];
  };

  const handleGenerateCode = () => {
    setFormData(prev => ({ ...prev, code: generateOrgCode() }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.code.trim()) {
      toast({
        title: "Missing required fields",
        description: "Please provide organization name and code.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('organizations')
        .insert({
          name: formData.name,
          code: formData.code.toUpperCase(),
          admin_name: formData.admin_name || null,
          admin_email: formData.admin_email || null,
          admin_phone: formData.admin_phone ? unformatPhoneNumber(formData.admin_phone) : null,
          treasurer_name: formData.treasurer_name || null,
          treasurer_email: formData.treasurer_email || null,
          treasurer_phone: formData.treasurer_phone ? unformatPhoneNumber(formData.treasurer_phone) : null,
          calendar_keeper_name: formData.calendar_keeper_name || null,
          calendar_keeper_email: formData.calendar_keeper_email || null,
          calendar_keeper_phone: formData.calendar_keeper_phone ? unformatPhoneNumber(formData.calendar_keeper_phone) : null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating organization:', error);
        toast({
          title: "Error",
          description: "Failed to create organization. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: `Organization "${formData.name}" created successfully!`,
      });

      setOpen(false);
      setFormData({
        name: '',
        code: '',
        admin_name: '',
        admin_email: '',
        admin_phone: '',
        treasurer_name: '',
        treasurer_email: '',
        treasurer_phone: '',
        calendar_keeper_name: '',
        calendar_keeper_email: '',
        calendar_keeper_phone: '',
      });
      onOrganizationCreated?.();
    } catch (error) {
      console.error('Error creating organization:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Test Organization
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Organization</DialogTitle>
          <DialogDescription>
            Create a test organization for development and testing purposes.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Organization Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter organization name"
                required
              />
            </div>
            
            <div className="col-span-2">
              <Label htmlFor="code">Organization Code *</Label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  placeholder="Enter 6-letter code"
                  maxLength={6}
                  required
                />
                <Button type="button" variant="outline" onClick={handleGenerateCode}>
                  Generate
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Administrator</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="admin_name">Name</Label>
                <Input
                  id="admin_name"
                  value={formData.admin_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, admin_name: e.target.value }))}
                  placeholder="Administrator name"
                />
              </div>
              <div>
                <Label htmlFor="admin_email">Email</Label>
                <Input
                  id="admin_email"
                  type="email"
                  value={formData.admin_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, admin_email: e.target.value }))}
                  placeholder="admin@example.com"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="admin_phone">Phone</Label>
                <PhoneInput
                  id="admin_phone"
                  value={formData.admin_phone}
                  onChange={(formatted) => setFormData(prev => ({ ...prev, admin_phone: formatted }))}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Treasurer</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="treasurer_name">Name</Label>
                <Input
                  id="treasurer_name"
                  value={formData.treasurer_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, treasurer_name: e.target.value }))}
                  placeholder="Treasurer name"
                />
              </div>
              <div>
                <Label htmlFor="treasurer_email">Email</Label>
                <Input
                  id="treasurer_email"
                  type="email"
                  value={formData.treasurer_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, treasurer_email: e.target.value }))}
                  placeholder="treasurer@example.com"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="treasurer_phone">Phone</Label>
                <PhoneInput
                  id="treasurer_phone"
                  value={formData.treasurer_phone}
                  onChange={(formatted) => setFormData(prev => ({ ...prev, treasurer_phone: formatted }))}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Calendar Keeper</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="calendar_keeper_name">Name</Label>
                <Input
                  id="calendar_keeper_name"
                  value={formData.calendar_keeper_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, calendar_keeper_name: e.target.value }))}
                  placeholder="Calendar keeper name"
                />
              </div>
              <div>
                <Label htmlFor="calendar_keeper_email">Email</Label>
                <Input
                  id="calendar_keeper_email"
                  type="email"
                  value={formData.calendar_keeper_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, calendar_keeper_email: e.target.value }))}
                  placeholder="calendar@example.com"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="calendar_keeper_phone">Phone</Label>
                <PhoneInput
                  id="calendar_keeper_phone"
                  value={formData.calendar_keeper_phone}
                  onChange={(formatted) => setFormData(prev => ({ ...prev, calendar_keeper_phone: formatted }))}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Organization"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};