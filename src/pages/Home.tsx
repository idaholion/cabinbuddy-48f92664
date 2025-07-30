import { Calendar, ShoppingCart, Receipt, CheckCircle, Clock, Camera, FileText, DollarSign, Users, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div className="min-h-screen bg-contain bg-center bg-no-repeat flex flex-col items-center pt-20 p-8" style={{
      backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'
    }}>
      <div className="w-full text-center">
        {/* Main Title */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl text-red-600 whitespace-nowrap" style={{ fontFamily: 'Kaushan Script, cursive' }}>
          Welcome to Cabin Buddy
        </h1>
      </div>
    </div>
  );
};

export default Home;