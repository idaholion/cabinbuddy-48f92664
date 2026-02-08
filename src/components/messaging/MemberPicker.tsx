import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Mail, MessageSquare, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useFamilyGroups } from '@/hooks/useFamilyGroups';
import { GroupMember } from '@/types/group-member';

export interface SelectedMember {
  familyGroupName: string;
  familyGroupId: string;
  memberName: string;
  memberEmail: string | null;
  memberPhone: string | null;
  isLead: boolean;
}

interface MemberPickerProps {
  value: SelectedMember | null;
  onChange: (member: SelectedMember | null) => void;
  placeholder?: string;
}

export const MemberPicker = ({ 
  value, 
  onChange, 
  placeholder = "Select a member..." 
}: MemberPickerProps) => {
  const [open, setOpen] = useState(false);
  const { familyGroups, loading } = useFamilyGroups();

  // Build a flat list of all members organized by family group
  const membersByGroup = useMemo(() => {
    const groups: { 
      groupName: string; 
      groupId: string;
      members: SelectedMember[] 
    }[] = [];

    familyGroups.forEach((group) => {
      const groupMembers: SelectedMember[] = [];
      
      // Add the lead first if they exist
      if (group.lead_name) {
        groupMembers.push({
          familyGroupName: group.name,
          familyGroupId: group.id,
          memberName: group.lead_name,
          memberEmail: group.lead_email || null,
          memberPhone: group.lead_phone || null,
          isLead: true,
        });
      }

      // Add host members (excluding duplicates with lead)
      const hostMembers = (group.host_members || []) as GroupMember[];
      hostMembers.forEach((member) => {
        // Skip if this is the lead (already added)
        const isLeadDuplicate = group.lead_email && 
          member.email?.toLowerCase() === group.lead_email?.toLowerCase();
        
        if (!isLeadDuplicate && member.name) {
          groupMembers.push({
            familyGroupName: group.name,
            familyGroupId: group.id,
            memberName: member.name,
            memberEmail: member.email || null,
            memberPhone: member.phone || null,
            isLead: false,
          });
        }
      });

      if (groupMembers.length > 0) {
        groups.push({
          groupName: group.name,
          groupId: group.id,
          members: groupMembers,
        });
      }
    });

    return groups;
  }, [familyGroups]);

  const selectedDisplay = value 
    ? `${value.memberName} (${value.familyGroupName})`
    : placeholder;

  const getMemberKey = (member: SelectedMember) => 
    `${member.familyGroupId}-${member.memberName}`;

  const handleSelect = (member: SelectedMember) => {
    const isSame = value && getMemberKey(value) === getMemberKey(member);
    onChange(isSame ? null : member);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between text-base"
          disabled={loading}
        >
          <span className="truncate flex items-center gap-2">
            <User className="h-4 w-4 shrink-0" />
            {selectedDisplay}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0 bg-popover" align="start">
        <Command>
          <CommandInput placeholder="Search members..." className="text-base" />
          <CommandList>
            <CommandEmpty>No members found.</CommandEmpty>
            {membersByGroup.map((group) => (
              <CommandGroup key={group.groupId} heading={group.groupName}>
                {group.members.map((member) => {
                  const isSelected = value && getMemberKey(value) === getMemberKey(member);
                  const hasEmail = !!member.memberEmail;
                  const hasPhone = !!member.memberPhone;

                  return (
                    <CommandItem
                      key={getMemberKey(member)}
                      value={`${member.memberName} ${member.familyGroupName}`}
                      onSelect={() => handleSelect(member)}
                      className="flex items-center justify-between text-base"
                    >
                      <div className="flex items-center gap-2">
                        <Check
                          className={cn(
                            "h-4 w-4",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span>
                          {member.memberName}
                          {member.isLead && (
                            <span className="ml-1 text-xs text-muted-foreground">(Lead)</span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {hasEmail && (
                          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        {hasPhone && (
                          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        {!hasEmail && !hasPhone && (
                          <span className="text-xs text-destructive">No contact</span>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
