import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface LeadInformationStepProps {
  leadName: string;
  leadPhone: string;
  leadEmail: string;
  onLeadNameChange: (name: string) => void;
  onLeadPhoneChange: (phone: string) => void;
  onLeadEmailChange: (email: string) => void;
}

export const LeadInformationStep = ({
  leadName,
  leadPhone,
  leadEmail,
  onLeadNameChange,
  onLeadPhoneChange,
  onLeadEmailChange
}: LeadInformationStepProps) => {
  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="text-center">
        <CardTitle>Family Group Lead Information</CardTitle>
        <CardDescription>
          Enter the contact details for the primary family group lead
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-1">
          <div className="space-y-2">
            <Label htmlFor="leadName" className="text-base font-medium">
              Full Name
            </Label>
            <Input 
              id="leadName" 
              placeholder="Enter the family group lead's full name"
              value={leadName}
              onChange={(e) => onLeadNameChange(e.target.value)}
              className="text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="leadPhone" className="text-base font-medium">
              Phone Number
            </Label>
            <PhoneInput 
              id="leadPhone" 
              value={leadPhone}
              onChange={onLeadPhoneChange}
              className="text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="leadEmail" className="text-base font-medium">
              Email Address
            </Label>
            <Input 
              id="leadEmail" 
              type="email" 
              placeholder="lead@example.com"
              value={leadEmail}
              onChange={(e) => onLeadEmailChange(e.target.value)}
              className="text-base"
            />
          </div>
        </div>

        <div className="mt-6 p-4 bg-muted/20 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Note</h4>
          <p className="text-sm text-muted-foreground">
            The family group lead serves as the primary contact for this group. 
            All fields are optional, but providing contact information helps with 
            communication and coordination.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};