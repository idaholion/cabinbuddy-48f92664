# Data Isolation Guide

**Created:** 2025-11-20  
**Last Updated:** 2025-11-20  
**Version:** 1.0

## Overview

This guide explains how to use the secure query wrapper to ensure proper data isolation between organizations. The secure query wrapper (`src/lib/secure-queries.ts`) provides automatic organization context validation and prevents cross-organization data access.

---

## Quick Start

### 1. Import the Secure Query Functions

```typescript
import {
  secureSelect,
  secureInsert,
  secureUpdate,
  secureDelete,
  secureRpc,
  createOrganizationContext,
  OrganizationContext
} from '@/lib/secure-queries';
```

### 2. Get Organization Context

In your component or hook, get the organization context:

```typescript
import { useOrganizationContext } from '@/hooks/useOrganizationContext';

const {
  organizationId,
  isTestOrganization,
  getAllocationModel
} = useOrganizationContext();

// Create context object
const orgContext = createOrganizationContext(
  organizationId,
  isTestOrganization,
  getAllocationModel()
);
```

### 3. Use Secure Queries

Replace direct Supabase queries with secure wrappers:

```typescript
// ❌ OLD WAY - No automatic organization filtering
const { data } = await supabase
  .from('payments')
  .select('*')
  .eq('organization_id', organizationId); // Easy to forget!

// ✅ NEW WAY - Automatic organization filtering
const { data } = await secureSelect('payments', orgContext);
```

---

## Core Functions

### `secureSelect(tableName, context, options?)`

Automatically filters SELECT queries by organization_id.

```typescript
// Basic usage
const { data, error } = await secureSelect('family_groups', orgContext);

// With additional filters
const { data, error } = await secureSelect('payments', orgContext)
  .eq('status', 'paid')
  .order('created_at', { ascending: false });

// Skip isolation for supervisor queries (use with caution!)
const { data, error } = await secureSelect('organizations', orgContext, {
  skipIsolation: true
});
```

### `secureInsert(tableName, data, context, options?)`

Automatically injects organization_id into inserted data.

```typescript
// Single insert
await secureInsert('payments', {
  amount: 100,
  family_group: 'Smith Family',
  status: 'pending'
}, orgContext);
// organization_id is automatically added

// Bulk insert
await secureInsert('payments', [
  { amount: 100, family_group: 'Smith' },
  { amount: 200, family_group: 'Jones' }
], orgContext);
// organization_id is automatically added to all records

// Test organization - automatically marks as test data
await secureInsert('payments', paymentData, testOrgContext);
// Both organization_id and is_test_data are added
```

### `secureUpdate(tableName, data, context, options?)`

Automatically filters UPDATE queries by organization_id.

```typescript
// Update with automatic organization filtering
await secureUpdate('payments', {
  status: 'paid',
  paid_date: new Date().toISOString()
}, orgContext)
  .eq('id', paymentId);
// Only updates records in the current organization
```

### `secureDelete(tableName, context, options?)`

Automatically filters DELETE queries by organization_id.

```typescript
// Delete with automatic organization filtering
await secureDelete('payments', orgContext)
  .eq('id', paymentId);
// Only deletes records in the current organization
```

### `secureRpc(functionName, params, context, options?)`

Calls RPC functions with organization context validation.

```typescript
// RPC call with automatic organization_id injection
const { data, error } = await secureRpc(
  'rename_family_group',
  {
    p_old_name: 'Old Name',
    p_new_name: 'New Name'
  },
  orgContext
);
// p_organization_id is automatically added
```

---

## Advanced Usage

### Type Safety with assertOrganizationOwnership

Validate that data belongs to the current organization:

```typescript
import { assertOrganizationOwnership } from '@/lib/secure-queries';

// Single record validation
const payment = await fetchPayment(id);
assertOrganizationOwnership(payment, orgContext);
// Throws OrganizationContextError if mismatch

// Array validation
const payments = await fetchPayments();
assertOrganizationOwnership(payments, orgContext);
// Validates all records
```

### Audit Cross-Organization Access Attempts

Log suspicious access attempts:

```typescript
import { auditCrossOrganizationAccess } from '@/lib/secure-queries';

// Check if attempted access is to different organization
const isValid = await auditCrossOrganizationAccess(
  attemptedOrgId,
  currentOrgContext,
  'payments',
  'SELECT'
);

if (!isValid) {
  // Access denied - audit log created
  throw new Error('Cross-organization access denied');
}
```

### Supervisor Queries

For supervisor-specific components that need cross-organization access:

```typescript
import { supervisorQuery } from '@/lib/secure-queries';

// Query specific organization (supervisors only)
const { data } = await supervisorQuery('payments', targetOrgId);

// Query all organizations (supervisors only)
const { data } = await supervisorQuery('organizations');
```

**⚠️ WARNING:** Only use `supervisorQuery` in components protected by `ProtectedSupervisorRoute` or with explicit supervisor checks.

---

## Migration Guide

### Converting Existing Hooks

**Step 1:** Add organization context at the top of your hook

```typescript
const { organizationId, isTestOrganization, getAllocationModel } = useOrganizationContext();

const orgContext = createOrganizationContext(
  organizationId,
  isTestOrganization,
  getAllocationModel()
);
```

**Step 2:** Replace Supabase queries with secure wrappers

