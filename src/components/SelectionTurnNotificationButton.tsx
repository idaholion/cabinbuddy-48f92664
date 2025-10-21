import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

interface SelectionTurnNotificationButtonProps {
  currentFamilyGroup: string | null;
  rotationYear: number;
  disabled?: boolean;
}

export const SelectionTurnNotificationButton = ({
  currentFamilyGroup,
  rotationYear,
  disabled = false
}: SelectionTurnNotificationButtonProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { organization } = useOrganization();

  const handleSendNotification = async () => {
    if (!currentFamilyGroup || !organization) return;

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('send-selection-turn-notification', {
        body: {
          organization_id: organization.id,
          family_group: currentFamilyGroup,
          rotation_year: rotationYear
        }
      });

      if (error) throw error;

      toast({
        title: "Notification Sent",
        description: `Selection turn notification sent to ${currentFamilyGroup}`,
      });
    } catch (error) {
      console.error('Error sending notification:', error);
      toast({
        title: "Error",
        description: "Failed to send notification",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!currentFamilyGroup) return null;

  return (
    <Button
      onClick={handleSendNotification}
      disabled={loading || disabled}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      <Bell className="h-4 w-4" />
      {loading ? "Sending..." : `Notify ${currentFamilyGroup}`}
    </Button>
  );
};
