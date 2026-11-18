import { Alert, AlertDescription } from "@/components/ui/alert";
import { LayoutTemplate } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";

/** Always-visible warning while the CabinBuddy Master Template is the active organization. */
export function MasterTemplateBanner() {
  const { organization } = useOrganization();
  if (!(organization as { is_template_source?: boolean } | null)?.is_template_source) return null;

  return (
    <Alert className="sticky top-0 z-40 rounded-none border-x-0 border-t-0 border-b-2 border-primary bg-primary text-primary-foreground">
      <LayoutTemplate className="h-4 w-4 !text-primary-foreground" />
      <AlertDescription className="ml-2 text-sm">
        <strong>Editing the CabinBuddy Master Template.</strong> Content you change here becomes the starter
        content for new cabins. It does not change Andrew Family Cabin or any other existing cabin.
        Switch cabins in the sidebar to return to your family's view.
      </AlertDescription>
    </Alert>
  );
}
