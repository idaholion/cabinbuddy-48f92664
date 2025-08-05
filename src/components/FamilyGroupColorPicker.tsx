import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Palette, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

// Limited color palette for family groups (10 colors)
const FAMILY_GROUP_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange  
  '#eab308', // Yellow
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#6366f1', // Indigo
];

interface FamilyGroupColorPickerProps {
  familyGroup: {
    id: string;
    name: string;
    color?: string;
  };
  onColorUpdate: () => void;
  isGroupLead: boolean;
}

export function FamilyGroupColorPicker({ familyGroup, onColorUpdate, isGroupLead }: FamilyGroupColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [availableColors, setAvailableColors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();
  const { organization } = useOrganization();

  const fetchAvailableColors = async () => {
    if (!organization?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_available_colors', {
        p_organization_id: organization.id,
        p_current_group_id: familyGroup.id
      });

      if (error) {
        console.error('Error fetching available colors:', error);
        toast({
          title: "Error",
          description: "Failed to fetch available colors",
          variant: "destructive"
        });
        return;
      }

      setAvailableColors(data || []);
    } catch (error) {
      console.error('Error in fetchAvailableColors:', error);
      toast({
        title: "Error",
        description: "Failed to fetch available colors",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchAvailableColors();
    }
  }, [open, organization?.id, familyGroup.id]);

  const updateFamilyGroupColor = async (color: string) => {
    if (!organization?.id) return;
    
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('family_groups')
        .update({ color, updated_at: new Date().toISOString() })
        .eq('id', familyGroup.id)
        .eq('organization_id', organization.id);

      if (error) {
        console.error('Error updating family group color:', error);
        toast({
          title: "Error",
          description: "Failed to update group color",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: `Updated ${familyGroup.name} color successfully`,
      });

      onColorUpdate();
      setOpen(false);
    } catch (error) {
      console.error('Error in updateFamilyGroupColor:', error);
      toast({
        title: "Error",
        description: "Failed to update group color",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  // Don't render if user is not a group lead
  if (!isGroupLead) {
    return null;
  }

  const currentColor = familyGroup.color || '#64748b'; // Default gray if no color set

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <div 
            className="w-4 h-4 rounded border border-border"
            style={{ backgroundColor: currentColor }}
          />
          <Palette className="h-4 w-4" />
          Choose Color
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose Color for {familyGroup.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <div className="text-sm text-muted-foreground">
                Select a color for your family group's reservations. Each group must have a unique color.
              </div>
              
              <div className="grid grid-cols-5 gap-3">
                {availableColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => updateFamilyGroupColor(color)}
                    disabled={updating}
                    className="relative w-12 h-12 rounded-lg border-2 border-border hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                    style={{ backgroundColor: color }}
                    title={color}
                  >
                    {familyGroup.color === color && (
                      <Check className="h-5 w-5 text-white absolute inset-0 m-auto drop-shadow-lg" />
                    )}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
                  </button>
                ))}
              </div>
              
              {availableColors.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  No colors available. All colors are currently in use by other family groups.
                </div>
              )}
              
              <div className="text-xs text-muted-foreground">
                Current color: 
                <span 
                  className="inline-block w-3 h-3 rounded ml-2 border border-border"
                  style={{ backgroundColor: currentColor }}
                />
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}