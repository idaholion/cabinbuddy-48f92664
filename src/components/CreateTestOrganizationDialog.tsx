import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Beaker, Loader2 } from 'lucide-react';

interface CreateTestOrganizationDialogProps {
  onOrganizationCreated: () => void;
}

const sampleOrganizationData = {
  admin_name: "Sarah Johnson",
  admin_email: "sarah.johnson@email.com", 
  admin_phone: "(555) 123-4567",
  treasurer_name: "Michael Chen",
  treasurer_email: "michael.chen@email.com",
  treasurer_phone: "(555) 234-5678",
  calendar_keeper_name: "Emily Rodriguez",
  calendar_keeper_email: "emily.rodriguez@email.com",
  calendar_keeper_phone: "(555) 345-6789",
};

const sampleFamilyGroups = [
  { 
    name: "The Johnsons", 
    lead_name: "Robert Johnson", 
    lead_email: "robert.johnson@email.com", 
    lead_phone: "(555) 111-1111",
    host_members: [
      { name: "Lisa Johnson", phone: "(555) 111-1112", email: "lisa.johnson@email.com" },
      { name: "David Johnson", phone: "(555) 111-1113", email: "david.johnson@email.com" },
      { name: "Jennifer Johnson", phone: "(555) 111-1114", email: "jennifer.johnson@email.com" }
    ]
  },
  { 
    name: "The Smiths", 
    lead_name: "Amanda Smith", 
    lead_email: "amanda.smith@email.com", 
    lead_phone: "(555) 222-2222",
    host_members: [
      { name: "Mark Smith", phone: "(555) 222-2223", email: "mark.smith@email.com" },
      { name: "Katie Smith", phone: "(555) 222-2224", email: "katie.smith@email.com" }
    ]
  },
  { 
    name: "The Williams", 
    lead_name: "Thomas Williams", 
    lead_email: "thomas.williams@email.com", 
    lead_phone: "(555) 333-3333",
    host_members: [
      { name: "Susan Williams", phone: "(555) 333-3334", email: "susan.williams@email.com" },
      { name: "James Williams", phone: "(555) 333-3335", email: "james.williams@email.com" },
      { name: "Rachel Williams", phone: "(555) 333-3336", email: "rachel.williams@email.com" },
      { name: "Chris Williams", phone: "(555) 333-3337", email: "chris.williams@email.com" }
    ]
  },
  { 
    name: "The Browns", 
    lead_name: "Michelle Brown", 
    lead_email: "michelle.brown@email.com", 
    lead_phone: "(555) 444-4444",
    host_members: [
      { name: "Kevin Brown", phone: "(555) 444-4445", email: "kevin.brown@email.com" },
      { name: "Ashley Brown", phone: "(555) 444-4446", email: "ashley.brown@email.com" }
    ]
  },
];

const sampleReceipts = [
  { description: "Groceries for Welcome Basket", amount: 45.67, date: "2024-01-15", family_group: "The Johnsons" },
  { description: "Cabin Deep Cleaning Service", amount: 150.00, date: "2024-01-20", family_group: "The Smiths" },
  { description: "New Kitchen Towels and Linens", amount: 78.99, date: "2024-01-25", family_group: "The Williams" },
  { description: "Coffee and Tea Supplies", amount: 32.50, date: "2024-02-01", family_group: "The Browns" },
  { description: "Firewood Delivery", amount: 120.00, date: "2024-02-05" },
  { description: "Plumbing Repair", amount: 285.00, date: "2024-02-10", family_group: "The Johnsons" },
  { description: "Guest Wi-Fi Upgrade", amount: 89.99, date: "2024-02-15" },
  { description: "Hot Tub Maintenance", amount: 175.00, date: "2024-02-20", family_group: "The Smiths" },
];

const sampleReservationSettings = {
  property_name: "Mountain View Cabin",
  address: "123 Pine Ridge Trail, Mountain View, CO 80424",
  bedrooms: 4,
  bathrooms: 3,
  max_guests: 8,
  nightly_rate: 250.00,
  cleaning_fee: 125.00,
  pet_fee: 50.00,
  damage_deposit: 500.00,
  financial_method: "Venmo @CabinBuddy"
};

export const CreateTestOrganizationDialog = ({ onOrganizationCreated }: CreateTestOrganizationDialogProps) => {
  const [open, setOpen] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
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
      // 1. Create the organization
      const orgData = {
        name: orgName.trim(),
        code: generateOrgCode(),
        ...sampleOrganizationData
      };

      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert(orgData)
        .select()
        .single();

      if (orgError) throw orgError;

      // 2. Create family groups
      const familyGroupsWithOrgId = sampleFamilyGroups.map(group => ({
        ...group,
        organization_id: newOrg.id
      }));

      const { error: familyGroupsError } = await supabase
        .from('family_groups')
        .insert(familyGroupsWithOrgId);

      if (familyGroupsError) throw familyGroupsError;

      // 3. Create sample receipts
      const receiptsWithOrgId = sampleReceipts.map(receipt => ({
        ...receipt,
        organization_id: newOrg.id
      }));

      const { error: receiptsError } = await supabase
        .from('receipts')
        .insert(receiptsWithOrgId);

      if (receiptsError) throw receiptsError;

      // 4. Create reservation settings
      const reservationData = {
        ...sampleReservationSettings,
        organization_id: newOrg.id
      };

      const { error: reservationError } = await supabase
        .from('reservation_settings')
        .insert(reservationData);

      if (reservationError) throw reservationError;

      toast({
        title: "Success",
        description: `Test organization "${orgName}" created with complete sample data!`,
      });

      setOpen(false);
      setOrgName('');
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 text-base">
          <Beaker className="h-4 w-4" />
          Create Complete Test Organization
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Beaker className="h-5 w-5" />
            Create Complete Test Organization
          </DialogTitle>
          <DialogDescription>
            This will create a test organization with sample data including:
            <ul className="list-disc list-inside mt-2 space-y-1 text-base">
              <li>Organization contacts (admin, treasurer, calendar keeper)</li>
              <li>4 family groups with leads and host members</li>
              <li>8 sample receipts with various expenses</li>
              <li>Complete property and reservation settings</li>
            </ul>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orgName" className="text-base">Organization Name</Label>
            <Input
              id="orgName"
              placeholder="Enter test organization name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) {
                  createCompleteTestOrganization();
                }
              }}
              className="text-base placeholder:text-base"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading} className="text-base">
              Cancel
            </Button>
            <Button onClick={createCompleteTestOrganization} disabled={loading} className="text-base">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Beaker className="h-4 w-4 mr-2" />
                  Create Test Org
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};