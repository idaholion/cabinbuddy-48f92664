import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  HelpCircle, 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  Eye, 
  EyeOff,
  MessageCircle,
  ChevronDown 
} from 'lucide-react';
import {
  useCBFaqItemsAll,
  useCBFaqItemsMutations,
  CB_FAQ_ROUTES,
  type CBFaqItem,
  type CreateCBFaqItemInput,
} from '@/hooks/useCBFaqItems';

export const CBFaqManagement = () => {
  const { data: faqItems, isLoading } = useCBFaqItemsAll();
  const { createFaq, updateFaq, deleteFaq, toggleFaqActive, isCreating, isUpdating, isDeleting, isToggling } = useCBFaqItemsMutations();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRoute, setFilterRoute] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CBFaqItem | null>(null);
  
  // Form state
  const [formRoutePath, setFormRoutePath] = useState('');
  const [formQuestion, setFormQuestion] = useState('');
  const [formAnswer, setFormAnswer] = useState('');
  const [formSortOrder, setFormSortOrder] = useState(0);

  // Group FAQ items by route
  const groupedFaqs = useMemo(() => {
    if (!faqItems) return {};
    
    const filtered = faqItems.filter(item => {
      const matchesSearch = searchTerm === '' || 
        item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRoute = filterRoute === 'all' || item.route_path === filterRoute;
      return matchesSearch && matchesRoute;
    });

    return filtered.reduce((acc, item) => {
      if (!acc[item.route_path]) {
        acc[item.route_path] = [];
      }
      acc[item.route_path].push(item);
      return acc;
    }, {} as Record<string, CBFaqItem[]>);
  }, [faqItems, searchTerm, filterRoute]);

  // Get route label helper
  const getRouteLabel = (path: string) => {
    const route = CB_FAQ_ROUTES.find(r => r.path === path);
    return route?.label || path;
  };

  // Count total and active FAQs
  const totalCount = faqItems?.length || 0;
  const activeCount = faqItems?.filter(item => item.is_active).length || 0;

  // Reset form
  const resetForm = () => {
    setFormRoutePath('');
    setFormQuestion('');
    setFormAnswer('');
    setFormSortOrder(0);
    setEditingItem(null);
  };

  // Handle add/edit dialog open
  const handleOpenAddDialog = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const handleOpenEditDialog = (item: CBFaqItem) => {
    setFormRoutePath(item.route_path);
    setFormQuestion(item.question);
    setFormAnswer(item.answer);
    setFormSortOrder(item.sort_order);
    setEditingItem(item);
  };

  // Handle save
  const handleSave = async () => {
    if (!formRoutePath || !formQuestion || !formAnswer) return;

    if (editingItem) {
      await updateFaq({
        id: editingItem.id,
        route_path: formRoutePath,
        question: formQuestion,
        answer: formAnswer,
        sort_order: formSortOrder,
      });
      setEditingItem(null);
    } else {
      await createFaq({
        route_path: formRoutePath,
        question: formQuestion,
        answer: formAnswer,
        sort_order: formSortOrder,
      });
      setIsAddDialogOpen(false);
    }
    resetForm();
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    await deleteFaq(id);
  };

  // Handle toggle active
  const handleToggleActive = async (id: string, currentActive: boolean) => {
    await toggleFaqActive({ id, is_active: !currentActive });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              CB FAQ Management
            </CardTitle>
            <CardDescription>
              Manage help content shown in the CB assistant across all organizations.
              <span className="ml-2">
                <Badge variant="secondary">{activeCount} active</Badge>
                <Badge variant="outline" className="ml-1">{totalCount} total</Badge>
              </span>
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenAddDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add FAQ
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New FAQ</DialogTitle>
                <DialogDescription>
                  Create a new FAQ item for the CB assistant.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="route">Page Route</Label>
                  <Select value={formRoutePath} onValueChange={setFormRoutePath}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a route" />
                    </SelectTrigger>
                    <SelectContent>
                      {CB_FAQ_ROUTES.map((route) => (
                        <SelectItem key={route.path} value={route.path}>
                          {route.label} ({route.path})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="question">Question</Label>
                  <Input
                    id="question"
                    value={formQuestion}
                    onChange={(e) => setFormQuestion(e.target.value)}
                    placeholder="How do I make a reservation?"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="answer">Answer</Label>
                  <Textarea
                    id="answer"
                    value={formAnswer}
                    onChange={(e) => setFormAnswer(e.target.value)}
                    placeholder="Go to Cabin Calendar, click on available dates..."
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sortOrder">Sort Order</Label>
                  <Input
                    id="sortOrder"
                    type="number"
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    Lower numbers appear first within the same route.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={!formRoutePath || !formQuestion || !formAnswer || isCreating}
                >
                  {isCreating ? 'Creating...' : 'Create FAQ'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search questions and answers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterRoute} onValueChange={setFilterRoute}>
            <SelectTrigger className="w-full sm:w-[240px]">
              <SelectValue placeholder="Filter by route" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Routes</SelectItem>
              {CB_FAQ_ROUTES.map((route) => (
                <SelectItem key={route.path} value={route.path}>
                  {route.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* FAQ Items grouped by route */}
        {Object.keys(groupedFaqs).length === 0 ? (
          <div className="text-center py-12">
            <HelpCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No FAQ items found</h3>
            <p className="text-muted-foreground">
              {searchTerm || filterRoute !== 'all' 
                ? 'Try adjusting your search or filter.' 
                : 'Click "Add FAQ" to create your first FAQ item.'}
            </p>
          </div>
        ) : (
          <Accordion type="multiple" className="space-y-2">
            {Object.entries(groupedFaqs)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([routePath, items]) => (
                <AccordionItem 
                  key={routePath} 
                  value={routePath}
                  className="border rounded-lg px-4"
                >
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono text-xs">
                        {routePath}
                      </Badge>
                      <span className="font-medium">{getRouteLabel(routePath)}</span>
                      <Badge variant="secondary" className="ml-2">
                        {items.length} FAQ{items.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="space-y-3">
                      {items
                        .sort((a, b) => a.sort_order - b.sort_order)
                        .map((item) => (
                          <div 
                            key={item.id} 
                            className={`border rounded-lg p-4 ${!item.is_active ? 'opacity-60 bg-muted/30' : ''}`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm">Q:</span>
                                  {!item.is_active && (
                                    <Badge variant="outline" className="text-xs">
                                      <EyeOff className="h-3 w-3 mr-1" />
                                      Hidden
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm mb-2">{item.question}</p>
                                <p className="text-xs text-muted-foreground">
                                  <span className="font-medium">A:</span> {item.answer}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleActive(item.id, item.is_active)}
                                  disabled={isToggling}
                                  title={item.is_active ? 'Hide' : 'Show'}
                                >
                                  {item.is_active ? (
                                    <Eye className="h-4 w-4" />
                                  ) : (
                                    <EyeOff className="h-4 w-4" />
                                  )}
                                </Button>
                                
                                {/* Edit Dialog */}
                                <Dialog 
                                  open={editingItem?.id === item.id} 
                                  onOpenChange={(open) => !open && setEditingItem(null)}
                                >
                                  <DialogTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => handleOpenEditDialog(item)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-lg">
                                    <DialogHeader>
                                      <DialogTitle>Edit FAQ</DialogTitle>
                                      <DialogDescription>
                                        Update this FAQ item.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                      <div className="space-y-2">
                                        <Label htmlFor="edit-route">Page Route</Label>
                                        <Select value={formRoutePath} onValueChange={setFormRoutePath}>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select a route" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {CB_FAQ_ROUTES.map((route) => (
                                              <SelectItem key={route.path} value={route.path}>
                                                {route.label} ({route.path})
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="edit-question">Question</Label>
                                        <Input
                                          id="edit-question"
                                          value={formQuestion}
                                          onChange={(e) => setFormQuestion(e.target.value)}
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="edit-answer">Answer</Label>
                                        <Textarea
                                          id="edit-answer"
                                          value={formAnswer}
                                          onChange={(e) => setFormAnswer(e.target.value)}
                                          rows={4}
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="edit-sortOrder">Sort Order</Label>
                                        <Input
                                          id="edit-sortOrder"
                                          type="number"
                                          value={formSortOrder}
                                          onChange={(e) => setFormSortOrder(parseInt(e.target.value) || 0)}
                                        />
                                      </div>
                                    </div>
                                    <DialogFooter>
                                      <Button variant="outline" onClick={() => setEditingItem(null)}>
                                        Cancel
                                      </Button>
                                      <Button 
                                        onClick={handleSave} 
                                        disabled={!formRoutePath || !formQuestion || !formAnswer || isUpdating}
                                      >
                                        {isUpdating ? 'Saving...' : 'Save Changes'}
                                      </Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>

                                {/* Delete Confirmation */}
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete FAQ?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently delete this FAQ item. This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => handleDelete(item.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        {isDeleting ? 'Deleting...' : 'Delete'}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
};
