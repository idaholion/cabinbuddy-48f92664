import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Calendar, MessageSquare, Clock, ArrowRightLeft, Bell } from 'lucide-react';
import { SearchInput } from '@/components/ui/search-input';
import { format } from 'date-fns';
import { useTradeRequests } from '@/hooks/useTradeRequests';
import { useFamilyGroups } from '@/hooks/useFamilyGroups';
import { useAuth } from '@/contexts/AuthContext';
import { TradeApprovalDialog } from './TradeApprovalDialog';

export function TradeRequestsManager() {
  const { user } = useAuth();
  const { tradeRequests, loading, refetchTradeRequests } = useTradeRequests();
  const { familyGroups } = useFamilyGroups();
  const [selectedTradeRequest, setSelectedTradeRequest] = useState<any>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Get user's family group
  const userFamilyGroup = familyGroups.find(fg => 
    fg.host_members?.some((member: any) => member.email === user?.email)
  )?.name;

  // Filter trade requests by category
  const incomingRequests = tradeRequests.filter(tr => 
    tr.target_family_group === userFamilyGroup && tr.status === 'pending'
  );

  const outgoingRequests = tradeRequests.filter(tr => 
    tr.requester_family_group === userFamilyGroup
  );

  const completedTrades = tradeRequests.filter(tr => 
    (tr.requester_family_group === userFamilyGroup || tr.target_family_group === userFamilyGroup) &&
    tr.status !== 'pending'
  );

  const handleApprovalClick = (tradeRequest: any) => {
    setSelectedTradeRequest(tradeRequest);
    setShowApprovalDialog(true);
  };

  const handleApprovalComplete = () => {
    refetchTradeRequests();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'approved':
        return <Badge variant="default">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const TradeRequestCard = ({ request, showActions = false }: { request: any; showActions?: boolean }) => (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {request.requester_family_group} → {request.target_family_group}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusBadge(request.status)}
            <Badge variant={request.request_type === 'trade_offer' ? 'default' : 'secondary'}>
              {request.request_type === 'trade_offer' ? 'Trade' : 'Request Only'}
            </Badge>
          </div>
        </div>

        <div className="space-y-2">
          {/* Requested Time */}
          <div className="flex items-center space-x-2 text-sm">
            <Calendar className="h-3 w-3 text-primary" />
            <span className="text-muted-foreground">Wants:</span>
            <span>
              {format(new Date(request.requested_start_date), "MMM d")} - {format(new Date(request.requested_end_date), "MMM d, yyyy")}
            </span>
          </div>

          {/* Offered Time */}
          {request.request_type === 'trade_offer' && request.offered_start_date && (
            <div className="flex items-center space-x-2 text-sm">
              <Clock className="h-3 w-3 text-primary" />
              <span className="text-muted-foreground">Offers:</span>
              <span>
                {format(new Date(request.offered_start_date), "MMM d")} - {format(new Date(request.offered_end_date), "MMM d, yyyy")}
              </span>
            </div>
          )}

          {/* Message Preview */}
          {request.requester_message && (
            <div className="flex items-start space-x-2 text-sm">
              <MessageSquare className="h-3 w-3 text-muted-foreground mt-0.5" />
              <span className="text-muted-foreground italic truncate">
                "{request.requester_message.length > 60 
                  ? request.requester_message.substring(0, 60) + '...' 
                  : request.requester_message}"
              </span>
            </div>
          )}

          {/* Timestamp */}
          <div className="text-xs text-muted-foreground">
            {format(new Date(request.created_at), "MMM d, yyyy 'at' h:mm a")}
          </div>
        </div>

        {/* Actions */}
        {showActions && request.status === 'pending' && (
          <div className="flex justify-end mt-3">
            <Button 
              size="sm" 
              onClick={() => handleApprovalClick(request)}
            >
              Review Request
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading trade requests...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ArrowRightLeft className="h-5 w-5" />
            <span>Trade Requests</span>
            {incomingRequests.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {incomingRequests.length} pending
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Manage time trading between family groups
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="mb-4">
            <SearchInput
              placeholder="Search trade requests..."
              onSearch={setSearchQuery}
              className="w-full"
            />
          </div>
          
          <Tabs defaultValue="incoming" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="incoming" className="relative">
                Incoming
                {incomingRequests.length > 0 && (
                  <Badge variant="destructive" className="ml-2 h-4 w-4 p-0 text-xs">
                    {incomingRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="outgoing">
                Outgoing ({outgoingRequests.length})
              </TabsTrigger>
              <TabsTrigger value="history">
                History ({completedTrades.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="incoming" className="mt-4">
              {incomingRequests.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No pending requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {incomingRequests.map((request) => (
                    <TradeRequestCard 
                      key={request.id} 
                      request={request} 
                      showActions={true}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="outgoing" className="mt-4">
              {outgoingRequests.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No outgoing requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {outgoingRequests.map((request) => (
                    <TradeRequestCard 
                      key={request.id} 
                      request={request}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              {completedTrades.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No trade history</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {completedTrades.map((request) => (
                    <TradeRequestCard 
                      key={request.id} 
                      request={request}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <TradeApprovalDialog
        open={showApprovalDialog}
        onOpenChange={setShowApprovalDialog}
        tradeRequest={selectedTradeRequest}
        onApprovalComplete={handleApprovalComplete}
      />
    </>
  );
}