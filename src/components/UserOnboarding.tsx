import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ArrowRight, Calendar, Users, FileText, Camera } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  completed: boolean;
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 'calendar',
    title: 'View Cabin Calendar',
    description: 'Check available dates and current reservations',
    path: '/calendar',
    icon: <Calendar className="h-5 w-5" />,
    completed: false
  },
  {
    id: 'organization',
    title: 'Join Your Family Organization',
    description: 'Connect with your family group to start sharing the cabin',
    path: '/select-organization',
    icon: <Users className="h-5 w-5" />,
    completed: false
  },
  {
    id: 'rules',
    title: 'Read Cabin Rules',
    description: 'Familiarize yourself with cabin guidelines and policies',
    path: '/cabin-rules',
    icon: <FileText className="h-5 w-5" />,
    completed: false
  },
  {
    id: 'photos',
    title: 'Share Family Photos',
    description: 'Upload and share memories from your cabin visits',
    path: '/photos',
    icon: <Camera className="h-5 w-5" />,
    completed: false
  }
];

export const UserOnboarding = () => {
  const { user } = useAuth();
  const [steps, setSteps] = useState(onboardingSteps);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user is new (you can implement your own logic here)
    const isNewUser = !localStorage.getItem(`onboarding-completed-${user?.id}`);
    const hasCompletedSteps = localStorage.getItem(`onboarding-steps-${user?.id}`);
    
    if (isNewUser || !hasCompletedSteps) {
      setIsVisible(true);
    }

    // Load completed steps from localStorage
    if (hasCompletedSteps) {
      const completedSteps = JSON.parse(hasCompletedSteps);
      setSteps(prevSteps => 
        prevSteps.map(step => ({
          ...step,
          completed: completedSteps.includes(step.id)
        }))
      );
    }
  }, [user?.id]);

  const markStepCompleted = (stepId: string) => {
    const updatedSteps = steps.map(step => 
      step.id === stepId ? { ...step, completed: true } : step
    );
    setSteps(updatedSteps);
    
    const completedStepIds = updatedSteps
      .filter(step => step.completed)
      .map(step => step.id);
    
    localStorage.setItem(`onboarding-steps-${user?.id}`, JSON.stringify(completedStepIds));
  };

  const completeOnboarding = () => {
    localStorage.setItem(`onboarding-completed-${user?.id}`, 'true');
    setIsVisible(false);
  };

  const completedCount = steps.filter(step => step.completed).length;
  const progressPercentage = (completedCount / steps.length) * 100;

  if (!isVisible) return null;

  return (
    <Card className="mb-6 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            Welcome to Cabin Buddy!
            <Badge variant="secondary">{completedCount}/{steps.length}</Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={completeOnboarding}
            className="text-muted-foreground"
          >
            Skip
          </Button>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground mb-4">
          Get started with these essential steps to make the most of your cabin experience:
        </p>
        
        {steps.map((step, index) => (
          <div
            key={step.id}
            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step.completed 
                ? 'bg-green-500 text-white' 
                : 'bg-muted text-muted-foreground'
            }`}>
              {step.completed ? <CheckCircle className="h-4 w-4" /> : step.icon}
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className={`font-medium text-sm ${
                step.completed ? 'line-through text-muted-foreground' : ''
              }`}>
                {step.title}
              </h4>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
            
            {!step.completed && (
              <Button
                variant="outline"
                size="sm"
                asChild
                onClick={() => markStepCompleted(step.id)}
              >
                <Link to={step.path} className="flex items-center gap-1">
                  Start
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            )}
          </div>
        ))}
        
        {completedCount === steps.length && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Congratulations!</span>
            </div>
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
              You've completed the onboarding process. You're all set to enjoy your cabin experience!
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={completeOnboarding}
              className="mt-2 border-green-300 text-green-700 hover:bg-green-100 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-900"
            >
              Finish Setup
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};