import { useState, useEffect } from "react";
import { Calendar, DollarSign, Users, FileText, ChevronRight, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useReservations } from "@/hooks/useReservations";
import { useReceipts } from "@/hooks/useReceipts";
import { useFinancialSettings } from "@/hooks/useFinancialSettings";
import { useOrgAdmin } from "@/hooks/useOrgAdmin";
import { useFamilyGroups } from "@/hooks/useFamilyGroups";
import { BillingCalculator } from "@/lib/billing-calculator";
import { formatDistanceToNow } from "date-fns";
import { parseDateOnly } from "@/lib/date-utils";

const StayHistory = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useOrgAdmin();
  const { familyGroups, loading: familyGroupsLoading } = useFamilyGroups();
  const [selectedFamilyGroup, setSelectedFamilyGroup] = useState<string>("all");
  
  // Configure admin view mode for reservations
  const adminViewMode = {
    enabled: isAdmin,
    familyGroup: selectedFamilyGroup
  };
  
  const { reservations, loading: reservationsLoading } = useReservations(adminViewMode);
  const { receipts, loading: receiptsLoading } = useReceipts();
  const { settings: financialSettings } = useFinancialSettings();
  
  // Get past reservations (completed stays)
  const pastReservations = reservations
    .filter(r => {
      const endDate = parseDateOnly(r.end_date);
      return endDate < new Date() && r.status === 'confirmed';
    })
    .sort((a, b) => parseDateOnly(b.end_date).getTime() - parseDateOnly(a.end_date).getTime());

  const calculateStayData = (reservation: any) => {
    const checkInDate = parseDateOnly(reservation.start_date);
    const checkOutDate = parseDateOnly(reservation.end_date);
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 3600 * 24));
    
    // Calculate receipts for this stay
    const stayReceipts = receipts.filter(receipt => {
      const receiptDate = parseDateOnly(receipt.date);
      return receiptDate >= checkInDate && receiptDate <= checkOutDate;
    });
    
    const receiptsTotal = stayReceipts.reduce((total, receipt) => total + receipt.amount, 0);
    
    // Calculate billing if financial settings are available
    let billing = { total: 0, details: 'No billing data available' };
    if (financialSettings) {
      const billingConfig = {
        method: financialSettings.billing_method as any,
        amount: financialSettings.billing_amount,
        taxRate: financialSettings.tax_rate,
        cleaningFee: financialSettings.cleaning_fee,
        petFee: financialSettings.pet_fee,
        damageDeposit: financialSettings.damage_deposit,
      };
      
      const stayDetails = {
        guests: reservation.guest_count || 0,
        nights,
        weeks: Math.ceil(nights / 7),
        checkInDate,
        checkOutDate,
      };
      
      billing = BillingCalculator.calculateStayBilling(billingConfig, stayDetails);
    }
    
    const totalAmount = Math.max(0, billing.total - receiptsTotal);
    
    return {
      nights,
      receiptsTotal,
      stayReceipts,
      billing,
      totalAmount,
      checkInDate,
      checkOutDate,
    };
  };

  const isLoading = reservationsLoading || receiptsLoading || adminLoading || familyGroupsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-muted-foreground text-base">Loading stay history...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat" style={{backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'}}>
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-6xl mb-4 font-kaushan text-primary drop-shadow-lg">Stay History</h1>
            <p className="text-muted-foreground text-base">
              {isAdmin ? "Review cabin stays and checkout information for all family groups" : "Review your past cabin stays and checkout information"}
            </p>
            
            {/* Admin Family Group Selector */}
            {isAdmin && (
              <div className="mt-4 flex justify-center">
                <div className="w-64">
                  <Select value={selectedFamilyGroup} onValueChange={setSelectedFamilyGroup}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select family group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Family Groups</SelectItem>
                      {familyGroups.map((group) => (
                        <SelectItem key={group.id} value={group.name}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {pastReservations.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-3">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto" />
                <h3 className="text-lg font-semibold">No Past Stays Found</h3>
                <p className="text-base text-muted-foreground">
                  You haven't completed any stays yet. Your stay history will appear here after your first cabin visit.
                </p>
                <Button onClick={() => navigate("/calendar")} className="text-base">
                  View Calendar
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{pastReservations.length}</p>
                      <p className="text-base text-muted-foreground">Total Stays</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Clock className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">
                        {pastReservations.reduce((total, r) => {
                          const nights = Math.ceil((parseDateOnly(r.end_date).getTime() - parseDateOnly(r.start_date).getTime()) / (1000 * 3600 * 24));
                          return total + nights;
                        }, 0)}
                      </p>
                      <p className="text-base text-muted-foreground">Total Nights</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">
                        {BillingCalculator.formatCurrency(
                          pastReservations.reduce((total, r) => {
                            const stayData = calculateStayData(r);
                            return total + stayData.totalAmount;
                          }, 0)
                        )}
                      </p>
                      <p className="text-base text-muted-foreground">Total Paid</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Stay List */}
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">
                {isAdmin && selectedFamilyGroup === "all" ? "All Family Group Stays" : 
                 isAdmin ? `${selectedFamilyGroup} Stays` : "Your Stays"}
              </h2>
              
              {pastReservations.map((reservation) => {
                const stayData = calculateStayData(reservation);
                
                return (
                  <Card key={reservation.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-semibold">
                              {reservation.property_name || 'Cabin Stay'}
                            </h3>
                            <Badge variant="secondary" className="text-base">
                              {formatDistanceToNow(stayData.checkOutDate, { addSuffix: true })}
                            </Badge>
                          </div>
                          
                          <div className="grid gap-2 md:grid-cols-4 text-base">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {stayData.checkInDate.toLocaleDateString()} - {stayData.checkOutDate.toLocaleDateString()}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>{stayData.nights} nights</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>{reservation.guest_count || 0} guests</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {BillingCalculator.formatCurrency(stayData.totalAmount)}
                              </span>
                            </div>
                          </div>
                          
                          {stayData.receiptsTotal > 0 && (
                            <div className="mt-2 text-base text-muted-foreground">
                              Receipts submitted: {BillingCalculator.formatCurrency(stayData.receiptsTotal)}
                              ({stayData.stayReceipts.length} receipt{stayData.stayReceipts.length !== 1 ? 's' : ''})
                            </div>
                          )}
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // Navigate to a detailed view (we could create this later)
                            // For now, just show they can expand for details
                          }}
                          className="text-base"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Expandable details section - could be implemented later */}
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex gap-2">
                          <Badge 
                            variant="outline" 
                            className="text-base"
                            style={{
                              borderColor: familyGroups.find(fg => fg.name === reservation.family_group)?.color,
                              backgroundColor: `${familyGroups.find(fg => fg.name === reservation.family_group)?.color}10`
                            }}
                          >
                            {reservation.family_group}
                          </Badge>
                          {reservation.status && (
                            <Badge variant="default" className="text-base">
                              {reservation.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3 justify-center pt-6">
              <Button variant="outline" onClick={() => navigate("/finance-reports")} className="text-base">
                <FileText className="h-4 w-4 mr-2" />
                View Financial Dashboard
              </Button>
              <Button onClick={() => navigate("/calendar")} className="text-base">
                <Calendar className="h-4 w-4 mr-2" />
                Book New Stay
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StayHistory;