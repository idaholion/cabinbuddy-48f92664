/**
 * Admin-configurable payment methods for the "Other Payment Options" dialog.
 *
 * The config is stored on reservation_settings.payment_methods_config (jsonb).
 * When it is missing/null we fall back to the historical hardcoded list,
 * seeded with whatever Venmo / PayPal / check info the org already saved.
 */

export interface PaymentMethodOption {
  /** Stable key. Non-enum keys (zelle, credit_card, custom-*) are stored as `other`. */
  key: string;
  label: string;
  enabled: boolean;
  /** Shown in the list but greyed out / unselectable */
  comingSoon?: boolean;
  /** Account info / instructions shown when the method is selected */
  instructions?: string;
  /** Label for the reference / confirmation number field */
  referenceLabel?: string;
  sortOrder: number;
  isCustom?: boolean;
}

/** Payment method values that actually exist in the DB payment_method enum */
const DB_PAYMENT_METHODS = new Set([
  'cash',
  'check',
  'venmo',
  'paypal',
  'bank_transfer',
  'stripe',
  'other',
]);

/** Map a config key to a value the payments table accepts */
export const toDbPaymentMethod = (key: string): string =>
  DB_PAYMENT_METHODS.has(key) ? key : 'other';

export interface PaymentMethodSeed {
  venmoHandle?: string;
  paypalEmail?: string;
  checkPayableTo?: string;
  checkMailingAddress?: string;
}

export const buildDefaultPaymentMethods = (seed: PaymentMethodSeed = {}): PaymentMethodOption[] => {
  const checkInstructions = [
    seed.checkPayableTo ? `Make check payable to: ${seed.checkPayableTo}` : '',
    seed.checkMailingAddress ? `Mail to: ${seed.checkMailingAddress}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return [
    {
      key: 'check',
      label: 'Check',
      enabled: true,
      instructions: checkInstructions,
      referenceLabel: 'Additional Reference (optional)',
      sortOrder: 0,
    },
    { key: 'cash', label: 'Cash', enabled: true, referenceLabel: 'Payment Reference/Confirmation #', sortOrder: 1 },
    {
      key: 'venmo',
      label: 'Venmo',
      enabled: true,
      instructions: seed.venmoHandle ? `Send Venmo payment to: ${seed.venmoHandle}` : '',
      referenceLabel: 'Venmo Transaction ID',
      sortOrder: 2,
    },
    { key: 'zelle', label: 'Zelle', enabled: true, referenceLabel: 'Zelle Confirmation #', sortOrder: 3 },
    {
      key: 'paypal',
      label: 'PayPal',
      enabled: true,
      instructions: seed.paypalEmail ? `Send PayPal payment to: ${seed.paypalEmail}` : '',
      referenceLabel: 'PayPal Transaction ID',
      sortOrder: 4,
    },
    { key: 'bank_transfer', label: 'Bank Transfer', enabled: true, referenceLabel: 'Transfer Confirmation #', sortOrder: 5 },
    { key: 'credit_card', label: 'Credit Card', enabled: true, referenceLabel: 'Authorization / Last 4', sortOrder: 6 },
    { key: 'other', label: 'Other', enabled: true, referenceLabel: 'Payment Reference/Confirmation #', sortOrder: 7 },
  ];
};

/**
 * Merge a stored config with the defaults so newly added built-in methods
 * still appear, and return the list sorted for display.
 */
export const resolvePaymentMethods = (
  stored: unknown,
  seed: PaymentMethodSeed = {},
): PaymentMethodOption[] => {
  const defaults = buildDefaultPaymentMethods(seed);

  if (!Array.isArray(stored) || stored.length === 0) return defaults;

  const storedList = (stored as PaymentMethodOption[]).filter((m) => m && typeof m.key === 'string');
  const byKey = new Map(storedList.map((m) => [m.key, m]));

  const merged: PaymentMethodOption[] = defaults.map((d) => {
    const s = byKey.get(d.key);
    byKey.delete(d.key);
    if (!s) return d;
    return {
      ...d,
      ...s,
      label: s.label || d.label,
      referenceLabel: s.referenceLabel || d.referenceLabel,
      instructions: s.instructions ?? d.instructions,
      enabled: s.enabled !== false,
      sortOrder: typeof s.sortOrder === 'number' ? s.sortOrder : d.sortOrder,
    };
  });

  // Custom methods the admin added
  byKey.forEach((s) => {
    merged.push({
      key: s.key,
      label: s.label || 'Custom',
      enabled: s.enabled !== false,
      comingSoon: s.comingSoon,
      instructions: s.instructions,
      referenceLabel: s.referenceLabel || 'Payment Reference/Confirmation #',
      sortOrder: typeof s.sortOrder === 'number' ? s.sortOrder : 99,
      isCustom: true,
    });
  });

  return merged.sort((a, b) => a.sortOrder - b.sortOrder);
};

/** Methods shown in the dropdown (coming-soon ones render greyed out) */
export const visiblePaymentMethods = (methods: PaymentMethodOption[]): PaymentMethodOption[] =>
  methods.filter((m) => m.enabled);
