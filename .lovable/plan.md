

## Embed Economic Survey Data in the Documents Page

The Documents page is currently a flat file upload/management page. We'll add a **tab structure** so that the existing document management becomes one tab, and the Economic Impact Survey data becomes a second tab.

### Changes

**`src/pages/Documents.tsx`**
- Wrap the existing content in a `Tabs` component with two tabs:
  - **"Documents"** — contains all existing document upload/management UI (no changes to functionality)
  - **"Economic Impact Survey"** — contains the survey responses content (moved from the standalone `SurveyResponses` page)
- Import `Tabs, TabsContent, TabsList, TabsTrigger` from `@/components/ui/tabs`
- Import `useSurveyResponses` and render the summary cards, category breakdown, and detailed table inline
- Update the page title/header to be more general (e.g., "Documents & Reports")

**`src/App.tsx`**
- Keep the `/survey-responses` route but redirect it to `/documents?tab=economic-survey` for backward compatibility (or simply remove the route if no external links exist)

**`src/components/AppSidebar.tsx`**
- No changes needed — Documents is already in the Resources section, and the survey page was never in the sidebar

**`src/pages/SurveyResponses.tsx`**
- Keep the file but extract the core content into a reusable component, or simply inline the logic into the Documents page's new tab

### User Flow
1. Navigate to **Resources → Documents** in the sidebar
2. See two tabs at the top: **Documents** | **Economic Impact Survey**
3. Documents tab works exactly as before
4. Economic Impact Survey tab shows the year selector, summary cards, category breakdown, and detailed responses table — the same content currently on the standalone page

