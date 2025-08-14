import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  checkOrganizationStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const checkOrganizationStatus = async () => {
    const currentUser = user || session?.user;
    if (!currentUser) return;
    
    const currentPath = window.location.pathname;
    
    // Don't check organization status if user is on setup pages or onboarding
    if (currentPath === '/setup' || currentPath === '/onboarding' || currentPath === '/manage-organizations' || currentPath.startsWith('/family-') || currentPath.startsWith('/financial-') || currentPath.startsWith('/reservation-')) {
      return;
    }
    
    try {
      const { data: organizations, error } = await supabase.rpc('get_user_organizations');
      
      if (error) {
        return;
      }

      // Handle different organization scenarios
      if (!organizations || organizations.length === 0) {
        // No organizations - redirect to onboarding
        if (currentPath !== '/onboarding') {
          window.location.href = '/onboarding';
        }
      } else if (organizations.length > 1) {
        // Multiple organizations - redirect to selection
        if (currentPath !== '/manage-organizations') {
          window.location.href = '/manage-organizations';
        }
      }
    } catch (error) {
      // Silently handle error in production
      if (process.env.NODE_ENV === 'development') {
        console.error('Error checking organization status:', error);
      }
    }
  };

  useEffect(() => {
    // Clear any mock authentication data
    localStorage.removeItem('mock-auth-user');
    localStorage.removeItem('mock-auth-token');

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        // Don't trigger organization check immediately on page load
        // Only check when explicitly signing in
        if (event === 'SIGNED_IN' && session?.user) {
          // Only redirect if user is not already navigating to setup or organization pages
          const currentPath = window.location.pathname;
          if (currentPath !== '/setup' && currentPath !== '/onboarding' && currentPath !== '/manage-organizations' && !currentPath.startsWith('/family-') && !currentPath.startsWith('/financial-') && !currentPath.startsWith('/reservation-')) {
            setTimeout(() => {
              checkOrganizationStatus();
            }, 500);
          }
        }
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, metadata?: any) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: metadata
      }
    });

    if (error) {
      toast({
        title: "Sign Up Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Check your email",
        description: "We've sent you a confirmation link to complete your registration.",
      });
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Sign In Error",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      if (data.user && data.session) {
        toast({
          title: "Welcome back!",
          description: "Successfully signed in.",
        });
        
        // Check organization status after successful login
        setTimeout(() => {
          checkOrganizationStatus();
        }, 500);
        
        return { error: null };
      }

      return { error: new Error('No user data returned') };
    } catch (error: any) {
      toast({
        title: "Connection Error",
        description: "Unable to connect to authentication service. Please check your connection.",
        variant: "destructive",
      });
      return { error };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast({
          title: "Reset Password Error",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      toast({
        title: "Check your email",
        description: "We've sent you a password reset link.",
      });
      return { error: null };
    } catch (error: any) {
      toast({
        title: "Connection Error",
        description: "Unable to send reset email. Please try again.",
        variant: "destructive",
      });
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      // Handle error silently in production
      if (error && process.env.NODE_ENV === 'development') {
        console.error('Sign out error:', error);
      }
    } catch (error) {
      // Handle error silently in production
      if (process.env.NODE_ENV === 'development') {
        console.error('Sign out failed:', error);
      }
    }
    
    // Always clear state and redirect
    setUser(null);
    setSession(null);
    window.location.href = '/login';
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    checkOrganizationStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};