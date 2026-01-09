console.log('🔄 CABIN CALENDAR LOADED - CODE VERSION: 2025-11-01-02:00 FIX');

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Calendar, RotateCcw, CheckCircle, Clock, Users, ChevronDown, MapPin, Plus, Edit2, User, CalendarIcon, ArrowRight, Hammer } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { NavigationHeader } from "@/components/ui/navigation-header";
import { PropertyCalendar, PropertyCalendarRef } from "@/components/PropertyCalendar";
import { TradeRequestForm } from "@/components/TradeRequestForm";
import { SecondarySelectionManager } from "@/components/SecondarySelectionManager";
import { WorkWeekendProposalForm } from "@/components/WorkWeekendProposalForm";
import { useRotationOrder } from "@/hooks/useRotationOrder";
import { useReservationSettings } from "@/hooks/useReservationSettings";
import { useReservationPeriods } from "@/hooks/useReservationPeriods";
import { parseISO, format, addDays } from "date-fns";
import { useSequentialSelection, SelectionStatus } from "@/hooks/useSequentialSelection";
import { useAuth } from "@/contexts/AuthContext";
import { useSelectionExtensions } from "@/hooks/useSelectionExtensions";
import { ExtendSelectionDialog } from "@/components/ExtendSelectionDialog";
import { useFamilyGroups } from "@/hooks/useFamilyGroups";
import { useTradeRequests } from "@/hooks/useTradeRequests";
import { useOrganization } from "@/hooks/useOrganization";
import { useUserRole } from "@/hooks/useUserRole";
import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/contexts/RoleContext";
import { Eye, EyeOff } from "lucide-react";
import { SelectionTurnNotificationButton } from "@/components/SelectionTurnNotificationButton";
import { AllocationModelBadge } from "@/components/AllocationModelBadge";
import { TestOrganizationWarningBanner } from "@/components/TestOrganizationWarningBanner";

