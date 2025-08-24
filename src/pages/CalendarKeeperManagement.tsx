import { useEffect } from "react";
import { NotificationManagement } from "@/components/NotificationManagement";
import { NotificationTest } from "@/components/NotificationTest";
import { ReminderTemplateManager } from "@/components/ReminderTemplateManager";
import { ReservationLookup } from "@/components/ReservationLookup";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CalendarKeeperManagement = () => {
  useEffect(() => {
    document.title = "Calendar Keeper Management – Notifications & Reminders";
  }, []);

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat" style={{backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'}}>
      <header className="sr-only">
        <h1>Calendar Keeper Management – Notifications & Reminders</h1>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        <PageHeader
          title="Calendar Keeper Management"
          subtitle="Send manual reminders, run automatic notifications, and manage reservation communications."
        />
        <section aria-label="Notification tools" className="mt-4">
          <Tabs defaultValue="notifications" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="notifications">Manual Reminders</TabsTrigger>
              <TabsTrigger value="lookup">Reservation Lookup</TabsTrigger>
              <TabsTrigger value="test">Test System</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
            </TabsList>
            <TabsContent value="notifications" className="mt-6">
              <NotificationManagement />
            </TabsContent>
            <TabsContent value="lookup" className="mt-6">
              <ReservationLookup />
            </TabsContent>
            <TabsContent value="test" className="mt-6 flex justify-center">
              <NotificationTest />
            </TabsContent>
            <TabsContent value="templates" className="mt-6">
              <ReminderTemplateManager />
            </TabsContent>
          </Tabs>
        </section>
      </main>
    </div>
  );
};

export default CalendarKeeperManagement;
