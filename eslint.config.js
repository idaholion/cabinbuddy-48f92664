import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": "off",
      "no-restricted-syntax": [
        "error",
        {
          selector: "NewExpression[callee.name='Date'][arguments.0.property.name=/(start_date|end_date|check_date|due_date|paid_date|date|requested_start_date|requested_end_date|allocated_start_date|allocated_end_date|issue_date|offered_start_date|offered_end_date|payment_deadline)/]",
          message: "❌ Use parseDateOnly() from @/lib/date-utils instead of new Date() for database date-only strings to avoid timezone issues. Example: parseDateOnly(reservation.start_date)"
        }
      ]
    },
  }
);