const CabinCalendar = () => {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { familyGroups, assignDefaultColorsWithProtection, isSupervisor } = useFamilyGroups();
  const { getRotationForYear, rotationData } = useRotationOrder();
  const { reservationSettings } = useReservationSettings();
  const { tradeRequests } = useTradeRequests();
  const { periods: reservationPeriods } = useReservationPeriods();
  const { toast } = useToast();
  
  // State variables
  const [bookingOpen, setBookingOpen] = useState(false);
  const [tradeRequestOpen, setTradeRequestOpen] = useState(false);
  const [multiPeriodBookingOpen, setMultiPeriodBookingOpen] = useState(false);
  const [manualDateSelectionOpen, setManualDateSelectionOpen] = useState(false);
  const propertyCalendarRef = useRef<PropertyCalendarRef>(null);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());
  const [selectedFamilyGroup, setSelectedFamilyGroup] = useState<string>("");
  const [selectedHost, setSelectedHost] = useState<string>("");
  const [accordionValue, setAccordionValue] = useState<string[]>([]);
  const workWeekendSectionRef = useRef<HTMLDivElement>(null);
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [selectedFamilyForExtension, setSelectedFamilyForExtension] = useState<string | null>(null);
  const [extensionEndDate, setExtensionEndDate] = useState<Date>(new Date());

  // Get user role information
  const { isCalendarKeeper, isGroupLead, userFamilyGroup: userGroup, userHostInfo, isAdmin } = useUserRole();
  const { impersonatedFamilyGroup, setImpersonatedFamilyGroup } = useRole();
  
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
  
  // Assign default colors to family groups if they don't have colors (supervisors only)
  useEffect(() => {
    const hasUncoloredGroups = familyGroups.some(fg => !fg.color);
    if (isSupervisor && hasUncoloredGroups && familyGroups.length > 0) {
      assignDefaultColorsWithProtection();
    }
  }, [familyGroups, assignDefaultColorsWithProtection, isSupervisor]);
  
  // Calculate the active rotation year based on current date and rotation start date
  const getRotationYear = () => {
    if (!rotationData || !rotationData.start_month) {
      return new Date().getFullYear();
    }
    
    const today = new Date();
    const currentYear = today.getFullYear();
    
    // Parse rotation start month (e.g., "October" -> 9, zero-indexed)
    const monthNames = ["January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"];
    const startMonthIndex = monthNames.findIndex(m => m === rotationData.start_month);
    
    // Create rotation start date for current year (use 1st of month for year calculation)
    const rotationStartThisYear = new Date(currentYear, startMonthIndex, 1);
    
    console.log('[CabinCalendar] getRotationYear calculation:', {
      today: today.toISOString(),
      currentYear,
      startMonth: rotationData.start_month,
      rotationStartThisYear: rotationStartThisYear.toISOString(),
      hasPassedStartDate: today >= rotationStartThisYear,
      calculatedRotationYear: today >= rotationStartThisYear ? currentYear + 1 : currentYear
    });
    
    // If we've passed the rotation start date, we're in the next rotation year
    if (today >= rotationStartThisYear) {
      return currentYear + 1;
    }
    
    // Otherwise, we're still in the current rotation year
    return currentYear;
  };
  
  const rotationYear = getRotationYear();
  const currentRotationOrder = rotationData ? getRotationForYear(rotationYear) : [];
  const { 
    currentPhase, 
    familyStatuses, 
    loading: selectionLoading,
    canCurrentUserSelect,
    advanceSelection,
    currentFamilyGroup,
    getUserUsageInfo,
    secondarySelectionStartDate
  } = useSequentialSelection(rotationYear);
  
  console.log('=== CABIN CALENDAR SELECTION STATE ===', {
    rotationYear,
    currentPhase,
    currentFamilyGroup,
    userGroup: userGroup?.name,
    canSelect: userGroup ? canCurrentUserSelect(userGroup.name) : false,
    selectionLoading,
    willShowSecondaryManager: currentPhase === 'secondary'
  });
  
  // Use correct selection status from useSequentialSelection hook
  const currentRotationYearStatuses = familyStatuses;
  const currentRotationYearCurrentFamily = currentFamilyGroup;
  
  // Get selection period extensions for current rotation year
  const { 
    getExtensionForFamily, 
    createOrUpdateExtension,
    loading: extensionsLoading 
  } = useSelectionExtensions(rotationYear);
  
  const { userFamilyGroup } = useUserRole();

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat" style={{backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'}}>
      <div className="max-w-7xl mx-auto">
        <Card className="bg-card/95 mb-8 min-h-screen">
          <CardHeader className="pb-2 pt-2">
            {/* Test Organization Warning Banner */}
            <TestOrganizationWarningBanner className="mb-4" />
            
            <div className="text-center mb-2">
              <div className="flex items-center justify-center gap-3 mb-1">
                <h1 className="text-2xl md:text-4xl font-kaushan text-primary drop-shadow-lg flex items-center">
                  <Calendar className="h-5 w-5 md:h-6 md:w-6 mr-2" />
                  Cabin Calendar
                </h1>
                <AllocationModelBadge showIcon={true} />
              </div>
              <div className="relative flex items-center justify-center">
                <p className="text-sm md:text-lg text-primary font-medium">View and manage cabin reservations and availability</p>
                <div className="absolute left-0">
                  <NavigationHeader 
                    backLabel="Home" 
                    className="mb-0"
                    familyGroups={familyGroups}
                    selectedFamilyGroup={selectedFamilyGroup}
                    onFamilyGroupChange={handleFamilyGroupChange}
                    showFamilyGroupSelector={isCalendarKeeper || (organization?.admin_email?.toLowerCase() === user?.email?.toLowerCase())}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            
            {/* Admin Impersonation Controls */}
            {isAdmin && (
              <div className="mb-4 p-4 bg-muted/50 border border-border rounded-lg space-y-3">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Admin View Mode</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={impersonatedFamilyGroup || "none"}
                      onValueChange={(value) => setImpersonatedFamilyGroup(value === "none" ? null : value)}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="View as..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Your own view</SelectItem>
                        {familyGroups.map(fg => (
                          <SelectItem key={fg.name} value={fg.name}>
                            View as: {fg.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {impersonatedFamilyGroup && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setImpersonatedFamilyGroup(null)}
                      >
                        <EyeOff className="h-4 w-4 mr-1" />
                        Exit
                      </Button>
                    )}
                  </div>
                </div>
                {impersonatedFamilyGroup && (
                  <div className="p-3 bg-primary/10 border border-primary/20 rounded-md">
                    <p className="text-sm text-primary font-medium">
                      👁️ You are viewing as: <strong>{impersonatedFamilyGroup}</strong>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      You can see exactly what members of this family group see, including their selection turn status.
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Debug logging for button visibility */}
            {(() => {
              const shouldShowButton = currentPhase === 'primary' && userGroup && canCurrentUserSelect(userGroup.name);
              console.log('[CabinCalendar] Button visibility check:', {
                currentPhase,
                hasUserGroup: !!userGroup,
                userGroupName: userGroup?.name,
                canSelect: userGroup ? canCurrentUserSelect(userGroup.name) : false,
                shouldShowButton
              });
              return null;
            })()}
            
            {/* Primary Selection Turn Indicator Banner */}
            {currentPhase === 'primary' && userGroup && canCurrentUserSelect(userGroup.name) && (
              <div className="mb-4 p-4 bg-primary/10 border-2 border-primary rounded-lg">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-primary flex items-center gap-2 mb-1">
                      <CheckCircle className="h-5 w-5 flex-shrink-0" />
                      It's Your Turn to Select!
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {(() => {
                        const usageInfo = getUserUsageInfo(userGroup.name);
                        console.log('[DEBUG] CabinCalendar - Selection Banner usageInfo:', {
                          userGroupName: userGroup.name,
                          usageInfo,
                          currentPhase,
                          rotationYear
                        });
                        if (!usageInfo) return "You can now make your primary selections.";
                        return `You've selected ${usageInfo.used} of ${usageInfo.allowed} periods (${usageInfo.remaining} remaining)`;
                      })()}
                    </p>
                  </div>
                  <ConfirmationDialog
                    title="Confirm Selection Complete"
                    description={(() => {
                      const usageInfo = getUserUsageInfo(userGroup.name);
                      if (!usageInfo) return "Are you sure you want to complete your selection and pass it to the next family?";
                      if (usageInfo.remaining > 0) {
                        return `You have only selected ${usageInfo.used} periods out of ${usageInfo.allowed}. Are you sure you want to finish early and pass the selection to the next family group?`;
                      }
                      return "Confirm that you have completed your selection period and are ready to pass the selection to the next family group.";
                    })()}
                    confirmText="Yes, I'm Done"
                    onConfirm={async () => {
                      try {
                        await advanceSelection(true);
                        toast({
                          title: "Selection Complete",
                          description: "Your selection period has been marked complete. The next family group has been notified that it's their turn.",
                        });
                      } catch (error) {
                        console.error('Error advancing selection:', error);
                        toast({
                          title: "Error",
                          description: "Failed to complete selection. Please try again.",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <Button size="lg" className="bg-primary hover:bg-primary/90 shadow-lg whitespace-nowrap">
                      <CheckCircle className="h-5 w-5 mr-2" />
                      I'm Done Selecting
                    </Button>
                  </ConfirmationDialog>
                </div>
              </div>
            )}
            
            {/* Secondary Selection Manager */}
            {currentPhase === 'secondary' && (
              <div className="mb-4">
                <SecondarySelectionManager 
                  currentMonth={currentCalendarMonth}
                  userFamilyGroup={userGroup?.name}
                />
              </div>
            )}
            
            {/* Admin Manual Notification Control */}
            {(isCalendarKeeper || isAdmin || organization?.treasurer_email?.toLowerCase() === user?.email?.toLowerCase()) && 
             currentPhase === 'primary' && 
             currentRotationYearCurrentFamily && 
             (!userGroup || !canCurrentUserSelect(userGroup.name)) && (
              <div className="mb-4 p-4 bg-muted/50 border border-border rounded-lg">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-foreground mb-1">
                      Current Selection Turn: {currentRotationYearCurrentFamily}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      You can manually send a notification to remind them it's their turn
                    </p>
                  </div>
                  <SelectionTurnNotificationButton
                    currentFamilyGroup={currentRotationYearCurrentFamily}
                    rotationYear={rotationYear}
                  />
                </div>
              </div>
            )}
            
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
                    <div className="flex flex-wrap items-center gap-3 lg:gap-4">
                       {/* 2025 Order Dropdown - Narrow trigger, wide content */}
                       <Select>
                         <SelectTrigger className="w-32 bg-background/90 backdrop-blur-sm border-border">
                           <SelectValue placeholder={`${rotationYear} Order`} />
                         </SelectTrigger>
                         <SelectContent className="bg-background border border-border shadow-lg z-50 w-80">
                           <div className="p-3">
                             <div className="font-medium text-sm mb-2">
                               {rotationYear} Rotation Order
                             </div>
                             <div className="space-y-1">
                               {currentRotationOrder.map((familyGroup, index) => {
                                 return (
                                   <div key={index} className="flex items-center gap-2 text-sm">
                                     <span className="font-semibold w-6">{index + 1}.</span>
                                     <span className="flex-1">{familyGroup}</span>
                                   </div>
                                 );
                               })}
                             </div>
                           </div>
                         </SelectContent>
                       </Select>

                       {/* Selection Status Dropdown - Narrow trigger, wide content */}
                       <Select>
                         <SelectTrigger className="w-40 bg-background/90 backdrop-blur-sm border-border">
                           <SelectValue placeholder={`${rotationYear} Status`} />
                         </SelectTrigger>
                         <SelectContent className="bg-background border border-border shadow-lg z-50 w-80">
                           <div className="p-3">
                             <div className="font-medium text-sm mb-2">
                               {rotationYear} Selection Status
                             </div>
                             <div className="space-y-1">
                               {currentRotationYearStatuses.map((familyStatus, index) => {
                                 const getStatusDisplay = () => {
                                   switch (familyStatus.status) {
                                     case 'active':
                                       return {
                                         icon: '🟢',
                                         text: familyStatus.dayCountText || 'selecting',
                                         title: 'Currently selecting'
                                       };
                                     case 'completed':
                                       return {
                                         icon: '✅',
                                         text: 'completed',
                                         title: 'Selection completed'
                                       };
                                     case 'waiting':
                                       return {
                                         icon: '⏳',
                                         text: 'waiting',
                                         title: 'Waiting to select'
                                       };
                                     default:
                                       return {
                                         icon: '⏳',
                                         text: 'waiting',
                                         title: 'Waiting to select'
                                       };
                                   }
                                 };
                                 
                                 const statusDisplay = getStatusDisplay();
                                 
                                 return (
                                   <div key={index} className="flex items-center gap-2 text-sm">
                                     <span className="font-semibold w-6">{index + 1}.</span>
                                     <span className="flex-1">{familyStatus.familyGroup}</span>
                                     <div className="flex items-center gap-1">
                                       <div title={statusDisplay.title}>
                                         {statusDisplay.icon}
                                       </div>
                                       <span className="text-xs text-muted-foreground">({statusDisplay.text})</span>
                                     </div>
                                   </div>
                                 );
                               })}
                             </div>
              <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                <p className="font-medium">Selection begins October 1st</p>
                {(() => {
                  // Check if all families have completed both primary and secondary
                  const allPrimaryCompleted = currentRotationYearStatuses.every(s => s.status === 'completed');
                  const allSecondaryCompleted = currentPhase === 'secondary' && allPrimaryCompleted;
                  
                  if (allSecondaryCompleted) {
                    return (
                      <div className="space-y-1 mt-2">
                        <p className="font-semibold text-green-600 dark:text-green-400">✅ Primary Selection Completed</p>
                        <p className="font-semibold text-green-600 dark:text-green-400">✅ Secondary Selection Completed</p>
                      </div>
                    );
                  }
                  
                  if (currentPhase === 'secondary' && allPrimaryCompleted && !allSecondaryCompleted) {
                    // In secondary phase, primary is done
                    return (
                      <div className="space-y-1 mt-2">
                        <p className="font-semibold text-green-600 dark:text-green-400">✅ Primary Selection Completed</p>
                        {currentRotationYearCurrentFamily ? (
                          <>
                            <p className="font-semibold text-primary">Secondary Selection Active</p>
                            {secondarySelectionStartDate && rotationData && (
                              <p className="text-xs">
                                Selection period: {format(secondarySelectionStartDate, 'MMM d')} - {format(addDays(secondarySelectionStartDate, rotationData.secondary_selection_days || 7), 'MMM d')}
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-xs">Secondary selection in progress</p>
                        )}
                      </div>
                    );
                  }
                  
                  if (!currentRotationYearCurrentFamily) {
                    return null;
                  }
                  
                  // Primary selection phase: show actual selection dates
                  if (currentPhase === 'secondary') {
                    if (!secondarySelectionStartDate || !rotationData) {
                      return (
                        <div className="space-y-1 mt-2">
                          <p className="font-semibold text-green-600 dark:text-green-400">✅ Primary Selection Completed</p>
                          <p className="font-semibold text-primary">Secondary Selection Active</p>
                          <p className="text-xs">7-day rolling selection period</p>
                        </div>
                      );
                    }
                    
                    const startDate = secondarySelectionStartDate;
                    const selectionDays = rotationData.secondary_selection_days || 7;
                    const endDate = addDays(startDate, selectionDays);
                    
                    return (
                      <div className="space-y-1 mt-2">
                        <p className="font-semibold text-green-600 dark:text-green-400">✅ Primary Selection Completed</p>
                        <p className="font-semibold text-primary">Secondary Selection Active</p>
                        <p className="text-xs">Selection period: {format(startDate, 'MMM d')} - {format(endDate, 'MMM d')}</p>
                      </div>
                    );
                  }
                  
                  // Primary selection phase: show actual selection period dates
                  const currentPeriod = reservationPeriods?.find(
                    p => p.current_family_group === currentRotationYearCurrentFamily && 
                         p.rotation_year === rotationYear
                  );

                  if (!currentPeriod) {
                    return <div className="text-xs text-muted-foreground">Selection period not found</div>;
                  }

                  const startDate = parseISO(currentPeriod.selection_start_date);
                  const originalEndDate = parseISO(currentPeriod.selection_end_date);
                  
                  // Check for extension
                  const extension = getExtensionForFamily(currentRotationYearCurrentFamily);
                  const endDate = extension 
                    ? new Date(extension.extended_until)
                    : originalEndDate;

                  const formatDate = (date: Date) => {
                    return format(date, 'MMM d');
                  };
                  
                  const handleExtendClick = () => {
                    setSelectedFamilyForExtension(currentRotationYearCurrentFamily);
                    setExtensionEndDate(endDate);
                    setExtendDialogOpen(true);
                  };
                  
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p>Selection period: {formatDate(startDate)} - {formatDate(endDate)}</p>
                        {(isCalendarKeeper || isGroupLead) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleExtendClick}
                            className="h-6 px-2 text-xs"
                          >
                            <Clock className="h-3 w-3 mr-1" />
                            Extend
                          </Button>
                        )}
                      </div>
                      {extension && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          ⚠️ Extended from {formatDate(originalEndDate)}
                          {extension.extension_reason && ` - ${extension.extension_reason}`}
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
                           </div>
                         </SelectContent>
                       </Select>

                       {/* Booking Controls */}
                       <DropdownMenu>
                         <DropdownMenuTrigger asChild>
                           <Button size="sm" className="hover-scale">
                             <Calendar className="h-4 w-4 mr-2" />
                             Booking
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
                            <DropdownMenuItem 
                              onClick={() => {
                                propertyCalendarRef.current?.scrollToWorkWeekend();
                              }}
                              className="hover-scale"
                            >
                              <Hammer className="mr-2 h-4 w-4" />
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
                               <DropdownMenuItem onClick={() => setTradeRequestOpen(true)}>
                                 Request trade with another group
                               </DropdownMenuItem>
                               <DropdownMenuItem>
                                 Request Calendar Keeper assistance
                               </DropdownMenuItem>
                             </DropdownMenuSubContent>
                           </DropdownMenuSub>
                         </DropdownMenuContent>
                       </DropdownMenu>

                         {/* Host Selector - Only when Calendar Keeper has selected a family group */}
                         {isCalendarKeeper && selectedFamilyGroup && selectedFamilyGroup !== "all" && availableHosts.length > 0 && (
                           <Select value={selectedHost} onValueChange={setSelectedHost}>
                             <SelectTrigger className="w-40 bg-background/90 backdrop-blur-sm border-border">
                               <User className="h-4 w-4 mr-1" />
                               <SelectValue placeholder="Host" />
                             </SelectTrigger>
                             <SelectContent className="bg-background border border-border shadow-lg z-50 min-w-[12rem]">
                               {availableHosts.map((host) => (
                                  <SelectItem key={host.name} value={host.name}>
                                    <div className="flex items-center gap-2">
                                      <User className="h-3 w-3" />
                                      <span className="truncate">{host.name.split(' ')[0]}</span>
                                    </div>
                                  </SelectItem>
                               ))}
                             </SelectContent>
                            </Select>
                          )}

                      </div>
                   </div>
                 )}
                </div>
              </div>

            {/* Calendar - Main focus */}
            <div className="grid grid-cols-1 gap-4">
              <PropertyCalendar 
                ref={propertyCalendarRef}
                onMonthChange={setCurrentCalendarMonth}
                selectedFamilyGroupFilter=""
              />
            </div>


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
            
            {/* Extend Selection Period Dialog */}
            {selectedFamilyForExtension && (
              <ExtendSelectionDialog
                open={extendDialogOpen}
                onOpenChange={setExtendDialogOpen}
                familyGroup={selectedFamilyForExtension}
                currentEndDate={extensionEndDate}
                onExtend={async (newEndDate, reason) => {
                  const selectionDays = rotationData?.selection_days || 7;
                  const currentYear = rotationYear; // The year being selected for
                  const selectionStartYear = currentYear - 1; // Year when selection starts
                  const baseStartDate = new Date(selectionStartYear, 9, 1);
                  const currentYearOrder = getRotationForYear(currentYear);
                  const currentFamilyIndex = currentYearOrder.indexOf(selectedFamilyForExtension);
                  const startDate = new Date(baseStartDate);
                  startDate.setDate(startDate.getDate() + (currentFamilyIndex * selectionDays));
                  const originalEndDate = new Date(startDate);
                  originalEndDate.setDate(originalEndDate.getDate() + selectionDays - 1);
                  
                  await createOrUpdateExtension(
                    selectedFamilyForExtension,
                    originalEndDate.toISOString().split('T')[0],
                    newEndDate,
                    reason
                  );
                }}
              />
            )}
            
            {/* Trade Request Form */}
            <TradeRequestForm
              open={tradeRequestOpen}
              onOpenChange={setTradeRequestOpen}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CabinCalendar;
