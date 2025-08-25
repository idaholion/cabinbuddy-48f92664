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
      console.log('🔐 NUCLEAR OPTION: Attempting complete auth reset for:', email);
      
      // NUCLEAR OPTION: Complete Supabase reset with global scope
      await supabase.auth.signOut({ scope: 'global' });
      
      // Wait for the signout to fully complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Clear ALL possible storage mechanisms
      console.log('🔐 CLEARING ALL STORAGE COMPLETELY');
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear all cookies
      document.cookie.split(";").forEach(c => {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      
      // Clear IndexedDB if it exists (Supabase might use it)
      if ('indexedDB' in window) {
        try {
          const databases = await indexedDB.databases();
          databases.forEach(db => {
            if (db.name && db.name.includes('supabase')) {
              indexedDB.deleteDatabase(db.name);
            }
          });
        } catch (e) {
          console.log('Could not clear IndexedDB:', e);
        }
      }
      
      console.log('🔐 ATTEMPTING COMPLETELY FRESH LOGIN FOR:', email.trim().toLowerCase());
      
      // Wait a bit more to ensure everything is cleared
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Force a completely fresh auth attempt
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      console.log('🔐 NUCLEAR FRESH LOGIN RESULT:', {
        inputEmail: email.trim().toLowerCase(),
        responseEmail: data.user?.email,
        responseUserId: data.user?.id,
        success: !error,
        errorMessage: error?.message
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
        // CRITICAL VALIDATION
        const expectedEmail = email.trim().toLowerCase();
        const actualEmail = data.user.email;
        
        if (actualEmail !== expectedEmail) {
          console.error('🚨🚨🚨 AUTHENTICATION SYSTEM FAILURE 🚨🚨🚨');
          console.error('🚨 Expected email:', expectedEmail);
          console.error('🚨 Actual email:', actualEmail);
          console.error('🚨 User ID:', data.user.id);
          console.error('🚨 This indicates a serious authentication bug!');
          
          // Force another signout
          await supabase.auth.signOut({ scope: 'global' });
          
          toast({
            title: "Critical Authentication Error",
            description: `Authentication system returned wrong user. Expected: ${expectedEmail}, Got: ${actualEmail}. Please contact support.`,
            variant: "destructive",
          });
          
          return { error: { message: "Authentication system failure" } };
        }
        
        console.log('✅ SUCCESS: Correctly authenticated user:', actualEmail);
        
        toast({
          title: "Welcome back!",
          description: `Successfully signed in as ${actualEmail}`,
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
      
      // Clear ALL auth-related localStorage items
      Object.keys(localStorage).forEach(key => {
        if (key.includes('auth') || key.includes('supabase') || key.includes('sb-')) {
          console.log('🔐 Clearing localStorage key:', key);
          localStorage.removeItem(key);
        }
      });
      
      // Also clear sessionStorage
      Object.keys(sessionStorage).forEach(key => {
        if (key.includes('auth') || key.includes('supabase') || key.includes('sb-')) {
          console.log('🔐 Clearing sessionStorage key:', key);
          sessionStorage.removeItem(key);
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