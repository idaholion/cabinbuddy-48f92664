import { useEffect } from "react";
import { NotificationManagement } from "@/components/NotificationManagement";
import { PageHeader } from "@/components/ui/page-header";

const CalendarKeeperManagement = () => {
  useEffect(() => {
    document.title = "Calendar Keeper Management – Notifications & Reminders";
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sr-only">
        <h1>Calendar Keeper Management – Notifications & Reminders</h1>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        <PageHeader
          title="Calendar Keeper Management"
          subtitle="Send manual reminders, run automatic notifications, and manage reservation communications."
        />
        <section aria-label="Notification tools" className="mt-4">
          <NotificationManagement />
        </section>
      </main>
    </div>
  );
};

export default CalendarKeeperManagement;