```typescript
// Before
const { data } = await supabase
  .from('payments')
  .select('*')
  .eq('organization_id', organizationId)
  .eq('status', 'pending');

// After
const { data } = await secureSelect('payments', orgContext)
  .eq('status', 'pending');
```

**Step 3:** Test thoroughly

- Verify organization filtering works
- Check that test organization data is marked correctly
- Ensure error handling works for missing context

### Example: Converting usePayments Hook

```typescript
// BEFORE
export const usePayments = () => {
  const { activeOrganization } = useMultiOrganization();
  
  const { data } = useQuery({
    queryKey: ['payments', activeOrganization?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('organization_id', activeOrganization?.organization_id);
      
      if (error) throw error;
      return data;
    }
  });
};

// AFTER
import { secureSelect, createOrganizationContext } from '@/lib/secure-queries';
import { useOrganizationContext } from '@/hooks/useOrganizationContext';

export const usePayments = () => {
  const { organizationId, isTestOrganization, getAllocationModel } = useOrganizationContext();
  
  const orgContext = createOrganizationContext(
    organizationId,
    isTestOrganization,
    getAllocationModel()
  );
  
  const { data } = useQuery({
    queryKey: ['payments', organizationId],
    queryFn: async () => {
      const { data, error } = await secureSelect('payments', orgContext);
      
      if (error) throw error;
      return data;
    },
    enabled: !!orgContext // Don't run query without context
  });
};
```

---

## Error Handling

### OrganizationContextError

Thrown when organization context is missing or invalid:

```typescript
try {
  await secureSelect('payments', null);
} catch (error) {
  if (error instanceof OrganizationContextError) {
    // Handle missing context
    toast({
      title: 'Organization Required',
      description: error.message,
      variant: 'destructive'
    });
  }
}
```

### Common Error Scenarios

1. **Missing Organization Context**
   ```
   Error: Organization context is required. Ensure you are using 
   useOrganizationContext() and have an active organization.
   ```
   **Solution:** Ensure user has selected an organization

2. **Cross-Organization Data Access**
   ```
   Error: Data belongs to organization abc123, but current 
   context is xyz789
   ```
   **Solution:** This indicates a potential security issue - investigate immediately

---

## Best Practices

### ✅ DO

- Always use secure query wrappers for organization-scoped data
- Create organization context at the top of your hook/component
- Enable query only when context exists (`enabled: !!orgContext`)
- Use `assertOrganizationOwnership` when receiving data from external sources
- Add test organization warnings in UI components

### ❌ DON'T

- Don't use raw Supabase queries for organization-scoped tables
- Don't manually add organization_id filters (let the wrapper do it)
- Don't use `skipIsolation` option unless absolutely necessary
- Don't use `supervisorQuery` in non-supervisor components
- Don't forget to handle `OrganizationContextError`

---

## Testing

### Test Organization Detection

The secure query wrapper automatically detects test organizations:

```typescript
// Test organization context
const testContext = createOrganizationContext(
  'test-org-id',
  true, // is_test_organization = true
  'rotating_selection'
);

// All inserts automatically marked as test data
await secureInsert('payments', paymentData, testContext);
// Adds: organization_id AND is_test_data: true
```

### Console Warnings

When operating on test organization data:

```
[SECURE QUERY] Operating on TEST organization data: test-org-id
```

This helps developers identify when they're working with test data during development.

---

## Security Considerations

### Audit Logging

All cross-organization access attempts are logged to `organization_access_audit` table:

- User ID
- Attempted organization ID
- Current organization ID
- Table name
- Operation type (SELECT, INSERT, UPDATE, DELETE)
- Success/failure status
- Error message

### RLS Policies

The secure query wrapper works **in addition to** Row-Level Security (RLS) policies, not as a replacement. RLS policies provide defense-in-depth at the database level.

### Supervisor Access

Supervisors have special privileges to access cross-organization data. This access is:

- Explicitly granted through `supervisorQuery` function
- Logged and auditable
- Should be used sparingly and only in supervisor-specific components

---

## Troubleshooting

### Query Not Filtering by Organization

**Symptom:** Data from multiple organizations appearing in results

**Solution:** Verify you're using `secureSelect` instead of raw Supabase query

### Test Data Not Being Marked

**Symptom:** `is_test_data` column not being set to `true`

**Solution:** Ensure `isTestOrganization` is passed correctly to `createOrganizationContext`

### Type Errors

**Symptom:** TypeScript errors with `as any` casts

**Solution:** This is expected - the secure wrapper uses dynamic table names which aren't type-safe. The wrapper provides runtime safety instead.

---

## Roadmap

Future enhancements to the secure query wrapper:

- [ ] Add support for `.single()` queries
- [ ] Add support for `.maybeSingle()` queries
- [ ] Implement query performance monitoring
- [ ] Add automatic retry logic for network errors
- [ ] Create TypeScript type generators for better type safety
- [ ] Add query caching layer
- [ ] Implement rate limiting for suspicious patterns

---

## Related Documentation

- [Implementation Tracker](./IMPLEMENTATION_TRACKER.md) - Overall progress tracking
- [Monitoring Reminder](./MONITORING_REMINDER.md) - Monitoring and alerts
- [Date Handling Guide](./DATE_HANDLING_GUIDE.md) - Date handling best practices

---

## Support

For questions or issues with data isolation:

1. Check this guide first
2. Review the implementation tracker
3. Check console for `[SECURE QUERY]` warnings
4. Review `organization_access_audit` table for suspicious activity
5. Contact development team if security issue suspected
