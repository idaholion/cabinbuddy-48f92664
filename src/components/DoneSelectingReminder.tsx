import { useEffect, useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { BOOKING_CREATED } from "@/lib/selection-display-events";

export const DONE_BUTTON_ID = "done-selecting-button";

/** After a booking uses the family's last pick for the round, reminds them to press I'm Done Selecting. Never ends the turn itself. */
export function DoneSelectingReminder({ familyGroup, remaining }: { familyGroup?: string; remaining: number | null }) {
  const [pendingSince, setPendingSince] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onBooked = (e: Event) => {
      const family = (e as CustomEvent<{ familyGroup?: string }>).detail?.familyGroup;
      if (familyGroup && family === familyGroup) setPendingSince(Date.now());
    };
    window.addEventListener(BOOKING_CREATED, onBooked);
    return () => window.removeEventListener(BOOKING_CREATED, onBooked);
  }, [familyGroup]);

  // Counts refresh shortly after the booking; wait for them before asking.
  useEffect(() => {
    if (pendingSince === null) return;
    if (remaining !== null && remaining <= 0) { setOpen(true); setPendingSince(null); return; }
    const t = setTimeout(() => setPendingSince(null), 20_000);
    return () => clearTimeout(t);
  }, [pendingSince, remaining]);

  const showButton = () => {
    const el = document.getElementById(DONE_BUTTON_ID);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-4", "ring-primary", "ring-offset-2", "rounded-md", "animate-pulse");
    setTimeout(() => el.classList.remove("ring-4", "ring-primary", "ring-offset-2", "rounded-md", "animate-pulse"), 6000);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you done selecting?</AlertDialogTitle>
          <AlertDialogDescription>
            You've booked all your selections for this round. If you're finished, press <strong>I'm Done Selecting</strong> at the top of the calendar so the next family can take their turn. Until you do, the turn stays with you.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Not yet</AlertDialogCancel>
          <AlertDialogAction onClick={showButton}>Show me the button</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
