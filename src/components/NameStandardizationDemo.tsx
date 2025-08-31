import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Search, User } from 'lucide-react';
import { 
  parseFullName, 
  formatFullName, 
  getInitials, 
  normalizeName,
  namesMatch,
  validateFullName,
  formatNameForDisplay 
} from '@/lib/name-utils';

export const NameStandardizationDemo = () => {
  const [testName, setTestName] = useState('');
  const [compareName, setCompareName] = useState('');

  const parsed = parseFullName(testName);
  const isValid = validateFullName(testName);
  const namesDoMatch = testName && compareName ? namesMatch(testName, compareName) : false;

  const examples = [
    { input: 'John Smith', description: 'Standard full name' },
    { input: 'Mary Jane Watson', description: 'Name with middle name' },
    { input: 'DAVID BROWN', description: 'All caps name' },
    { input: 'jane doe', description: 'All lowercase name' },
    { input: 'John', description: 'First name only (invalid)' },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Name Standardization System
          </CardTitle>
          <CardDescription>
            Enhanced name handling with parsing, validation, and smart matching
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Interactive Name Parser */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="test-name">Test Name Input</Label>
              <Input
                id="test-name"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder="Enter a name to test parsing..."
              />
            </div>

            {testName && (
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  {isValid ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="font-medium">
                    {isValid ? 'Valid Name Format' : 'Invalid Name Format'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>First Name:</strong> {parsed.firstName || 'None'}
                  </div>
                  <div>
                    <strong>Last Name:</strong> {parsed.lastName || 'None'}
                  </div>
                  <div>
                    <strong>Display Name:</strong> {formatNameForDisplay(testName)}
                  </div>
                  <div>
                    <strong>Initials:</strong> {getInitials(testName)}
                  </div>
                  <div>
                    <strong>Normalized:</strong> {normalizeName(testName)}
                  </div>
                  <div>
                    <strong>Formatted:</strong> {formatFullName(parsed.firstName, parsed.lastName)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Name Matching Test */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="compare-name">Test Name Matching</Label>
              <Input
                id="compare-name"
                value={compareName}
                onChange={(e) => setCompareName(e.target.value)}
                placeholder="Enter another name to compare..."
              />
            </div>

            {testName && compareName && (
              <div className={`p-4 rounded-lg ${
                namesDoMatch ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center gap-2">
                  {namesDoMatch ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="font-medium">
                    Names {namesDoMatch ? 'Match' : 'Do Not Match'}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Comparing: "{testName}" with "{compareName}"
                </div>
              </div>
            )}
          </div>

          {/* Example Names */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Example Names to Test
            </Label>
            <div className="grid gap-2">
              {examples.map((example, index) => (
                <Card 
                  key={index}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setTestName(example.input)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">{example.input}</span>
                        <div className="text-xs text-muted-foreground">
                          {example.description}
                        </div>
                      </div>
                      <Badge variant={validateFullName(example.input) ? "default" : "destructive"}>
                        {validateFullName(example.input) ? "Valid" : "Invalid"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};