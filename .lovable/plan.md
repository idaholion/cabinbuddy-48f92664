
# Plan: Remove "Need to Create Account" Statistic

## Overview
Remove the redundant "Need to Create Account" statistic card from the Family Group Overview page since it's confusing and already covered by the "Profile Not Claimed" category.

## Changes

### 1. Remove the statistic card
**File: `src/pages/FamilyGroupHealthCheck.tsx`**

Remove the "Need to Create Account" card from the summary stats grid (lines 283-289), reducing from 5 cards to 4.

### 2. Remove the unused variable
Remove the `membersWithoutAccounts` calculation on line 245 since it will no longer be used.

### 3. Update the grid layout
Change the grid from `md:grid-cols-5` to `md:grid-cols-4` to properly distribute the remaining 4 cards.

## Summary
- **Lines to modify**: 245, 271, 283-289
- **Net effect**: Cleaner, less confusing dashboard with 4 statistics instead of 5
- **Stats remaining**: Total Issues, No Email Listed, Profile Not Claimed, Users Without Profile
