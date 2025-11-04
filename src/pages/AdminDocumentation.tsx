import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

interface DocFile {
  name: string;
  title: string;
  path: string;
  description: string;
}

const DOC_FILES: DocFile[] = [
  {
    name: 'implementation-tracker',
    title: 'Implementation Tracker',
    path: '/docs/IMPLEMENTATION_TRACKER.md',
    description: 'Track progress of allocation model protection and test data isolation initiatives'
  },
  {
    name: 'date-handling',
    title: 'Date Handling Guide',
    path: '/docs/DATE_HANDLING_GUIDE.md',
    description: 'Guidelines for handling dates consistently across the application'
  },
  {
    name: 'season-summary',
    title: 'Season Summary Phase 3',
    path: '/docs/SEASON_SUMMARY_PHASE3.md',
    description: 'Documentation for Season Summary feature implementation'
  }
];

export default function AdminDocumentation() {
  const [activeDoc, setActiveDoc] = useState<string>('implementation-tracker');
  const [docContent, setDocContent] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const loadDocument = async (doc: DocFile) => {
    if (docContent[doc.name]) return; // Already loaded

    setLoading(prev => ({ ...prev, [doc.name]: true }));
    
    try {
      const response = await fetch(doc.path);
      if (!response.ok) throw new Error('Failed to load document');
      
      const text = await response.text();
      setDocContent(prev => ({ ...prev, [doc.name]: text }));
    } catch (error) {
      console.error('Error loading document:', error);
      toast({
        title: 'Error Loading Document',
        description: `Failed to load ${doc.title}`,
        variant: 'destructive'
      });
    } finally {
      setLoading(prev => ({ ...prev, [doc.name]: false }));
    }
  };

  useEffect(() => {
    // Load the active document
    const doc = DOC_FILES.find(d => d.name === activeDoc);
    if (doc) loadDocument(doc);
  }, [activeDoc]);

  const downloadMarkdown = (doc: DocFile) => {
    const content = docContent[doc.name];
    if (!content) return;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.name}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Download Started',
      description: `Downloading ${doc.title}...`
    });
  };

  const refreshDocument = async (doc: DocFile) => {
    // Clear cache and reload
    setDocContent(prev => {
      const newContent = { ...prev };
      delete newContent[doc.name];
      return newContent;
    });
    await loadDocument(doc);
    
    toast({
      title: 'Document Refreshed',
      description: `Reloaded ${doc.title}`
    });
  };

  const renderMarkdown = (content: string) => {
    // Simple markdown rendering - converts headers, lists, code blocks, checkboxes
    const lines = content.split('\n');
    let inCodeBlock = false;
    let codeLanguage = '';

    return lines.map((line, index) => {
      // Code blocks
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeLanguage = line.substring(3).trim();
          return <div key={index} className="mt-4 mb-2 text-xs text-muted-foreground">{codeLanguage || 'code'}</div>;
        } else {
          inCodeBlock = false;
          return <div key={index} className="mb-4"></div>;
        }
      }
      
      if (inCodeBlock) {
        return (
          <div key={index} className="bg-muted px-4 py-1 font-mono text-sm overflow-x-auto">
            {line}
          </div>
        );
      }

      // Headers
      if (line.startsWith('# ')) {
        return <h1 key={index} className="text-3xl font-bold mt-8 mb-4">{line.substring(2)}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={index} className="text-2xl font-semibold mt-6 mb-3 text-primary">{line.substring(3)}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={index} className="text-xl font-semibold mt-5 mb-2">{line.substring(4)}</h3>;
      }
      if (line.startsWith('#### ')) {
        return <h4 key={index} className="text-lg font-medium mt-4 mb-2">{line.substring(5)}</h4>;
      }

      // Checkboxes and lists
      if (line.trim().startsWith('- [x]') || line.trim().startsWith('- [ ]')) {
        const checked = line.includes('[x]');
        const text = line.substring(line.indexOf(']') + 1).trim();
        return (
          <div key={index} className="flex items-start gap-2 ml-4 my-1">
            <input type="checkbox" checked={checked} readOnly className="mt-1" />
            <span className={checked ? 'line-through text-muted-foreground' : ''}>{text}</span>
          </div>
        );
      }

      // Regular lists
      if (line.trim().startsWith('- ')) {
        return <li key={index} className="ml-6 my-1">{line.substring(line.indexOf('-') + 1).trim()}</li>;
      }
      if (/^\d+\.\s/.test(line.trim())) {
        return <li key={index} className="ml-6 my-1 list-decimal">{line.substring(line.indexOf('.') + 1).trim()}</li>;
      }

      // Status badges
      if (line.includes('✅') || line.includes('⏳') || line.includes('🔄')) {
        return (
          <p key={index} className="my-2 flex items-center gap-2">
            {line.includes('✅') && <Badge variant="default" className="bg-green-500">Complete</Badge>}
            {line.includes('⏳') && <Badge variant="secondary">Pending</Badge>}
            {line.includes('🔄') && <Badge variant="outline" className="border-blue-500 text-blue-500">In Progress</Badge>}
            <span>{line.replace(/[✅⏳🔄]/g, '').trim()}</span>
          </p>
        );
      }

      // Bold text
      line = line.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>');
      
      // Links
      line = line.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-primary underline" target="_blank" rel="noopener noreferrer">$1</a>');

      // Horizontal rule
      if (line.trim() === '---') {
        return <hr key={index} className="my-6 border-border" />;
      }

      // Empty line
      if (line.trim() === '') {
        return <div key={index} className="h-2"></div>;
      }

      // Regular paragraph
      return <p key={index} className="my-2" dangerouslySetInnerHTML={{ __html: line }}></p>;
    });
  };

  const activeDocFile = DOC_FILES.find(d => d.name === activeDoc);
  const isLoading = loading[activeDoc];
  const content = docContent[activeDoc];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Admin Documentation</h1>
        <p className="text-muted-foreground">
          Technical documentation, implementation guides, and tracking documents
        </p>
      </div>

      <Tabs value={activeDoc} onValueChange={setActiveDoc} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          {DOC_FILES.map(doc => (
            <TabsTrigger key={doc.name} value={doc.name} className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {doc.title}
            </TabsTrigger>
          ))}
        </TabsList>

        {DOC_FILES.map(doc => (
          <TabsContent key={doc.name} value={doc.name} className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {doc.title}
                    </CardTitle>
                    <CardDescription>{doc.description}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refreshDocument(doc)}
                      disabled={isLoading}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadMarkdown(doc)}
                      disabled={!content}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100vh-300px)] w-full rounded-md border p-6">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : content ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      {renderMarkdown(content)}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Failed to load document</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
