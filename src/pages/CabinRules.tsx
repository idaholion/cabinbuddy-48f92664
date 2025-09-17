import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Shield, Clock, Users, Trash2, Wifi, Car, Home, AlertTriangle, Edit3 } from "lucide-react";
import { Link } from "react-router-dom";
import { useCabinRules } from "@/hooks/useCabinRules";
import { CabinRulesEditor } from "@/components/CabinRulesEditor";
import { CreateCabinRuleDialog } from "@/components/CreateCabinRuleDialog";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useOrganization } from "@/hooks/useOrganization";
import { useOrgAdmin } from "@/hooks/useOrgAdmin";
const CabinRules = () => {
  const { cabinRules, loading, updateCabinRule, deleteCabinRule, createCabinRule } = useCabinRules();
  const { organization } = useOrganization();
  const { isAdmin } = useOrgAdmin();
  const [editingSection, setEditingSection] = useState<string | null>(null);

  const handleDeleteRule = async (id: string) => {
    await deleteCabinRule(id);
  };
  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-cover bg-center bg-no-repeat p-4" style={{
        backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'
      }}>
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <Button variant="outline" asChild className="mb-4 text-base">
              <Link to="/home">
                <Home className="h-4 w-4 mr-2" />
                Home
              </Link>
            </Button>
            <h1 className="text-6xl mb-4 font-kaushan text-primary drop-shadow-lg text-center">Cabin Rules & Policies</h1>
          </div>
          <Card className="bg-card/95">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-muted-foreground text-base">Loading cabin rules...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getSectionIcon = (sectionType: string) => {
    switch (sectionType) {
      case 'general': return <Shield className="h-6 w-6" />;
      case 'checkin_checkout': return <Clock className="h-5 w-5" />;
      case 'guest_policy': return <Users className="h-5 w-5" />;
      case 'property_care': return <Home className="h-5 w-5" />;
      case 'cleaning_trash': return <Trash2 className="h-5 w-5" />;
      case 'parking': return <Car className="h-5 w-5" />;
      case 'amenities': return <Wifi className="h-5 w-5" />;
      case 'emergency': return <AlertTriangle className="h-6 w-6 text-orange-500" />;
      default: return null;
    }
  };

  const renderRule = (rule: any) => {
    const isEditing = editingSection === rule.id;

    if (isAdmin) {
      return (
        <CabinRulesEditor
          key={rule.id}
          rule={rule}
          onSave={updateCabinRule}
          onDelete={handleDeleteRule}
          isEditing={isEditing}
          onEditToggle={() => setEditingSection(isEditing ? null : rule.id)}
        />
      );
    }

    // Read-only view for non-admins
    switch (rule.section_type) {
      case 'general':
        return (
          <Card key={rule.id} className="bg-card/95 mb-6">
            <CardHeader>
              <CardTitle className="text-2xl text-center flex items-center justify-center gap-2">
                {getSectionIcon(rule.section_type)}
                {rule.section_title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {rule.content.items?.map((item: string, index: number) => (
                  <div key={index} className="flex items-start gap-3">
                    <Badge variant="destructive" className="mt-1 text-base">{index + 1}</Badge>
                    <p className="text-base">{item}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case 'checkin_checkout':
      case 'guest_policy':
      case 'property_care':
      case 'cleaning_trash':
      case 'parking':
      case 'amenities':
        return (
          <Card key={rule.id} className="bg-card/95">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getSectionIcon(rule.section_type)}
                {rule.section_title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {rule.section_type === 'checkin_checkout' ? (
                <>
                  <div>
                    <h4 className="font-semibold text-base">Check-in: {rule.content.checkin_time}</h4>
                    <p className="text-base text-muted-foreground">{rule.content.checkin_note}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-base">Check-out: {rule.content.checkout_time}</h4>
                    <p className="text-base text-muted-foreground">{rule.content.checkout_note}</p>
                  </div>
                </>
              ) : (
                rule.content.items?.map((item: string, index: number) => (
                  <p key={index} className="text-base">{item}</p>
                ))
              )}
            </CardContent>
          </Card>
        );

      case 'emergency':
        return (
          <Card key={rule.id} className="bg-card/95 mb-6">
            <CardHeader>
              <CardTitle className="text-xl text-center flex items-center justify-center gap-2">
                {getSectionIcon(rule.section_type)}
                {rule.section_title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4 text-center">
                <div>
                  <h4 className="font-semibold text-base">Emergency Services</h4>
                  <p className="text-2xl font-bold text-red-600">{rule.content.emergency_services}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-base">Property Manager</h4>
                  <p className="text-base">{rule.content.property_manager}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-base">Local Hospital</h4>
                  <p className="text-base">{rule.content.local_hospital}</p>
                </div>
              </div>
              <Separator />
              <div className="text-center">
                <h4 className="font-semibold mb-2 text-base">Emergency Procedures</h4>
                {rule.content.procedures?.map((procedure: string, index: number) => (
                  <p key={index} className="text-base">{procedure}</p>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case 'violation_policy':
        return (
          <Card key={rule.id} className="bg-card/95">
            <CardHeader>
              <CardTitle className="text-xl text-center">{rule.section_title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-center text-base">{rule.content.policy}</p>
              <p className="text-center text-base text-muted-foreground">{rule.content.agreement}</p>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };
  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat p-4" style={{
      backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'
    }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Button variant="outline" asChild className="mb-4 text-base">
            <Link to="/home">
              <Home className="h-4 w-4 mr-2" />
              Home
            </Link>
          </Button>
          <h1 className="text-6xl mb-4 font-kaushan text-primary drop-shadow-lg text-center">Cabin Rules & Policies</h1>
          <div className="flex items-center justify-center gap-4">
            <p className="text-2xl text-primary text-center font-medium">Please review and follow all cabin guidelines</p>
            {isAdmin && (
              <Badge variant="outline" className="text-base">
                <Edit3 className="h-4 w-4 mr-2" />
                Administrator
              </Badge>
            )}
          </div>
        </div>

        {isAdmin && (
          <div className="flex justify-center">
            <CreateCabinRuleDialog onCreateRule={createCabinRule} />
          </div>
        )}

        <div className="space-y-6">
          {cabinRules.length === 0 ? (
            <Card className="bg-card/95">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-muted-foreground text-base">
                    {isAdmin 
                      ? "No cabin rules have been created yet. Click 'Add New Section' to get started."
                      : "No cabin rules are currently available."
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* General Rules - always first */}
              {cabinRules
                .filter(rule => rule.section_type === 'general')
                .map(renderRule)}

              {/* Check-in/Guest Policy Row - only if both exist */}
              {(() => {
                const checkinRules = cabinRules.filter(rule => ['checkin_checkout', 'guest_policy'].includes(rule.section_type));
                if (checkinRules.length === 2) {
                  return (
                    <div className="grid md:grid-cols-2 gap-6">
                      {checkinRules.map(renderRule)}
                    </div>
                  );
                } else {
                  return checkinRules.map(renderRule);
                }
              })()}

              {/* Property Care/Cleaning Row - only if both exist */}
              {(() => {
                const careRules = cabinRules.filter(rule => ['property_care', 'cleaning_trash'].includes(rule.section_type));
                if (careRules.length === 2) {
                  return (
                    <div className="grid md:grid-cols-2 gap-6">
                      {careRules.map(renderRule)}
                    </div>
                  );
                } else {
                  return careRules.map(renderRule);
                }
              })()}

              {/* Parking/Amenities Row - only if both exist */}
              {(() => {
                const amenityRules = cabinRules.filter(rule => ['parking', 'amenities'].includes(rule.section_type));
                if (amenityRules.length === 2) {
                  return (
                    <div className="grid md:grid-cols-2 gap-6">
                      {amenityRules.map(renderRule)}
                    </div>
                  );
                } else {
                  return amenityRules.map(renderRule);
                }
              })()}

              {/* Emergency Information */}
              {cabinRules
                .filter(rule => rule.section_type === 'emergency')
                .map(renderRule)}

              {/* All other sections (including custom ones) */}
              {cabinRules
                .filter(rule => !['general', 'checkin_checkout', 'guest_policy', 'property_care', 'cleaning_trash', 'parking', 'amenities', 'emergency', 'violation_policy'].includes(rule.section_type))
                .map(renderRule)}

              {/* Violation Policy - always last */}
              {cabinRules
                .filter(rule => rule.section_type === 'violation_policy')
                .map(renderRule)}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CabinRules;