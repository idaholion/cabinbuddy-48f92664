/**
 * Organization Utilities
 * 
 * Provides utilities for organization creation, configuration, and data isolation validation.
 */

export type AllocationModel = 'rotating_selection' | 'static_weeks' | 'first_come_first_serve' | 'lottery';

export interface SelectionRules {
  type: AllocationModel;
  [key: string]: unknown;
}

export interface RotatingSelectionRules extends SelectionRules {
  type: 'rotating_selection';
  snake_draft: boolean;
  selection_period_days: number;
  rotation_order: 'alphabetical' | 'random' | 'custom';
  allow_trades: boolean;
  max_selections_per_turn: number;
}

export interface StaticWeeksRules extends SelectionRules {
  type: 'static_weeks';
  periods_per_year: number;
  period_duration_days: number;
  trade_allowed: boolean;
  assignment_method: 'fixed' | 'annual_lottery';
}

export interface FirstComeFirstServeRules extends SelectionRules {
  type: 'first_come_first_serve';
  max_days_per_booking: number;
  advance_booking_days: number;
  min_gap_between_bookings: number;
  priority_for_hosts: boolean;
}

export interface LotteryRules extends SelectionRules {
  type: 'lottery';
  lottery_frequency: 'annual' | 'seasonal' | 'monthly';
  weighted_by_shares: boolean;
  max_selections_per_lottery: number;
  allow_preference_ranking: boolean;
}

/**
 * Get default selection rules for a given allocation model type
 */
export function getDefaultRulesForType(allocationType: AllocationModel): SelectionRules {
  switch (allocationType) {
    case 'rotating_selection':
      return {
        type: 'rotating_selection',
        snake_draft: true,
        selection_period_days: 7,
        rotation_order: 'alphabetical',
        allow_trades: true,
        max_selections_per_turn: 2,
      } as RotatingSelectionRules;

    case 'static_weeks':
      return {
        type: 'static_weeks',
        periods_per_year: 26,
        period_duration_days: 14,
        trade_allowed: true,
        assignment_method: 'fixed',
      } as StaticWeeksRules;

    case 'first_come_first_serve':
      return {
        type: 'first_come_first_serve',
        max_days_per_booking: 14,
        advance_booking_days: 365,
        min_gap_between_bookings: 7,
        priority_for_hosts: false,
      } as FirstComeFirstServeRules;

    case 'lottery':
      return {
        type: 'lottery',
        lottery_frequency: 'annual',
        weighted_by_shares: true,
        max_selections_per_lottery: 3,
        allow_preference_ranking: true,
      } as LotteryRules;

    default:
      return {
        type: 'rotating_selection',
        snake_draft: true,
        selection_period_days: 7,
        rotation_order: 'alphabetical',
        allow_trades: true,
        max_selections_per_turn: 2,
      } as RotatingSelectionRules;
  }
}

/**
 * Get a human-readable description of an allocation model
 */
export function getAllocationModelDescription(allocationType: AllocationModel): string {
  switch (allocationType) {
    case 'rotating_selection':
      return 'Family groups take turns selecting dates in a rotating order (snake draft style). Fair and transparent.';
    case 'static_weeks':
      return 'Numbered weeks/periods rotate annually among family groups (e.g., Family A has Week 1 this year, Week 2 next year). Predictable and fair.';
    case 'first_come_first_serve':
      return 'Dates are available to book on a first-come, first-served basis. Flexible but competitive.';
    case 'lottery':
      return 'Dates are assigned through periodic lotteries. Random but fair distribution.';
    default:
      return 'Select an allocation model for your organization.';
  }
}

/**
 * Get the display name for an allocation model
 */
export function getAllocationModelDisplayName(allocationType: AllocationModel): string {
  switch (allocationType) {
    case 'rotating_selection':
      return 'Rotating Selection (Snake Draft)';
    case 'static_weeks':
      return 'Rotating Week Assignments';
    case 'first_come_first_serve':
      return 'First Come, First Served';
    case 'lottery':
      return 'Lottery System';
    default:
      return 'Unknown';
  }
}

/**
 * Sample data generators for test organizations
 */
export const sampleOrganizationContacts = {
  admin_name: "Sarah Johnson",
  admin_email: "sarah.johnson@testcabin.com",
  admin_phone: "(555) 123-4567",
  treasurer_name: "Michael Chen",
  treasurer_email: "michael.chen@testcabin.com",
  treasurer_phone: "(555) 234-5678",
  calendar_keeper_name: "Emily Rodriguez",
  calendar_keeper_email: "emily.rodriguez@testcabin.com",
  calendar_keeper_phone: "(555) 345-6789",
};

