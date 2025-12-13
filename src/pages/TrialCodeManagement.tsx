import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useTrialCodes } from '@/hooks/useTrialCodes';
import { useSupervisor } from '@/hooks/useSupervisor';
import { Plus, Copy, CheckCircle, XCircle, Clock, Users, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

interface TrialCode {
  id: string;
  code: string;
  created_at: string;
  used_at: string | null;
  used_by_user_id: string | null;
  created_by_user_id: string | null;
  is_active: boolean;
  expires_at: string | null;
  notes: string | null;
  updated_at: string;
}

const TrialCodeManagement = () => {
  const { toast } = useToast();
  const { isSupervisor, loading: supervisorLoading } = useSupervisor();
  const { createTrialCode, fetchTrialCodes, loading } = useTrialCodes();
  
  const [codes, setCodes] = useState<TrialCode[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newCodeNotes, setNewCodeNotes] = useState('');
  const [newCodeExpireDays, setNewCodeExpireDays] = useState<string>('');
  const [bulkCount, setBulkCount] = useState<number>(1);

  useEffect(() => {
    if (isSupervisor) {
      loadTrialCodes();
    }
  }, [isSupervisor]);

  const loadTrialCodes = async () => {
    const fetchedCodes = await fetchTrialCodes();
    setCodes(fetchedCodes);
  };

  const handleCreateCode = async () => {
    if (bulkCount === 1) {
      const expireDays = newCodeExpireDays ? parseInt(newCodeExpireDays) : undefined;
      const code = await createTrialCode(newCodeNotes || undefined, expireDays);
      
      if (code) {
        await loadTrialCodes();
        setShowCreateDialog(false);
        setNewCodeNotes('');
        setNewCodeExpireDays('');
      }
    } else {
      // Bulk creation
      const expireDays = newCodeExpireDays ? parseInt(newCodeExpireDays) : undefined;
      const promises = Array.from({ length: bulkCount }, (_, i) => 
        createTrialCode(
          newCodeNotes ? `${newCodeNotes} (${i + 1}/${bulkCount})` : undefined, 
          expireDays
        )
      );
      
      try {
        await Promise.all(promises);
        await loadTrialCodes();
        setShowCreateDialog(false);
        setNewCodeNotes('');
        setNewCodeExpireDays('');
        setBulkCount(1);
        
        toast({
          title: "Success",
          description: `Created ${bulkCount} trial codes successfully!`,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Some codes failed to create. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast({
        title: "Copied!",
        description: `Trial code ${code} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (code: TrialCode) => {
    if (code.used_at) {
      return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle className="h-3 w-3 mr-1" />Used</Badge>;
    }
    
    if (!code.is_active) {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Inactive</Badge>;
    }
    
    if (code.expires_at && new Date(code.expires_at) < new Date()) {
      return <Badge variant="destructive"><Clock className="h-3 w-3 mr-1" />Expired</Badge>;
    }
    
    return <Badge variant="default"><Clock className="h-3 w-3 mr-1" />Available</Badge>;
  };

  const getCodeStats = () => {
    const total = codes.length;
    const used = codes.filter(c => c.used_at).length;
    const available = codes.filter(c => !c.used_at && c.is_active && (!c.expires_at || new Date(c.expires_at) > new Date())).length;
    const expired = codes.filter(c => c.expires_at && new Date(c.expires_at) < new Date()).length;
    
    return { total, used, available, expired };
  };

  if (supervisorLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isSupervisor) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Access denied. Only supervisors can manage trial codes.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = getCodeStats();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/supervisor" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Supervisor Dashboard
          </Link>
          <h1 className="text-3xl font-bold">Trial Code Management</h1>
          <p className="text-muted-foreground">
            Manage beta access codes for new organization creation
          </p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Trial Code
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Trial Code</DialogTitle>
              <DialogDescription>
                Generate trial access codes for beta testers to create new organizations
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="e.g., 'For John Smith - Beta tester'"
                  value={newCodeNotes}
                  onChange={(e) => setNewCodeNotes(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expireDays">Expire After (Days, Optional)</Label>
                <Input
                  id="expireDays"
                  type="number"
                  placeholder="e.g., 30"
                  value={newCodeExpireDays}
                  onChange={(e) => setNewCodeExpireDays(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bulkCount">Number of Codes</Label>
                <Input
                  id="bulkCount"
                  type="number"
                  min="1"
                  max="10"
                  value={bulkCount}
                  onChange={(e) => setBulkCount(parseInt(e.target.value) || 1)}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateCode} disabled={loading}>
                  {loading ? 'Creating...' : `Create ${bulkCount === 1 ? 'Code' : `${bulkCount} Codes`}`}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Codes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <Clock className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.available}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Used</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.used}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
          </CardContent>
        </Card>
      </div>

      {/* Codes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Trial Codes</CardTitle>
          <CardDescription>
            All generated trial access codes and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Used Date</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.map((code) => (
                <TableRow key={code.id}>
                  <TableCell className="font-mono font-bold">
                    {code.code}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(code)}
                  </TableCell>
                  <TableCell>
                    {format(new Date(code.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    {code.used_at ? format(new Date(code.used_at), 'MMM d, yyyy') : '-'}
                  </TableCell>
                  <TableCell>
                    {code.expires_at ? format(new Date(code.expires_at), 'MMM d, yyyy') : 'Never'}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {code.notes || '-'}
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => copyToClipboard(code.code)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {codes.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No trial codes created yet. Create your first code to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TrialCodeManagement;