import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Beaker, Loader2, Info, Calendar, DollarSign, Users, Home } from 'lucide-react';
import { 
  type AllocationModel,
  getDefaultRulesForType,
  getAllocationModelDescription,
  getAllocationModelDisplayName,
  sampleOrganizationContacts,
  sampleFamilyGroups,
  sampleReceipts,
  sampleReservationSettings,
  generateSampleReservations,
  generateSamplePayments,
} from '@/lib/organization-utils';

interface CreateTestOrganizationDialogProps {
  onOrganizationCreated: () => void;
}

export const CreateTestOrganizationDialog = ({ onOrganizationCreated }: CreateTestOrganizationDialogProps) => {
  const [open, setOpen] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [allocationModel, setAllocationModel] = useState<AllocationModel>('rotating_selection');
  const [includeFinancialData, setIncludeFinancialData] = useState(true);
  const [includeReservations, setIncludeReservations] = useState(true);
  const [includeFamilyGroups, setIncludeFamilyGroups] = useState(true);
  const { toast } = useToast();

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

  const createCompleteTestOrganization = async () => {
    if (!orgName.trim()) {
      toast({
        title: "Error",
        description: "Please enter an organization name.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // 1. Create the organization with test flags and allocation model
      const orgData = {
        name: orgName.trim(),
        code: generateOrgCode(),
        is_test_organization: true,
        financial_test_mode: includeFinancialData,
        allocation_model: allocationModel,
        ...sampleOrganizationContacts
      };

      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert(orgData)
        .select()
        .single();

      if (orgError) throw orgError;

      // 2. Create family groups if selected
      if (includeFamilyGroups) {
        const familyGroupsWithOrgId = sampleFamilyGroups.map(group => ({
          ...group,
          organization_id: newOrg.id
        }));

        const { error: familyGroupsError } = await supabase
          .from('family_groups')
          .insert(familyGroupsWithOrgId);

        if (familyGroupsError) throw familyGroupsError;
      }

      // 3. Create reservation settings
      const reservationData = {
        ...sampleReservationSettings,
        organization_id: newOrg.id
      };

      const { error: reservationError } = await supabase
        .from('reservation_settings')
        .insert(reservationData);

      if (reservationError) throw reservationError;

      // 4. Create sample reservations if selected
      if (includeReservations && includeFamilyGroups) {
        const familyGroupNames = sampleFamilyGroups.map(fg => fg.name);
        const reservations = generateSampleReservations(familyGroupNames);
        
        const reservationsWithOrgId = reservations.map(res => ({
          ...res,
          organization_id: newOrg.id
        }));

        const { error: reservationsError } = await supabase
          .from('reservations')
          .insert(reservationsWithOrgId);

        if (reservationsError) {
          console.warn('Failed to create sample reservations:', reservationsError);
          // Don't throw - reservations are optional
        }
      }

      // 5. Create financial data if selected
      if (includeFinancialData) {
        // Create sample receipts
        const receiptsWithOrgId = sampleReceipts.map(receipt => ({
          ...receipt,
          organization_id: newOrg.id
        }));

        const { error: receiptsError } = await supabase
          .from('receipts')
          .insert(receiptsWithOrgId);

        if (receiptsError) {
          console.warn('Failed to create sample receipts:', receiptsError);
        }

        // Create sample payments if we have reservations
        if (includeReservations && includeFamilyGroups) {
          const familyGroupNames = sampleFamilyGroups.map(fg => fg.name);
          const reservations = generateSampleReservations(familyGroupNames);
          const payments = generateSamplePayments(familyGroupNames, reservations);

          const paymentsWithOrgId = payments.map(payment => ({
            ...payment,
            organization_id: newOrg.id
          }));

          const { error: paymentsError } = await supabase
            .from('payments')
            .insert(paymentsWithOrgId);

          if (paymentsError) {
            console.warn('Failed to create sample payments:', paymentsError);
          }
        }
      }

      // Build summary message
      const createdItems = ['organization contacts', 'property settings'];
      if (includeFamilyGroups) createdItems.push('4 family groups');
      if (includeReservations) createdItems.push('sample reservations');
      if (includeFinancialData) createdItems.push('financial data (receipts, payments)');

      toast({
        title: "Test Organization Created",
        description: `"${orgName}" created with: ${createdItems.join(', ')}.`,
      });

      setOpen(false);
      setOrgName('');
      setAllocationModel('rotating_selection');
      setIncludeFinancialData(true);
      setIncludeReservations(true);
      setIncludeFamilyGroups(true);
      onOrganizationCreated();
    } catch (error) {
      console.error('Error creating test organization:', error);
      toast({
        title: "Error",
        description: "Failed to create test organization. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate what will be created
  const getCreationSummary = () => {
    const items: { icon: React.ReactNode; label: string }[] = [
      { icon: <Home className="h-4 w-4" />, label: 'Property settings & contacts' },
    ];
    
    if (includeFamilyGroups) {
      items.push({ icon: <Users className="h-4 w-4" />, label: '4 family groups with members' });
    }
    if (includeReservations && includeFamilyGroups) {
      items.push({ icon: <Calendar className="h-4 w-4" />, label: '8 sample reservations' });
    }
    if (includeFinancialData) {
      items.push({ icon: <DollarSign className="h-4 w-4" />, label: 'Receipts & payment records' });
    }
    
    return items;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 hover:scale-105 hover:shadow-md hover:border-primary/50 transition-all duration-200">
          <Beaker className="h-4 w-4" />
          Create Test Organization
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Beaker className="h-5 w-5 text-amber-500" />
            Create Test Organization
          </DialogTitle>
          <DialogDescription>
            Create a test organization with sample data. Test organizations are clearly marked and isolated from production data.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-5">
          {/* Organization Name */}
          <div className="space-y-2">
            <Label htmlFor="orgName" className="text-base font-medium">Organization Name</Label>
            <Input
              id="orgName"
              placeholder="e.g., Test Cabin, Demo Property"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="text-base"
            />
          </div>

          {/* Allocation Model Selection */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Allocation Model</Label>
            <Select value={allocationModel} onValueChange={(v) => setAllocationModel(v as AllocationModel)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rotating_selection">
                  {getAllocationModelDisplayName('rotating_selection')}
                </SelectItem>
                <SelectItem value="static_weeks">
                  {getAllocationModelDisplayName('static_weeks')}
                </SelectItem>
                <SelectItem value="first_come_first_serve">
                  {getAllocationModelDisplayName('first_come_first_serve')}
                </SelectItem>
                <SelectItem value="lottery">
                  {getAllocationModelDisplayName('lottery')}
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground flex items-start gap-1.5">
              <Info className="h-4 w-4 mt-0.5 shrink-0" />
              {getAllocationModelDescription(allocationModel)}
            </p>
          </div>

          {/* Data Options */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Include Sample Data</Label>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeFamilyGroups"
                  checked={includeFamilyGroups}
                  onCheckedChange={(checked) => setIncludeFamilyGroups(checked === true)}
                />
                <label htmlFor="includeFamilyGroups" className="text-sm cursor-pointer">
                  Family groups (4 groups with members)
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeReservations"
                  checked={includeReservations}
                  disabled={!includeFamilyGroups}
                  onCheckedChange={(checked) => setIncludeReservations(checked === true)}
                />
                <label 
                  htmlFor="includeReservations" 
                  className={`text-sm cursor-pointer ${!includeFamilyGroups ? 'text-muted-foreground' : ''}`}
                >
                  Sample reservations (requires family groups)
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeFinancialData"
                  checked={includeFinancialData}
                  onCheckedChange={(checked) => setIncludeFinancialData(checked === true)}
                />
                <label htmlFor="includeFinancialData" className="text-sm cursor-pointer">
                  Financial test data (receipts, payments)
                </label>
              </div>
            </div>
          </div>

          {/* Creation Summary */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <p className="text-sm font-medium">Will create:</p>
            <ul className="space-y-1.5">
              {getCreationSummary().map((item, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                  {item.icon}
                  {item.label}
                </li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button 
              variant="outline" 
              onClick={() => setOpen(false)} 
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              onClick={createCompleteTestOrganization} 
              disabled={loading || !orgName.trim()}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Beaker className="h-4 w-4" />
                  Create Test Organization
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
