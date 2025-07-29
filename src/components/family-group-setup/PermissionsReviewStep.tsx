import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface HostMember {
  name: string;
  phone: string;
  email: string;
}

interface PermissionsReviewStepProps {
  selectedGroup: string;
  leadName: string;
  leadPhone: string;
  leadEmail: string;
  hostMembers: HostMember[];
  reservationPermission: string;
  alternateLeadId: string;
  onReservationPermissionChange: (permission: string) => void;
  onAlternateLeadChange: (leadId: string) => void;
}

export const PermissionsReviewStep = ({
  selectedGroup,
  leadName,
  leadPhone,
  leadEmail,
  hostMembers,
  reservationPermission,
  alternateLeadId,
  onReservationPermissionChange,
  onAlternateLeadChange
}: PermissionsReviewStepProps) => {
  const filledHostMembers = hostMembers.filter(member => member.name.trim() !== '');

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="text-center">
        <CardTitle>Permissions & Review</CardTitle>
        <CardDescription>
          Set reservation permissions and review all information before saving
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Reservation Permissions */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Reservation Permissions</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Select who can make reservations for this family group
            </p>
          </div>
          
          <RadioGroup value={reservationPermission} onValueChange={onReservationPermissionChange}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="lead_only" id="lead_only" />
              <Label htmlFor="lead_only">Lead only</Label>
            </div>
            {filledHostMembers.map((member, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={`host_${index}`} id={`host_${index}`} />
                <Label htmlFor={`host_${index}`}>{member.name}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Alternate Lead */}
        <div className="space-y-3">
          <div>
            <h3 className="text-lg font-semibold mb-1">Alternate Group Lead</h3>
            <p className="text-sm text-muted-foreground">
              Select which host member serves as the alternate group lead (optional)
            </p>
          </div>
          
          <Select value={alternateLeadId} onValueChange={onAlternateLeadChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select alternate lead (optional)" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="none">None selected</SelectItem>
              {filledHostMembers.map((member, index) => (
                <SelectItem key={index} value={member.name}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Review Summary */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Review Summary</h3>
          
          <div className="grid gap-4">
            <div className="p-3 bg-muted/20 rounded-lg">
              <h4 className="font-medium mb-2">Family Group</h4>
              <p className="text-sm">{selectedGroup}</p>
            </div>

            <div className="p-3 bg-muted/20 rounded-lg">
              <h4 className="font-medium mb-2">Group Lead</h4>
              <div className="text-sm space-y-1">
                <p><strong>Name:</strong> {leadName || "Not provided"}</p>
                <p><strong>Phone:</strong> {leadPhone || "Not provided"}</p>
                <p><strong>Email:</strong> {leadEmail || "Not provided"}</p>
              </div>
            </div>

            {filledHostMembers.length > 0 && (
              <div className="p-3 bg-muted/20 rounded-lg">
                <h4 className="font-medium mb-2">Host Members ({filledHostMembers.length})</h4>
                <div className="text-sm space-y-2">
                  {filledHostMembers.map((member, index) => (
                    <div key={index} className="border-l-2 border-muted pl-3">
                      <p><strong>{member.name}</strong></p>
                      <p>{member.phone} • {member.email}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-3 bg-muted/20 rounded-lg">
              <h4 className="font-medium mb-2">Permissions</h4>
              <div className="text-sm space-y-1">
                <p><strong>Can make reservations:</strong> {
                  reservationPermission === "lead_only" 
                    ? "Lead only" 
                    : filledHostMembers.find((_, index) => reservationPermission === `host_${index}`)?.name || "Lead only"
                }</p>
                <p><strong>Alternate lead:</strong> {
                  alternateLeadId === "none" ? "None selected" : alternateLeadId
                }</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};