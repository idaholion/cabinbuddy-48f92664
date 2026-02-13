

## Make "Feedback" Actually Reach the Supervisor

### The Problem Today
The existing Feedback button has a nice form (type, title, description, email) but it only `console.log`s the data -- nothing is stored or sent anywhere.

### What Changes

**1. Create a `feedback` database table** to store submissions so the supervisor can see them.

Columns:
- `id` (uuid, primary key)
- `organization_id` (uuid, nullable -- in case submitted from outside an org context)
- `user_id` (uuid, nullable)
- `type` (text -- bug, feature, improvement, general, plus a new "supervisor_request" type)
- `title` (text)
- `description` (text)
- `email` (text, nullable)
- `page` (text -- which page they were on)
- `status` (text -- "new", "reviewed", "resolved", default "new")
- `supervisor_notes` (text, nullable -- for supervisor to add response notes)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

RLS policies:
- Users can INSERT their own feedback
- Users can SELECT their own feedback (by user_id)
- Supervisors can SELECT/UPDATE all feedback

**2. Update `src/hooks/useFeedback.ts`**
- Replace the `console.log` + fake delay with an actual Supabase insert into the `feedback` table
- Include `organization_id` from context and `user_id` from auth

**3. Update `src/components/FeedbackButton.tsx`**
- Add a new feedback type option: "Supervisor Request" (for login email changes, complaints, etc.)
- Keep existing types (bug, feature, improvement, general)
- Update the dialog title/description to clarify this reaches the supervisor

**4. Add a "Feedback Inbox" section to the Supervisor Dashboard**
- New tab called "Feedback Inbox" in `src/pages/SupervisorDashboard.tsx`
- Shows all feedback submissions across all organizations
- Displays type, title, description, submitter email, organization, date, and status
- Supervisor can mark items as "reviewed" or "resolved" and add notes
- Badge showing count of unread/new items on the tab

### What Users Will Experience
- Click the existing "Feedback" button (available on FAQ page, Index page, etc.)
- Choose a type (including "Supervisor Request" for things like login email changes)
- Fill in title, description, and optionally their email
- Submit -- it gets stored in the database
- The supervisor sees it in their dashboard and can act on it

### Technical Details Summary

| File | Change |
|------|--------|
| New migration | Create `feedback` table with RLS |
| `src/hooks/useFeedback.ts` | Replace console.log with Supabase insert |
| `src/components/FeedbackButton.tsx` | Add "Supervisor Request" type option |
| `src/pages/SupervisorDashboard.tsx` | Add "Feedback Inbox" tab with list + status management |

No new edge functions needed -- this is all direct database operations.

