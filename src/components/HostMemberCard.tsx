import React from 'react';
import { Control, useFieldArray, useFormContext } from 'react-hook-form';
import { Card } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FamilyGroupSetupFormData } from '@/lib/validations';

interface HostMemberCardProps {
  index: number;
  control: Control<FamilyGroupSetupFormData>;
  onRemove: (index: number) => void;
  canRemove: boolean;
  isDragOver?: boolean;
}

export const HostMemberCard: React.FC<HostMemberCardProps> = ({
  index,
  control,
  onRemove,
  canRemove,
  isDragOver = false,
}) => {
  const { watch, formState: { errors } } = useFormContext<FamilyGroupSetupFormData>();
  const hostMembers = watch('hostMembers');
  const currentMember = hostMembers[index];
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `host-member-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isEmpty = !currentMember?.name && !currentMember?.email && !currentMember?.phone;
  const isFilled = currentMember?.name || currentMember?.email || currentMember?.phone;

  // Check for duplicates
  const nameError = errors.hostMembers?.[index]?.name;
  const emailError = errors.hostMembers?.[index]?.email;
  const phoneError = errors.hostMembers?.[index]?.phone;
  const hasRootError = errors.hostMembers?.root;

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'opacity-50' : ''}>
      <Card className={`
        p-4 transition-all duration-200 border-2
        ${isEmpty ? 'border-dashed border-muted bg-muted/20' : 'border-solid'}
        ${isFilled ? 'border-primary/20 bg-primary/5' : ''}
        ${isDragOver ? 'border-primary bg-primary/10' : ''}
        ${hasRootError ? 'border-destructive/50 bg-destructive/5' : ''}
        hover:shadow-md
      `}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div 
              {...attributes} 
              {...listeners}
              className="cursor-grab hover:cursor-grabbing p-1 hover:bg-muted rounded"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <h4 className="font-medium text-lg">
              Host Member {index + 1}
              
            </h4>
          </div>
          
          {canRemove && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove Host Member</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to remove this host member? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => onRemove(index)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
          <FormField
            control={control}
            name={`hostMembers.${index}.name`}
            render={({ field }) => (
              <FormItem>
                 <FormLabel className="text-xl">Name</FormLabel>
                 <FormControl>
                   <Input {...field} placeholder="Enter name" className="text-lg" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={control}
              name={`hostMembers.${index}.email`}
              render={({ field }) => (
                <FormItem>
                   <FormLabel className="text-xl">Email</FormLabel>
                   <FormControl>
                     <Input {...field} type="email" placeholder="Enter email" className="text-lg" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name={`hostMembers.${index}.phone`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xl">Phone</FormLabel>
                  <FormControl>
                    <PhoneInput 
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={control}
            name={`hostMembers.${index}.canReserve`}
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center space-x-2 p-2 bg-muted/30 rounded mt-2">
                  <FormControl>
                    <input
                      type="checkbox"
                      id={`reservation-${index}`}
                      checked={field.value || false}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="h-4 w-4"
                    />
                  </FormControl>
                   <label htmlFor={`reservation-${index}`} className="text-xl">
                     Can make reservations
                   </label>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {hasRootError && (
          <div className="mt-3 p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
            {hasRootError.message}
          </div>
        )}
      </Card>
    </div>
  );
};