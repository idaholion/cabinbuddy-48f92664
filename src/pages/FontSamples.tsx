import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Type } from "lucide-react";
import { Link } from "react-router-dom";

const FontSamples = () => {
  const fontSamples = [
    {
      name: "Inter (Sans)",
      className: "font-sans",
      description: "Clean, modern sans-serif font perfect for UI elements"
    },
    {
      name: "Georgia (Serif)",
      className: "font-serif", 
      description: "Classic serif font for readable body text"
    },
    {
      name: "Playfair Display",
      className: "font-display",
      description: "Elegant display font for headings and titles"
    },
    {
      name: "Open Sans (Body)",
      className: "font-body",
      description: "Friendly sans-serif optimized for body text"
    },
    {
      name: "Roboto (Button)",
      className: "font-button",
      description: "Google's signature font for buttons and UI"
    },
    {
      name: "Menlo (Mono)",
      className: "font-mono",
      description: "Monospace font for code and technical text"
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
                <CardTitle className="flex items-center">
                  <Type className="h-5 w-5 mr-2" />
                  {font.name}
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