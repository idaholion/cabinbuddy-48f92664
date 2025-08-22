export interface GroupMember {
  name: string;
  phone: string;
  email: string;
  canHost?: boolean;
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