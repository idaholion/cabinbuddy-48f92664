import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

interface HostMember {
  name: string;
  phone: string;
  email: string;
}

interface HostMembersStepProps {
  hostMembers: HostMember[];
  onHostMemberChange: (index: number, field: 'name' | 'phone' | 'email', value: string) => void;
  onAddHostMember: () => void;
  onRemoveHostMember?: (index: number) => void;
}

export const HostMembersStep = ({
  hostMembers,
  onHostMemberChange,
  onAddHostMember,
  onRemoveHostMember
}: HostMembersStepProps) => {
  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="text-center">
        <CardTitle>Host Members</CardTitle>
        <CardDescription>
          Add additional family members who will be part of this group
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {hostMembers.map((member, index) => (
            <div key={index} className="p-4 border rounded-lg bg-muted/10">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">Host Member {index + 1}</h4>
                {onRemoveHostMember && hostMembers.length > 3 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveHostMember(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-sm">Name</Label>
                  <Input 
                    placeholder="Full name"
                    value={member.name}
                    onChange={(e) => onHostMemberChange(index, 'name', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Phone</Label>
                  <PhoneInput 
                    value={member.phone}
                    onChange={(formatted) => onHostMemberChange(index, 'phone', formatted)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Email</Label>
                  <Input 
                    type="email" 
                    placeholder="email@example.com"
                    value={member.email}
                    onChange={(e) => onHostMemberChange(index, 'email', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex justify-center">
          <Button variant="outline" onClick={onAddHostMember}>
            <Plus className="h-4 w-4 mr-2" />
            Add Another Host Member
          </Button>
        </div>

        <div className="p-4 bg-muted/20 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Host Member Information</h4>
          <p className="text-sm text-muted-foreground">
            Host members are additional family members who are part of this group. 
            You can add as many as needed. All fields are optional, but providing 
            contact information helps with group coordination.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};