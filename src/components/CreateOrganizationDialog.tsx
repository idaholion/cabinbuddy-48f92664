import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useSetupState } from '@/hooks/useSetupState';
import { supabase } from '@/integrations/supabase/client';
import { Plus } from 'lucide-react';
import { unformatPhoneNumber } from '@/lib/phone-utils';
import { useAuth } from '@/contexts/AuthContext';

interface CreateOrganizationResult {
  success: boolean;
  organization_id?: string;
  organization_name?: string;
  organization_code?: string;
  message?: string;
  error?: string;
  error_code?: string;
}

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
  const { user } = useAuth();
  const { clearSetupState } = useSetupState();
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Use external open state if provided, otherwise use internal
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;
  const [loading, setLoading] = useState(false);
  
  // Reset form data when dialog opens
  const resetForm = () => ({
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
  
  const [formData, setFormData] = useState(resetForm);
  
  // Reset form when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setFormData(resetForm());
    }
    setOpen(newOpen);
  };

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

    if (!user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to create an organization.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      console.log('🚀 [CREATE_ORG] Starting atomic organization creation...');
      console.log('👤 [CREATE_ORG] User authenticated:', { userId: user.id, email: user.email });
      
      // Use the atomic database function to create both organization and user link
      const { data, error } = await supabase.rpc('create_organization_with_user_link', {
        p_name: formData.name,
        p_code: formData.code.toUpperCase(),
        p_admin_name: formData.admin_name || null,
        p_admin_email: formData.admin_email || null,
        p_admin_phone: formData.admin_phone ? unformatPhoneNumber(formData.admin_phone) : null,
        p_treasurer_name: formData.treasurer_name || null,
        p_treasurer_email: formData.treasurer_email || null,
        p_treasurer_phone: formData.treasurer_phone ? unformatPhoneNumber(formData.treasurer_phone) : null,
        p_calendar_keeper_name: formData.calendar_keeper_name || null,
        p_calendar_keeper_email: formData.calendar_keeper_email || null,
        p_calendar_keeper_phone: formData.calendar_keeper_phone ? unformatPhoneNumber(formData.calendar_keeper_phone) : null,
      });

      if (error) {
        console.error('❌ [CREATE_ORG] Database function RPC error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      console.log('📊 [CREATE_ORG] Function result:', data);

      // Cast the response to our expected type
      const result = data as unknown as CreateOrganizationResult;

      if (!result || !result.success) {
        const errorMessage = result?.error || 'Unknown error occurred';
        console.error('❌ [CREATE_ORG] Function returned error:', errorMessage);
        throw new Error(errorMessage);
      }

      console.log('✅ [CREATE_ORG] Organization created atomically:', {
        id: result.organization_id,
        name: result.organization_name,
        code: result.organization_code
      });

      toast({
        title: "Success", 
        description: result.message || `Organization "${formData.name}" created successfully!`,
      });

      // Clear setup state since organization creation is complete
      clearSetupState();

      // Reset form and close dialog
      handleOpenChange(false);
      onOrganizationCreated?.();

    } catch (error) {
      console.error('💥 [CREATE_ORG] Fatal error:', error);
      
      // Extract user-friendly error message
      let errorMessage = "Failed to create organization";
      if (error instanceof Error) {
        if (error.message.includes('duplicate') || error.message.includes('already exists')) {
          errorMessage = "An organization with this code already exists. Please choose a different code.";
        } else if (error.message.includes('authentication') || error.message.includes('not authenticated')) {
          errorMessage = "You must be logged in to create an organization.";
        } else if (error.message.includes('required')) {
          errorMessage = error.message;
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button className="hover:scale-105 hover:shadow-lg hover:shadow-primary/20 transition-all duration-200">
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
              <Label htmlFor="name" className="text-base">Organization Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter organization name"
                required
                className="text-base placeholder:text-base"
              />
            </div>
            
            <div className="col-span-2">
              <Label htmlFor="code" className="text-base">Organization Code *</Label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  placeholder="Enter 6-letter code"
                  maxLength={6}
                  required
                  className="text-base placeholder:text-base"
                />
                <Button type="button" variant="outline" onClick={handleGenerateCode} className="hover:scale-105 hover:shadow-md hover:border-primary/50 transition-all duration-200">
                  Generate
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Administrator</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="admin_name" className="text-base">Name</Label>
                <Input
                  id="admin_name"
                  value={formData.admin_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, admin_name: e.target.value }))}
                  placeholder="Administrator name"
                  className="text-base placeholder:text-base"
                />
              </div>
              <div>
                <Label htmlFor="admin_email" className="text-base">Email</Label>
                <Input
                  id="admin_email"
                  type="email"
                  value={formData.admin_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, admin_email: e.target.value }))}
                  placeholder="admin@example.com"
                  className="text-base placeholder:text-base"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="admin_phone" className="text-base">Phone</Label>
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
                <Label htmlFor="treasurer_name" className="text-base">Name</Label>
                <Input
                  id="treasurer_name"
                  value={formData.treasurer_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, treasurer_name: e.target.value }))}
                  placeholder="Treasurer name"
                  className="text-base placeholder:text-base"
                />
              </div>
              <div>
                <Label htmlFor="treasurer_email" className="text-base">Email</Label>
                <Input
                  id="treasurer_email"
                  type="email"
                  value={formData.treasurer_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, treasurer_email: e.target.value }))}
                  placeholder="treasurer@example.com"
                  className="text-base placeholder:text-base"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="treasurer_phone" className="text-base">Phone</Label>
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
                <Label htmlFor="calendar_keeper_name" className="text-base">Name</Label>
                <Input
                  id="calendar_keeper_name"
                  value={formData.calendar_keeper_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, calendar_keeper_name: e.target.value }))}
                  placeholder="Calendar keeper name"
                  className="text-base placeholder:text-base"
                />
              </div>
              <div>
                <Label htmlFor="calendar_keeper_email" className="text-base">Email</Label>
                <Input
                  id="calendar_keeper_email"
                  type="email"
                  value={formData.calendar_keeper_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, calendar_keeper_email: e.target.value }))}
                  placeholder="calendar@example.com"
                  className="text-base placeholder:text-base"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="calendar_keeper_phone" className="text-base">Phone</Label>
                <PhoneInput
                  id="calendar_keeper_phone"
                  value={formData.calendar_keeper_phone}
                  onChange={(formatted) => setFormData(prev => ({ ...prev, calendar_keeper_phone: formatted }))}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} className="hover:scale-105 hover:shadow-md hover:border-muted transition-all duration-200">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="hover:scale-105 hover:shadow-lg hover:shadow-primary/20 transition-all duration-200 disabled:hover:scale-100 disabled:hover:shadow-none">
              {loading ? "Creating..." : "Create Organization"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};