

# Add Pending Trade Request Banner

## Overview
Add a persistent alert banner at the top of every page (in MainLayout) that appears when the logged-in user has pending incoming trade requests. The banner will show a count and a button that navigates to the trade requests page.

## What gets built

**1. New component: `PendingTradeRequestBanner`**
- Queries `trade_requests` table for pending requests where the user's family group is the `target_family_group`
- Shows an alert banner (similar style to `GuestAccessBanner` / `TestOrganizationBanner`) with:
  - Icon + message: "You have X pending trade request(s)"
  - A "Review" button that links to the trade requests page (or the calendar page where TradeRequestsManager lives)
- Hidden when there are zero pending requests
- Uses the existing `useTradeRequests` hook and `useFamilyGroups` to determine the user's family group and filter incoming pending requests

**2. Add to MainLayout**
- Insert `<PendingTradeRequestBanner />` alongside the existing banners (after `ProfileClaimingPrompt`)

**3. Navigation target**
- Need to confirm where TradeRequestsManager is rendered (likely a tab on the calendar or a dedicated route) so the "Review" button links to the right place

## Technical details
- Reuses existing `useTradeRequests` hook for data fetching
- Reuses `useFamilyGroups` + `useAuth` to match user to their family group (same pattern as `TradeRequestsManager`)
- Uses the `Alert` UI component with a warm/attention-grabbing style
- No new database queries or migrations needed

