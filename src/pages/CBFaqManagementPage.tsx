import React from 'react';
import { CBFaqManagement } from '@/components/CBFaqManagement';

const CBFaqManagementPage = () => {
  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-background to-muted/20">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl mb-4 font-kaushan text-primary drop-shadow-lg">
            CB Help Management
          </h1>
          <p className="text-muted-foreground text-base">
            Manage the FAQ content shown in the CB assistant across all organizations
          </p>
        </div>
        
        <CBFaqManagement />
      </div>
    </div>
  );
};

export default CBFaqManagementPage;
