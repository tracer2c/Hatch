import React, { createContext, useContext, useState, ReactNode } from 'react';

interface HelpContextData {
  activePage: string;
  activeTab?: string;
  visibleCharts?: string[];
  selectedFilters?: Record<string, any>;
  currentMetrics?: Record<string, any>;
  visibleElements?: string[];
}

interface HelpContextType {
  contextData: HelpContextData;
  updateContext: (data: Partial<HelpContextData>) => void;
  clearContext: () => void;
}

const HelpContext = createContext<HelpContextType | undefined>(undefined);

export const HelpProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [contextData, setContextData] = useState<HelpContextData>({
    activePage: 'Dashboard Overview'
  });

  const updateContext = (data: Partial<HelpContextData>) => {
    setContextData(prev => ({ ...prev, ...data }));
  };

  const clearContext = () => {
    setContextData({ activePage: 'Dashboard Overview' });
  };

  return (
    <HelpContext.Provider value={{ contextData, updateContext, clearContext }}>
      {children}
    </HelpContext.Provider>
  );
};

export const useHelpContext = () => {
  const context = useContext(HelpContext);
  if (context === undefined) {
    // Fallback to a no-op context to avoid crashes if provider isn't mounted yet
    const defaultValue: HelpContextType = {
      contextData: { activePage: 'Application' },
      updateContext: () => {},
      clearContext: () => {},
    };
    return defaultValue;
  }
  return context;
};