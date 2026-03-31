

# Move Completed Trades to History Only + Add Cancel Button

## Changes

**1. TradeRequestsManager.tsx: Filter outgoing to pending only**
- Change `outgoingRequests` filter to include only `status === 'pending'`
- History tab already correctly shows non-pending trades

**2. TradeRequestsManager.tsx: Add cancel button on outgoing pending requests**
- Add a "Cancel Request" button to `TradeRequestCard` when the request is outgoing and pending
- Wire it to `updateTradeRequest` with `status: 'cancelled'`

**3. useTradeRequests.ts: No changes needed**
- `updateTradeRequest` already supports setting status to `'cancelled'`

## Technical details
- Incoming tab already filters for `pending` only -- no change needed there
- Outgoing filter changes from `requester_family_group === userFamilyGroup` to also require `status === 'pending'`
- Cancel button calls existing `updateTradeRequest(id, { status: 'cancelled' })`
- Once cancelled, the request moves to History automatically

