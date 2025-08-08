import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface NavigationHeaderProps {
  backTo?: string;
  backLabel?: string;
  className?: string;
}

export function NavigationHeader({ 
  backTo = "/home", 
  backLabel = "Back to Home",
  className = "mb-4" 
}: NavigationHeaderProps) {
  return (
    <Button variant="outline" asChild className={`text-base ${className}`}>
      <Link to={backTo}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        {backLabel}
      </Link>
    </Button>
  );
}