import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLocation } from 'react-router-dom';

interface ContextualSuggestionsProps {
  onSuggestionClick: (suggestion: string) => void;
  className?: string;
}

export const ContextualSuggestions: React.FC<ContextualSuggestionsProps> = ({
  onSuggestionClick,
  className = ""
}) => {
  const location = useLocation();

  const getContextualSuggestions = (pathname: string) => {
    const suggestions: Record<string, string[]> = {
      '/': [
        'What am I seeing on this dashboard?',
        'Explain the performance metrics',
        'What are these alerts about?',
        'Show me system status'
      ],
      '/analytics': [
        'Generate a performance report',
        'Show fertility trends',
        'Compare house performance',
        'Analyze batch status'
      ],
      '/process-flow': [
        'Explain this workflow',
        'What stages are shown?',
        'How do batches move through?',
        'Show me bottlenecks'
      ],
      '/comparison-model': [
        'Compare flock performance',
        'Show breed differences',
        'Analyze unit efficiency',
        'Compare time periods'
      ],
      '/data-entry': [
        'How do I enter data here?',
        'What fields are required?',
        'Show data validation rules',
        'Explain these metrics'
      ],
      '/management': [
        'How do I manage users?',
        'Configure system settings',
        'Set up notifications',
        'Manage permissions'
      ]
    };

    return suggestions[pathname] || [
      'What can I help you with?',
      'Explain what I\'m looking at',
      'Show me key insights',
      'Help me understand this page'
    ];
  };

  const suggestions = getContextualSuggestions(location.pathname);
  const pageNames: Record<string, string> = {
    '/': 'Dashboard',
    '/analytics': 'Analytics',
    '/process-flow': 'Process Flow',
    '/comparison-model': 'Comparison',
    '/data-entry': 'Data Entry',
    '/management': 'Management'
  };

  const currentPageName = pageNames[location.pathname] || 'Current Page';

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Quick help for:</span>
        <Badge variant="secondary" className="text-xs">
          {currentPageName}
        </Badge>
      </div>
      <div className="grid gap-2">
        {suggestions.map((suggestion, index) => (
          <Button
            key={index}
            variant="ghost"
            onClick={() => onSuggestionClick(suggestion)}
            className="justify-start h-auto py-2 px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/30"
          >
            {suggestion}
          </Button>
        ))}
      </div>
    </div>
  );
};