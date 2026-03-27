import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Eye, UserPlus, Search, CheckCircle2, ArrowRight } from 'lucide-react';

type PreviewStep = 'welcome' | 'claim-auto' | 'claim-manual' | 'claimed';

export const NewUserExperiencePreview = () => {
  const [step, setStep] = useState<PreviewStep>('welcome');

  const resetPreview = () => setStep('welcome');

  return (
    <Dialog onOpenChange={(open) => { if (!open) resetPreview(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Preview New User Experience
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New User Experience Preview</DialogTitle>
          <DialogDescription>
            This is what a new member sees when they first visit Profile Settings.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-4 flex-wrap">
          <Button size="sm" variant={step === 'welcome' ? 'default' : 'outline'} onClick={() => setStep('welcome')}>
            Step 1: Welcome
          </Button>
          <Button size="sm" variant={step === 'claim-auto' ? 'default' : 'outline'} onClick={() => setStep('claim-auto')}>
            Auto-Detected
          </Button>
          <Button size="sm" variant={step === 'claim-manual' ? 'default' : 'outline'} onClick={() => setStep('claim-manual')}>
            Manual Search
          </Button>
          <Button size="sm" variant={step === 'claimed' ? 'default' : 'outline'} onClick={() => setStep('claimed')}>
            After Claiming
          </Button>
        </div>

        <div className="border rounded-lg p-4 bg-muted/20 space-y-4">
          <p className="text-xs text-muted-foreground italic">Preview — this is read-only</p>

          {/* Step 1: Welcome Card */}
          {step === 'welcome' && (
            <>
              <Card className="border-accent bg-accent/10">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    👋 Welcome! Let's Get You Set Up
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Your family group lead may have already entered some of your information. Here's what you need to do:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li><strong>Claim your profile</strong> — select your family group and find your name to link your account.</li>
                    <li><strong>Verify your email</strong> — make sure your email address is correct. If it's missing, please add it.</li>
                    <li><strong>Check your phone number</strong> — add or update it if you'd like. <span className="italic">Phone numbers are optional</span> but helpful for reservation reminders.</li>
                    <li><strong>Save your changes</strong> — click "Save Profile Changes" when you're done.</li>
                  </ol>
                </CardContent>
              </Card>

              <Card className="border-primary/50 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Claim Your Profile
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-2">
                    <Search className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        We couldn't automatically detect your profile.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Click <strong>Search & Claim</strong> to find and link your account to your family group member profile.
                      </p>
                    </div>
                  </div>
                  <Button className="mt-4 flex items-center gap-2" disabled>
                    <Search className="h-4 w-4" />
                    Search & Claim Profile
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {/* Auto-detected flow */}
          {step === 'claim-auto' && (
            <Card className="border-primary/50 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Confirm Your Profile
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      We detected your profile based on your email! Your information has been auto-populated below.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Click <strong>Claim Profile</strong> to permanently link your account to this family group member.
                    </p>
                  </div>
                </div>
                <Button className="mt-4 flex items-center gap-2" disabled>
                  <UserPlus className="h-4 w-4" />
                  Claim Profile
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Manual search flow */}
          {step === 'claim-manual' && (
            <Card className="border-primary/50 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Claim Your Profile
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-2">
                  <Search className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      We couldn't automatically detect your profile.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Click <strong>Search & Claim</strong> to find and link your account to your family group member profile.
                    </p>
                  </div>
                </div>
                <Button className="mt-4 flex items-center gap-2" disabled>
                  <Search className="h-4 w-4" />
                  Search & Claim Profile
                </Button>
              </CardContent>
            </Card>
          )}

          {/* After claiming */}
          {step === 'claimed' && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-green-800">
                  <CheckCircle2 className="h-5 w-5" />
                  Profile Linked Successfully
                </CardTitle>
              </CardHeader>
              <CardContent className="text-green-700">
                <p className="text-sm mb-4">
                  Your account is linked to <strong>Cook Family</strong>.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
