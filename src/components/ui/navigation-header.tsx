import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Home, Users } from "lucide-react";
import { Link } from "react-router-dom";

interface NavigationHeaderProps {
  backTo?: string;
  backLabel?: string;
  className?: string;
  familyGroups?: Array<{id: string; name: string; color?: string}>;
  selectedFamilyGroup?: string;
  onFamilyGroupChange?: (value: string) => void;
  showFamilyGroupSelector?: boolean;
}

export function NavigationHeader({ 
  backTo = "/home", 
  backLabel = "Back to Home",
  className = "mb-4",
  familyGroups = [],
  selectedFamilyGroup,
  onFamilyGroupChange,
  showFamilyGroupSelector = false
}: NavigationHeaderProps) {
  const isHome = backTo === "/home";
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button variant="outline" asChild className="hover:scale-105 hover:shadow-md hover:border-primary/50 transition-all duration-200">
        <Link to={backTo}>
          {isHome ? (
            <Home className="h-4 w-4" />
          ) : (
            <>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {backLabel}
            </>
          )}
        </Link>
      </Button>
      
      {showFamilyGroupSelector && familyGroups.length > 0 && (
        <Select value={selectedFamilyGroup} onValueChange={onFamilyGroupChange}>
          <SelectTrigger className="w-36 h-9 bg-background/90 backdrop-blur-sm border-border text-sm">
            <Users className="h-3 w-3 mr-1" />
            <SelectValue placeholder="Family" />
          </SelectTrigger>
          <SelectContent className="bg-background border border-border shadow-lg z-50 min-w-[12rem]">
            <SelectItem value="all">All Family Groups</SelectItem>
            {familyGroups.map((familyGroup) => (
              <SelectItem key={familyGroup.id} value={familyGroup.name}>
                <div className="flex items-center gap-2">
                  {familyGroup.color && (
                    <div
                      className="w-2 h-2 rounded-full border border-border/50"
                      style={{ backgroundColor: familyGroup.color }}
                    />
                  )}
                  <span className="truncate">{familyGroup.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}