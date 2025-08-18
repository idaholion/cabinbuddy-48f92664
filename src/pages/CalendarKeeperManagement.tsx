import { useEffect } from "react";
import { NotificationManagement } from "@/components/NotificationManagement";
import { ReminderTemplateManager } from "@/components/ReminderTemplateManager";
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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="notifications">Upcoming Notifications</TabsTrigger>
              <TabsTrigger value="templates">Reminder Templates</TabsTrigger>
            </TabsList>
            <TabsContent value="notifications" className="mt-6">
              <NotificationManagement />
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
