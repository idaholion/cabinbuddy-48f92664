import { z } from "zod";
import { validateFullName } from "./name-utils";

// Common validation schemas
export const emailSchema = z.string().email("Please enter a valid email address");
export const phoneSchema = z.string().refine((val) => {
  if (!val || val === "") return true;
  // Remove all non-digit characters and check if it's a valid phone number
  const cleaned = val.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
}, "Please enter a valid phone number");
export const requiredStringSchema = z.string().min(1, "This field is required");
export const optionalStringSchema = z.string().optional();
export const positiveNumberSchema = z.number().positive("Must be a positive number");
export const dateSchema = z.date({ required_error: "Please select a date" });

// Organization validation schemas
export const organizationSchema = z.object({
  name: requiredStringSchema.min(2, "Organization name must be at least 2 characters"),
  code: requiredStringSchema.min(2, "Organization code must be at least 2 characters").max(10, "Organization code must be 10 characters or less"),
  admin_name: optionalStringSchema,
  admin_email: emailSchema.optional().or(z.literal("")),
  admin_phone: phoneSchema.optional().or(z.literal("")),
  treasurer_name: optionalStringSchema,
  treasurer_email: emailSchema.optional().or(z.literal("")),
  treasurer_phone: phoneSchema.optional().or(z.literal("")),
  calendar_keeper_name: optionalStringSchema,
  calendar_keeper_email: emailSchema.optional().or(z.literal("")),
  calendar_keeper_phone: phoneSchema.optional().or(z.literal("")),
});

// Family group validation schemas
export const familyGroupSchema = z.object({
  name: requiredStringSchema.min(2, "Family group name must be at least 2 characters"),
  lead_name: requiredStringSchema.min(2, "Lead name must contain at least 2 characters").refine((val) => {
    return validateFullName(val);
  }, "Please enter both first and last name"),
  lead_email: emailSchema.optional().or(z.literal("")),
  lead_phone: phoneSchema.optional().or(z.literal("")),
});

// Enhanced family group setup validation schema
export const familyGroupSetupSchema = z.object({
  selectedGroup: requiredStringSchema.min(1, "Please select or create a family group"),
  leadName: requiredStringSchema.min(2, "Lead name must contain at least 2 characters").refine((val) => {
    return validateFullName(val);
  }, "Please enter both first and last name"),
  leadPhone: z.string().optional().refine((val) => {
    if (!val || val === "") return true;
    // Remove all non-digit characters and check if it's a valid phone number
    const cleaned = val.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
  }, "Please enter a valid phone number"),
  leadEmail: z.string().optional().refine((val) => {
    if (!val || val === "") return true;
    return z.string().email().safeParse(val).success;
  }, "Please enter a valid email address"),
  groupMembers: z.array(z.object({
    firstName: requiredStringSchema.min(1, "First name is required"),
    lastName: requiredStringSchema.min(1, "Last name is required"),
    name: z.string().optional(), // Computed field, will be auto-generated
    phone: z.string().optional(),
    email: z.string().optional(),
    canHost: z.boolean().optional().default(false),
  }))
    .refine((members) => {
      // Check for duplicate names (non-empty only)  
      const names = members.map(m => `${m.firstName} ${m.lastName}`.toLowerCase().trim()).filter(Boolean);
      return new Set(names).size === names.length;
    }, "Group member names must be unique")
    .refine((members) => {
      // Check for duplicate emails (non-empty only)
      const emails = members.map(m => m.email.toLowerCase().trim()).filter(Boolean);
      return new Set(emails).size === emails.length;
    }, "Group member emails must be unique")
    .refine((members) => {
      // Check for duplicate phone numbers (non-empty only)
      const phones = members.map(m => m.phone.replace(/\D/g, '')).filter(Boolean);
      return new Set(phones).size === phones.length;
    }, "Group member phone numbers must be unique"),
  
  alternateLeadId: z.string(),
});

// Reservation validation schemas
export const reservationSchema = z.object({
  start_date: dateSchema,
  end_date: dateSchema,
  family_group: requiredStringSchema,
  guest_count: z.number().int().min(1, "At least 1 guest is required"),
  property_name: optionalStringSchema,
}).refine(
  (data) => data.end_date > data.start_date,
  {
    message: "End date must be after start date",
    path: ["end_date"],
  }
);

// Financial validation schemas
export const receiptSchema = z.object({
  description: requiredStringSchema.min(3, "Description must be at least 3 characters"),
  amount: positiveNumberSchema,
  date: dateSchema,
  family_group: optionalStringSchema,
});

// User profile validation schemas
export const profileSchema = z.object({
  first_name: requiredStringSchema.min(1, "First name is required"),
  last_name: requiredStringSchema.min(1, "Last name is required"),
  display_name: optionalStringSchema,
  family_role: optionalStringSchema,
});

// Auth validation schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signupSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  first_name: requiredStringSchema,
  last_name: requiredStringSchema,
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }
);

export const resetPasswordSchema = z.object({
  email: emailSchema,
});

// Trade request validation schemas
export const tradeRequestSchema = z.object({
  target_family_group: requiredStringSchema,
  requested_start_date: dateSchema,
  requested_end_date: dateSchema,
  offered_start_date: dateSchema.optional(),
  offered_end_date: dateSchema.optional(),
  requester_message: optionalStringSchema,
  request_type: z.enum(["request", "offer", "swap"]),
}).refine(
  (data) => data.requested_end_date > data.requested_start_date,
  {
    message: "Requested end date must be after start date",
    path: ["requested_end_date"],
  }
).refine(
  (data) => {
    if (data.offered_start_date && data.offered_end_date) {
      return data.offered_end_date > data.offered_start_date;
    }
    return true;
  },
  {
    message: "Offered end date must be after start date",
    path: ["offered_end_date"],
  }
);

export type OrganizationFormData = z.infer<typeof organizationSchema>;
export type FamilyGroupFormData = z.infer<typeof familyGroupSchema>;
export type FamilyGroupSetupFormData = z.infer<typeof familyGroupSetupSchema>;
export type ReservationFormData = z.infer<typeof reservationSchema>;
export type ReceiptFormData = z.infer<typeof receiptSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type TradeRequestFormData = z.infer<typeof tradeRequestSchema>;