import { useState } from "react";
import { HelpCircle, AlertTriangle, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useCalendarKeeperAssistance } from "@/hooks/useCalendarKeeperAssistance";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface CalendarKeeperAssistanceDialogProps {
  children: React.ReactNode;
}

export const CalendarKeeperAssistanceDialog = ({ children }: CalendarKeeperAssistanceDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    urgency: 'medium' as 'low' | 'medium' | 'high',
    category: 'general' as 'general' | 'booking' | 'technical' | 'payment' | 'emergency',
  });

  const { createRequest, loading, requests } = useCalendarKeeperAssistance();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject.trim() || !formData.description.trim()) {
      return;
    }

    const success = await createRequest(formData);
    if (success) {
      setFormData({
        subject: '',
        description: '',
        urgency: 'medium',
        category: 'general',
      });
      setIsOpen(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <HelpCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  const myRequests = requests.slice(0, 5); // Show last 5 requests

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Request Calendar Keeper Assistance
          </DialogTitle>
          <DialogDescription>
            Need help with your reservation or have questions? Send a message to your calendar keeper.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Request Form */}
          <div className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Question</SelectItem>
                    <SelectItem value="booking">Booking Issue</SelectItem>
                    <SelectItem value="technical">Technical Problem</SelectItem>
                    <SelectItem value="payment">Payment/Billing</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="urgency">Urgency</Label>
                <Select
                  value={formData.urgency}
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, urgency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select urgency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - General inquiry</SelectItem>
                    <SelectItem value="medium">Medium - Needs attention</SelectItem>
                    <SelectItem value="high">High - Urgent issue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Brief description of your request"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Please provide details about your request or question..."
                  className="min-h-32"
                  required
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !formData.subject.trim() || !formData.description.trim()}
                >
                  {loading ? "Sending..." : "Send Request"}
                </Button>
              </DialogFooter>
            </form>
          </div>

          {/* Recent Requests */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-3">Your Recent Requests</h3>
              {myRequests.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">
                      No previous requests found
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {myRequests.map((request) => (
                    <Card key={request.id} className="border">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(request.status)}
                            <CardTitle className="text-sm font-medium">
                              {request.subject}
                            </CardTitle>
                          </div>
                          <div className="flex gap-1">
                            <Badge variant={getUrgencyColor(request.urgency)} className="text-xs">
                              {request.urgency}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {request.category}
                            </Badge>
                          </div>
                        </div>
                        <CardDescription className="text-xs">
                          {new Date(request.created_at).toLocaleDateString()} • Status: {request.status}
                        </CardDescription>
                      </CardHeader>
                      {request.calendar_keeper_response && (
                        <CardContent className="pt-0">
                          <div className="bg-muted p-3 rounded text-sm">
                            <p className="font-medium text-xs text-muted-foreground mb-1">Calendar Keeper Response:</p>
                            <p>{request.calendar_keeper_response}</p>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};