import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ShoppingItem {
  id: string;
  name: string;
  quantity?: string;
  addedBy: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
}

const ShoppingList = () => {
  const navigate = useNavigate();
  const [newItem, setNewItem] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const [items, setItems] = useState<ShoppingItem[]>([
    { id: "1", name: "Milk", quantity: "1 gallon", addedBy: "Mom", completed: false, priority: "medium" },
    { id: "2", name: "Bread", quantity: "2 loaves", addedBy: "Dad", completed: false, priority: "high" },
    { id: "3", name: "Eggs", quantity: "1 dozen", addedBy: "Emma", completed: true, priority: "medium" },
    { id: "4", name: "Bananas", addedBy: "Jake", completed: false, priority: "low" },
  ]);

  const addItem = () => {
    if (!newItem.trim()) return;
    
    const item: ShoppingItem = {
      id: Date.now().toString(),
      name: newItem.trim(),
      quantity: newQuantity.trim() || undefined,
      addedBy: "You",
      completed: false,
      priority: "medium"
    };
    
    setItems([...items, item]);
    setNewItem("");
    setNewQuantity("");
  };

  const toggleComplete = (id: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const deleteItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "default";
    }
  };

  const pendingItems = items.filter(item => !item.completed);
  const completedItems = items.filter(item => item.completed);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Family Shopping List</h1>
          </div>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>

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
                    checked={item.completed}
                    onCheckedChange={() => toggleComplete(item.id)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.name}</span>
                      {item.quantity && (
                        <span className="text-sm text-muted-foreground">({item.quantity})</span>
                      )}
                      <Badge variant={getPriorityColor(item.priority)}>
                        {item.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Added by {item.addedBy}</p>
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
                      checked={item.completed}
                      onCheckedChange={() => toggleComplete(item.id)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="line-through">{item.name}</span>
                        {item.quantity && (
                          <span className="text-sm text-muted-foreground">({item.quantity})</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">Added by {item.addedBy}</p>
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