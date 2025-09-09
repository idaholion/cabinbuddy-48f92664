import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, ShoppingCart, Home, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { NavigationHeader } from "@/components/ui/navigation-header";
import { useShoppingLists } from "@/hooks/useShoppingLists";
import { useAuth } from "@/contexts/AuthContext";

const ShoppingList = () => {
  const navigate = useNavigate();
  const { items, loading, addItem: addItemToDb, toggleItemComplete, deleteItem: deleteItemFromDb, createShoppingList, shoppingLists } = useShoppingLists();
  const { user } = useAuth();
  const [newItem, setNewItem] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const [currentListId, setCurrentListId] = useState<string | null>(null);

  // Ensure we have a shopping list to work with
  useEffect(() => {
    const initializeList = async () => {
      if (shoppingLists.length === 0 && !loading) {
        // Create a default shopping list if none exist
        const newList = await createShoppingList();
        if (newList) {
          setCurrentListId(newList.id);
        }
      } else if (shoppingLists.length > 0 && !currentListId) {
        // Use the first available list
        setCurrentListId(shoppingLists[0].id);
      }
    };

    initializeList();
  }, [shoppingLists, loading, createShoppingList, currentListId]);

  const addItem = async () => {
    if (!newItem.trim() || !currentListId) return;
    
    try {
      await addItemToDb(currentListId, {
        item_name: newItem.trim(),
        quantity: newQuantity.trim() || undefined,
        category: "general" // Default category
      });
      
      setNewItem("");
      setNewQuantity("");
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  };

  const toggleComplete = (id: string) => {
    toggleItemComplete(id);
  };

  const deleteItem = (id: string) => {
    deleteItemFromDb(id);
  };

  const getPriorityColor = (category?: string) => {
    // Map categories to priority colors for visual consistency
    switch (category) {
      case "urgent": return "destructive";
      case "important": return "default";
      case "general": return "secondary";
      default: return "secondary";
    }
  };

  const pendingItems = items.filter(item => !item.is_completed);
  const completedItems = items.filter(item => item.is_completed);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat p-4" style={{backgroundImage: 'url(/lovable-uploads/45c3083f-46c5-4e30-a2f0-31a24ab454f4.png)'}}>
      <div className="max-w-2xl mx-auto space-y-6">
        <PageHeader 
          title="Family Shopping List"
          subtitle="Collaborative shopping list for cabin stays"
          icon={ShoppingCart}
          backgroundImage={true}
        >
          <NavigationHeader />
        </PageHeader>

        {/* Add Item Form */}
        <Card>
          <CardHeader>
            <CardTitle>Add New Item</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Item name..."
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addItem()}
                className="flex-1"
              />
              <Input
                placeholder="Quantity (optional)"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addItem()}
                className="w-40"
              />
              <Button onClick={addItem}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pending Items */}
        <Card>
          <CardHeader>
            <CardTitle>Need to Buy ({pendingItems.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <Checkbox
                    checked={item.is_completed}
                    onCheckedChange={() => toggleComplete(item.id)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.item_name}</span>
                      {item.quantity && (
                        <span className="text-sm text-muted-foreground">({item.quantity})</span>
                      )}
                      <Badge variant={getPriorityColor(item.category)}>
                        {item.category || "general"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Added by {item.added_by_user_id === user?.id ? 'You' : 'Family Member'}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {pendingItems.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No items to buy! Add some items above.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Completed Items */}
        {completedItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recently Bought ({completedItems.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {completedItems.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg opacity-60">
                    <Checkbox
                      checked={item.is_completed}
                      onCheckedChange={() => toggleComplete(item.id)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="line-through">{item.item_name}</span>
                        {item.quantity && (
                          <span className="text-sm text-muted-foreground">({item.quantity})</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">Added by {item.added_by_user_id === user?.id ? 'You' : 'Family Member'}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ShoppingList;