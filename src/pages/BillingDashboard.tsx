import { BillingDashboard as BillingDashboardComponent } from "@/components/BillingDashboard";

const BillingDashboard = () => {
  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat p-4" style={{backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'}}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-6xl mb-4 font-kaushan text-primary drop-shadow-lg text-center">Billing & Invoices</h1>
          <p className="text-2xl text-primary text-center font-medium">Manage invoices and billing cycles</p>
        </div>

        <div className="bg-card/95 p-6 rounded-lg">
          <BillingDashboardComponent />
        </div>
      </div>
    </div>
  );
};

export default BillingDashboard;
