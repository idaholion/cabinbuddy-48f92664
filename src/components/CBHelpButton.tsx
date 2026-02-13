import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  MessageCircle, 
  Send, 
  User, 
  Bot, 
  ListChecks, 
  Trash2, 
  HelpCircle,
  ChevronRight,
  Lightbulb,
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { useConversationReminders } from '@/hooks/useConversationReminders';
import { faqData, FAQItem } from '@/data/faqData';
import { useCBFaqItemsByRoute } from '@/hooks/useCBFaqItems';

// Route to FAQ category mapping
const routeToFaqCategories: Record<string, string[]> = {
  '/': ['Getting Started', 'Reservations & Calendar'],
  '/home': ['Getting Started', 'Reservations & Calendar'],
  '/calendar': ['Reservations & Calendar'],
  '/cabin-calendar': ['Reservations & Calendar'],
  '/stay-history': ['Financial Management', 'Reservations & Calendar'],
  '/checkout': ['Check-In & Check-Out', 'Financial Management'],
  '/check-in': ['Check-In & Check-Out'],
  '/calendar-keeper': ['Admin & Group Lead', 'Reservations & Calendar'],
  '/work-weekends': ['Features & Resources'],
  '/documents': ['Features & Resources'],
  '/photos': ['Features & Resources'],
  '/shared-notes': ['Features & Resources'],
  '/faq': ['Getting Started', 'Troubleshooting'],
  '/financial-review': ['Financial Management'],
  '/family-group-setup': ['Admin & Group Lead', 'Getting Started'],
  '/reservation-setup': ['Admin & Group Lead', 'Reservations & Calendar'],
  '/shopping-list': ['Features & Resources'],
  '/cabin-rules': ['Features & Resources'],
  '/family-voting': ['Features & Resources'],
  '/seasonal-checklists': ['Check-In & Check-Out'],
};

