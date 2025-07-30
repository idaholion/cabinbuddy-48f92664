import React, { useState } from 'react';
import { Plus, Calendar, Users, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EnhancedPropertyCalendar } from '@/components/EnhancedPropertyCalendar';
import { MultiReservationForm } from '@/components/MultiReservationForm';
import { BookingForm } from '@/components/BookingForm';
import { useReservations, Reservation } from '@/hooks/useEnhancedReservations';
import { useFamilyGroups } from '@/hooks/useFamilyGroups';
import { ReservationListSkeleton } from '@/components/ui/loading-skeletons';
import { QueryError, EmptyState } from '@/components/ui/error-states';

export const EnhancedReservationSystem = () => {
  const [selectedFamilyGroup, setSelectedFamilyGroup] = useState<string>();
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('calendar');

  const { reservations, isLoading, error } = useReservations();
  const { familyGroups } = useFamilyGroups();

  const handleReservationSelect = (reservation: Reservation) => {
    setSelectedReservation(reservation);
  };

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false);
  };

  const filteredReservations = selectedFamilyGroup 
    ? reservations.filter(r => r.family_group === selectedFamilyGroup)
    : reservations;

  const upcomingReservations = filteredReservations
    .filter(r => new Date(r.start_date) >= new Date() && r.status !== 'cancelled')
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

  const currentReservations = filteredReservations
    .filter(r => {
      const today = new Date();
      const start = new Date(r.start_date);
      const end = new Date(r.end_date);
      return today >= start && today <= end && r.status !== 'cancelled';
    });

  if (isLoading) {
    return <ReservationListSkeleton />;
  }

  if (error) {
    return (
      <QueryError 
        error={error as Error}
        title="Failed to load reservations"
        description="There was an error loading the reservation system."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reservation System</h1>
          <p className="text-muted-foreground">
            Manage your cabin reservations with advanced booking capabilities
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Family Group Filter */}
          <Select value={selectedFamilyGroup || 'all'} onValueChange={(value) => {
            setSelectedFamilyGroup(value === 'all' ? undefined : value);
          }}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Groups" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              {familyGroups.map(group => (
                <SelectItem key={group.id} value={group.name}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-3 w-3 rounded-full border"
                      style={{ backgroundColor: group.color }}
                    />
                    {group.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Create Reservation Dialog */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Reservation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Reservation</DialogTitle>
              </DialogHeader>
              
              <Tabs defaultValue="multi" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="multi">Multi-Period Booking</TabsTrigger>
                  <TabsTrigger value="single">Single Reservation</TabsTrigger>
                </TabsList>
                
                <TabsContent value="multi" className="mt-6">
                  <MultiReservationForm 
                    onSuccess={handleCreateSuccess}
                    onCancel={() => setIsCreateDialogOpen(false)}
                  />
                </TabsContent>
                
                <TabsContent value="single" className="mt-6">
                  <div className="text-center p-8 text-muted-foreground">
                    Single reservation form integration coming soon...
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Current Reservations</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{currentReservations.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Upcoming Reservations</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{upcomingReservations.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Total Active</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {reservations.filter(r => r.status !== 'cancelled').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>
        
        <TabsContent value="calendar" className="mt-6">
          <EnhancedPropertyCalendar
            selectedFamilyGroup={selectedFamilyGroup}
            onReservationSelect={handleReservationSelect}
          />
        </TabsContent>
        
        <TabsContent value="list" className="mt-6">
          <div className="space-y-4">
            {/* Current Reservations */}
            {currentReservations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Current Reservations</CardTitle>
                  <CardDescription>Active reservations happening now</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {currentReservations.map((reservation) => (
                      <div
                        key={reservation.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => handleReservationSelect(reservation)}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="h-4 w-4 rounded-full border"
                            style={{ 
                              backgroundColor: familyGroups.find(g => g.name === reservation.family_group)?.color 
                            }}
                          />
                          <div>
                            <div className="font-medium">{reservation.family_group}</div>
                            <div className="text-sm text-muted-foreground">
                              {reservation.start_date} to {reservation.end_date}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {reservation.guest_count && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Users className="h-3 w-3" />
                              {reservation.guest_count}
                            </div>
                          )}
                          <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                            Active
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Upcoming Reservations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Upcoming Reservations ({upcomingReservations.length})
                </CardTitle>
                <CardDescription>Future reservations</CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingReservations.length === 0 ? (
                  <EmptyState
                    title="No upcoming reservations"
                    description="Create your first reservation to get started."
                    action={
                      <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Reservation
                      </Button>
                    }
                  />
                ) : (
                  <div className="space-y-3">
                    {upcomingReservations.map((reservation) => (
                      <div
                        key={reservation.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => handleReservationSelect(reservation)}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="h-4 w-4 rounded-full border"
                            style={{ 
                              backgroundColor: familyGroups.find(g => g.name === reservation.family_group)?.color 
                            }}
                          />
                          <div>
                            <div className="font-medium">{reservation.family_group}</div>
                            <div className="text-sm text-muted-foreground">
                              {reservation.start_date} to {reservation.end_date}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {reservation.guest_count && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Users className="h-3 w-3" />
                              {reservation.guest_count}
                            </div>
                          )}
                          <div className={`text-xs px-2 py-1 rounded-full ${
                            reservation.status === 'confirmed' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {reservation.status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};