import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { NavigationHeader } from "@/components/ui/navigation-header";
import { StayHistorySnapshotManager } from "@/components/StayHistorySnapshotManager";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera } from "lucide-react";

export default function StayHistorySnapshots() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  // Generate year options (current year and 5 years back)
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-8 space-y-6">
        <PageHeader
          title="Stay History Snapshots"
          subtitle="Create and restore snapshots of stay history data to protect against data corruption"
          icon={Camera}
        >
          <NavigationHeader />
        </PageHeader>

        <div className="flex items-center gap-4 mb-6">
          <span className="text-sm font-medium">Select Year:</span>
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => setSelectedYear(parseInt(value))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <StayHistorySnapshotManager currentYear={selectedYear} />
      </div>
    </div>
  );
}