// Extended help contexts for all major pages
const helpContexts: Record<string, {
  title: string;
  description: string;
  steps?: string[];
  tips?: string[];
}> = {
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
  '/home': {
    title: 'Home Dashboard',
    description: 'Your personalized cabin management dashboard with quick access to all features.',
    steps: [
      'View your upcoming and recent stays',
      'See important notifications and updates',
      'Access frequently used features quickly',
      'Check the current reservation status'
    ],
    tips: [
      'The dashboard updates in real-time as reservations change',
      'Use quick action cards for common tasks',
      'Check the notification area for time-sensitive updates'
    ]
  },
  '/calendar': {
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
      'Use the rotation order to see who picks next'
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
      'Use the rotation order to see who picks next'
    ]
  },
  '/stay-history': {
    title: 'Stay History & Payments',
    description: 'View your past cabin stays and track payment status for each reservation.',
    steps: [
      'Filter stays by year using the dropdown',
      'View payment status for each reservation',
      'Record payments when you pay your share',
      'Check balance due and payment history'
    ],
    tips: [
      'Outstanding balances carry forward to new stays',
      'You can view detailed payment breakdown for each stay',
      'Use the sync button to refresh payment data'
    ]
  },
  '/checkout': {
    title: 'Checkout Process',
    description: 'Complete your departure checklist and review billing before leaving.',
    steps: [
      'Complete all departure checklist items',
      'Review your stay billing and occupancy',
      'Report any issues or maintenance needs',
      'Submit your checkout when complete'
    ],
    tips: [
      'Double-check all rooms and appliances',
      'Take photos of any issues you find',
      'Complete the checkout survey to help improve the cabin'
    ]
  },
  '/calendar-keeper': {
    title: 'Calendar Keeper Management',
    description: 'Manage reservation selections, rotation order, and calendar settings.',
    steps: [
      'View and manage the rotation order for selections',
      'Start primary or secondary selection phases',
      'Send turn notifications to family groups',
      'Lookup any reservation by date or family'
    ],
    tips: [
      'Use the "Notify" button to remind families of their turn',
      'Check selection status before starting a new phase',
      'The reservation lookup can find any booking quickly'
    ]
  },
  '/work-weekends': {
    title: 'Work Weekends',
    description: 'Propose, view, and manage cabin maintenance work weekends.',
    steps: [
      'Click "Propose Work Weekend" to suggest dates',
      'View pending proposals awaiting approval',
      'See approved work weekends on the calendar',
      'Sign up to participate in upcoming work events'
    ],
    tips: [
      'Work weekends are great for cabin maintenance',
      'Coordinate with other families for bigger projects',
      'Add detailed descriptions of work planned'
    ]
  },
  '/documents': {
    title: 'Documents & Files',
    description: 'Access and manage cabin documents, rules, and shared files.',
    steps: [
      'Browse documents by category',
      'Upload new documents (admin only)',
      'Download files you need',
      'View cabin rules and seasonal checklists'
    ],
    tips: [
      'Important documents are organized by category',
      'Seasonal checklists help with opening/closing',
      'Contact admin to add new documents'
    ]
  },
  '/photos': {
    title: 'Photo Sharing',
    description: 'Share and view photos from cabin stays and events.',
    steps: [
      'Browse photos from all family stays',
      'Upload your own cabin photos',
      'Filter by date or family group',
      'Download or share photos you like'
    ],
    tips: [
      'Share special moments with all families',
      'Add captions to help identify photos later',
      'Great photos can be used for the cabin calendar'
    ]
  },
  '/shared-notes': {
    title: 'Shared Notes',
    description: 'Leave notes for other families about cabin tips, issues, or discoveries.',
    steps: [
      'Create a new note with the add button',
      'Filter notes by category or family',
      'Search for specific topics',
      'Reply to or update existing notes'
    ],
    tips: [
      'Notes help families share important info',
      'Use categories to organize different topics',
      'Pin important notes for visibility'
    ]
  },
  '/faq': {
    title: 'Frequently Asked Questions',
    description: 'Find answers to common questions about cabin usage and procedures.',
    steps: [
      'Browse questions by category',
      'Use search to find specific topics',
      'Click a question to expand the answer',
      'Contact admin if you need more help'
    ],
    tips: [
      'Check FAQ before asking common questions',
      'Suggest new FAQ items to your admin',
      'Most answers include helpful links'
    ]
  },
  '/check-in': {
    title: 'Check-in Process',
    description: 'Complete your arrival checklist and report any issues found.',
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
  },
  '/financial-review': {
    title: 'Financial Review',
    description: 'Track expenses, view payment history, and manage cabin finances.',
    steps: [
      'View expense summary by category',
      'Check payment status for all families',
      'Generate financial reports',
      'Manage use fees and billing settings'
    ],
    tips: [
      'Regular reviews help keep finances organized',
      'Export reports for tax purposes',
      'Contact treasurer with financial questions'
    ]
  },
  '/family-group-setup': {
    title: 'Family Group Setup',
    description: 'Configure your family group members and contact information.',
    steps: [
      'Add or remove family members',
      'Update contact information',
      'Set member permissions',
      'Choose your family color'
    ],
    tips: [
      'Keep contact info updated for notifications',
      'All members can book reservations',
      'Group lead manages member list'
    ]
  },
  '/reservation-setup': {
    title: 'Reservation Settings',
    description: 'Configure booking rules, selection periods, and reservation policies.',
    steps: [
      'Set minimum/maximum stay lengths',
      'Configure selection window timing',
      'Define peak and off-peak periods',
      'Set up automated notifications'
    ],
    tips: [
      'Clear rules prevent booking conflicts',
      'Review settings before each selection season',
      'Notify families of any rule changes'
    ]
  }
};

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

type HelpMode = 'quick' | 'chat';

