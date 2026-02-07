

# CB FAQ Management - Supervisor Page

## Overview

Create a supervisor-only page that allows managing the universal CB Help FAQ items that appear across all organizations. This leverages the existing `cb_faq_items` database table (already created with proper RLS policies) and provides a UI to view, add, edit, and delete FAQ items mapped to specific application routes.

## Current State

### What Exists
- **Database Table**: `cb_faq_items` with columns:
  - `id` (uuid, primary key)
  - `route_path` (text) - The page route this FAQ applies to
  - `question` (text) - The FAQ question
  - `answer` (text) - The FAQ answer
  - `sort_order` (integer) - Display order within the route
  - `is_active` (boolean) - Whether this FAQ is shown
  - `created_at`, `updated_at` (timestamps)
- **RLS Policies**: 
  - Anyone can view active items (SELECT where `is_active = true`)
  - Supervisors can manage all items (ALL operations)

### What's Missing
- No management UI for supervisors
- No hook to fetch/update CB FAQ items
- The `CBHelpButton` still uses hardcoded `faqData` from `src/data/faqData.ts`
- The table is currently empty (no seed data)

## Implementation Plan

### Phase 1: Create Data Hook

**New File: `src/hooks/useCBFaqItems.ts`**

A custom hook to manage CB FAQ items:

```text
Features:
- Fetch all CB FAQ items (for supervisors)
- Fetch active items by route (for CBHelpButton)
- Create, update, delete operations
- Uses React Query for caching and optimistic updates
```

### Phase 2: Create CB FAQ Management Component

**New File: `src/components/CBFaqManagement.tsx`**

A supervisor-only component similar to `DefaultFeatureManagement.tsx`:

```text
Layout Structure:
+--------------------------------------------------+
| CB FAQ Management                     [+ Add FAQ] |
| Manage help content shown across all organizations|
+--------------------------------------------------+
| Search: [_______________]  Filter by Route: [▼]   |
+--------------------------------------------------+
| Route: /calendar                                  |
|  +----------------------------------------------+ |
|  | Q: How do I make a reservation?        [Edit]| |
|  | A: Go to Cabin Calendar, click on...   [Del] | |
|  +----------------------------------------------+ |
|  | Q: What is the rotation order?         [Edit]| |
|  | A: The rotation order determines...    [Del] | |
|  +----------------------------------------------+ |
+--------------------------------------------------+
| Route: /check-in                                  |
|  +----------------------------------------------+ |
|  | Q: What are checklists?                [Edit]| |
|  | A: Checklists are task lists for...    [Del] | |
|  +----------------------------------------------+ |
+--------------------------------------------------+
```

Key Features:
- Group FAQ items by route for easy navigation
- Search/filter by route or question text
- Add new FAQ items with route selection
- Edit existing questions and answers
- Toggle active/inactive status
- Reorder items within a route (drag-and-drop)
- Show count of FAQs per route
- Preview button to see how FAQs appear in CB

### Phase 3: Create Supervisor Page

**New File: `src/pages/CBFaqManagementPage.tsx`**

Wrapped with supervisor-only access:

```text
- Uses SupervisorRoute protection
- Includes MainLayout wrapper
- Renders CBFaqManagement component
- PageHeader with icon and description
```

### Phase 4: Add Navigation

**File: `src/App.tsx`**

Add new route:
```typescript
<Route path="/supervisor/cb-faq" element={
  <SupervisorRoute>
    <MainLayout>
      <Suspense fallback={<LoadingSpinner />}>
        <CBFaqManagementPage />
      </Suspense>
    </MainLayout>
  </SupervisorRoute>
} />
```

**File: `src/pages/SupervisorDashboard.tsx`**

Add new tab to supervisor dashboard:
- Add "CB Help" tab to the TabsList
- TabsContent renders `CBFaqManagement` component

**File: `src/components/AppSidebar.tsx`**