export const sampleFamilyGroups = [
  {
    name: "The Johnsons",
    lead_name: "Robert Johnson",
    lead_email: "robert.johnson@testcabin.com",
    lead_phone: "(555) 111-1111",
    host_members: [
      { name: "Lisa Johnson", phone: "(555) 111-1112", email: "lisa.johnson@testcabin.com" },
      { name: "David Johnson", phone: "(555) 111-1113", email: "david.johnson@testcabin.com" },
      { name: "Jennifer Johnson", phone: "(555) 111-1114", email: "jennifer.johnson@testcabin.com" },
    ],
  },
  {
    name: "The Smiths",
    lead_name: "Amanda Smith",
    lead_email: "amanda.smith@testcabin.com",
    lead_phone: "(555) 222-2222",
    host_members: [
      { name: "Mark Smith", phone: "(555) 222-2223", email: "mark.smith@testcabin.com" },
      { name: "Katie Smith", phone: "(555) 222-2224", email: "katie.smith@testcabin.com" },
    ],
  },
  {
    name: "The Williams",
    lead_name: "Thomas Williams",
    lead_email: "thomas.williams@testcabin.com",
    lead_phone: "(555) 333-3333",
    host_members: [
      { name: "Susan Williams", phone: "(555) 333-3334", email: "susan.williams@testcabin.com" },
      { name: "James Williams", phone: "(555) 333-3335", email: "james.williams@testcabin.com" },
      { name: "Rachel Williams", phone: "(555) 333-3336", email: "rachel.williams@testcabin.com" },
      { name: "Chris Williams", phone: "(555) 333-3337", email: "chris.williams@testcabin.com" },
    ],
  },
  {
    name: "The Browns",
    lead_name: "Michelle Brown",
    lead_email: "michelle.brown@testcabin.com",
    lead_phone: "(555) 444-4444",
    host_members: [
      { name: "Kevin Brown", phone: "(555) 444-4445", email: "kevin.brown@testcabin.com" },
      { name: "Ashley Brown", phone: "(555) 444-4446", email: "ashley.brown@testcabin.com" },
    ],
  },
];

export const sampleReceipts = [
  { description: "Groceries for Welcome Basket", amount: 45.67, date: "2024-01-15", family_group: "The Johnsons" },
  { description: "Cabin Deep Cleaning Service", amount: 150.0, date: "2024-01-20", family_group: "The Smiths" },
  { description: "New Kitchen Towels and Linens", amount: 78.99, date: "2024-01-25", family_group: "The Williams" },
  { description: "Coffee and Tea Supplies", amount: 32.5, date: "2024-02-01", family_group: "The Browns" },
  { description: "Firewood Delivery", amount: 120.0, date: "2024-02-05" },
  { description: "Plumbing Repair", amount: 285.0, date: "2024-02-10", family_group: "The Johnsons" },
  { description: "Guest Wi-Fi Upgrade", amount: 89.99, date: "2024-02-15" },
  { description: "Hot Tub Maintenance", amount: 175.0, date: "2024-02-20", family_group: "The Smiths" },
];

export const sampleReservationSettings = {
  property_name: "Mountain View Cabin",
  address: "123 Pine Ridge Trail, Mountain View, CO 80424",
  bedrooms: 4,
  bathrooms: 3,
  max_guests: 8,
  nightly_rate: 250.0,
  cleaning_fee: 125.0,
  pet_fee: 50.0,
  damage_deposit: 500.0,
  financial_method: "Venmo @CabinBuddy",
};

/**
 * Generate sample reservations for a test organization
 */
export function generateSampleReservations(
  familyGroups: string[],
  startYear: number = new Date().getFullYear()
): Array<{
  family_group: string;
  start_date: string;
  end_date: string;
  guest_count: number;
  status: string;
}> {
  const reservations: Array<{
    family_group: string;
    start_date: string;
    end_date: string;
    guest_count: number;
    status: string;
  }> = [];

  // Generate 2 reservations per family group
  familyGroups.forEach((group, index) => {
    // First reservation: Spring
    const springStart = new Date(startYear, 3, 1 + index * 7); // April
    const springEnd = new Date(springStart);
    springEnd.setDate(springEnd.getDate() + 5);

    reservations.push({
      family_group: group,
      start_date: springStart.toISOString().split('T')[0],
      end_date: springEnd.toISOString().split('T')[0],
      guest_count: 4 + (index % 3),
      status: 'confirmed',
    });

    // Second reservation: Summer
    const summerStart = new Date(startYear, 6, 10 + index * 7); // July
    const summerEnd = new Date(summerStart);
    summerEnd.setDate(summerEnd.getDate() + 7);

    reservations.push({
      family_group: group,
      start_date: summerStart.toISOString().split('T')[0],
      end_date: summerEnd.toISOString().split('T')[0],
      guest_count: 5 + (index % 4),
      status: 'confirmed',
    });
  });

  return reservations;
}

/**
 * Generate sample payments for test financial data
 */
export function generateSamplePayments(
  familyGroups: string[],
  reservations: Array<{ family_group: string; start_date: string; end_date: string }>
): Array<{
  family_group: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'partial' | 'cancelled';
  payment_type: 'use_fee' | 'cleaning_fee' | 'damage_deposit' | 'late_fee' | 'other' | 'pet_fee' | 'refund' | 'reservation_balance' | 'reservation_deposit' | 'full_payment';
  description: string;
  due_date: string;
}> {
  return reservations.map((res, index) => {
    const nights = Math.ceil(
      (new Date(res.end_date).getTime() - new Date(res.start_date).getTime()) / (1000 * 60 * 60 * 24)
    );
    const amount = nights * 250; // $250/night
    
    const statuses: Array<'paid' | 'pending' | 'overdue'> = ['paid', 'pending', 'overdue'];

    return {
      family_group: res.family_group,
      amount,
      status: statuses[index % 3],
      payment_type: 'use_fee' as const,
      description: `Use fee for ${res.start_date} to ${res.end_date}`,
      due_date: res.start_date,
    };
  });
}

/**
 * Validate that an organization's data is properly isolated
 * Returns issues found or empty array if valid
 */
export function validateOrganizationIsolation(
  organizationId: string,
  isTestOrganization: boolean
): { field: string; issue: string }[] {
  const issues: { field: string; issue: string }[] = [];

  if (!organizationId) {
    issues.push({ field: 'organizationId', issue: 'Organization ID is required' });
  }

  // Additional validation logic can be added here
  // For example, checking for cross-organization references

  return issues;
}
