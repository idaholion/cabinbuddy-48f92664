import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MessageCircle, Send, X, User, Bot, ListChecks, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { useConversationReminders } from '@/hooks/useConversationReminders';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

export const AiHelpAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isRemindersOpen, setIsRemindersOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hi! I'm your AI assistant. I can help you with cabin management, reservations, payments, and any questions about using this system. What can I help you with?",
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
  const { reminders, addReminder, removeReminder, removeMostRecent, clearReminders } = useConversationReminders();

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

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            size="sm"
            className="fixed bottom-6 right-6 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 z-50"
            aria-label="Open AI Help Assistant"
          >
            <MessageCircle className="h-5 w-5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md h-[600px] flex flex-col p-0">
          <DialogHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                AI Help Assistant
              </DialogTitle>
              <Button variant="outline" size="sm" onClick={() => setIsRemindersOpen(true)} aria-label="Open reminders list">
                <ListChecks className="h-4 w-4 mr-2" />
                Reminders{reminders.length ? ` (${reminders.length})` : ''}
              </Button>
            </div>
          </DialogHeader>
          
          <div className="flex-1 flex flex-col min-h-0">
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
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-3 w-3 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                        message.isUser
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {message.content}
                    </div>
                    {message.isUser && (
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                        <User className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-3 w-3 text-primary" />
                    </div>
                    <div className="bg-muted text-muted-foreground px-3 py-2 rounded-lg text-sm">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
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
                  placeholder="Ask me anything about the cabin system..."
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
        </DialogContent>
      </Dialog>

      {/* Reminders List Dialog */}
      <Dialog open={isRemindersOpen} onOpenChange={setIsRemindersOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5" />
              Reminders
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {reminders.length === 0 ? (
              <p className="text-muted-foreground">No reminders yet. Use "add this to the list" after I ask a question.</p>
            ) : (
              reminders.map((r) => (
                <div key={r.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
                  <div>
                    <p className="text-sm leading-5">{r.text}</p>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(r.addedAt).toLocaleString()} {r.route ? `• ${r.route}` : ''}</p>
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