import { Button } from "@/components/ui/button";
import { DollarSign } from "lucide-react";

interface OtherPaymentOptionsButtonProps {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}

/**
 * Shared "Other Payment Options" button used on both the Daily & Final Input
 * page and the Stay History page so the two pages stay visually identical.
 * Styled like the blue Venmo card, but in amber to distinguish it.
 */
export const OtherPaymentOptionsButton = ({
  onClick,
  disabled,
  label = "Other Payment Options",
}: OtherPaymentOptionsButtonProps) => (
  <div className="mt-3">
    <Button
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className="w-full h-12 text-base font-medium bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/40 hover:text-amber-800"
    >
      <DollarSign className="h-5 w-5 mr-2" />
      {label}
    </Button>
  </div>
);
