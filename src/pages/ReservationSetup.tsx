import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useNavigate } from "react-router-dom";

export default function ReservationSetup() {
  const navigate = useNavigate();
  const [rotationYear, setRotationYear] = useState("2025");
  const [maxTimeSlots, setMaxTimeSlots] = useState("2");
  const [maxNights, setMaxNights] = useState("7");
  const [startDay, setStartDay] = useState("Friday");
  const [startTime, setStartTime] = useState("12:00 PM");
  const [rotationOption, setRotationOption] = useState("rotate");
  const [firstLastOption, setFirstLastOption] = useState("first");

  // Mock family groups - in real app this would come from previous setup
  const familyGroups = [
    "Smith Family", "Johnson Family", "Williams Family", 
    "Brown Family", "Jones Family", "Garcia Family"
  ];

  const years = Array.from({ length: 10 }, (_, i) => (2025 + i).toString());
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const times = [
    "12:00 AM", "1:00 AM", "2:00 AM", "3:00 AM", "4:00 AM", "5:00 AM",
    "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
    "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM",
    "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM", "11:00 PM"
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Reservation Setup</h1>
          <p className="text-muted-foreground">Configure rotation and time block preferences</p>
        </div>

        {/* Rotation Section */}
        <Card>
          <CardHeader>
            <CardTitle>Rotation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <p className="text-sm">
                Rotation order starting in 
              </p>
              <Select value={rotationYear} onValueChange={setRotationYear}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span>Each Family Group can select</span>
              <Select value={maxTimeSlots} onValueChange={setMaxTimeSlots}>
                <SelectTrigger className="w-16">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => (i + 1).toString()).map((num) => (
                    <SelectItem key={num} value={num}>{num}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>time periods, each time period up to</span>
              <Select value={maxNights} onValueChange={setMaxNights}>
                <SelectTrigger className="w-16">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 14 }, (_, i) => (i + 1).toString()).map((num) => (
                    <SelectItem key={num} value={num}>{num}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>consecutive nights, starting on</span>
              <Select value={startDay} onValueChange={setStartDay}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {days.map((day) => (
                    <SelectItem key={day} value={day}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>at</span>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {times.map((time) => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>This order will rotate each year, with the person who selected</span>
                <Select value={firstLastOption} onValueChange={setFirstLastOption}>
                  <SelectTrigger className="w-16">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="first">First</SelectItem>
                    <SelectItem value="last">Last</SelectItem>
                  </SelectContent>
                </Select>
                <span>selecting {firstLastOption === "first" ? "last" : "first"} the following year</span>
              </div>
              
              <RadioGroup value={rotationOption} onValueChange={setRotationOption} className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="rotate" id="rotate" />
                  <Label htmlFor="rotate" className="text-sm text-muted-foreground">Rotation continues</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fixed" id="fixed" />
                  <Label htmlFor="fixed" className="text-sm text-muted-foreground">Order does not change</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="space-y-2">
              {familyGroups.map((group, index) => (
                <div key={index} className="flex items-center gap-2 p-2 border rounded">
                  <span className="font-medium">{index + 1}.</span>
                  <span>{group}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>



        {/* Rotating Time Blocks Section */}
        <Card>
          <CardHeader>
            <CardTitle>Rotating Time Blocks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <span className="w-6 text-sm font-medium">{i + 1}.</span>
                  <Select>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select Family Group" />
                    </SelectTrigger>
                    <SelectContent>
                      {familyGroups.map((group) => (
                        <SelectItem key={group} value={group}>{group}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Input 
                      type="date" 
                      className="w-36"
                      placeholder="Start Date"
                    />
                    <span className="self-center text-muted-foreground">to</span>
                    <Input 
                      type="date" 
                      className="w-36"
                      placeholder="End Date"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => navigate("/financial-setup")}>
            Back
          </Button>
          <Button onClick={() => navigate("/calendar")}>
            Continue to Calendar
          </Button>
        </div>
      </div>
    </div>
  );
}