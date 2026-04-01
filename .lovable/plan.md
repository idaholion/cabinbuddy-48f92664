
# Fix Trade Notification Recipients

## Problem
Trade notifications are sent to ALL host_members of both family groups. They should only go to:
1. The specific requester (individual who made the request)
2. The specific target host (individual who owns the reservation)
3. The organization admin

## Changes (send-trade-notification/index.ts)

### request_created:
- **Target**: Use `target_host_email`/`target_host_name` only (already done correctly when `hasSpecificHost` is true)
- **Requester**: Instead of `getHostMemberRecipients(requesterGroup)` (all members), use `requester_email` from trade_requests table + find their phone from host_members
- **Admin**: Already correct (CC'd once)

### request_approved:
- **Requester notification**: Use `requester_email` only (not all requester group members)
- **Target confirmation**: Use `target_host_email` only (not all target group members)
- **Admin**: Add admin CC

### request_rejected:
- Same pattern as approved — use specific individuals only
- **Admin**: Add admin CC
