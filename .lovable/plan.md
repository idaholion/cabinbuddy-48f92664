

## Fix Year Picker to Include Past Years

Two file changes to set year range to 10 years back and 2 years forward from current year:

1. **`src/components/EnhancedMonthPicker.tsx`** (line 42): Replace year generation:
   ```
   const years = Array.from({ length: 13 }, (_, i) => (new Date().getFullYear() - 10) + i);
   ```

2. **`src/components/MonthYearPicker.tsx`** (line 22): Replace year generation:
   ```
   const years = Array.from({ length: 13 }, (_, i) => (new Date().getFullYear() - 10) + i);
   ```

This gives a range of ~2016–2028 (adjusts automatically each year).

