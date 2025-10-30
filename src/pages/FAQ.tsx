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
import { HelpCircle, MessageSquare } from "lucide-react";
import { faqData } from "@/data/faqData";
import { renderSafeText, createSafeHTML } from "@/lib/safe-text";
import { FeedbackButton } from "@/components/FeedbackButton";

export default function FAQ() {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter FAQ items based on search query
  const filteredData = faqData.map(category => ({
    ...category,
    items: category.items.filter(item =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.items.length > 0);

  return (
    <MainLayout>
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <PageHeader
          title="Frequently Asked Questions"
          subtitle="Find answers to common questions about Cabin Buddy"
          icon={HelpCircle}
        />

        {/* Search Bar */}
        <div className="mb-8">
          <SearchInput
            placeholder="Search for answers..."
            onSearch={setSearchQuery}
            className="max-w-2xl"
          />
        </div>

        {/* FAQ Content */}
        {filteredData.length > 0 ? (
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
