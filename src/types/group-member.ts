export interface GroupMember {
  name: string; // Full display name (for backward compatibility)
  firstName?: string; // First name (optional for backward compatibility)
  lastName?: string; // Last name (optional for backward compatibility)
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