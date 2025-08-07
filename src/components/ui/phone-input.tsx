import * as React from "react"
import { Input } from "@/components/ui/input"
import { formatPhoneNumber, unformatPhoneNumber } from "@/lib/phone-utils"
import { cn } from "@/lib/utils"
import { PhoneConsentDialog } from "@/components/ui/phone-consent-dialog"

interface PhoneInputProps extends Omit<React.ComponentProps<"input">, "onChange" | "type"> {
  value?: string;
  onChange?: ((value: string) => void) | ((value: string, rawValue: string) => void);
  disabled?: boolean;
  autoFormat?: boolean;
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value = "", onChange, disabled = false, autoFormat = true, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState(
      autoFormat ? formatPhoneNumber(value) : value
    );
    const [showConsentDialog, setShowConsentDialog] = React.useState(false);
    const [hasConsented, setHasConsented] = React.useState(false);
    const [inputFocused, setInputFocused] = React.useState(false);

    // Update display value when prop value changes
    React.useEffect(() => {
      if (autoFormat) {
        setDisplayValue(formatPhoneNumber(value));
      } else {
        setDisplayValue(value);
      }
    }, [value, autoFormat]);

    const handleFocus = () => {
      console.log('PhoneInput focused - hasConsented:', hasConsented, 'value:', value);
      if (!hasConsented && !value) {
        console.log('Showing consent dialog');
        setShowConsentDialog(true);
      } else {
        console.log('Setting input focused');
        setInputFocused(true);
      }
    };

    const handleConsentAccept = () => {
      console.log('Consent accepted');
      setHasConsented(true);
      setShowConsentDialog(false);
      setInputFocused(true);
    };

    const handleConsentDecline = () => {
      console.log('Consent declined');
      setShowConsentDialog(false);
      setInputFocused(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!hasConsented) return;
      
      const inputValue = e.target.value;
      
      if (!autoFormat) {
        setDisplayValue(inputValue);
        // Handle both single-parameter onChange (React Hook Form) and two-parameter onChange
        if (onChange) {
          try {
            (onChange as (value: string, rawValue: string) => void)(inputValue, unformatPhoneNumber(inputValue));
          } catch {
            (onChange as (value: string) => void)(inputValue);
          }
        }
        return;
      }

      // Get raw digits
      const rawValue = unformatPhoneNumber(inputValue);
      
      // Limit to 10 digits
      if (rawValue.length <= 10) {
        const formatted = formatPhoneNumber(inputValue);
        setDisplayValue(formatted);
        // Handle both single-parameter onChange (React Hook Form) and two-parameter onChange
        if (onChange) {
          try {
            (onChange as (value: string, rawValue: string) => void)(formatted, rawValue);
          } catch {
            (onChange as (value: string) => void)(formatted);
          }
        }
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow backspace, delete, tab, escape, enter
      if ([8, 9, 27, 13, 46].includes(e.keyCode) ||
          // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
          (e.keyCode === 65 && e.ctrlKey) ||
          (e.keyCode === 67 && e.ctrlKey) ||
          (e.keyCode === 86 && e.ctrlKey) ||
          (e.keyCode === 88 && e.ctrlKey) ||
          // Allow home, end, left, right
          (e.keyCode >= 35 && e.keyCode <= 39)) {
        return;
      }
      
      // Ensure that it is a number and stop the keypress
      if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
        e.preventDefault();
      }
    };

    return (
      <>
        <Input
          {...props}
          ref={ref}
          type="tel"
          value={displayValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          disabled={disabled || !hasConsented}
          placeholder={autoFormat ? "(555) 123-4567" : props.placeholder}
          className={cn(className)}
        />
        <PhoneConsentDialog
          open={showConsentDialog}
          onAccept={handleConsentAccept}
          onDecline={handleConsentDecline}
        />
        {console.log('Rendering PhoneConsentDialog - open:', showConsentDialog)}
      </>
    );
  }
);

PhoneInput.displayName = "PhoneInput";

export { PhoneInput };