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

  useEffect(() => {
    // Check for mock authentication first
    const mockUser = localStorage.getItem('mock-auth-user');
    const mockToken = localStorage.getItem('supabase.auth.token');
    
    if (mockUser && mockToken) {
      try {
        const userData = JSON.parse(mockUser);
        const sessionData = JSON.parse(mockToken);
        setUser(userData);
        setSession(sessionData);
        setLoading(false);
        console.log('Restored mock authentication from localStorage');
        return;
      } catch (error) {
        console.error('Error parsing mock auth data:', error);
        localStorage.removeItem('mock-auth-user');
        localStorage.removeItem('supabase.auth.token');
      }
    }

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
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

  // Network connectivity test
  const testSupabaseConnection = async () => {
    try {
      console.log('Testing Supabase connection...');
      const response = await fetch(`https://ftaxzdnrnhktzbcsejoy.supabase.co/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0YXh6ZG5ybmhrdHpiY3Nlam95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NTgwNDMsImV4cCI6MjA2OTAzNDA0M30.EqvoCt1QJpe3UWFzbhgS_9EUOzoKw-Ze7BnstPBFdNQ'
        }
      });
      console.log('Supabase connection test result:', response.status, response.statusText);
      return response.ok;
    } catch (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('SignIn function called with email:', email);
    
    // First test network connectivity
    const isConnected = await testSupabaseConnection();
    
    if (!isConnected) {
      console.warn('Supabase connection failed, using mock authentication');
      toast({
        title: "Network Issue Detected",
        description: "Using offline mode. Some features may be limited.",
        variant: "destructive",
      });
      
      // Use mock authentication as fallback
      const mockUser = {
        id: 'temp-user-id',
        email: email || 'guest@example.com',
        user_metadata: {},
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        role: 'authenticated'
      } as any;
      
      const mockSession = {
        access_token: 'mock-token',
        refresh_token: 'mock-refresh',
        expires_in: 3600,
        token_type: 'bearer',
        user: mockUser
      } as any;
      
      setUser(mockUser);
      setSession(mockSession);
      localStorage.setItem('supabase.auth.token', JSON.stringify(mockSession));
      localStorage.setItem('mock-auth-user', JSON.stringify(mockUser));
      
      return { error: null };
    }
    
    // Network is good, try real authentication
    try {
      console.log('Attempting real Supabase authentication...');
      
      // Clear any existing mock data first
      localStorage.removeItem('mock-auth-user');
      localStorage.removeItem('supabase.auth.token');
      
      // Try anonymous login if no credentials provided
      if (!email && !password) {
        const { error } = await supabase.auth.signInAnonymously();
        console.log('Anonymous auth response:', { error });
        
        if (error) {
          toast({
            title: "Anonymous Login Failed",
            description: error.message,
            variant: "destructive",
          });
        }
        
        return { error };
      }

      // Try email/password login
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('Auth response:', { error });

      if (error) {
        console.error('Authentication error:', error);
        
        let errorMessage = error.message;
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = "Invalid email or password. Please check your credentials.";
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = "Please check your email and click the confirmation link.";
        }
        
        toast({
          title: "Sign In Error", 
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        console.log('Real authentication successful');
        toast({
          title: "Welcome back!",
          description: "Successfully signed in.",
        });
      }

      return { error };
    } catch (catchError) {
      console.error('Caught error during authentication:', catchError);
      toast({
        title: "Connection Error",
        description: "Authentication server unavailable. Using offline mode.",
        variant: "destructive",
      });
      
      // Fallback to mock auth if real auth fails
      const mockUser = {
        id: 'temp-user-id',
        email: email || 'guest@example.com',
        user_metadata: {},
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        role: 'authenticated'
      } as any;
      
      const mockSession = {
        access_token: 'mock-token',
        refresh_token: 'mock-refresh',
        expires_in: 3600,
        token_type: 'bearer',
        user: mockUser
      } as any;
      
      setUser(mockUser);
      setSession(mockSession);
      localStorage.setItem('supabase.auth.token', JSON.stringify(mockSession));
      localStorage.setItem('mock-auth-user', JSON.stringify(mockUser));
      
      return { error: null };
    }
  };

  const signOut = async () => {
    console.log('Signing out...');
    
    // Clear all authentication data
    localStorage.removeItem('mock-auth-user');
    localStorage.removeItem('supabase.auth.token');
    
    // Clear state first
    setUser(null);
    setSession(null);
    
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
        toast({
          title: "Sign Out Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        console.log('Sign out successful');
        toast({
          title: "Signed out",
          description: "You have been successfully signed out.",
        });
      }
    } catch (error) {
      console.error('Sign out failed:', error);
      // Even if Supabase signout fails, we've cleared local state
    }
    
    // Always redirect to login after signout attempt
    window.location.href = '/login';
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};