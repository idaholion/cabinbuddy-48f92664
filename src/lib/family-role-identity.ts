export interface ClaimedFamilyProfile {
  family_group_name: string;
  member_name: string;
  member_type: 'group_lead' | 'host_member';
}

interface FamilyMember {
  user_id?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  canHost?: boolean;
  canEditReservations?: boolean;
  canEditDailyFinal?: boolean;
  canEditStayHistory?: boolean;
}

interface FamilyGroup {
  name: string;
  lead_name?: string;
  lead_email?: string;
  host_members?: FamilyMember[];
}

const normalize = (value?: string | null) => (value || '').trim().toLowerCase();
const memberName = (member: FamilyMember) => member.name || [member.firstName, member.lastName].filter(Boolean).join(' ');
const namesMatch = (a?: string, b?: string) => {
  const left = normalize(a), right = normalize(b);
  if (!left || !right) return false;
  if (left === right) return true;
  const words = left.split(/\s+/), other = right.split(/\s+/);
  return words.length > 1 && other.length > 1
    ? words.filter(word => other.includes(word)).length >= 2
    : words.some(word => other.includes(word));
};

/** A saved claim/account link wins over contact email or legacy display-name matches. */
export function resolveFamilyRole<T extends FamilyGroup>(
  groups: T[],
  identity: { id?: string | null; email?: string; name?: string },
  claim?: ClaimedFamilyProfile | null,
) {
  const empty = { group: null, member: null, isLead: false, nameMatched: false };
  if (claim) {
    const group = groups.find(group => group.name === claim.family_group_name);
    if (!group) return empty;
    const members = group.host_members || [];
    const index = members.findIndex(member => normalize(memberName(member)) === normalize(claim.member_name));
    const member = index >= 0 ? members[index] : null;
    return { group, member, isLead: claim.member_type === 'group_lead' || (index === 0 && normalize(memberName(member || {})) === normalize(group.lead_name)), nameMatched: false };
  }
  if (identity.id) {
    for (const group of groups) {
      const index = (group.host_members || []).findIndex(member => member.user_id === identity.id);
      if (index >= 0) return { group, member: group.host_members?.[index] || null, isLead: index === 0, nameMatched: false };
    }
  }
  // Retain the existing unclaimed-profile fallback, only after checking all saved links.
  for (const byName of [false, true]) {
    for (const group of groups) {
      const leadMatches = byName ? namesMatch(identity.name, group.lead_name) : Boolean(normalize(identity.email) && normalize(identity.email) === normalize(group.lead_email));
      if (leadMatches) return { group, member: null, isLead: true, nameMatched: byName };
      const index = (group.host_members || []).findIndex(member => byName
        ? namesMatch(identity.name, memberName(member))
        : Boolean(normalize(identity.email) && normalize(identity.email) === normalize(member.email)));
      if (index >= 0) return { group, member: group.host_members?.[index] || null, isLead: index === 0, nameMatched: byName };
    }
  }
  return empty;
}