import { useState, useMemo } from 'react';
import { useCBFaqItems, CBFaqItem, CBFaqItemInput } from '@/hooks/useCBFaqItems';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  HelpCircle, 
  Search, 
  Route as RouteIcon,
  MessageCircleQuestion 
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// All known routes in the application
const KNOWN_ROUTES = [
  { path: '/', label: 'Landing Page' },
  { path: '/home', label: 'Home Dashboard' },
  { path: '/calendar', label: 'Reservation Calendar' },
  { path: '/cabin-calendar', label: 'Cabin Calendar' },
  { path: '/check-in', label: 'Check In' },
  { path: '/checkout-list', label: 'Checkout Checklist' },
  { path: '/checkout-final', label: 'Daily & Final Check' },
  { path: '/stay-history', label: 'Stay History' },
  { path: '/add-receipt', label: 'Add Receipt' },
  { path: '/shopping-list', label: 'Shopping List' },
  { path: '/cabin-rules', label: 'Cabin Rules' },
  { path: '/seasonal-checklists', label: 'Seasonal Checklists' },
  { path: '/documents', label: 'Documents' },
  { path: '/photos', label: 'Photos' },
  { path: '/shared-notes', label: 'Shared Notes' },
  { path: '/messaging', label: 'Messaging' },
  { path: '/family-voting', label: 'Family Voting' },
  { path: '/finance-reports', label: 'Financial Dashboard' },
  { path: '/billing', label: 'Billing & Invoices' },
  { path: '/invoice-settings', label: 'Invoice Settings' },
  { path: '/financial-admin-tools', label: 'Financial Admin Tools' },
  { path: '/admin-season-summary', label: 'Admin Season Summary' },
  { path: '/data-backup', label: 'Data Backup' },
  { path: '/checklist-creator', label: 'Checklist Creator' },
  { path: '/faq', label: 'FAQ Page' },
  { path: '/faq-management', label: 'FAQ Management' },
  { path: '/features', label: 'Feature Guide' },
  { path: '/setup', label: 'Account Setup' },
  { path: '/family-setup', label: 'Family Setup' },
  { path: '/family-group-setup', label: 'Family Group Setup' },
  { path: '/group-member-profile', label: 'Profile Settings' },
  { path: '/reservation-setup', label: 'Reservation Setup' },
  { path: '/use-fee-setup', label: 'Use Fee Setup' },
  { path: '/calendar-keeper-management', label: 'Calendar Keeper' },
  { path: '/manage-organizations', label: 'Manage Organizations' },
  { path: '/supervisor', label: 'Supervisor Dashboard' },
  { path: '/notification-monitoring', label: 'Notification Monitoring' },
  { path: '/stay-history-snapshots', label: 'Stay History Snapshots' },
  { path: '/family-group-health-check', label: 'Family Group Health Check' },
];

interface FaqFormData {
  route_path: string;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
}

const emptyFormData: FaqFormData = {
  route_path: '',
  question: '',
  answer: '',
  sort_order: 0,
  is_active: true,
};