Add link under Supervisor section:
```text
Supervisor
├── Dashboard
├── Admin Documentation
├── CB FAQ Management  ← NEW
```

### Phase 5: Integrate with CBHelpButton

**File: `src/components/CBHelpButton.tsx`**

Update to use database-driven FAQ items:

```text
Current (hardcoded):
- Imports faqData from src/data/faqData.ts
- Filters by category mapping

Updated (hybrid approach):
- First, fetch from cb_faq_items by route_path
- If database has items for this route, use those
- If no database items, fall back to hardcoded faqData
- This ensures backward compatibility during migration
```

### Phase 6: Seed Initial Data

Create a migration to populate `cb_faq_items` with the existing route-to-FAQ mappings:

```text
Routes to seed:
- /calendar, /cabin-calendar → 3-4 reservation FAQs
- /check-in → 2-3 check-in FAQs
- /stay-history → 2-3 financial/history FAQs
- /shopping-list, /documents, /photos → 2-3 feature FAQs each
- /family-group-setup → 2-3 admin FAQs
- etc.
```

---

## Technical Details

### Database Schema (Already Exists)

```sql
-- Table: cb_faq_items
-- Already created with these columns:
CREATE TABLE cb_faq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_path TEXT NOT NULL,           -- e.g., '/calendar'
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies (already exist):
-- 1. "Anyone can view active CB FAQ items" - SELECT where is_active = true
-- 2. "Supervisors can manage all CB FAQ items" - ALL ops for is_supervisor()
```

### Route Options for Dropdown

The management UI will offer these routes (matching current `routeToFaqCategories`):

| Route | Display Name |
|-------|--------------|
| `/` | Home (Landing) |
| `/home` | Home Dashboard |
| `/calendar` | Cabin Calendar |
| `/check-in` | Check-In |
| `/checkout-list` | Checkout List |
| `/stay-history` | Stay History |
| `/shopping-list` | Shopping List |
| `/documents` | Documents |
| `/photos` | Photos |
| `/shared-notes` | Shared Notes |
| `/family-group-setup` | Family Group Setup |
| `/reservation-setup` | Reservation Setup |
| `/cabin-rules` | Cabin Rules |
| `/family-voting` | Family Voting |
| `/seasonal-checklists` | Seasonal Checklists |
| `/faq` | FAQ Page |
| `/finance-reports` | Financial Dashboard |
| `/billing` | Billing |

### Component Structure

```text
src/
├── hooks/
│   └── useCBFaqItems.ts          ← NEW: Data fetching hook
├── components/
│   └── CBFaqManagement.tsx       ← NEW: Management UI component
├── pages/
│   └── CBFaqManagementPage.tsx   ← NEW: Supervisor page wrapper
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/hooks/useCBFaqItems.ts` | Create | React Query hook for CB FAQ CRUD operations |
| `src/components/CBFaqManagement.tsx` | Create | Supervisor management UI component |
| `src/pages/CBFaqManagementPage.tsx` | Create | Page wrapper with supervisor protection |
| `src/App.tsx` | Modify | Add route for `/supervisor/cb-faq` |
| `src/pages/SupervisorDashboard.tsx` | Modify | Add "CB Help" tab |
| `src/components/AppSidebar.tsx` | Modify | Add sidebar link under Supervisor section |
| `src/components/CBHelpButton.tsx` | Modify | Fetch from database with fallback to hardcoded data |

---

## User Experience Flow

1. **Supervisor navigates to CB FAQ Management** via sidebar or supervisor dashboard tab
2. **Views all FAQ items** grouped by route, with search and filter options
3. **Adds new FAQ** by clicking "Add FAQ", selecting a route, entering question and answer
4. **Edits existing FAQ** by clicking edit icon, modifying content, saving
5. **Toggles visibility** using active/inactive switch
6. **Reorders FAQs** within a route by dragging items
7. **Users see updated FAQs** immediately in the CB Help button on any page

