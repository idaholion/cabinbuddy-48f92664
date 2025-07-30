import { useState, useEffect } from 'react';
import { Search, Calendar, FileText, Camera, User, Receipt, Home, CheckCircle, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  title: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  category: string;
}

const searchableItems: SearchResult[] = [
  {
    id: 'calendar',
    title: 'Cabin Calendar',
    description: 'View and manage cabin reservations',
    path: '/calendar',
    icon: <Calendar className="h-4 w-4" />,
    category: 'Navigation'
  },
  {
    id: 'check-in',
    title: 'Arrival Check In',
    description: 'Check in upon arrival at the cabin',
    path: '/check-in',
    icon: <CheckCircle className="h-4 w-4" />,
    category: 'Check In'
  },
  {
    id: 'daily-check-in',
    title: 'Daily Check In',
    description: 'Perform daily cabin maintenance checks',
    path: '/daily-check-in',
    icon: <Clock className="h-4 w-4" />,
    category: 'Check In'
  },
  {
    id: 'shopping-list',
    title: 'Shopping List',
    description: 'Manage cabin shopping and supplies',
    path: '/shopping-list',
    icon: <Receipt className="h-4 w-4" />,
    category: 'Management'
  },
  {
    id: 'add-receipt',
    title: 'Add Receipt',
    description: 'Upload and track receipts',
    path: '/add-receipt',
    icon: <Receipt className="h-4 w-4" />,
    category: 'Financial'
  },
  {
    id: 'photos',
    title: 'Family Photos',
    description: 'Share and view family photos',
    path: '/photos',
    icon: <Camera className="h-4 w-4" />,
    category: 'Sharing'
  },
  {
    id: 'cabin-rules',
    title: 'Cabin Rules',
    description: 'View cabin rules and guidelines',
    path: '/cabin-rules',
    icon: <FileText className="h-4 w-4" />,
    category: 'Information'
  },
  {
    id: 'documents',
    title: 'Documents',
    description: 'Access important cabin documents',
    path: '/documents',
    icon: <FileText className="h-4 w-4" />,
    category: 'Information'
  },
  {
    id: 'financial-review',
    title: 'Financial Review',
    description: 'Review financial reports and expenses',
    path: '/financial-review',
    icon: <Receipt className="h-4 w-4" />,
    category: 'Financial'
  },
  {
    id: 'setup',
    title: 'Setup',
    description: 'Configure family and organization settings',
    path: '/setup',
    icon: <User className="h-4 w-4" />,
    category: 'Setup'
  }
];

export const GlobalSearch = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (query.trim() === '') {
      setResults(searchableItems.slice(0, 8)); // Show most common items
    } else {
      const filtered = searchableItems.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.description.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase())
      );
      setResults(filtered);
    }
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelect = (result: SearchResult) => {
    navigate(result.path);
    setIsOpen(false);
    setQuery('');
  };

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.category]) {
      acc[result.category] = [];
    }
    acc[result.category].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full max-w-sm justify-start text-muted-foreground"
        >
          <Search className="h-4 w-4 mr-2" />
          Search...
          <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl p-0">
        <div className="flex items-center border-b px-3">
          <Search className="h-4 w-4 mr-2 shrink-0 opacity-50" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, features, and actions..."
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            autoFocus
          />
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          {Object.entries(groupedResults).map(([category, items]) => (
            <div key={category} className="mb-4 last:mb-0">
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {category}
              </div>
              <div className="space-y-1">
                {items.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleSelect(result)}
                    className={cn(
                      "w-full flex items-center gap-3 px-2 py-2 text-left rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                    )}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded bg-muted">
                      {result.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{result.title}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {result.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {results.length === 0 && query && (
            <div className="px-2 py-8 text-center text-muted-foreground">
              No results found for "{query}"
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};