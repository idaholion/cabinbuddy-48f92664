import { useState } from "react";
import { MainLayout } from "@/components/MainLayout";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HelpCircle, MessageSquare, Settings } from "lucide-react";
import { renderSafeText, createSafeHTML } from "@/lib/safe-text";
import { FeedbackButton } from "@/components/FeedbackButton";
import { useOrganization } from "@/hooks/useOrganization";
import { useRobustUserRole } from "@/hooks/useRobustUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

export default function FAQ() {
  const [searchQuery, setSearchQuery] = useState("");
  const { organization: currentOrganization } = useOrganization();
  const { isAdmin } = useRobustUserRole();

  // Fetch FAQ items from database
  const { data: faqItems = [], isLoading } = useQuery({
    queryKey: ["faq-items", currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      
      const { data, error } = await supabase
        .from("faq_items")
        .select("*")
        .eq("organization_id", currentOrganization.id)
        .order("category_order", { ascending: true })
        .order("item_order", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!currentOrganization?.id,
  });

  // Group by category
  const categorizedData = faqItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof faqItems>);

  // Filter FAQ items based on search query
  const filteredData = Object.entries(categorizedData)
    .map(([category, items]) => ({
      title: category,
      items: items.filter(item =>
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }))
    .filter(category => category.items.length > 0);

  return (
    <MainLayout>
      <div 
        className="fixed inset-0 hero-background-stable"
        style={{
          backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)',
          zIndex: -1
        }}
      />
      <div className="relative container max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex-1">
            <PageHeader
              title="Frequently Asked Questions"
              subtitle="Find answers to common questions about Cabin Buddy"
              backgroundImage={true}
            />
          </div>
          {isAdmin && (
            <Link to="/faq-management">
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Manage FAQ
              </Button>
            </Link>
          )}
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <SearchInput
            placeholder="Search for answers..."
            onSearch={setSearchQuery}
            className="max-w-2xl"
          />
        </div>

        {/* FAQ Content */}
        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Loading FAQ items...</p>
            </CardContent>
          </Card>
        ) : filteredData.length > 0 ? (
          <div className="space-y-6">
            {filteredData.map((category, categoryIndex) => (
              <Card key={categoryIndex}>
                <CardContent className="pt-6">
                  <h2 className="text-2xl font-semibold mb-4 text-foreground">
                    {category.title}
                  </h2>
                  <Accordion type="single" collapsible className="w-full">
                    {category.items.map((item, itemIndex) => (
                      <AccordionItem
                        key={itemIndex}
                        value={`${categoryIndex}-${itemIndex}`}
                      >
                        <AccordionTrigger className="text-left">
                          {item.question}
                        </AccordionTrigger>
                        <AccordionContent>
                          <div
                            className="text-muted-foreground"
                            dangerouslySetInnerHTML={createSafeHTML(
                              renderSafeText(item.answer)
                            )}
                          />
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No results found for "{searchQuery}". Try a different search term.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Help Section */}
        <Card className="mt-8">
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <MessageSquare className="h-12 w-12 mx-auto text-primary" />
              <h3 className="text-xl font-semibold">Still need help?</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Can't find the answer you're looking for? Send us your feedback
                or questions.
              </p>
              <FeedbackButton />
            </div>
          </CardContent>
        </Card>
        </div>
    </MainLayout>
  );
}
