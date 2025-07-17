import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Type, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

const FontSamples = () => {
  const fontSamples = [
    {
      name: "Inter (Sans)",
      className: "font-sans",
      description: "Clean, modern sans-serif font perfect for UI elements",
      isGoogle: true,
      googleUrl: "https://fonts.google.com/specimen/Inter"
    },
    {
      name: "Georgia (Serif)",
      className: "font-serif", 
      description: "Classic serif font for readable body text",
      isGoogle: false
    },
    {
      name: "Playfair Display",
      className: "font-display",
      description: "Elegant display font for headings and titles",
      isGoogle: true,
      googleUrl: "https://fonts.google.com/specimen/Playfair+Display"
    },
    {
      name: "Open Sans (Body)",
      className: "font-body",
      description: "Friendly sans-serif optimized for body text",
      isGoogle: true,
      googleUrl: "https://fonts.google.com/specimen/Open+Sans"
    },
    {
      name: "Roboto (Button)",
      className: "font-button",
      description: "Google's signature font for buttons and UI",
      isGoogle: true,
      googleUrl: "https://fonts.google.com/specimen/Roboto"
    },
    {
      name: "Menlo (Mono)",
      className: "font-mono",
      description: "Monospace font for code and technical text",
      isGoogle: false
    }
  ];

  const sampleText = "The quick brown fox jumps over the lazy dog";
  const sampleHeading = "Beautiful Typography";

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Button variant="outline" asChild className="mb-4">
            <Link to="/family-setup">← Back to Family Setup</Link>
          </Button>
          <h1 className="text-4xl font-bold mb-2 text-foreground font-display">Font Samples</h1>
          <p className="text-lg text-muted-foreground font-body">Preview all available fonts in your design system</p>
        </div>

        <div className="grid gap-6">
          {fontSamples.map((font, index) => (
            <Card key={index} className="p-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Type className="h-5 w-5 mr-2" />
                    {font.name}
                  </div>
                  <div className="flex items-center gap-2">
                    {font.isGoogle && (
                      <Badge variant="secondary" className="text-xs">
                        Google Font
                      </Badge>
                    )}
                    {font.googleUrl && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={font.googleUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    )}
                  </div>
                </CardTitle>
                <CardDescription>{font.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={`${font.className} text-3xl font-bold text-foreground`}>
                  {sampleHeading}
                </div>
                <div className={`${font.className} text-lg text-muted-foreground`}>
                  {sampleText}
                </div>
                <div className={`${font.className} text-sm text-muted-foreground`}>
                  CSS Class: <code className="bg-muted px-2 py-1 rounded font-mono">{font.className}</code>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button className={font.className} size="sm">Sample Button</Button>
                  <Button variant="outline" className={font.className} size="sm">Outline Button</Button>
                  <Button variant="secondary" className={font.className} size="sm">Secondary Button</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Google Fonts Integration</CardTitle>
            <CardDescription>These Google Fonts are loaded via the index.html file</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Current Google Fonts URL:</h3>
              <code className="block bg-muted p-4 rounded font-mono text-sm break-all">
                https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Georgia:wght@400;700&family=Playfair+Display:wght@400;600;700&family=Open+Sans:wght@300;400;500;600;700&family=Roboto:wght@300;400;500;700&display=swap
              </code>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Available Google Fonts:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {fontSamples.filter(font => font.isGoogle).map((font, index) => (
                    <li key={index} className="flex items-center justify-between">
                      <span>{font.name}</span>
                      {font.googleUrl && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={font.googleUrl} target="_blank" rel="noopener noreferrer" className="text-xs">
                            View on Google Fonts <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">System Fonts:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {fontSamples.filter(font => !font.isGoogle).map((font, index) => (
                    <li key={index}>{font.name}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Font Usage Guide</CardTitle>
            <CardDescription>How to apply these fonts in your components</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">In React Components:</h3>
              <code className="block bg-muted p-4 rounded font-mono text-sm">
                {`<div className="font-display">Display Text</div>
<p className="font-body">Body text</p>
<Button className="font-button">Button Text</Button>`}
              </code>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Available Classes:</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {fontSamples.map((font, index) => (
                  <code key={index} className="bg-muted px-3 py-2 rounded text-sm font-mono">
                    {font.className}
                  </code>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FontSamples;