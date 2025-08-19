import React, { useState } from 'react';
import { HelpCircle, X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSupervisor } from '@/hooks/useSupervisor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface HelpContent {
  title: string;
  description: string;
  steps?: string[];
  tips?: string[];
  relatedPages?: Array<{ name: string; path: string }>;
}

interface HelpContextConfig {
  [key: string]: HelpContent;
}

// Help content for different pages/contexts
const helpContexts: HelpContextConfig = {
  '/': {
    title: 'Dashboard Overview',
    description: 'Your main hub for managing cabin reservations, expenses, and family group activities.',
    steps: [
      'Check upcoming reservations in the calendar',
      'Review recent expenses and receipts', 
      'Monitor family group activities',
      'Access quick actions for common tasks'
    ],
    tips: [
      'Use the calendar to plan your next visit',
      'Upload receipts immediately to track expenses',
      'Check notifications for important updates'
    ]
  },
  '/cabin-calendar': {
    title: 'Reservation Calendar',
    description: 'View and manage all cabin reservations. Create new bookings or modify existing ones.',
    steps: [
      'Click on any date to create a new reservation',
      'Click on existing reservations to view details',
      'Use the month/year picker to navigate dates',
      'Filter by family group to see specific bookings'
    ],
    tips: [
      'Book during off-peak times for longer stays',
      'Coordinate with other families to avoid conflicts',
      'Set up notifications for booking reminders'
    ]
  },
  '/financial-review': {
    title: 'Financial Management',
    description: 'Track expenses, upload receipts, and manage the cabin\'s financial health.',
    steps: [
      'Upload receipts by taking photos or selecting files',
      'Categorize expenses for better tracking',
      'Review monthly and yearly spending',
      'Export reports for tax purposes'
    ],
    tips: [
      'Take receipt photos immediately after purchases',
      'Use clear, well-lit photos for better OCR reading',
      'Add notes to receipts for context'
    ]
  },
  '/family-group-setup': {
    title: 'Family Group Management',
    description: 'Organize families, assign hosts, and manage group permissions.',
    steps: [
      'Create family groups with descriptive names',
      'Add family members as hosts',
      'Set reservation permissions for each member',
      'Assign unique colors for easy identification'
    ],
    tips: [
      'Choose colors that are easy to distinguish',
      'Give clear permissions to avoid conflicts',
      'Regular review member lists for accuracy'
    ]
  },
  '/check-in': {
    title: 'Check-in Process',
    description: 'Complete your arrival checklist and report any issues.',
    steps: [
      'Complete all required checklist items',
      'Report any maintenance issues found',
      'Upload photos of any problems',
      'Submit your check-in when complete'
    ],
    tips: [
      'Take before/after photos for maintenance issues',
      'Check all appliances and utilities',
      'Note any missing supplies or amenities'
    ]
  }
};

interface ContextualHelpProps {
  context?: string;
  className?: string;
}

export const ContextualHelp: React.FC<ContextualHelpProps> = ({ 
  context = window.location.pathname,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  const helpContent = helpContexts[context] || {
    title: 'Help',
    description: 'General help information for using Cabin Buddy.',
    steps: [
      'Navigate using the sidebar menu',
      'Use the search function to find specific information',
      'Check notifications for important updates',
      'Contact support if you need assistance'
    ],
    tips: [
      'Keep your browser updated for the best experience',
      'Use the feedback button to report issues',
      'Bookmark frequently used pages'
    ]
  };

  const nextStep = () => {
    if (helpContent.steps && currentStep < helpContent.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const navigate = useNavigate();
  const location = useLocation();
  const { isSupervisor } = useSupervisor();

  const handleFeaturesClick = () => {
    console.log('Features button clicked - isSupervisor:', isSupervisor, 'pathname:', location.pathname);
    if (isSupervisor && location.pathname === '/supervisor') {
      // For supervisors on dashboard, trigger a custom event to switch tabs
      console.log('Dispatching switchToFeaturesTab event');
      window.dispatchEvent(new CustomEvent('switchToFeaturesTab'));
    } else {
      // Otherwise navigate to features page
      console.log('Navigating to /features');
      navigate('/features');
    }
  };

  return (
    <div className="flex items-center space-x-2">
      {/* Feature Guide Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleFeaturesClick}
        className="h-8 px-3 text-xs hover:scale-105 hover:shadow-md transition-all duration-200"
        aria-label="View feature guide"
      >
        <Sparkles className="h-3 w-3 mr-1" />
        Features
      </Button>

      {/* Contextual Help Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={`h-8 w-8 p-0 ${className}`}
        aria-label="Get help"
      >
        <HelpCircle className="h-4 w-4" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              {helpContent.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <p className="text-muted-foreground">
              {helpContent.description}
            </p>

            {helpContent.steps && helpContent.steps.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    How to Use This Page
                    <Badge variant="secondary">
                      {currentStep + 1} of {helpContent.steps.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="font-medium text-sm">
                        Step {currentStep + 1}:
                      </p>
                      <p className="mt-1">
                        {helpContent.steps[currentStep]}
                      </p>
                    </div>

                    <div className="flex justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={prevStep}
                        disabled={currentStep === 0}
                        className="flex items-center gap-1"
                      >
                        <ChevronLeft className="h-3 w-3" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={nextStep}
                        disabled={!helpContent.steps || currentStep >= helpContent.steps.length - 1}
                        className="flex items-center gap-1"
                      >
                        Next
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {helpContent.tips && helpContent.tips.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">💡 Pro Tips</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {helpContent.tips.map((tip, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-2" />
                        <span className="text-sm">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {helpContent.relatedPages && helpContent.relatedPages.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Related Pages</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {helpContent.relatedPages.map((page, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          window.location.href = page.path;
                          setIsOpen(false);
                        }}
                        className="justify-start"
                      >
                        {page.name}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground text-center">
                Still need help? Use the feedback button to contact support.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Quick tooltip component for inline help
interface HelpTooltipProps {
  content: string;
  children: React.ReactNode;
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <div 
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help"
      >
        {children}
      </div>
      {isVisible && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs bg-gray-900 text-white rounded-lg shadow-lg max-w-xs">
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
};