export const CBHelpButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<HelpMode>('quick');
  const [isRemindersOpen, setIsRemindersOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hi! I'm CB, your CabinBuddy assistant. I can help you with cabin management, reservations, payments, and any questions about using this system. What can I help you with?",
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { reminders, addReminder, removeReminder, removeMostRecent, clearReminders } = useConversationReminders();

  // Get current path first so we can use it in the hook
  const currentPath = location.pathname;

  // Fetch dynamic FAQs from database for current route
  const { data: dbFaqItems } = useCBFaqItemsByRoute(currentPath);

  // Get relevant FAQs - prefer database items, fallback to hardcoded
  const getRelevantFaqs = (): FAQItem[] => {
    // If we have database FAQ items for this route, use those
    if (dbFaqItems && dbFaqItems.length > 0) {
      return dbFaqItems.map(item => ({
        question: item.question,
        answer: item.answer,
      }));
    }
    
    // Fallback to hardcoded FAQ data based on category mapping
    const categories = routeToFaqCategories[currentPath] || ['Getting Started'];
    const relevantFaqs: FAQItem[] = [];
    
    faqData.forEach(category => {
      if (categories.includes(category.title)) {
        relevantFaqs.push(...category.items);
      }
    });
    
    // Return first 4 most relevant FAQs
    return relevantFaqs.slice(0, 4);
  };

  // Get help content for current page
  const helpContent = helpContexts[currentPath] || {
    title: 'CabinBuddy Help',
    description: 'General help for using CabinBuddy to manage your shared cabin.',
    steps: [
      'Navigate using the sidebar menu',
      'Use the search function to find specific information',
      'Check notifications for important updates',
      'Use this help button on any page for guidance'
    ],
    tips: [
      'Each page has specific help content',
      'Chat with CB for personalized assistance',
      'Use the feedback button to report issues'
    ]
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    // Handle conversational reminder commands locally
    const lower = inputMessage.trim().toLowerCase();
    const makeAiMsg = (content: string): Message => ({
      id: (Date.now() + 1).toString(),
      content,
      isUser: false,
      timestamp: new Date(),
    });

    // Add to list
    if (lower.includes('add this to the list') || lower.includes('add this to reminders') || lower.includes('add this to the reminders')) {
      const lastBot = [...messages].reverse().find(m => !m.isUser);
      const targetText = lastBot?.content || 'Previous assistant message (none found)';
      addReminder(targetText, location.pathname);
      setMessages(prev => [...prev, makeAiMsg('Added to your Reminders. Say "show me reminders" anytime to view them.')]);
      setInputMessage('');
      setIsRemindersOpen(true);
      return;
    }

    // Show list
    if (lower.includes('show me reminders') || lower === 'reminders') {
      setIsRemindersOpen(true);
      setMessages(prev => [...prev, makeAiMsg(`You have ${reminders.length} reminder${reminders.length === 1 ? '' : 's'}.`)]);
      setInputMessage('');
      return;
    }

    // Remove most recent item
    if (lower.includes('remove this item from the list') || lower.includes('remove this reminder')) {
      if (reminders.length > 0) {
        removeMostRecent();
        setMessages(prev => [...prev, makeAiMsg('Removed the most recent reminder.')]);
      } else {
        setMessages(prev => [...prev, makeAiMsg('There are no reminders to remove.')]);
      }
      setIsRemindersOpen(true);
      setInputMessage('');
      return;
    }

    setInputMessage('');
    setIsLoading(true);

    try {
      const context = {
        route: location.pathname,
        userRole: user?.user_metadata?.role || 'member',
        timestamp: new Date().toISOString()
      };

      const { data, error } = await supabase.functions.invoke('ai-help-assistant', {
        body: {
          message: inputMessage,
          context
        }
      });

      if (error) throw error;

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      toast({
        title: "Error",
        description: "Sorry, I'm having trouble responding right now. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const switchToChat = () => {
    setMode('chat');
  };

  const switchToQuickHelp = () => {
    setMode('quick');
  };

  return (
    <>
      {/* CB Floating Action Button */}
      <Button
        size="sm"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 z-50"
        aria-label="Open CB Help Assistant"
      >
        <div className="flex flex-col items-center justify-center">
          <span className="text-lg font-bold">CB</span>
        </div>
      </Button>

      {/* Main Help Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2 border-b bg-gradient-to-r from-primary/5 to-primary/10">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md">
                  <span className="text-sm font-bold">CB</span>
                </div>
                <div>
                  <span className="text-lg font-semibold">CabinBuddy Help</span>
                  <p className="text-xs text-muted-foreground font-normal">
                    {mode === 'quick' ? helpContent.title : 'AI Chat Assistant'}
                  </p>
                </div>
              </DialogTitle>
              {reminders.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsRemindersOpen(true)} 
                  className="flex items-center gap-1"
                >
                  <ListChecks className="h-4 w-4" />
                  <Badge variant="secondary" className="ml-1">{reminders.length}</Badge>
                </Button>
              )}
            </div>
          </DialogHeader>

          {mode === 'quick' ? (
            /* Quick Help Mode */
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Description */}
              <p className="text-muted-foreground text-sm">
                {helpContent.description}
              </p>

              {/* Steps */}
              {helpContent.steps && helpContent.steps.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ChevronRight className="h-4 w-4 text-primary" />
                      What You Can Do Here
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {helpContent.steps.map((step, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary font-medium">
                          {index + 1}
                        </div>
                        <span className="text-sm">{step}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Common Questions - FAQ Section */}
              {(() => {
                const relevantFaqs = getRelevantFaqs();
                return relevantFaqs.length > 0 ? (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <HelpCircle className="h-4 w-4 text-primary" />
                        Common Questions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Accordion type="single" collapsible className="space-y-1">
                        {relevantFaqs.map((faq, index) => (
                          <AccordionItem 
                            key={index} 
                            value={`faq-${index}`}
                            className="border-b last:border-b-0"
                          >
                            <AccordionTrigger className="text-sm text-left py-2 hover:no-underline">
                              {faq.question}
                            </AccordionTrigger>
                            <AccordionContent className="text-sm text-muted-foreground pb-3">
                              {faq.answer}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          navigate('/faq');
                          setIsOpen(false);
                        }}
                      >
                        See all FAQs <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    </CardContent>
                  </Card>
                ) : null;
              })()}

              {/* Tips */}
              {helpContent.tips && helpContent.tips.length > 0 && (
                <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      Pro Tips
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {helpContent.tips.map((tip, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <span className="flex-shrink-0 text-amber-600 dark:text-amber-400">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Chat with CB button */}
              <Button 
                onClick={switchToChat} 
                className="w-full flex items-center justify-center gap-2"
                variant="outline"
              >
                <Sparkles className="h-4 w-4" />
                Chat with CB for More Help
              </Button>
            </div>
          ) : (
            /* Chat Mode */
            <div className="flex-1 flex flex-col min-h-0">
              {/* Back to Quick Help */}
              <div className="px-4 py-2 border-b">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={switchToQuickHelp}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to Quick Help
                </Button>
              </div>

              <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex items-start gap-2 ${
                        message.isUser ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {!message.isUser && (
                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
                          <span className="text-[10px] font-bold text-primary-foreground">CB</span>
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                          message.isUser
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        {message.content}
                      </div>
                      {message.isUser && (
                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-secondary flex items-center justify-center">
                          <User className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
                        <span className="text-[10px] font-bold text-primary-foreground">CB</span>
                      </div>
                      <div className="bg-muted px-3 py-2 rounded-lg">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask CB anything about CabinBuddy..."
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!inputMessage.trim() || isLoading}
                    size="sm"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reminders List Dialog */}
      <Dialog open={isRemindersOpen} onOpenChange={setIsRemindersOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5" />
              CB Reminders
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {reminders.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No reminders yet. In chat mode, say "add this to the list" after CB gives you helpful info.
              </p>
            ) : (
              reminders.map((r) => (
                <div key={r.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
                  <div>
                    <p className="text-sm leading-5">{r.text}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(r.addedAt).toLocaleString()} {r.route ? `• ${r.route}` : ''}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => removeReminder(r.id)} aria-label="Remove reminder">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={clearReminders} disabled={!reminders.length}>
              Clear all
            </Button>
            <Button onClick={() => setIsRemindersOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
