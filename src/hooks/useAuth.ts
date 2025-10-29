import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UserProfile {
  id: string;
  company_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
  status: string;
}

export interface UserRole {
  role: 'company_admin' | 'operations_head' | 'staff';
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user profile and roles
          setTimeout(async () => {
            await fetchUserProfile(session.user.id);
            await fetchUserRoles(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
        }
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserProfile(session.user.id);
        fetchUserRoles(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchUserRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) throw error;
      setRoles(data || []);
    } catch (error) {
      console.error('Error fetching user roles:', error);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: firstName,
            last_name: lastName,
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Account created successfully",
        description: "Please check your email to verify your account.",
      });

      return { error: null };
    } catch (error: any) {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "Welcome back!",
        description: "You have been signed in successfully.",
      });

      return { error: null };
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Sign out failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const createDefaultAdmin = async () => {
    // Skip if we've already attempted and failed
    const hasTriedCreation = localStorage.getItem('admin_creation_attempted');
    if (hasTriedCreation) {
      return { error: null };
    }

    try {
      // Check if any users exist
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id')
        .limit(1);
        
      if (profiles && profiles.length > 0) {
        // Users already exist, skip creation
        return { error: null };
      }
      
      // Use a proper email format for local development
      const { error } = await supabase.auth.signUp({
        email: 'admin@hatchery.local',
        password: 'admin123',
        options: {
          data: {
            first_name: 'Default',
            last_name: 'Admin',
          }
        }
      });
      
      if (error) {
        // Mark that we've attempted creation to avoid repeated failures
        localStorage.setItem('admin_creation_attempted', 'true');
        if (!error.message.includes('already been registered') && !error.message.includes('invalid')) {
          throw error;
        }
      }
      
      return { error: null };
    } catch (error: any) {
      // Mark attempt and prevent future attempts
      localStorage.setItem('admin_creation_attempted', 'true');
      // Only log truly unexpected errors
      if (!error.message?.includes('already been registered') && !error.message?.includes('invalid')) {
        console.error('Error creating default admin:', error);
      }
      return { error };
    }
  };

  const hasRole = (role: 'company_admin' | 'operations_head' | 'staff') => {
    return roles.some(r => r.role === role);
  };

  const isAdmin = () => hasRole('company_admin');
  const isOperationsHead = () => hasRole('operations_head');
  const isStaff = () => hasRole('staff');

  return {
    user,
    session,
    profile,
    roles,
    loading,
    signUp,
    signIn,
    signOut,
    createDefaultAdmin,
    hasRole,
    isAdmin,
    isOperationsHead,
    isStaff,
  };
};