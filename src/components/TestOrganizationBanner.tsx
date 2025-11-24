import { Alert, AlertDescription } from "@/components/ui/alert";
import { TestTube, Info } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";

export function TestOrganizationBanner() {
  const { organization } = useOrganization();

  if (!organization?.is_test_organization) {
    return null;
  }

  return (
    <Alert className="rounded-none border-l-0 border-r-0 border-t-0 bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700">
      <TestTube className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <AlertDescription className="ml-2 text-sm text-blue-800 dark:text-blue-200">
        <strong>Test Organization Mode:</strong> You're currently working in a test environment. 
        Data and actions here won't affect production organizations.
        <Info className="inline h-3.5 w-3.5 ml-2 opacity-70" />
      </AlertDescription>
    </Alert>
  );
}
