#!/bin/bash

# Script to find potential date handling violations
# Run this before committing to catch UTC date issues

echo "🔍 Searching for potential date handling violations..."
echo ""

# Define patterns that are likely violations
PATTERNS=(
  "new Date(.*\.start_date"
  "new Date(.*\.end_date"
  "new Date(.*\.check_date"
  "new Date(.*\.due_date"
  "new Date(.*\.paid_date"
  "new Date(.*\.date\)"
  "new Date(.*\.requested_start_date"
  "new Date(.*\.requested_end_date"
  "new Date(.*\.allocated_start_date"
  "new Date(.*\.allocated_end_date"
  "new Date(.*\.issue_date"
)

FOUND_ISSUES=0

for pattern in "${PATTERNS[@]}"; do
  # Search in src directory, exclude date-utils.ts and this script
  RESULTS=$(grep -rn "$pattern" src/ \
    --include="*.ts" \
    --include="*.tsx" \
    --exclude="date-utils.ts" \
    --exclude="date-types.ts" \
    2>/dev/null)
  
  if [ ! -z "$RESULTS" ]; then
    echo "⚠️  Found potential violation: $pattern"
    echo "$RESULTS"
    echo ""
    FOUND_ISSUES=1
  fi
done

if [ $FOUND_ISSUES -eq 0 ]; then
  echo "✅ No date handling violations found!"
  exit 0
else
  echo ""
  echo "❌ Found potential date handling violations!"
  echo ""
  echo "📖 Remember to use parseDateOnly() for all database date fields."
  echo "   See docs/DATE_HANDLING_GUIDE.md for details."
  echo ""
  exit 1
fi
