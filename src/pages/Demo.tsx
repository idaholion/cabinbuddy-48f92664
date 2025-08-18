import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X, Calendar, Users, DollarSign, Camera, FileText, MessageSquare, ClipboardCheck, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NavigationHeader } from '@/components/ui/navigation-header';
import { useNavigate } from 'react-router-dom';

interface DemoSlide {
  id: string;
  title: string;
  description: string;
  explanation: string;
  icon: React.ElementType;
  content: React.ReactNode;
}

export default function Demo() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  const demoSlides: DemoSlide[] = [
    {
      id: 'family-organization',
      title: 'Family Organization Setup', 
      description: 'Create and manage family groups for your cabin sharing community',
      explanation: 'Start by setting up family groups - the foundation of your cabin sharing system. Each family has their own profile, contact information, and member details for easy coordination.',
      icon: Users,
      content: (
        <div className="p-6 bg-background min-h-[500px]">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-foreground mb-4">Welcome to Your Cabin Community</h1>
              <p className="text-lg text-muted-foreground">Set up family groups to organize your cabin sharing members</p>
            </div>
            
            <div className="grid gap-8 md:grid-cols-2">
              {/* Family Setup Form */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    Add New Family Group
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Family Name</label>
                      <input 
                        type="text" 
                        className="w-full mt-1 p-2 border border-input rounded-md"
                        value="The Johnson Family"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Primary Contact</label>
                      <input 
                        type="text" 
                        className="w-full mt-1 p-2 border border-input rounded-md"
                        value="Sarah Johnson"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Email</label>
                      <input 
                        type="email" 
                        className="w-full mt-1 p-2 border border-input rounded-md"
                        value="sarah.johnson@email.com"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Phone</label>
                      <input 
                        type="tel" 
                        className="w-full mt-1 p-2 border border-input rounded-md"
                        value="(555) 123-4567"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Number of Members</label>
                      <select className="w-full mt-1 p-2 border border-input rounded-md" value="4" disabled>
                        <option>4</option>
                      </select>
                    </div>
                    <Button className="w-full" disabled>Add Family Group</Button>
                  </div>
                </CardContent>
              </Card>

              {/* Current Family Groups */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Current Family Groups</h3>
                  <div className="space-y-3">
                    <div className="p-3 border rounded-lg bg-green-50">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium">The Smith Family</div>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Contact: Mike Smith</p>
                      <p className="text-sm text-muted-foreground">mike.smith@email.com</p>
                      <p className="text-sm text-muted-foreground">Members: 5</p>
                    </div>
                    <div className="p-3 border rounded-lg bg-green-50">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium">The Wilson Family</div>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Contact: Lisa Wilson</p>
                      <p className="text-sm text-muted-foreground">lisa.wilson@email.com</p>
                      <p className="text-sm text-muted-foreground">Members: 3</p>
                    </div>
                    <div className="p-3 border rounded-lg bg-green-50">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium">The Brown Family</div>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Contact: David Brown</p>
                      <p className="text-sm text-muted-foreground">david.brown@email.com</p>
                      <p className="text-sm text-muted-foreground">Members: 4</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-8 grid gap-8 md:grid-cols-2">
              {/* Financial Setup Preview */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    Financial Configuration
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Annual Family Fee</label>
                      <input 
                        type="text" 
                        className="w-full mt-1 p-2 border border-input rounded-md"
                        value="$2,400"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Payment Due Date</label>
                      <input 
                        type="text" 
                        className="w-full mt-1 p-2 border border-input rounded-md"
                        value="January 15th"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Late Fee</label>
                      <input 
                        type="text" 
                        className="w-full mt-1 p-2 border border-input rounded-md"
                        value="$50"
                        readOnly
                      />
                    </div>
                    <div className="text-sm text-green-700 bg-green-50 p-2 rounded">
                      ✓ Financial settings configured
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Reservation Setup Preview */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-purple-600" />
                    Reservation Rules
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Maximum Stay Length</label>
                      <input 
                        type="text" 
                        className="w-full mt-1 p-2 border border-input rounded-md"
                        value="14 days"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Booking Opens</label>
                      <input 
                        type="text" 
                        className="w-full mt-1 p-2 border border-input rounded-md"
                        value="1st of each month at 9:00 AM"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Rotation Method</label>
                      <input 
                        type="text" 
                        className="w-full mt-1 p-2 border border-input rounded-md"
                        value="Fair rotation by family"
                        readOnly
                      />
                    </div>
                    <div className="text-sm text-purple-700 bg-purple-50 p-2 rounded">
                      ✓ Reservation system configured
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'system-configuration',
      title: 'System Configuration',
      description: 'Complete financial and reservation rule setup',
      explanation: 'Configure the financial settings, reservation rules, and operational parameters that will govern how your cabin sharing system works.',
      icon: DollarSign,
      content: (
        <div className="p-6 bg-background min-h-[500px]">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-4">System Configuration Dashboard</h1>
              <p className="text-muted-foreground">Set up your financial and reservation rules</p>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              {/* Financial Setup */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    Financial Configuration
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Annual Family Fee</label>
                      <input 
                        type="text" 
                        className="w-full mt-1 p-2 border border-input rounded-md"
                        value="$2,400"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Payment Due Date</label>
                      <input 
                        type="text" 
                        className="w-full mt-1 p-2 border border-input rounded-md"
                        value="January 15th"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Late Fee</label>
                      <input 
                        type="text" 
                        className="w-full mt-1 p-2 border border-input rounded-md"
                        value="$50"
                        readOnly
                      />
                    </div>
                    <div className="text-sm text-green-700 bg-green-50 p-2 rounded">
                      ✓ Financial settings configured
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Reservation Rules */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-purple-600" />
                    Reservation Rules
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Maximum Stay Length</label>
                      <input 
                        type="text" 
                        className="w-full mt-1 p-2 border border-input rounded-md"
                        value="14 days"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Booking Opens</label>
                      <input 
                        type="text" 
                        className="w-full mt-1 p-2 border border-input rounded-md"
                        value="1st of each month at 9:00 AM"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Rotation Method</label>
                      <input 
                        type="text" 
                        className="w-full mt-1 p-2 border border-input rounded-md"
                        value="Fair rotation by family"
                        readOnly
                      />
                    </div>
                    <div className="text-sm text-purple-700 bg-purple-50 p-2 rounded">
                      ✓ Reservation system configured
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'calendar',
      title: 'Reservation Calendar',
      description: 'Interactive booking calendar with family assignments',
      explanation: 'The calendar shows all reservations, allows new bookings, and manages the rotation system to ensure fair access for all families.',
      icon: Calendar,
      content: (
        <div className="p-6 bg-background min-h-[500px]">
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold">Reservation Calendar</h1>
              <div className="flex gap-2">
                <Button variant="outline">Previous Month</Button>
                <Button>Next Month</Button>
              </div>
            </div>

            <div className="bg-white border rounded-lg overflow-hidden">
              <div className="grid grid-cols-7 gap-0 border-b">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-3 text-center font-medium bg-muted text-muted-foreground border-r last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-0">
                {Array.from({ length: 35 }, (_, i) => {
                  const dayNum = i - 2; // Start calendar on 3rd cell
                  const hasReservation = [5, 6, 7, 8, 9, 10, 11, 15, 16, 17, 18, 19, 20, 21, 25, 26, 27, 28].includes(dayNum);
                  const family = hasReservation ? ['Smith Family', 'Johnson Family', 'Wilson Family'][Math.floor(Math.random() * 3)] : null;
                  
                  return (
                    <div key={i} className="h-24 border-r border-b last:border-r-0 p-1">
                      {dayNum > 0 && dayNum <= 31 && (
                        <div className="h-full">
                          <div className="text-sm font-medium mb-1">{dayNum}</div>
                          {hasReservation && (
                            <div className="text-xs bg-blue-100 text-blue-800 rounded px-1 py-0.5 truncate">
                              {family}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
                <span>Reserved</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
                <span>Maintenance</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'financial',
      title: 'Financial Dashboard',
      description: 'Expense tracking and financial reporting',
      explanation: 'Track all cabin-related expenses, generate reports, and manage shared costs across families with transparent billing.',
      icon: DollarSign,
      content: (
        <div className="p-6 bg-background min-h-[500px]">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Financial Dashboard</h1>
            
            <div className="grid gap-6 md:grid-cols-3 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-green-600">$12,450</div>
                  <p className="text-sm text-muted-foreground">Total Collected</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-blue-600">$8,230</div>
                  <p className="text-sm text-muted-foreground">Total Expenses</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-orange-600">$4,220</div>
                  <p className="text-sm text-muted-foreground">Available Balance</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Recent Expenses</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b">
                      <div>
                        <p className="font-medium">Maintenance - Deck Repair</p>
                        <p className="text-sm text-muted-foreground">Jan 15, 2024</p>
                      </div>
                      <div className="text-red-600 font-semibold">-$1,250</div>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <div>
                        <p className="font-medium">Utilities - Electric</p>
                        <p className="text-sm text-muted-foreground">Jan 10, 2024</p>
                      </div>
                      <div className="text-red-600 font-semibold">-$180</div>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <div>
                        <p className="font-medium">Supplies - Cleaning</p>
                        <p className="text-sm text-muted-foreground">Jan 8, 2024</p>
                      </div>
                      <div className="text-red-600 font-semibold">-$85</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Family Contributions</h3>
                  <div className="space-y-3">
                    {['Smith Family', 'Johnson Family', 'Wilson Family', 'Brown Family'].map((family, i) => (
                      <div key={family} className="flex justify-between items-center py-2 border-b">
                        <div>
                          <p className="font-medium">{family}</p>
                          <p className="text-sm text-muted-foreground">Annual Fee</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-green-600 font-semibold">$2,400</div>
                          <Badge variant="secondary" className="bg-green-100 text-green-800">Paid</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'messaging',
      title: 'Communication Center',
      description: 'Send messages to families and administrators',
      explanation: 'Coordinate with all users through email and SMS messaging, with targeted communication to specific groups or all members.',
      icon: MessageSquare,
      content: (
        <div className="p-6 bg-background min-h-[500px]">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Communication Center</h1>
            
            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Send Message</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">To:</label>
                    <select className="w-full mt-1 p-2 border border-input rounded-md">
                      <option>All Users</option>
                      <option>Administrators</option>
                      <option>Calendar Keeper</option>
                      <option>Group Leads</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Message Type:</label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked className="rounded" />
                        <span className="text-sm">Email</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">SMS</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Subject:</label>
                    <input 
                      type="text" 
                      className="w-full mt-1 p-2 border border-input rounded-md"
                      value="Cabin Maintenance Schedule Update"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Message:</label>
                    <textarea 
                      className="w-full mt-1 p-2 border border-input rounded-md h-32"
                      value="The cabin deck repair has been scheduled for January 20-22. The cabin will be available for use, but please use the side entrance during this time."
                      readOnly
                    />
                  </div>
                  <Button className="w-full">Send Message</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Recent Messages</h3>
                <div className="space-y-3">
                  <div className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium">Booking Reminder</div>
                      <div className="text-sm text-muted-foreground">Jan 12, 2024</div>
                    </div>
                    <p className="text-sm text-muted-foreground">Sent to: All Users</p>
                    <p className="text-sm mt-1">February booking period opens tomorrow at 9 AM.</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium">Maintenance Notice</div>
                      <div className="text-sm text-muted-foreground">Jan 8, 2024</div>
                    </div>
                    <p className="text-sm text-muted-foreground">Sent to: Group Leads</p>
                    <p className="text-sm mt-1">Please coordinate with your families for spring cleaning.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    },
    {
      id: 'photos',
      title: 'Photo Sharing',
      description: 'Share memories and document cabin experiences',
      explanation: 'Upload and organize photos from cabin stays, creating a shared memory bank for all families to enjoy.',
      icon: Camera,
      content: (
        <div className="p-6 bg-background min-h-[500px]">
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold">Photo Gallery</h1>
              <Button>Upload Photos</Button>
            </div>
            
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 12 }, (_, i) => (
                <Card key={i} className="overflow-hidden">
                  <div className="aspect-square bg-gradient-to-br from-blue-100 to-green-100 flex items-center justify-center">
                    <Camera className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <CardContent className="p-3">
                    <p className="text-sm font-medium">Summer 2024 - Week {i + 1}</p>
                    <p className="text-xs text-muted-foreground">Smith Family</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-8">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Recent Uploads</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-2 hover:bg-muted rounded">
                      <Camera className="h-4 w-4" />
                      <div>
                        <p className="text-sm font-medium">Lake_sunset_jan2024.jpg</p>
                        <p className="text-xs text-muted-foreground">Uploaded by Johnson Family • 2 days ago</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 hover:bg-muted rounded">
                      <Camera className="h-4 w-4" />
                      <div>
                        <p className="text-sm font-medium">Kids_playing_snow.jpg</p>
                        <p className="text-xs text-muted-foreground">Uploaded by Wilson Family • 5 days ago</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'documents',
      title: 'Document Library',
      description: 'Access cabin rules, guides, and important documents',
      explanation: 'Centralized storage for all cabin-related documents including rules, maintenance guides, and seasonal information.',
      icon: FileText,
      content: (
        <div className="p-6 bg-background min-h-[500px]">
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold">Document Library</h1>
              <Button>Upload Document</Button>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <FileText className="h-6 w-6 text-blue-600" />
                    <h3 className="font-semibold">Cabin Rules</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">Guidelines for cabin use and behavior</p>
                  <div className="space-y-2">
                    <div className="text-sm hover:text-primary cursor-pointer">• General Rules & Guidelines</div>
                    <div className="text-sm hover:text-primary cursor-pointer">• Pet Policy</div>
                    <div className="text-sm hover:text-primary cursor-pointer">• Quiet Hours</div>
                    <div className="text-sm hover:text-primary cursor-pointer">• Emergency Procedures</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <FileText className="h-6 w-6 text-green-600" />
                    <h3 className="font-semibold">Maintenance Guides</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">How-to guides for cabin upkeep</p>
                  <div className="space-y-2">
                    <div className="text-sm hover:text-primary cursor-pointer">• HVAC Operation</div>
                    <div className="text-sm hover:text-primary cursor-pointer">• Water System</div>
                    <div className="text-sm hover:text-primary cursor-pointer">• Generator Instructions</div>
                    <div className="text-sm hover:text-primary cursor-pointer">• Appliance Manuals</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <FileText className="h-6 w-6 text-orange-600" />
                    <h3 className="font-semibold">Seasonal Information</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">Season-specific guides and tips</p>
                  <div className="space-y-2">
                    <div className="text-sm hover:text-primary cursor-pointer">• Winter Preparation</div>
                    <div className="text-sm hover:text-primary cursor-pointer">• Spring Opening</div>
                    <div className="text-sm hover:text-primary cursor-pointer">• Summer Activities</div>
                    <div className="text-sm hover:text-primary cursor-pointer">• Fall Closing</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <FileText className="h-6 w-6 text-purple-600" />
                    <h3 className="font-semibold">Forms & Checklists</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">Essential forms and checklists</p>
                  <div className="space-y-2">
                    <div className="text-sm hover:text-primary cursor-pointer">• Check-in Checklist</div>
                    <div className="text-sm hover:text-primary cursor-pointer">• Check-out Checklist</div>
                    <div className="text-sm hover:text-primary cursor-pointer">• Maintenance Request Form</div>
                    <div className="text-sm hover:text-primary cursor-pointer">• Incident Report</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <FileText className="h-6 w-6 text-red-600" />
                    <h3 className="font-semibold">Emergency Information</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">Critical emergency procedures</p>
                  <div className="space-y-2">
                    <div className="text-sm hover:text-primary cursor-pointer">• Emergency Contacts</div>
                    <div className="text-sm hover:text-primary cursor-pointer">• Fire Safety Plan</div>
                    <div className="text-sm hover:text-primary cursor-pointer">• Medical Emergency</div>
                    <div className="text-sm hover:text-primary cursor-pointer">• Power Outage Guide</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <FileText className="h-6 w-6 text-teal-600" />
                    <h3 className="font-semibold">Local Information</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">Area attractions and services</p>
                  <div className="space-y-2">
                    <div className="text-sm hover:text-primary cursor-pointer">• Local Restaurants</div>
                    <div className="text-sm hover:text-primary cursor-pointer">• Activities & Attractions</div>
                    <div className="text-sm hover:text-primary cursor-pointer">• Shopping & Services</div>
                    <div className="text-sm hover:text-primary cursor-pointer">• Maps & Directions</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'checkout',
      title: 'Checkout Process',
      description: 'Complete checkout checklist before departing',
      explanation: 'Systematic checkout process ensures the cabin is properly maintained and ready for the next family.',
      icon: ClipboardCheck,
      content: (
        <div className="p-6 bg-background min-h-[500px]">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Checkout Checklist</h1>
            
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Current Stay: Smith Family</h3>
                  <Badge variant="outline">In Progress</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Check-out Date: January 28, 2024</p>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm">✓</div>
                    Kitchen & Dining
                  </h3>
                  <div className="space-y-2 ml-8">
                    <div className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked className="rounded" />
                      <span className="line-through text-muted-foreground">Clean all dishes and put away</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked className="rounded" />
                      <span className="line-through text-muted-foreground">Wipe down counters and appliances</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked className="rounded" />
                      <span className="line-through text-muted-foreground">Empty and clean refrigerator</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked className="rounded" />
                      <span className="line-through text-muted-foreground">Take out trash and recycling</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm">2</div>
                    Bedrooms & Bathrooms
                  </h3>
                  <div className="space-y-2 ml-8">
                    <div className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked className="rounded" />
                      <span className="line-through text-muted-foreground">Strip and wash all used bedding</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="rounded" />
                      <span>Clean bathrooms (toilets, showers, sinks)</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="rounded" />
                      <span>Replace towels with clean ones</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="rounded" />
                      <span>Vacuum all bedroom floors</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center text-sm">3</div>
                    Common Areas
                  </h3>
                  <div className="space-y-2 ml-8">
                    <div className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="rounded" />
                      <span>Vacuum/sweep all floors</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="rounded" />
                      <span>Return furniture to original positions</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="rounded" />
                      <span>Clean fireplace area (if used)</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="rounded" />
                      <span>Turn off all lights and electronics</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-6 flex gap-3">
              <Button variant="outline" className="flex-1">Save Progress</Button>
              <Button className="flex-1" disabled>Complete Checkout</Button>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'supervisor',
      title: 'Supervisor Dashboard',
      description: 'Administrative overview and management tools',
      explanation: 'Comprehensive dashboard for administrators to monitor system health, user activity, and manage all aspects of the cabin sharing system.',
      icon: Shield,
      content: (
        <div className="p-6 bg-background min-h-[500px]">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Supervisor Dashboard</h1>
            
            <div className="grid gap-6 md:grid-cols-4 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-blue-600">8</div>
                  <p className="text-sm text-muted-foreground">Active Families</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-green-600">24</div>
                  <p className="text-sm text-muted-foreground">Reservations YTD</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-orange-600">3</div>
                  <p className="text-sm text-muted-foreground">Pending Approvals</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-purple-600">98%</div>
                  <p className="text-sm text-muted-foreground">System Health</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-2 border rounded">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium">Smith Family checked out</p>
                        <p className="text-xs text-muted-foreground">2 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 border rounded">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium">Johnson Family booked February 15-22</p>
                        <p className="text-xs text-muted-foreground">4 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 border rounded">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium">Maintenance request submitted</p>
                        <p className="text-xs text-muted-foreground">6 hours ago</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      <Users className="mr-2 h-4 w-4" />
                      Manage Family Groups
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Calendar className="mr-2 h-4 w-4" />
                      View Reservation System
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <DollarSign className="mr-2 h-4 w-4" />
                      Financial Overview
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Send Announcement
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-6">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">System Status</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Database: Operational</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Email Service: Operational</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm">SMS Service: Degraded</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    }
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % demoSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + demoSlides.length) % demoSlides.length);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const currentSlideData = demoSlides[currentSlide];

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader backTo="/" backLabel="Back to Home" />
      
      <div className="max-w-7xl mx-auto p-6">
        {/* Demo Controls */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">Cabin Management System Demo</h1>
              <p className="text-muted-foreground">Interactive walkthrough of key features</p>
            </div>
            <Button variant="outline" onClick={() => navigate('/')}>
              <X className="mr-2 h-4 w-4" />
              Exit Demo
            </Button>
          </div>

          {/* Progress Indicators */}
          <div className="flex items-center gap-2 mb-4">
            {demoSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentSlide
                    ? 'bg-primary'
                    : index < currentSlide
                    ? 'bg-primary/50'
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Demo Content */}
        <div className="relative">
          {/* Navigation Arrows */}
          <Button
            variant="outline"
            size="icon"
            className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 w-12 h-12"
            onClick={prevSlide}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>

          <Button
            className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold shadow-lg"
            onClick={nextSlide}
          >
            <ChevronRight className="h-8 w-8" />
          </Button>

          {/* Slide Content */}
          <Card className="relative overflow-hidden">
            {/* Explanation Overlay */}
            <div className="absolute top-4 left-4 right-4 z-10">
              <Card className="bg-background/95 backdrop-blur-sm border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <currentSlideData.icon className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">{currentSlideData.title}</h3>
                    <Badge variant="outline">{currentSlide + 1} of {demoSlides.length}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{currentSlideData.explanation}</p>
                </CardContent>
              </Card>
            </div>

            {/* Slide Content */}
            <div className="pt-24">
              {currentSlideData.content}
            </div>
          </Card>
        </div>

        {/* Navigation Footer - Moved higher and made more prominent */}
        <div className="flex items-center justify-between mt-4 px-4">
          <Button 
            variant="outline" 
            onClick={prevSlide} 
            disabled={currentSlide === 0}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="flex gap-2">
            {demoSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentSlide ? 'bg-primary' : 'bg-muted'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          <Button 
            onClick={nextSlide} 
            disabled={currentSlide === demoSlides.length - 1}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-lg font-semibold"
          >
            Next
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}