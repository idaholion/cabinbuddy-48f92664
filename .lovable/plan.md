

# Display Individual Names on Trade Requests

## Overview
Trade requests currently show family group names (e.g., "Andrew Family → Woolf Family") instead of the individual people involved (e.g., "Richard → Barb"). The `target_host_name` is already stored in the database, but the requester's name is not. We need to add a `requester_name` column and update both the creation and display logic.

## Changes

**1. Database migration: add `requester_name` column to `trade_requests`**
- Add `requester_name text` column (nullable, for backward compatibility)

**2. TradeRequestForm.tsx: save requester's name when creating a trade request**
- Look up the current user's name from their family group's `host_members` data (firstName + lastName) or from `user.user_metadata`
- Pass `requester_name` in the trade data alongside `requester_user_id`

**3. useTradeRequests.ts: add `requester_name` to the data interface and insert logic**
- Update `TradeRequestData` interface to include optional `requester_name`
- Include it in the insert payload

**4. TradeRequestsManager.tsx: display individual names instead of family group names**
- In the `TradeRequestCard`, show `request.requester_name` (falling back to `request.requester_family_group`) and `request.target_host_name` (falling back to `request.target_family_group`)
- Format: "Richard → Barb" with family group shown as secondary info

**5. PendingTradeRequestBanner.tsx: update banner text to show individual names**
- Same fallback pattern for the banner message text

**6. Update types.ts** (will auto-regenerate with migration, but may need manual update)

## Technical details
- The `target_host_name` column already exists and is populated by the form
- Only need to add `requester_name` column
- Fallback to family group name ensures backward compatibility with existing trade requests
- No changes needed to the execute-trade Edge Function (it already handles individual names)