export default function CBFaqManagement() {
  const { items, loading, error, createItem, updateItem, deleteItem, toggleActive, getItemsByRoute } = useCBFaqItems();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoute, setSelectedRoute] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CBFaqItem | null>(null);
  const [formData, setFormData] = useState<FaqFormData>(emptyFormData);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const itemsByRoute = useMemo(() => getItemsByRoute(), [getItemsByRoute]);

  // Filter items based on search and selected route
  const filteredItems = useMemo(() => {
    let filtered = items;
    
    if (selectedRoute !== 'all') {
      filtered = filtered.filter(item => item.route_path === selectedRoute);
    }
    
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.question.toLowerCase().includes(lower) ||
        item.answer.toLowerCase().includes(lower) ||
        item.route_path.toLowerCase().includes(lower)
      );
    }
    
    return filtered;
  }, [items, selectedRoute, searchTerm]);

  // Group filtered items by route for display
  const groupedFilteredItems = useMemo(() => {
    const grouped: Record<string, CBFaqItem[]> = {};
    filteredItems.forEach(item => {
      if (!grouped[item.route_path]) {
        grouped[item.route_path] = [];
      }
      grouped[item.route_path].push(item);
    });
    return grouped;
  }, [filteredItems]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData(emptyFormData);
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: CBFaqItem) => {
    setEditingItem(item);
    setFormData({
      route_path: item.route_path,
      question: item.question,
      answer: item.answer,
      sort_order: item.sort_order,
      is_active: item.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.route_path || !formData.question || !formData.answer) {
      return;
    }

    if (editingItem) {
      const success = await updateItem(editingItem.id, formData);
      if (success) {
        setDialogOpen(false);
        setEditingItem(null);
        setFormData(emptyFormData);
      }
    } else {
      const result = await createItem(formData);
      if (result) {
        setDialogOpen(false);
        setFormData(emptyFormData);
      }
    }
  };

  const handleDelete = async (id: string) => {
    const success = await deleteItem(id);
    if (success) {
      setDeleteConfirmId(null);
    }
  };

  const getRouteLabel = (path: string) => {
    const route = KNOWN_ROUTES.find(r => r.path === path);
    return route?.label || path;
  };

  const routesWithItems = Object.keys(itemsByRoute).sort();
  const routesWithoutItems = KNOWN_ROUTES.filter(r => !routesWithItems.includes(r.path));

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertDescription>Error loading CB FAQ items: {error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageCircleQuestion className="h-6 w-6 text-primary" />
              CB Help FAQ Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage the FAQ items that appear in the CB Help assistant for each page
            </p>
          </div>
          <Button onClick={handleOpenCreate} className="shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            Add FAQ Item
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{items.length}</div>
              <p className="text-xs text-muted-foreground">Total Items</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{items.filter(i => i.is_active).length}</div>
              <p className="text-xs text-muted-foreground">Active Items</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{routesWithItems.length}</div>
              <p className="text-xs text-muted-foreground">Routes with FAQs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{routesWithoutItems.length}</div>
              <p className="text-xs text-muted-foreground">Routes without FAQs</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search questions or answers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedRoute} onValueChange={setSelectedRoute}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="Filter by route" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Routes</SelectItem>
                  {KNOWN_ROUTES.map(route => (
                    <SelectItem key={route.path} value={route.path}>
                      {route.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* FAQ Items by Route */}
        {Object.keys(groupedFilteredItems).length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No FAQ items found</h3>
              <p className="text-muted-foreground mt-1">
                {searchTerm || selectedRoute !== 'all' 
                  ? 'Try adjusting your filters'
                  : 'Click "Add FAQ Item" to create your first item'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedFilteredItems)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([routePath, routeItems]) => (
                <Card key={routePath}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <RouteIcon className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-base font-medium">{getRouteLabel(routePath)}</CardTitle>
                      <Badge variant="secondary" className="ml-auto">
                        {routeItems.length} {routeItems.length === 1 ? 'item' : 'items'}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs font-mono">{routePath}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="multiple" className="w-full">
                      {routeItems
                        .sort((a, b) => a.sort_order - b.sort_order)
                        .map((item) => (
                          <AccordionItem key={item.id} value={item.id}>
                            <AccordionTrigger className="hover:no-underline">
                              <div className="flex items-center gap-2 text-left flex-1 pr-4">
                                <span className={!item.is_active ? 'text-muted-foreground line-through' : ''}>
                                  {item.question}
                                </span>
                                {!item.is_active && (
                                  <Badge variant="outline" className="text-xs">Inactive</Badge>
                                )}
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-4 pt-2">
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                  {item.answer}
                                </p>
                                <div className="flex items-center gap-2 pt-2 border-t">
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={item.is_active}
                                      onCheckedChange={(checked) => toggleActive(item.id, checked)}
                                    />
                                    <span className="text-xs text-muted-foreground">Active</span>
                                  </div>
                                  <div className="ml-auto flex gap-2">
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => handleOpenEdit(item)}
                                    >
                                      <Pencil className="h-3 w-3 mr-1" />
                                      Edit
                                    </Button>
                                    {deleteConfirmId === item.id ? (
                                      <div className="flex gap-1">
                                        <Button 
                                          variant="destructive" 
                                          size="sm"
                                          onClick={() => handleDelete(item.id)}
                                        >
                                          Confirm
                                        </Button>
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          onClick={() => setDeleteConfirmId(null)}
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    ) : (
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => setDeleteConfirmId(item.id)}
                                      >
                                        <Trash2 className="h-3 w-3 mr-1" />
                                        Delete
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                    </Accordion>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}

        {/* Routes without FAQs */}
        {routesWithoutItems.length > 0 && selectedRoute === 'all' && !searchTerm && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Routes Without FAQ Items</CardTitle>
              <CardDescription>
                These pages don't have any CB Help FAQ items yet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {routesWithoutItems.map(route => (
                  <Badge 
                    key={route.path} 
                    variant="outline" 
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => {
                      setFormData({ ...emptyFormData, route_path: route.path });
                      setEditingItem(null);
                      setDialogOpen(true);
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {route.label}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit FAQ Item' : 'Add FAQ Item'}
            </DialogTitle>
            <DialogDescription>
              {editingItem 
                ? 'Update the FAQ question and answer'
                : 'Create a new FAQ item for the CB Help assistant'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="route">Route/Page</Label>
              <Select 
                value={formData.route_path} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, route_path: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a route" />
                </SelectTrigger>
                <SelectContent>
                  {KNOWN_ROUTES.map(route => (
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
                value={formData.question}
                onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
                placeholder="e.g., How do I make a reservation?"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="answer">Answer</Label>
              <Textarea
                id="answer"
                value={formData.answer}
                onChange={(e) => setFormData(prev => ({ ...prev, answer: e.target.value }))}
                placeholder="Provide a helpful answer..."
                rows={4}
              />
            </div>

            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="sort_order">Sort Order</Label>
                <Input
                  id="sort_order"
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="flex items-end gap-2 pb-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!formData.route_path || !formData.question || !formData.answer}
            >
              {editingItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
