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
    // AuthContext should only handle authentication, not organization routing
    // Organization-based routing is now handled by RobustOrganizationRoute
    return;
  };

  useEffect(() => {
    // Clear any mock authentication data
    localStorage.removeItem('mock-auth-user');
    localStorage.removeItem('mock-auth-token');
    
    console.log('🔐 AuthProvider initializing...');
    console.log('🔐 Current localStorage keys:', Object.keys(localStorage));
    console.log('🔐 Auth-related localStorage:', Object.keys(localStorage).filter(k => k.includes('auth') || k.includes('supabase')));
    
    // Log all auth-related localStorage items
    Object.keys(localStorage).forEach(key => {
      if (key.includes('auth') || key.includes('supabase')) {
        const value = localStorage.getItem(key);
        console.log(`🔐 localStorage[${key}]:`, value ? value.substring(0, 100) + '...' : value);
      }
    });

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔐 Auth state change:', { 
          event, 
          hasSession: !!session, 
          userId: session?.user?.id,
          userEmail: session?.user?.email,
          userMetadata: session?.user?.user_metadata,
          previousUserId: user?.id,
          previousUserEmail: user?.email,
          timestamp: new Date().toISOString()
        });
        
        // CRITICAL DEBUG: Alert what account is actually logged in
        if (session?.user) {
          console.log('🚨 CRITICAL DEBUG: User logged in as:', session.user.email);
          console.log('🚨 User ID:', session.user.id);
          console.log('🚨 Full user object:', session.user);
        } else {
          console.log('🚨 CRITICAL DEBUG: No user session found');
        }
        
        // Log session details if available
        if (session) {
          console.log('🔐 Session details:', {
            expires_at: session.expires_at,
            token_type: session.token_type,
            user: {
              id: session.user.id,
              email: session.user.email,
              email_confirmed_at: session.user.email_confirmed_at,
              created_at: session.user.created_at,
              user_metadata: session.user.user_metadata
            }
          });
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        // Organization routing is now handled by RobustOrganizationRoute
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔐 Initial session loaded:', {
        hasSession: !!session,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
        userMetadata: session?.user?.user_metadata,
        timestamp: new Date().toISOString()
      });
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, metadata?: any) => {
    try {
      console.log('🔐 SIGNUP ATTEMPT - STEP 1: Creating fresh client');
      console.log('🔐 Input email:', email.trim().toLowerCase());
      
      // Create a completely fresh Supabase client instance for this operation
      const { createClient } = await import('@supabase/supabase-js');
      const freshClient = createClient(
        "https://ftaxzdnrnhktzbcsejoy.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0YXh6ZG5ybmhrdHpiY3Nlam95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTgwNDMsImV4cCI6MjA2OTAzNDA0M30.EqvoCt1QJpe3UWFzbhgS_9EUOzoKw-Ze7BnstPBFdNQ",
        {
          auth: {
            storage: {
              getItem: () => null,    // Always return null for fresh start
              setItem: () => {},      // Don't persist anything
              removeItem: () => {}    // No-op
            },
            persistSession: false,    // Don't persist at all
            autoRefreshToken: false,  // Don't auto-refresh
            detectSessionInUrl: false
          }
        }
      );
      
      console.log('🔐 STEP 2: Fresh client created, attempting signup');
      
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await freshClient.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: metadata
        }
      });

      console.log('🔐 STEP 3: Fresh client signup response');
      console.log('🔐 SUCCESS:', !error);
      console.log('🔐 Input Email:', email.trim().toLowerCase());
      console.log('🔐 Response Email:', data.user?.email || 'null');
      console.log('🔐 Response User ID:', data.user?.id || 'null');
      console.log('🔐 Error:', error?.message || 'none');

      if (error) {
        console.error('🚨 FRESH CLIENT SIGNUP ERROR:', error);
        toast({
          title: "Sign Up Error",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      if (!data.user) {
        console.error('🚨 NO USER DATA RETURNED FROM SIGNUP');
        toast({
          title: "Sign Up Error",
          description: "No user data returned from signup",
          variant: "destructive",
        });
        return { error: { message: "No user data returned" } };
      }

      console.log('✅ FRESH CLIENT SIGNUP SUCCESS for:', data.user.email);
      
      // Verify the email matches what was entered
      if (data.user.email !== email.trim().toLowerCase()) {
        console.error('🚨🚨🚨 EMAIL MISMATCH WITH FRESH CLIENT 🚨🚨🚨');
        console.error('Expected:', email.trim().toLowerCase());
        console.error('Got:', data.user.email);
        
        toast({
          title: "Critical Error",
          description: `Fresh client still returned wrong user. This is a Supabase server-side bug.`,
          variant: "destructive",
        });
        
        return { error: { message: "Supabase server-side authentication failure" } };
      }

      // STEP 4: Now sign the user in with the main client
      console.log('🔐 STEP 4: Signing in user with main client after successful signup');
      
      // Wait a moment for the user to be fully created
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const signInResult = await signIn(email.trim().toLowerCase(), password);
      
      if (signInResult.error) {
        console.error('🚨 AUTO SIGN-IN FAILED AFTER SIGNUP:', signInResult.error);
        toast({
          title: "Account Created - Please Sign In",
          description: `Account created successfully for ${data.user.email}. Please sign in manually.`,
        });
        return { error: null }; // Don't return the sign-in error since signup was successful
      }

      console.log('✅ AUTO SIGN-IN SUCCESSFUL AFTER SIGNUP');
      toast({
        title: "Welcome!",
        description: `Account created and signed in successfully as ${data.user.email}!`,
      });

      return { error: null };
    } catch (error: any) {
      console.error('🔐 Fresh client signup exception:', error);
      toast({
        title: "Sign Up Error",
        description: "Unable to create account with fresh client. Please try again.",
        variant: "destructive",
      });
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 Signing in user:', email.trim().toLowerCase());
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        console.error('🔐 SignIn error:', error);
        toast({
          title: "Sign in failed",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      if (data.user && data.session) {
        console.log('✅ Successfully authenticated user:', data.user.email);
        
        toast({
          title: "Welcome back!",
          description: `Successfully signed in as ${data.user.email}`,
        });
        
        return { error: null };
      }

      console.error('🔐 SignIn failed: No user data returned');
      return { error: new Error('No user data returned') };
    } catch (error: any) {
      console.error('🔐 SignIn exception:', error);
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
      console.log('🔐 Signing out...');
      console.log('🔐 Current user before signout:', user?.email);
      
      const { error } = await supabase.auth.signOut();
      
      // Clear ALL sessionStorage items (including tab-specific ones)
      const tabId = sessionStorage.getItem('tab-id');
      const allKeys = Object.keys(sessionStorage);
      
      allKeys.forEach(key => {
        if (key.includes('auth') || key.includes('supabase') || key.includes('sb-') || 
            (tabId && key.startsWith(tabId)) || key === 'tab-id') {
          console.log('🔐 Clearing sessionStorage key:', key);
          sessionStorage.removeItem(key);
        }
      });
      
      // Also clear any remaining localStorage items for safety
      Object.keys(localStorage).forEach(key => {
        if (key.includes('auth') || key.includes('supabase') || key.includes('sb-')) {
          console.log('🔐 Clearing localStorage key:', key);
          localStorage.removeItem(key);
        }
      });
      
      // Clear all cookies aggressively
      document.cookie.split(";").forEach(c => {
        const cookieName = c.replace(/^ +/, "").replace(/=.*/, "");
        if (cookieName.includes('supabase') || cookieName.includes('sb-') || cookieName.includes('auth')) {
          document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
          document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
        }
      });
      
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
    console.log('🔐 Sign out complete, redirecting...');
    
    // Force a hard refresh to completely clear any cached state
    window.location.replace('/');
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