import { useState, useEffect, useMemo } from "react";
import { MessageSquare, CheckCircle, Clock, AlertTriangle, X, Send, Bell, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchFilter } from "@/components/ui/search-filter";
import { useCalendarKeeperAssistance, CalendarKeeperRequest } from "@/hooks/useCalendarKeeperAssistance";
import { supabase } from "@/integrations/supabase/client";
import { NotificationManagement } from "./NotificationManagement";

export const CalendarKeeperManagement = () => {
  const { requests, updateRequestStatus, loading } = useCalendarKeeperAssistance();
  const [selectedRequest, setSelectedRequest] = useState<CalendarKeeperRequest | null>(null);
  const [response, setResponse] = useState("");
  const [newStatus, setNewStatus] = useState<'in_progress' | 'resolved' | 'closed'>('in_progress');
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('calendar-keeper-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calendar_keeper_requests'
        },
        () => {
          // Refresh requests when changes occur
          window.location.reload();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'destructive';
      case 'in_progress': return 'default';
      case 'resolved': return 'secondary';
      case 'closed': return 'outline';
      default: return 'default';
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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'emergency': return <AlertTriangle className="h-4 w-4" />;
      case 'booking': return <Clock className="h-4 w-4" />;
      case 'technical': return <MessageSquare className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const handleRespond = async () => {
    if (!selectedRequest || !response.trim()) return;

    const success = await updateRequestStatus(selectedRequest.id, newStatus, response);
    if (success) {
      setSelectedRequest(null);
      setResponse("");
      setNewStatus('in_progress');
    }
  };

  // Filtered and searched requests
  const filteredRequests = useMemo(() => {
    return requests.filter(request => {
      const matchesSearch = 
        request.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.requester_family_group.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || request.status === statusFilter;
      const matchesUrgency = urgencyFilter === "all" || request.urgency === urgencyFilter;
      const matchesCategory = categoryFilter === "all" || request.category === categoryFilter;
      
      return matchesSearch && matchesStatus && matchesUrgency && matchesCategory;
    });
  }, [requests, searchQuery, statusFilter, urgencyFilter, categoryFilter]);

  const filterRequestsByStatus = (status: string) => {
    return filteredRequests.filter(req => req.status === status);
  };

  const openRequests = filterRequestsByStatus('open');
  const inProgressRequests = filterRequestsByStatus('in_progress');
  const resolvedRequests = filterRequestsByStatus('resolved');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Calendar Keeper Dashboard</h2>
          <p className="text-muted-foreground">Manage assistance requests and notification system</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="destructive">{openRequests.length} Open</Badge>
          <Badge variant="default">{inProgressRequests.length} In Progress</Badge>
          <Badge variant="secondary">{resolvedRequests.length} Resolved</Badge>
        </div>
      </div>

      <Tabs defaultValue="notifications" className="space-y-4">
        <TabsList>
          <TabsTrigger value="notifications" className="flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span>Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center space-x-2">
            <MessageSquare className="h-4 w-4" />
            <span>Assistance Requests</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications">
          <NotificationManagement />
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <SearchFilter
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            urgencyFilter={urgencyFilter}
            onUrgencyChange={setUrgencyFilter}
            categoryFilter={categoryFilter}
            onCategoryChange={setCategoryFilter}
          />

          <Tabs defaultValue="open" className="space-y-4">
            <TabsList>
              <TabsTrigger value="open">Open ({openRequests.length})</TabsTrigger>
              <TabsTrigger value="in_progress">In Progress ({inProgressRequests.length})</TabsTrigger>
              <TabsTrigger value="resolved">Resolved ({resolvedRequests.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="open" className="space-y-4">
              {openRequests.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">No open requests</p>
                  </CardContent>
                </Card>
              ) : (
                openRequests.map((request) => (
                  <RequestCard 
                    key={request.id} 
                    request={request} 
                    onSelect={setSelectedRequest}
                    getStatusColor={getStatusColor}
                    getUrgencyColor={getUrgencyColor}
                    getCategoryIcon={getCategoryIcon}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="in_progress" className="space-y-4">
              {inProgressRequests.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">No requests in progress</p>
                  </CardContent>
                </Card>
              ) : (
                inProgressRequests.map((request) => (
                  <RequestCard 
                    key={request.id} 
                    request={request} 
                    onSelect={setSelectedRequest}
                    getStatusColor={getStatusColor}
                    getUrgencyColor={getUrgencyColor}
                    getCategoryIcon={getCategoryIcon}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="resolved" className="space-y-4">
              {resolvedRequests.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">No resolved requests</p>
                  </CardContent>
                </Card>
              ) : (
                resolvedRequests.map((request) => (
                  <RequestCard 
                    key={request.id} 
                    request={request} 
                    onSelect={setSelectedRequest}
                    getStatusColor={getStatusColor}
                    getUrgencyColor={getUrgencyColor}
                    getCategoryIcon={getCategoryIcon}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Response Dialog */}
      {selectedRequest && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Respond to Request</CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedRequest(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>
              From {selectedRequest.requester_family_group} • {selectedRequest.subject}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded">
              <p className="text-sm font-medium mb-2">Request Details:</p>
              <p className="text-sm">{selectedRequest.description}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status Update</Label>
              <Select value={newStatus} onValueChange={(value: any) => setNewStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_progress">Mark as In Progress</SelectItem>
                  <SelectItem value="resolved">Mark as Resolved</SelectItem>
                  <SelectItem value="closed">Close Request</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="response">Your Response</Label>
              <Textarea
                id="response"
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Type your response to the family group..."
                className="min-h-24"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setSelectedRequest(null)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleRespond}
                disabled={loading || !response.trim()}
              >
                {loading ? "Sending..." : "Send Response"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

interface RequestCardProps {
  request: CalendarKeeperRequest;
  onSelect: (request: CalendarKeeperRequest) => void;
  getStatusColor: (status: string) => string;
  getUrgencyColor: (urgency: string) => string;
  getCategoryIcon: (category: string) => React.ReactNode;
}

const RequestCard = ({ 
  request, 
  onSelect, 
  getStatusColor, 
  getUrgencyColor, 
  getCategoryIcon 
}: RequestCardProps) => (
  <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onSelect(request)}>
    <CardHeader className="pb-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-2">
          {getCategoryIcon(request.category)}
          <CardTitle className="text-base">{request.subject}</CardTitle>
        </div>
        <div className="flex space-x-2">
          <Badge variant={getUrgencyColor(request.urgency) as any}>{request.urgency}</Badge>
          <Badge variant={getStatusColor(request.status) as any}>{request.status}</Badge>
        </div>
      </div>
      <CardDescription>
        From {request.requester_family_group} • {new Date(request.created_at).toLocaleDateString()}
      </CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground line-clamp-2">
        {request.description}
      </p>
      {request.calendar_keeper_response && (
        <div className="mt-3 p-3 bg-muted rounded text-sm">
          <p className="font-medium text-xs text-muted-foreground mb-1">Previous Response:</p>
          <p>{request.calendar_keeper_response}</p>
        </div>
      )}
    </CardContent>
  </Card>
);