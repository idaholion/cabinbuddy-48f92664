import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const FontShowcase = () => {
  const navigate = useNavigate();

  const fonts = [
    { name: "Inter (Default Sans)", class: "font-sans", description: "Clean, modern sans-serif" },
    { name: "Georgia (Serif)", class: "font-serif", description: "Classic serif font" },
    { name: "Menlo (Mono)", class: "font-mono", description: "Monospace font" },
    { name: "Playfair Display", class: "font-display", description: "Elegant display font" },
    { name: "Open Sans", class: "font-body", description: "Readable body font" },
    { name: "Roboto", class: "font-button", description: "Modern button font" },
    { name: "Alex Brush", class: "font-script", description: "Script/cursive font" },
    { name: "Kaushan Script", class: "font-kaushan", description: "Playful script font" },
  ];

  const sizes = [
    { name: "Small", class: "text-2xl" },
    { name: "Medium", class: "text-4xl" },
    { name: "Large", class: "text-6xl" },
    { name: "Extra Large", class: "text-8xl" }
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <h1 className="text-6xl mb-4 font-kaushan text-primary drop-shadow-lg text-center">Font Showcase</h1>
        </div>

        {/* Font Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {fonts.map((font) => (
            <Card key={font.class} className="h-fit">
              <CardHeader>
                <CardTitle className="text-lg">{font.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{font.description}</p>
                <code className="text-xs bg-muted px-2 py-1 rounded">{font.class}</code>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Welcome to Cabin Buddy in different sizes */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Welcome to Cabin Buddy</p>
                  {sizes.map((size) => (
                    <div key={size.name} className="overflow-hidden">
                      <p className="text-xs text-muted-foreground mb-1">{size.name} ({size.class})</p>
                      <h2 className={`${font.class} ${size.class} leading-tight`}>
                        Welcome to Cabin Buddy
                      </h2>
                    </div>
                  ))}
                </div>

                {/* Sample text */}
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Sample Text</p>
                  <p className={`${font.class} text-base`}>
                    The quick brown fox jumps over the lazy dog. 1234567890
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Usage Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How to Use</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              To use any of these fonts in your components, simply add the corresponding class name to your element:
            </p>
            <code className="block bg-muted p-3 rounded text-sm">
              {`<h1 className="font-script text-8xl">Welcome to Cabin Buddy</h1>`}
            </code>
            <p className="text-xs text-muted-foreground mt-2">
              Note: If a font doesn't appear as expected, check that it's properly loaded in your index.css file.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FontShowcase;