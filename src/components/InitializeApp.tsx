import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface InitializeAppProps {
  children: React.ReactNode;
}

export default function InitializeApp({ children }: InitializeAppProps) {
  const { createDefaultAdmin, loading } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      // Create default admin user if it doesn't exist
      await createDefaultAdmin();
      setIsInitialized(true);
    };

    if (!loading) {
      initializeApp();
    }
  }, [loading, createDefaultAdmin]);

  if (loading || !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Initializing application...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}