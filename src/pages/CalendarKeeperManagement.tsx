import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import NotificationMonitoring from "@/pages/NotificationMonitoring";
import { NotificationManagement } from "@/components/NotificationManagement";
import { NotificationTest } from "@/components/NotificationTest";
import { ReminderTemplateManager } from "@/components/ReminderTemplateManager";
import { ReservationLookup } from "@/components/ReservationLookup";
import { AutomatedReminderSettings } from "@/components/AutomatedReminderSettings";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent } from "@/components/ui/tabs";

import { ManualTemplateNotifications } from "@/components/ManualTemplateNotifications";
import { SelectionTurnNotificationSender } from "@/components/SelectionTurnNotificationSender";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SECTIONS = [
  { value: "automated", label: "Automated System" },
  { value: "monitoring", label: "Delivery History" },
  { value: "templates", label: "Templates" },
  { value: "selection-turn", label: "Selection Turn" },
  { value: "notifications", label: "Manual Reminders" },
  { value: "manual-templates", label: "Manual Notifications" },
  { value: "lookup", label: "Reservation Lookup" },
  { value: "test", label: "Test System" },
];

const CalendarKeeperManagement = () => {
  useEffect(() => {
    document.title = "Notification Management – Notifications & Reminders";
  }, []);
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "automated";

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat" style={{backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'}}>
      <header className="sr-only">
        <h1>Notification Management – Notifications & Reminders</h1>
      </header>
      <main className="max-w-5xl mx-auto px-2 sm:px-4 py-4 sm:py-6 overflow-x-hidden">
        <PageHeader
          title="Notification Management"
          subtitle="Send manual reminders, run automatic notifications, and manage reservation communications."
          backgroundImage={true}
        />
        <section aria-label="Notification tools" className="mt-4">
          <Tabs value={tab} onValueChange={(v) => setSearchParams({ tab: v }, { replace: true })} className="w-full">
            <div className="sticky top-0 z-20 bg-background/95 backdrop-blur rounded-md p-2 shadow-sm max-w-md">
              <label className="text-sm font-medium mb-1 block">Section</label>
              <Select value={tab} onValueChange={(v) => setSearchParams({ tab: v }, { replace: true })}>
                <SelectTrigger className="w-full bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SECTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <TabsContent value="notifications" className="mt-6 min-w-0">
              <NotificationManagement />
            </TabsContent>
            <TabsContent value="manual-templates" className="mt-6 min-w-0">
              <ManualTemplateNotifications />
            </TabsContent>
            <TabsContent value="selection-turn" className="mt-6 flex justify-center min-w-0 [&>*]:w-full [&>*]:max-w-full">
              <SelectionTurnNotificationSender />
            </TabsContent>
            <TabsContent value="lookup" className="mt-6 min-w-0">
              <ReservationLookup />
            </TabsContent>
            <TabsContent value="test" className="mt-6 flex justify-center min-w-0 [&>*]:w-full [&>*]:max-w-full">
              <NotificationTest />
            </TabsContent>
            <TabsContent value="templates" className="mt-6 min-w-0">
              <ReminderTemplateManager />
            </TabsContent>
            <TabsContent value="automated" className="mt-6 min-w-0">
              <AutomatedReminderSettings />
            </TabsContent>
            <TabsContent value="monitoring" className="mt-6 min-w-0">
              <NotificationMonitoring embedded />
            </TabsContent>
          </Tabs>
        </section>
      </main>
    </div>
  );
};

export default CalendarKeeperManagement;
