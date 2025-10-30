import { useState } from "react";
import { MainLayout } from "@/components/MainLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Settings, Plus, Trash2, GripVertical, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrganization } from "@/hooks/useOrganization";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  category_order: number;
  item_order: number;
}

export default function FAQManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { organization: currentOrganization } = useOrganization();
  const [editingItem, setEditingItem] = useState<Partial<FAQItem> | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Fetch FAQ items
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
      return data as FAQItem[];
    },
    enabled: !!currentOrganization?.id,
  });

  // Group items by category
  const categorizedItems = faqItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, FAQItem[]>);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (item: Partial<FAQItem>) => {
      if (!currentOrganization?.id) throw new Error("No organization");

      if (item.id) {
        const { error } = await supabase
          .from("faq_items")
          .update({
            category: item.category,
            question: item.question,
            answer: item.answer,
            category_order: item.category_order,
            item_order: item.item_order,
          })
          .eq("id", item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("faq_items")
          .insert({
            organization_id: currentOrganization.id,
            category: item.category || "General",
            question: item.question || "",
            answer: item.answer || "",
            category_order: item.category_order || 0,
            item_order: item.item_order || 0,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faq-items"] });
      toast({ title: "FAQ item saved successfully" });
      setEditingItem(null);
    },
    onError: (error) => {
      toast({
        title: "Error saving FAQ item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("faq_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faq-items"] });
      toast({ title: "FAQ item deleted successfully" });
      setDeleteConfirmId(null);
    },
    onError: (error) => {
      toast({
        title: "Error deleting FAQ item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!editingItem?.question || !editingItem?.answer) {
      toast({
        title: "Missing required fields",
        description: "Question and answer are required",
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate(editingItem);
  };

  const handleNewItem = () => {
    setEditingItem({
      category: "General",
      question: "",
      answer: "",
      category_order: 0,
      item_order: faqItems.length,
    });
  };

  return (
    <MainLayout>
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <PageHeader
          title="FAQ Management"
          subtitle="Manage frequently asked questions for your organization"
          icon={Settings}
        />

        <div className="mb-6">
          <Button onClick={handleNewItem}>
            <Plus className="h-4 w-4 mr-2" />
            Add New FAQ Item
          </Button>
        </div>

        {/* Editing Form */}
        {editingItem && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>
                {editingItem.id ? "Edit FAQ Item" : "New FAQ Item"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={editingItem.category || ""}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, category: e.target.value })
                  }
                  placeholder="e.g., Getting Started, Reservations, etc."
                />
              </div>
              <div>
                <Label htmlFor="question">Question</Label>
                <Input
                  id="question"
                  value={editingItem.question || ""}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, question: e.target.value })
                  }
                  placeholder="Enter the question"
                />
              </div>
              <div>
                <Label htmlFor="answer">Answer</Label>
                <Textarea
                  id="answer"
                  value={editingItem.answer || ""}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, answer: e.target.value })
                  }
                  placeholder="Enter the answer (you can use **bold** and *italic* formatting)"
                  rows={6}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saveMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditingItem(null)}
                  disabled={saveMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* FAQ Items List */}
        {isLoading ? (
          <p>Loading FAQ items...</p>
        ) : (
          <div className="space-y-6">
            {Object.entries(categorizedItems).map(([category, items]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle>{category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50"
                      >
                        <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm mb-1">
                            {item.question}
                          </h4>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {item.answer}
                          </p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingItem(item)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteConfirmId(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={!!deleteConfirmId}
          onOpenChange={() => setDeleteConfirmId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete FAQ Item</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this FAQ item? This action cannot
                be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  deleteConfirmId && deleteMutation.mutate(deleteConfirmId)
                }
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
