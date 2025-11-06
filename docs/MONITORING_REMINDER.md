# Notification System Monitoring - TODO

## Overview
This document tracks the need for a comprehensive notification monitoring dashboard to address current visibility gaps in the automated notification system.

## Current System Status
✅ **Working Components:**
- Automated email notifications via Resend (confirmed working)
- Daily cron job at 3:00 PM UTC checking selection turn changes
- Email delivery tracking via Resend dashboard
- Selection turn notification tracking in `selection_turn_notifications_sent` table

⚠️ **Known Gaps:**
- SMS delivery status not logged to database
- pg_cron invocations don't appear in edge function analytics
- No unified view of notification history (email + SMS)
- Limited visibility into SMS failures or Twilio errors

## SMS Delivery Status Mystery
**Question:** Are SMS messages being sent successfully?

**Current State:**
- Twilio credentials are configured in Supabase
- Phone numbers are passed to notification functions
- SMS sending code exists in `send-notification` function
- No database logging of SMS attempts or outcomes

**Investigation Needed:**
1. Check Twilio dashboard for SMS delivery logs
2. Verify phone number format and validation
3. Confirm SMS billing/quota status
4. Review Twilio error logs if available

## Proposed Monitoring Dashboard

### Key Features Needed:
1. **Unified Notification History View**
   - Show all notification attempts (email + SMS)
   - Display success/failure status for each channel
   - Include timestamp, recipient, and message type
   - Filter by organization, date range, notification type

2. **SMS Status Tracking**
   - Log all SMS attempts to `notification_log` table
   - Track Twilio response status
   - Display delivery confirmations
   - Show error messages for failed attempts

3. **Real-Time Monitoring**
   - Dashboard showing recent notification activity
   - Alert system for notification failures
   - SMS quota/usage tracking
   - Email bounce/complaint tracking

4. **Analytics & Reporting**
   - Delivery success rates by channel
   - Most common failure reasons
   - Notification volume trends
   - Cost tracking (SMS usage)

## Database Schema Updates Needed

### Add SMS Status to notification_log
```sql
ALTER TABLE notification_log
ADD COLUMN sms_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN sms_status TEXT,
ADD COLUMN sms_error TEXT,
ADD COLUMN twilio_sid TEXT;
```

### Create notification_attempts table (alternative)
```sql
CREATE TABLE notification_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  notification_type TEXT NOT NULL,
  recipient_email TEXT,
  recipient_phone TEXT,
  family_group TEXT,
  email_sent BOOLEAN DEFAULT FALSE,
  email_status TEXT,
  email_error TEXT,
  sms_sent BOOLEAN DEFAULT FALSE,
  sms_status TEXT,
  sms_error TEXT,
  twilio_sid TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);
```

## Related Tables & Functions

### Current Tables:
- `notification_log` - Tracks notification events (limited info)
- `selection_turn_notifications_sent` - Tracks selection notifications
- `reminder_templates` - Custom notification templates
- `organizations` - Calendar keeper notification settings

### Edge Functions:
- `send-notification` - Main notification sender
- `send-selection-turn-notification` - Selection-specific sender
- `check-selection-turn-changes` - Daily cron job
- `send-reminder-notifications` - Automated reminders

### Useful Links:
- [Edge Functions Dashboard](https://supabase.com/dashboard/project/ftaxzdnrnhktzbcsejoy/functions)
- [Edge Function Logs (send-notification)](https://supabase.com/dashboard/project/ftaxzdnrnhktzbcsejoy/functions/send-notification/logs)
- [Edge Function Logs (check-selection-turn-changes)](https://supabase.com/dashboard/project/ftaxzdnrnhktzbcsejoy/functions/check-selection-turn-changes/logs)
- [SQL Editor](https://supabase.com/dashboard/project/ftaxzdnrnhktzbcsejoy/sql/new)

## Action Items

### High Priority:
- [ ] Create notification monitoring dashboard page
- [ ] Add SMS status tracking to database
- [ ] Update edge functions to log SMS attempts
- [ ] Add unified notification history view

### Medium Priority:
- [ ] Create notification analytics reports
- [ ] Add SMS quota/usage tracking
- [ ] Implement failure alert system
- [ ] Add Twilio dashboard integration

### Low Priority:
- [ ] Add notification cost tracking
- [ ] Create notification success rate metrics
- [ ] Add historical trend analysis
- [ ] Build notification testing interface

## Investigation Steps Completed (2025-01-XX)
1. ✅ Confirmed RESEND_API_KEY is configured in Supabase (not via Lovable secrets)
2. ✅ Verified emails are being sent successfully (Resend dashboard shows deliveries)
3. ✅ Identified pg_cron invocations don't generate analytics logs
4. ⏳ SMS delivery status still unknown - needs Twilio dashboard check
5. ⏳ Need to update edge functions to improve logging

## Next Steps
1. Check Twilio dashboard for SMS delivery logs
2. Implement database logging for SMS status
3. Update edge functions with improved error handling
4. Build monitoring dashboard UI
5. Add notification verification query

---

**Last Updated:** 2025-01-XX  
**Status:** Planning Phase  
**Priority:** High - Critical visibility gap for production system
