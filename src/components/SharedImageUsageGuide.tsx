import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InfoIcon, ImageIcon, Zap, Globe, Recycle } from 'lucide-react';

export const SharedImageUsageGuide: React.FC = () => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Shared Image Library</CardTitle>
        </div>
        <CardDescription>
          Optimize memory usage by reusing the same images across opening and closing checklists
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg dark:bg-green-950/20">
            <Zap className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-green-800 dark:text-green-200">Faster Loading</h4>
              <p className="text-sm text-green-700 dark:text-green-300">
                Same images cached by browser, load instantly
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg dark:bg-blue-950/20">
            <Globe className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-800 dark:text-blue-200">Consistent</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Same photos used across all checklists
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg dark:bg-purple-950/20">
            <Recycle className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-purple-800 dark:text-purple-200">Memory Efficient</h4>
              <p className="text-sm text-purple-700 dark:text-purple-300">
                Minimizes total bandwidth usage
              </p>
            </div>
          </div>
        </div>

        {/* Usage Instructions */}
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            <strong>Pro Tip:</strong> When creating your cabin opening checklist, use the same image names as your closing checklist. 
            The shared library ensures both checklists reference identical URLs, maximizing browser cache efficiency.
          </AlertDescription>
        </Alert>

        {/* Available Categories */}
        <div>
          <h4 className="font-medium mb-2">Available Image Categories:</h4>
          <div className="flex flex-wrap gap-2">
            {[
              'Water System',
              'Electrical', 
              'HVAC & Heating',
              'Appliances',
              'Structural',
              'Security',
              'Outdoor Equipment',
              'Safety & Maintenance'
            ].map((category) => (
              <Badge key={category} variant="secondary" className="text-xs">
                {category}
              </Badge>
            ))}
          </div>
        </div>

        {/* Best Practices */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Best Practices:</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Use descriptive, consistent names for shared images</li>
            <li>• Upload once to the shared library, reference everywhere</li>
            <li>• Keep image filenames the same across opening/closing checklists</li>
            <li>• Organize by system type (water, electrical, etc.) for easy finding</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};