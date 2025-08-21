import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Calendar, RotateCcw, CheckCircle, Clock, Users, ChevronDown, MapPin, Plus, Edit2, User, CalendarIcon, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { NavigationHeader } from "@/components/ui/navigation-header";
import { PropertyCalendar } from "@/components/PropertyCalendar";
import { SecondarySelectionManager } from "@/components/SecondarySelectionManager";

import { WorkWeekendProposalForm } from "@/components/WorkWeekendProposalForm";
import { useRotationOrder } from "@/hooks/useRotationOrder";
import { useReservationSettings } from "@/hooks/useReservationSettings";
import { useSequentialSelection } from "@/hooks/useSequentialSelection";
import { useAuth } from "@/contexts/AuthContext";
import { useFamilyGroups } from "@/hooks/useFamilyGroups";
import { useTradeRequests } from "@/hooks/useTradeRequests";
import { useOrganization } from "@/hooks/useOrganization";
import { useUserRole } from "@/hooks/useUserRole";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const CabinCalendar = () => {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { familyGroups, assignDefaultColorsWithProtection } = useFamilyGroups();
  const { getRotationForYear, rotationData } = useRotationOrder();
  const { reservationSettings } = useReservationSettings();
  const { tradeRequests } = useTradeRequests();
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());
  const [selectedFamilyGroup, setSelectedFamilyGroup] = useState<string>("");
  const [selectedHost, setSelectedHost] = useState<string>("");
  
  const [manualDateSelectionOpen, setManualDateSelectionOpen] = useState(false);

  // Get user role information
  const { isCalendarKeeper, isGroupLead, userFamilyGroup: userGroup, userHostInfo } = useUserRole();
  
  // Get user's family group and pending trade requests
  const userFamilyGroupName = userGroup?.name;

  const pendingTradeRequests = tradeRequests.filter(tr => 
    tr.target_family_group === userFamilyGroupName && tr.status === 'pending'
  ).length;
  
  // Set default selected family group to user's group
  useEffect(() => {
    if (userFamilyGroupName && !selectedFamilyGroup) {
      setSelectedFamilyGroup(userFamilyGroupName);
    }
  }, [userFamilyGroupName, selectedFamilyGroup]);
  
  // Set default selected host
  useEffect(() => {
    if (userHostInfo && !selectedHost) {
      setSelectedHost(userHostInfo.name);
    } else if (isGroupLead && userGroup?.lead_name && !selectedHost) {
      setSelectedHost(userGroup.lead_name);
    }
  }, [userHostInfo, isGroupLead, userGroup, selectedHost]);
  
  // Get available hosts based on selected family group and user role
  const getAvailableHosts = () => {
    const currentGroup = familyGroups.find(fg => fg.name === selectedFamilyGroup);
    if (!currentGroup) return [];
    
    const hosts = [];
    
    // Add group lead if exists
    if (currentGroup.lead_name) {
      hosts.push({ name: currentGroup.lead_name, email: currentGroup.lead_email });
    }
    
    // Add host members (avoid duplicates with lead)
    if (currentGroup.host_members) {
      const hostMembers = currentGroup.host_members
        .filter((member: any) => {
          // Filter out duplicates with group lead
          return member.name !== currentGroup.lead_name && 
                 member.email !== currentGroup.lead_email;
        })
        .map((member: any) => ({
          name: member.name,
          email: member.email
        }));
      hosts.push(...hostMembers);
    }
    
    // Remove any remaining duplicates by name
    const uniqueHosts = hosts.filter((host, index, self) => 
      index === self.findIndex(h => h.name === host.name)
    );
    
    return uniqueHosts;
  };
  
  const availableHosts = getAvailableHosts();
  
  
  // Handle family group change
  const handleFamilyGroupChange = (value: string) => {
    setSelectedFamilyGroup(value);
    
    // Reset host selection when changing family group
    setSelectedHost("");
    
    // Auto-select host based on role
    if (value !== "all") {
      const newGroup = familyGroups.find(fg => fg.name === value);
      if (newGroup) {
        // If calendar keeper, try to find their host info in the new group
        if (isCalendarKeeper && user?.email) {
          const userHost = newGroup.host_members?.find((member: any) => 
            member.email?.toLowerCase() === user.email.toLowerCase()
          );
          if (userHost) {
            setSelectedHost(userHost.name);
          } else if (newGroup.lead_email?.toLowerCase() === user.email.toLowerCase()) {
            setSelectedHost(newGroup.lead_name || "");
          }
        }
        // If group lead, they can only select their own group and they are the default host
        else if (isGroupLead && newGroup.name === userFamilyGroupName) {
          setSelectedHost(userGroup?.lead_name || "");
        }
      }
    }
  };
  
  // Assign default colors to family groups if they don't have colors
  useEffect(() => {
    const hasUncoloredGroups = familyGroups.some(fg => !fg.color);
    if (hasUncoloredGroups && familyGroups.length > 0) {
      assignDefaultColorsWithProtection();
    }
  }, [familyGroups, assignDefaultColorsWithProtection]);
  
  // Calculate the rotation year based on current calendar month and start month
  const getRotationYear = () => {
    if (!rotationData || !rotationData.start_month) {
      return new Date().getFullYear();
    }
    
    const calendarYear = currentCalendarMonth.getFullYear();
    const calendarMonthIndex = currentCalendarMonth.getMonth();
    const baseRotationYear = rotationData.rotation_year;
    const startMonth = rotationData.start_month;
    
    // Convert month name to number (0-11)
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    const startMonthIndex = monthNames.indexOf(startMonth);
    
    // Calculate which rotation year this calendar month/year represents
    let rotationYear = baseRotationYear;
    
    // If we're before the start month in the current calendar year, use previous rotation year
    if (calendarMonthIndex < startMonthIndex) {
      rotationYear = baseRotationYear;
    } else {
      // If we're at or after the start month, use next rotation year
      rotationYear = baseRotationYear + 1;
    }
    
    // Adjust for years after the base year
    if (calendarYear > baseRotationYear) {
      const yearDiff = calendarYear - baseRotationYear;
      if (calendarMonthIndex >= startMonthIndex) {
        rotationYear = baseRotationYear + yearDiff + 1;
      } else {
        rotationYear = baseRotationYear + yearDiff;
      }
    }
    
    return rotationYear;
  };
  
  const rotationYear = getRotationYear();
  const currentRotationOrder = rotationData ? getRotationForYear(rotationYear) : [];
  const { familyStatuses, loading: selectionLoading } = useSequentialSelection(rotationYear);

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat" style={{backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'}}>
      <div className="max-w-7xl mx-auto">
        <Card className="bg-card/95 mb-8 min-h-screen">
          <CardHeader className="pb-2 pt-2">
            <div className="text-center mb-2">
              <h1 className="text-2xl md:text-4xl mb-1 font-kaushan text-primary drop-shadow-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 md:h-6 md:w-6 mr-2" />
                Cabin Calendar
              </h1>
              <div className="relative flex items-center justify-center">
                <p className="text-sm md:text-lg text-primary font-medium">View and manage cabin reservations and availability</p>
                <div className="absolute left-0">
                  <NavigationHeader backLabel="Home" className="mb-0" />
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            
            {/* Enhanced Mobile-Responsive Toolbar */}
            <div className="mb-4 p-3 bg-background/95 rounded-lg border border-border/20 backdrop-blur-sm shadow-sm">
              {/* Mobile-First Layout */}
              <div className="space-y-4">
                {/* Top Row - Rotation Order (Desktop) / Collapsible (Mobile) */}
                {currentRotationOrder.length > 0 && (
                  <div className="w-full">
                    <div className="flex items-center gap-2 md:hidden mb-2">
                      <RotateCcw className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-sm font-medium">{rotationYear} Rotation</span>
                    </div>
                    <div className="hidden md:flex items-center gap-2">
                      <RotateCcw className="h-4 w-4 text-primary" />
                      <Select>
                        <SelectTrigger className="w-56 bg-background/90 backdrop-blur-sm border-border">
                          <SelectValue placeholder={`${rotationYear} Rotation Order`} />
                        </SelectTrigger>
                        <SelectContent className="bg-background border border-border shadow-lg z-50">
                          <div className="p-3">
                            <div className="font-medium text-sm mb-2">{rotationYear} Rotation Order</div>
                            <div className="space-y-1">
                              {currentRotationOrder.map((familyGroup, index) => {
                                const familyStatus = familyStatuses.find(fs => fs.familyGroup === familyGroup);
                                return (
                                  <div key={index} className="flex items-center gap-2 text-sm">
                                    <span className="font-semibold w-6">{index + 1}.</span>
                                    <span className="flex-1">{familyGroup}</span>
                                    <div className="flex items-center gap-1">
                                      {familyStatus?.status === 'completed' ? (
                                        <div title="Selections completed">
                                          <CheckCircle className="h-3 w-3 text-green-500" />
                                        </div>
                                      ) : familyStatus?.status === 'active' ? (
                                        <div title="Currently selecting">
                                          <ArrowRight className="h-3 w-3 text-primary animate-pulse" />
                                        </div>
                                      ) : (
                                        <div title="Waiting to select">
                                          <Clock className="h-3 w-3 text-muted-foreground" />
                                        </div>
                                      )}
                                      {familyStatus?.dayCountText && (
                                        <span className="text-xs text-muted-foreground">
                                          {familyStatus.dayCountText}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            {rotationData && (
                              <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                                <p>Based on {rotationData.rotation_year} rotation</p>
                                <p>Rotation: {rotationData.first_last_option === "first" ? "First to last" : "Last to first"}</p>
                                {rotationData.start_month && (
                                  <p>Rotation year starts in {rotationData.start_month}</p>
                                )}
                              </div>
                            )}
                          </div>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                
                {/* Main Controls Row - Responsive Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center gap-3 lg:gap-4">
                  {/* Enhanced Mobile-Responsive Booking Controls */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" className="w-full lg:w-auto hover-scale">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Booking</span>
                        <span className="sm:hidden">Book</span>
                        <ChevronDown className="h-4 w-4 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuItem 
                        onClick={() => setManualDateSelectionOpen(true)}
                        className="hover-scale"
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Manual Date Selection
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Clock className="h-4 w-4 mr-2" />
                        Work Weekend
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="relative">
                          <Edit2 className="h-4 w-4 mr-2" />
                          Edit Booking
                          {pendingTradeRequests > 0 && (
                            <Badge 
                              variant="destructive" 
                              className="ml-auto h-5 w-5 p-0 text-xs animate-pulse"
                            >
                              {pendingTradeRequests}
                            </Badge>
                          )}
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          <DropdownMenuItem>
                            Edit my bookings
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            Request trade with another group
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            Request Calendar Keeper assistance
                          </DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Enhanced Family Group Selector */}
                  <div className="flex items-center gap-2 min-w-0 flex-1 lg:flex-initial">
                    <Users className="h-4 w-4 text-primary flex-shrink-0" />
                    <Select value={selectedFamilyGroup} onValueChange={handleFamilyGroupChange}>
                      <SelectTrigger className="w-full lg:w-48 bg-background/90 backdrop-blur-sm border-border">
                        <SelectValue placeholder="Select Family Group" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border shadow-lg z-50">
                        {isCalendarKeeper && <SelectItem value="all">All Family Groups</SelectItem>}
                        {(isCalendarKeeper ? familyGroups : familyGroups.filter(fg => fg.name === userFamilyGroupName)).map((familyGroup) => (
                          <SelectItem key={familyGroup.id} value={familyGroup.name}>
                            <div className="flex items-center gap-2">
                              {familyGroup.color && (
                                <div
                                  className="w-3 h-3 rounded-full border border-border animate-scale-in"
                                  style={{ backgroundColor: familyGroup.color }}
                                />
                              )}
                              <span className="truncate">{familyGroup.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Enhanced Host Selector */}
                  {selectedFamilyGroup && selectedFamilyGroup !== "all" && availableHosts.length > 0 && (
                    <div className="flex items-center gap-2 min-w-0 flex-1 lg:flex-initial animate-fade-in">
                      <User className="h-4 w-4 text-primary flex-shrink-0" />
                      <Select value={selectedHost} onValueChange={setSelectedHost}>
                        <SelectTrigger className="w-full lg:w-48 bg-background/90 backdrop-blur-sm border-border">
                          <SelectValue placeholder="Select Host" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border border-border shadow-lg z-50">
                          {availableHosts.map((host, index) => (
                            <SelectItem key={index} value={host.name}>
                              <span className="truncate">{host.name}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {/* Property Selector */}
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <Select value="property">
                      <SelectTrigger className="w-full md:w-48 bg-background/90 backdrop-blur-sm border-border">
                        <SelectValue placeholder="Select property" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border shadow-lg z-50">
                        <SelectItem value="property">
                          {reservationSettings?.property_name || "Property"}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Calendar - Main focus */}
            <div className="grid grid-cols-1 gap-4">
              <PropertyCalendar 
                onMonthChange={setCurrentCalendarMonth}
                selectedFamilyGroupFilter=""
              />
            </div>

            {/* Collapsible sections for secondary tools */}
            <Accordion type="multiple" className="mt-4 space-y-2">
              <AccordionItem value="secondary-selection" className="border rounded-lg">
                <AccordionTrigger className="px-4 py-2 text-sm font-medium hover:no-underline">
                  Secondary Selection Management
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 animate-accordion-down">
                  <SecondarySelectionManager currentMonth={currentCalendarMonth} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="work-weekend" className="border rounded-lg">
                <AccordionTrigger className="px-4 py-2 text-sm font-medium hover:no-underline">
                  Work Weekend Proposals
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 animate-accordion-down">
                  <WorkWeekendProposalForm />
                </AccordionContent>
              </AccordionItem>
            </Accordion>


            {/* Manual Date Selection Dialog */}
            <Dialog open={manualDateSelectionOpen} onOpenChange={setManualDateSelectionOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Manual Date Selection</DialogTitle>
                </DialogHeader>
                <div className="text-center text-muted-foreground">
                  <p>This feature will allow you to manually select dates for booking.</p>
                  <p className="mt-2">Click on the calendar below to select dates visually, or use the date selection tools that appear when you select dates.</p>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CabinCalendar;