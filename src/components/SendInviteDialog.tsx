import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail, Check, AlertCircle, Loader2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Member {
  name: string;
  email?: string;
  phone?: string;
}

interface SendInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  organizationName: string;
  organizationCode: string;
  members: Member[];
  scope?: "organization" | "group";
  groupName?: string;
}

export function SendInviteDialog({
  open,
  onOpenChange,
  organizationId,
  organizationName,
  organizationCode,
  members,
  scope = "organization",
  groupName,
}: SendInviteDialogProps) {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);

  // Separate members with and without emails
  const membersWithEmail = members.filter(
    (m) => m.email && m.email.trim() !== ""
  );
  const membersWithoutEmail = members.filter(
    (m) => !m.email || m.email.trim() === ""
  );

  // Remove duplicates by email
  const uniqueMembersWithEmail = membersWithEmail.filter(
    (member, index, self) =>
      index === self.findIndex((m) => m.email?.toLowerCase() === member.email?.toLowerCase())
  );

  const handleSendInvites = async () => {
    if (uniqueMembersWithEmail.length === 0) {
      toast({
        title: "No recipients",
        description: "There are no members with email addresses to send invites to.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      const inviteUrl = `${window.location.origin}/join?code=${organizationCode}`;
      
      // Send invites to each member individually
      const results = await Promise.allSettled(
        uniqueMembersWithEmail.map(async (member) => {
          const subject = `You're invited to join ${organizationName}`;
          const message = `Hello ${member.name},

You've been invited to join ${organizationName} on Cabin Buddy, a platform for managing shared properties.

To join, click the link below or use the organization code: ${organizationCode}

Join here: ${inviteUrl}

If you already have an account, simply log in and enter the organization code. If you're new, click the link to sign up and automatically join the organization.

We look forward to seeing you!

Best regards,
${organizationName} Team`;

          const { error } = await supabase.functions.invoke("send-message", {
            body: {
              organizationId,
              subject,
              message,
              recipientGroup: "individual_member",
              messageType: "email",
              urgent: false,
              individualRecipient: {
                name: member.name,
                email: member.email,
                phone: null,
                familyGroup: groupName || "",
              },
            },
          });

          if (error) throw error;
          return member.name;
        })
      );

      const successful = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      if (failed === 0) {
        toast({
          title: "Invitations sent!",
          description: `Successfully sent ${successful} invitation${successful !== 1 ? "s" : ""}.`,
        });
        onOpenChange(false);
      } else if (successful > 0) {
        toast({
          title: "Some invitations sent",
          description: `Sent ${successful} of ${successful + failed} invitations. ${failed} failed.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Failed to send invitations",
          description: "Unable to send invitation emails. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error sending invites:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while sending invitations.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const scopeText = scope === "group" && groupName 
    ? `the ${groupName} family group` 
    : organizationName;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Invitation Emails
          </DialogTitle>
          <DialogDescription>
            Send invitation emails to join {scopeText}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {uniqueMembersWithEmail.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <Check className="h-4 w-4" />
                Will receive invite ({uniqueMembersWithEmail.length} member{uniqueMembersWithEmail.length !== 1 ? "s" : ""}):
              </div>
              <ScrollArea className="h-32 rounded-md border p-2">
                <ul className="space-y-1 text-sm">
                  {uniqueMembersWithEmail.map((member, index) => (
                    <li key={index} className="flex justify-between items-center">
                      <span>{member.name}</span>
                      <span className="text-muted-foreground text-xs">{member.email}</span>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          ) : (
            <div className="p-4 bg-muted rounded-md text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No members have email addresses configured.
              </p>
            </div>
          )}

          {membersWithoutEmail.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertCircle className="h-4 w-4" />
                No email on file ({membersWithoutEmail.length} member{membersWithoutEmail.length !== 1 ? "s" : ""}):
              </div>
              <ScrollArea className="h-24 rounded-md border border-destructive/20 bg-destructive/5 p-2">
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {membersWithoutEmail.map((member, index) => (
                    <li key={index}>{member.name || "(Unnamed member)"}</li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            Cancel
          </Button>
          <Button 
            onClick={handleSendInvites} 
            disabled={isSending || uniqueMembersWithEmail.length === 0}
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send {uniqueMembersWithEmail.length} Invite{uniqueMembersWithEmail.length !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
