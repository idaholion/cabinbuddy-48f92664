import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface GroupSelectionStepProps {
  selectedGroup: string;
  onGroupChange: (group: string) => void;
  allGroups: string[];
}

export const GroupSelectionStep = ({
  selectedGroup,
  onGroupChange,
  allGroups
}: GroupSelectionStepProps) => {
  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="text-center">
        <CardTitle>Select Family Group</CardTitle>
        <CardDescription>
          Choose the family group you want to set up or configure
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="groupName" className="text-lg font-semibold">
            Family Group Name
          </Label>
          <Select value={selectedGroup} onValueChange={onGroupChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a family group" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              {allGroups.length > 0 ? (
                allGroups.map((group, index) => (
                  <SelectItem key={index} value={group}>
                    {group}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-groups" disabled>
                  No family groups found - Please set them up in Family Setup first
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {selectedGroup && (
          <div className="mt-4 p-4 bg-muted/20 rounded-lg">
            <h3 className="font-semibold text-center">Selected Group: {selectedGroup}</h3>
            <p className="text-sm text-muted-foreground text-center mt-1">
              You can now configure the lead and host member details for this group.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};