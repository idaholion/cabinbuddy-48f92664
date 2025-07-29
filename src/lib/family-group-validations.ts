import { z } from "zod";

const hostMemberSchema = z.object({
  name: z.string().trim(),
  phone: z.string().trim(),
  email: z.string().trim()
});

export const groupSelectionSchema = z.object({
  selectedGroup: z.string().min(1, "Please select a family group")
});

export const leadInformationSchema = z.object({
  leadName: z.string().optional(),
  leadPhone: z.string().optional(),
  leadEmail: z.string().email("Please enter a valid email address").or(z.literal(""))
});

export const hostMembersSchema = z.object({
  hostMembers: z.array(hostMemberSchema).min(0)
});

export const permissionsReviewSchema = z.object({
  reservationPermission: z.string().min(1, "Please select who can make reservations"),
  alternateLeadId: z.string()
});

export const completeFamilyGroupSchema = groupSelectionSchema
  .merge(leadInformationSchema)
  .merge(hostMembersSchema)
  .merge(permissionsReviewSchema);

export type GroupSelectionData = z.infer<typeof groupSelectionSchema>;
export type LeadInformationData = z.infer<typeof leadInformationSchema>;
export type HostMembersData = z.infer<typeof hostMembersSchema>;
export type PermissionsReviewData = z.infer<typeof permissionsReviewSchema>;
export type CompleteFamilyGroupData = z.infer<typeof completeFamilyGroupSchema>;