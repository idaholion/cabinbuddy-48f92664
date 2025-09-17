import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { CabinRule } from '@/hooks/useCabinRules';

interface CreateCabinRuleDialogProps {
  onCreateRule: (newRule: Omit<CabinRule, 'id'>) => Promise<any>;
}

const sectionTypes = [
  { value: 'general', label: 'General Rules' },
  { value: 'checkin_checkout', label: 'Check-in & Check-out' },
  { value: 'guest_policy', label: 'Guest Policy' },
  { value: 'property_care', label: 'Property Care' },
  { value: 'cleaning_trash', label: 'Cleaning & Trash' },
  { value: 'parking', label: 'Parking' },
  { value: 'amenities', label: 'Amenities' },
  { value: 'emergency', label: 'Emergency Information' },
  { value: 'violation_policy', label: 'Violation Policy' },
  { value: 'custom', label: 'Custom Section' }
];

export const CreateCabinRuleDialog = ({ onCreateRule }: CreateCabinRuleDialogProps) => {
  const [open, setOpen] = useState(false);
  const [sectionType, setSectionType] = useState('');
  const [sectionTitle, setSectionTitle] = useState('');

  const getInitialContent = (type: string) => {
    switch (type) {
      case 'general':
      case 'guest_policy':
      case 'property_care':
      case 'cleaning_trash':
      case 'parking':
      case 'amenities':
        return { items: [''] };
      case 'checkin_checkout':
        return {
          checkin_time: '4:00 PM',
          checkin_note: 'Early check-in may be available upon request',
          checkout_time: '11:00 AM',
          checkout_note: 'Late check-out may incur additional fees'
        };
      case 'emergency':
        return {
          emergency_services: '911',
          property_manager: '(555) 123-4567',
          local_hospital: '(555) 987-6543',
          procedures: ['Fire extinguisher and first aid kit are located in the kitchen.']
        };
      case 'violation_policy':
        return {
          policy: 'Violations of these rules may result in immediate removal from the property.',
          agreement: 'By staying at this property, you agree to abide by all rules and policies.'
        };
      default:
        return { items: [''] };
    }
  };

  const getDefaultTitle = (type: string) => {
    const sectionTypeObj = sectionTypes.find(s => s.value === type);
    return sectionTypeObj ? sectionTypeObj.label : 'New Section';
  };

  const handleCreate = async () => {
    if (!sectionType) return;

    const title = sectionTitle || getDefaultTitle(sectionType);
    const content = getInitialContent(sectionType);

    const newRule: Omit<CabinRule, 'id'> = {
      section_type: sectionType,
      section_title: title,
      content
    };

    await onCreateRule(newRule);
    
    // Reset form
    setSectionType('');
    setSectionTitle('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="mb-6">
          <Plus className="h-4 w-4 mr-2" />
          Add New Section
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Cabin Rule Section</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="section-type">Section Type</Label>
            <Select value={sectionType} onValueChange={setSectionType}>
              <SelectTrigger>
                <SelectValue placeholder="Select section type" />
              </SelectTrigger>
              <SelectContent>
                {sectionTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="section-title">Section Title (optional)</Label>
            <Input
              id="section-title"
              value={sectionTitle}
              onChange={(e) => setSectionTitle(e.target.value)}
              placeholder={sectionType ? getDefaultTitle(sectionType) : 'Enter custom title'}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!sectionType}>
              Create Section
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};