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

  const signIn = async (email: string, password: string) => {
    console.log('SignIn function called with email:', email);
    
    // TEMPORARY: Bypass authentication for development
    if (!email && !password) {
      // Simulate successful anonymous login
      const mockUser = {
        id: 'temp-user-id',
        email: 'guest@example.com',
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
      
      // Update state directly and persist to localStorage
      setUser(mockUser);
      setSession(mockSession);
      
      // Store in localStorage for persistence across page reloads
      localStorage.setItem('supabase.auth.token', JSON.stringify(mockSession));
      localStorage.setItem('mock-auth-user', JSON.stringify(mockUser));
      
      console.log('Mock authentication successful');
      return { error: null };
    }
    
    try {
      // If no email/password provided, use anonymous login
      if (!email && !password) {
        const { error } = await supabase.auth.signInAnonymously();
        console.log('Anonymous auth response:', { error });
        return { error };
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('Auth response:', { error });

      if (error) {
        console.error('Detailed error:', error);
        
        // If it's a network error, provide specific guidance
        if (error.message.includes('fetch') || error.message.includes('network')) {
          toast({
            title: "Network Error",
            description: "Try disabling ad blockers, switching browsers, or using incognito mode.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Sign In Error", 
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        console.log('Sign in successful');
      }

      return { error };
    } catch (catchError) {
      console.error('Caught error during sign in:', catchError);
      toast({
        title: "Connection Error",
        description: "Cannot reach authentication server. Check your internet connection or try a different browser.",
        variant: "destructive",
      });
      return { error: catchError };
    }
  };

  const signOut = async () => {
    // Clear mock authentication data
    localStorage.removeItem('mock-auth-user');
    localStorage.removeItem('supabase.auth.token');
    
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Sign Out Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Redirect to login page after successful logout
      window.location.href = '/login';
    }
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