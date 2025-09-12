export interface GroupMember {
  firstName: string; // First name (required)
  lastName: string; // Last name (required)
  name: string; // Full display name (computed from firstName + lastName)
  phone: string;
  email: string;
  canHost?: boolean;
}

// Standard name interface used throughout the app
export interface StandardName {
  firstName: string;
  lastName: string;
  displayName: string;
}

export interface FamilyGroupData {
  name: string;
  lead_name?: string;
  lead_email?: string;
  lead_phone?: string;
  host_members?: GroupMember[];
  color?: string;
  alternate_lead_id?: string;
}