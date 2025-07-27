import * as React from "react"
import { Input } from "@/components/ui/input"
import { formatPhoneNumber, unformatPhoneNumber } from "@/lib/phone-utils"
import { cn } from "@/lib/utils"

interface PhoneInputProps extends Omit<React.ComponentProps<"input">, "onChange" | "type"> {
  value?: string;
  onChange?: (value: string, rawValue: string) => void;
  disabled?: boolean;
  autoFormat?: boolean;
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value = "", onChange, disabled = false, autoFormat = true, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState(
      autoFormat ? formatPhoneNumber(value) : value
    );

    // Update display value when prop value changes
    React.useEffect(() => {
      if (autoFormat) {
        setDisplayValue(formatPhoneNumber(value));
      } else {
        setDisplayValue(value);
      }
    }, [value, autoFormat]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      if (!autoFormat) {
        setDisplayValue(inputValue);
        onChange?.(inputValue, unformatPhoneNumber(inputValue));
        return;
      }

      // Get raw digits
      const rawValue = unformatPhoneNumber(inputValue);
      
      // Limit to 10 digits
      if (rawValue.length <= 10) {
        const formatted = formatPhoneNumber(inputValue);
        setDisplayValue(formatted);
        onChange?.(formatted, rawValue);
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
      <Input
        {...props}
        ref={ref}
        type="tel"
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={autoFormat ? "(555) 123-4567" : props.placeholder}
        className={cn(className)}
      />
    );
  }
);

PhoneInput.displayName = "PhoneInput";

export { PhoneInput };