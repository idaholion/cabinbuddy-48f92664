import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface SearchFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusChange: (status: string) => void;
  urgencyFilter: string;
  onUrgencyChange: (urgency: string) => void;
  categoryFilter: string;
  onCategoryChange: (category: string) => void;
}

export const SearchFilter = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  urgencyFilter,
  onUrgencyChange,
  categoryFilter,
  onCategoryChange,
}: SearchFilterProps) => {
  const clearFilters = () => {
    onSearchChange("");
    onStatusChange("all");
    onUrgencyChange("all");
    onCategoryChange("all");
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 p-4 bg-muted/30 rounded-lg">
      <div className="flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search requests..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 text-base"
          />
        </div>
      </div>
      
      <div className="flex gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="text-base">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-base font-medium">Status</label>
                <Select value={statusFilter} onValueChange={onStatusChange}>
                  <SelectTrigger className="text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-base">All Status</SelectItem>
                    <SelectItem value="open" className="text-base">Open</SelectItem>
                    <SelectItem value="in_progress" className="text-base">In Progress</SelectItem>
                    <SelectItem value="resolved" className="text-base">Resolved</SelectItem>
                    <SelectItem value="closed" className="text-base">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-base font-medium">Urgency</label>
                <Select value={urgencyFilter} onValueChange={onUrgencyChange}>
                  <SelectTrigger className="text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-base">All Urgency</SelectItem>
                    <SelectItem value="high" className="text-base">High</SelectItem>
                    <SelectItem value="medium" className="text-base">Medium</SelectItem>
                    <SelectItem value="low" className="text-base">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-base font-medium">Category</label>
                <Select value={categoryFilter} onValueChange={onCategoryChange}>
                  <SelectTrigger className="text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-base">All Categories</SelectItem>
                    <SelectItem value="general" className="text-base">General</SelectItem>
                    <SelectItem value="booking" className="text-base">Booking</SelectItem>
                    <SelectItem value="technical" className="text-base">Technical</SelectItem>
                    <SelectItem value="payment" className="text-base">Payment</SelectItem>
                    <SelectItem value="emergency" className="text-base">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button variant="outline" size="sm" onClick={clearFilters} className="w-full text-base">
                Clear Filters
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};