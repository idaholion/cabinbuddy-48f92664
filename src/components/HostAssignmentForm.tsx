import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface HostAssignment {
  host_name: string;
  host_email: string;
  start_date: Date;
  end_date: Date;
}

interface HostAssignmentFormProps {
  reservationStartDate: Date;
  reservationEndDate: Date;
  familyGroupHosts: { name: string; email: string; phone: string }[];
  value: HostAssignment[];
  onChange: (assignments: HostAssignment[]) => void;
  disabled?: boolean;
}

export function HostAssignmentForm({
  reservationStartDate,
  reservationEndDate,
  familyGroupHosts,
  value = [],
  onChange,
  disabled = false
}: HostAssignmentFormProps) {
  const [assignments, setAssignments] = useState<HostAssignment[]>(value);

  useEffect(() => {
    setAssignments(value);
  }, [value]);

  const addAssignment = () => {
    const newAssignment: HostAssignment = {
      host_name: '',
      host_email: '',
      start_date: reservationStartDate,
      end_date: reservationEndDate
    };
    const newAssignments = [...assignments, newAssignment];
    setAssignments(newAssignments);
    onChange(newAssignments);
  };

  const removeAssignment = (index: number) => {
    const newAssignments = assignments.filter((_, i) => i !== index);
    setAssignments(newAssignments);
    onChange(newAssignments);
  };

  const updateAssignment = (index: number, field: keyof HostAssignment, value: any) => {
    const newAssignments = [...assignments];
    newAssignments[index] = { ...newAssignments[index], [field]: value };
    setAssignments(newAssignments);
    onChange(newAssignments);
  };

  const selectHost = (index: number, hostEmail: string) => {
    const selectedHost = familyGroupHosts.find(h => h.email === hostEmail);
    if (selectedHost) {
      updateAssignment(index, 'host_name', selectedHost.name);
      updateAssignment(index, 'host_email', selectedHost.email);
    }
  };

  const validateDateRange = (startDate: Date, endDate: Date) => {
    return startDate >= reservationStartDate && 
           endDate <= reservationEndDate && 
           startDate < endDate;
  };

  const getDateConflicts = (index: number, startDate: Date, endDate: Date) => {
    const conflicts: string[] = [];
    
    // Check if dates are within reservation range
    if (startDate < reservationStartDate) {
      conflicts.push(`Start date cannot be before ${format(reservationStartDate, "MMM d")}`);
    }
    if (endDate > reservationEndDate) {
      conflicts.push(`End date cannot be after ${format(reservationEndDate, "MMM d")}`);
    }
    if (startDate >= endDate) {
      conflicts.push("Start date must be before end date");
    }

    // Check for overlaps with other assignments
    assignments.forEach((assignment, assignmentIndex) => {
      if (assignmentIndex === index) return;
      
      const overlapStart = Math.max(startDate.getTime(), assignment.start_date.getTime());
      const overlapEnd = Math.min(endDate.getTime(), assignment.end_date.getTime());
      
      if (overlapStart < overlapEnd) {
        conflicts.push(`Overlaps with ${assignment.host_name || 'another host'} assignment`);
      }
    });

    return conflicts;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Host Assignments</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addAssignment}
            disabled={disabled || familyGroupHosts.length === 0}
          >
            <Plus className="h-4 w-4 mr-2" />
            Assign Host
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Assign specific hosts to different date ranges within this reservation period.
          Each host can be responsible for a portion of the stay.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {familyGroupHosts.length === 0 && (
          <p className="text-sm text-muted-foreground italic">
            No hosts available for this family group. Please add host members to the family group first.
          </p>
        )}

        {assignments.map((assignment, index) => {
          const conflicts = getDateConflicts(index, assignment.start_date, assignment.end_date);
          const hasConflicts = conflicts.length > 0;

          return (
            <Card key={index} className={cn("border", hasConflicts && "border-destructive")}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Host Assignment {index + 1}</CardTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAssignment(index)}
                    disabled={disabled}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Host Selection */}
                <div>
                  <label className="text-sm font-medium">Select Host</label>
                  <select
                    value={assignment.host_email}
                    onChange={(e) => selectHost(index, e.target.value)}
                    className="w-full p-2 border rounded-md bg-background mt-1"
                    disabled={disabled}
                  >
                    <option value="">Choose a host...</option>
                    {familyGroupHosts.map((host) => (
                      <option key={host.email} value={host.email}>
                        {host.name} ({host.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Range Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Host Start Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal mt-1",
                            !assignment.start_date && "text-muted-foreground"
                          )}
                          disabled={disabled}
                        >
                          {assignment.start_date ? (
                            format(assignment.start_date, "PPP")
                          ) : (
                            <span>Pick start date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={assignment.start_date}
                          onSelect={(date) => date && updateAssignment(index, 'start_date', date)}
                          disabled={(date) => 
                            date < reservationStartDate || 
                            date > reservationEndDate ||
                            date >= assignment.end_date
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Host End Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal mt-1",
                            !assignment.end_date && "text-muted-foreground"
                          )}
                          disabled={disabled}
                        >
                          {assignment.end_date ? (
                            format(assignment.end_date, "PPP")
                          ) : (
                            <span>Pick end date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={assignment.end_date}
                          onSelect={(date) => date && updateAssignment(index, 'end_date', date)}
                          disabled={(date) => 
                            date < reservationStartDate || 
                            date > reservationEndDate ||
                            date <= assignment.start_date
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Assignment Summary */}
                {assignment.host_name && assignment.start_date && assignment.end_date && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm">
                      <span className="font-medium">{assignment.host_name}</span> will host from{' '}
                      <span className="font-medium">{format(assignment.start_date, "MMM d")}</span> to{' '}
                      <span className="font-medium">{format(assignment.end_date, "MMM d")}</span>
                      {' '}({Math.ceil((assignment.end_date.getTime() - assignment.start_date.getTime()) / (1000 * 60 * 60 * 24))} days)
                    </p>
                  </div>
                )}

                {/* Validation Errors */}
                {hasConflicts && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm font-medium text-destructive mb-1">Assignment Issues:</p>
                    <ul className="text-sm text-destructive space-y-1">
                      {conflicts.map((conflict, conflictIndex) => (
                        <li key={conflictIndex}>• {conflict}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {assignments.length === 0 && familyGroupHosts.length > 0 && (
          <div className="text-center py-8 border-2 border-dashed border-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              No host assignments yet. Click "Assign Host" to assign specific hosts to date ranges.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}