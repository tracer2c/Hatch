import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface ContextualHelpHook {
  sendMessage: (message: string, uiContext?: any, history?: any[]) => Promise<string>;
  isLoading: boolean;
  currentPageContext: string;
}

const getPageContext = (pathname: string): string => {
  const pageContexts: Record<string, string> = {
    '/': 'Dashboard Overview',
    '/analytics': 'Smart Analytics',
    '/process-flow': 'Process Flow',
    '/comparison-model': 'Comparison Model',
    '/unit-comparison': 'Unit Weekly Comparison',
    '/house-flow': 'House Flow Analysis',
    '/data-entry': 'Data Entry',
    '/checklist': 'Daily Checklist',
    '/management': 'Management',
    '/report': 'Reports',
    '/chat': 'Chat',
    '/performance': 'Performance Analytics'
  };

  // Handle dynamic routes
  if (pathname.includes('/data-entry/house/')) {
    if (pathname.includes('/egg-pack')) return 'Egg Pack Data Entry';
    if (pathname.includes('/fertility')) return 'Fertility Data Entry';
    if (pathname.includes('/qa')) return 'QA Data Entry';
    if (pathname.includes('/residue')) return 'Residue Data Entry';
    return 'House Data Entry';
  }

  if (pathname.includes('/checklist/house/')) {
    return 'House Daily Checklist';
  }

  return pageContexts[pathname] || 'Application';
};

const getPageDescription = (pathname: string): string => {
  const descriptions: Record<string, string> = {
    '/': 'Main dashboard showing overview of hatchery operations, system status, and key performance indicators.',
    '/analytics': 'Smart analytics with AI-powered insights and interactive charts for comprehensive data analysis.',
    '/process-flow': 'Visual representation of the entire hatchery process flow from egg setting to chick delivery.',
    '/comparison-model': 'Advanced comparison tools for analyzing flock performance across houses, units, breeds, and time periods.',
    '/unit-comparison': 'Weekly performance comparison across different units with trend analysis.',
    '/house-flow': 'Sankey flow diagram showing batch progression through different stages of incubation.',
    '/data-entry': 'Data input interface for recording various hatchery metrics and operational data.',
    '/checklist': 'Daily operational checklist for ensuring all routine tasks are completed.',
    '/management': 'System management interface for configuring users, settings, and operational parameters.',
    '/report': 'Comprehensive reporting tools for generating detailed analysis and documentation.',
    '/chat': 'AI-powered chat interface for data queries and advanced analytics.',
    '/performance': 'Performance analytics dashboard with detailed metrics and KPI tracking.'
  };

  if (pathname.includes('/data-entry/house/')) {
    return 'House-specific data entry interface for recording operational metrics and observations.';
  }

  if (pathname.includes('/checklist/house/')) {
    return 'House-specific daily checklist for routine operational tasks and maintenance.';
  }

  return descriptions[pathname] || 'Hatchery management application interface.';
};

export const useContextualHelp = (): ContextualHelpHook => {
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();
  const currentPageContext = getPageContext(location.pathname);

  const sendMessage = async (message: string, uiContext?: any, history?: any[]): Promise<string> => {
    setIsLoading(true);
    
    try {
      const pageContext = getPageContext(location.pathname);
      const pageDescription = getPageDescription(location.pathname);
      
      const { data, error } = await supabase.functions.invoke('contextual-help', {
        body: {
          message,
          pageContext,
          pageDescription,
          currentPath: location.pathname,
          uiContext,
          history: history || []
        }
      });

      if (error) {
        console.error('Error calling contextual-help function:', error);
        throw new Error('Failed to get response from assistant');
      }

      return data.response || 'I apologize, but I couldn\'t process your request. Please try again.';
    } catch (error) {
      console.error('Error in sendMessage:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sendMessage,
    isLoading,
    currentPageContext
  };
};