import { Calendar, ShoppingCart, Receipt, CheckCircle, Clock, Camera, FileText, DollarSign, Users, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat flex flex-col items-center justify-center p-8" style={{
      backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'
    }}>
      <div className="w-full text-center">
        {/* Main Title */}
        <h1 className="text-6xl md:text-8xl text-red-600 mb-12" style={{ fontFamily: 'Kaushan Script, cursive' }}>
          Welcome to Cabin Buddy
        </h1>
        
        {/* Navigation Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
          <Button asChild size="lg" className="h-24 flex flex-col gap-2">
            <Link to="/checkin">
              <CheckCircle className="h-8 w-8" />
              <span>Check In</span>
            </Link>
          </Button>
          
          <Button asChild size="lg" className="h-24 flex flex-col gap-2">
            <Link to="/shopping-list">
              <ShoppingCart className="h-8 w-8" />
              <span>Shopping List</span>
            </Link>
          </Button>
          
          <Button asChild size="lg" className="h-24 flex flex-col gap-2">
            <Link to="/add-receipt">
              <Receipt className="h-8 w-8" />
              <span>Add Receipt</span>
            </Link>
          </Button>
          
          <Button asChild size="lg" className="h-24 flex flex-col gap-2">
            <Link to="/cabin-calendar">
              <Calendar className="h-8 w-8" />
              <span>Calendar</span>
            </Link>
          </Button>
          
          <Button asChild size="lg" className="h-24 flex flex-col gap-2">
            <Link to="/financial-review">
              <DollarSign className="h-8 w-8" />
              <span>Financial Review</span>
            </Link>
          </Button>
          
          <Button asChild size="lg" className="h-24 flex flex-col gap-2">
            <Link to="/photo-sharing">
              <Camera className="h-8 w-8" />
              <span>Photo Sharing</span>
            </Link>
          </Button>
          
          <Button asChild size="lg" className="h-24 flex flex-col gap-2">
            <Link to="/documents">
              <FileText className="h-8 w-8" />
              <span>Documents</span>
            </Link>
          </Button>
          
          <Button asChild size="lg" className="h-24 flex flex-col gap-2">
            <Link to="/setup">
              <Settings className="h-8 w-8" />
              <span>Setup</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Home;