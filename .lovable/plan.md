

## Bug Fix: "Failed to fetch available colors" for non-supervisor admins

### Root Cause

The `get_available_colors` database function is declared as `STABLE`, which tells PostgreSQL it performs no writes. However, for non-supervisor users, it calls `validate_organization_access()`, which performs an INSERT into the `organization_access_audit` table. PostgreSQL rejects this INSERT because it violates the `STABLE` contract, producing the error: **"cannot execute INSERT in a read-only transaction"**.

Supervisors are unaffected because they pass the `is_supervisor()` check and skip the `validate_organization_access()` call entirely -- which is why this only shows up for Paul (a non-supervisor admin).

### Fix

Create a new migration that re-declares `get_available_colors` without the `STABLE` keyword, changing it to `VOLATILE` (the default). This allows the audit INSERT inside `validate_organization_access` to succeed.

The single change is on line 5 of the function definition:
- **Before**: `STABLE SECURITY DEFINER`
- **After**: `SECURITY DEFINER`

Everything else in the function remains identical.

### Technical Details

- **File to create**: A new SQL migration file
- **Change**: Remove `STABLE` from the `get_available_colors` function declaration so it becomes `VOLATILE` (the PostgreSQL default), allowing the audit INSERT to execute
- **Risk**: Minimal. Removing `STABLE` means PostgreSQL won't cache/optimize repeated calls within a single query, but this function is only called once per user interaction so there is no performance impact
- **No frontend changes needed** -- the existing `FamilyGroupColorPicker.tsx` and other callers will work as-is once the database function is fixed

