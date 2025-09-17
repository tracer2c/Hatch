import React from 'react';
import { QuestionButtons } from './QuestionButtons';

interface EnhancedMessageFormatterProps {
  content: string | any;
  onQuestionClick?: (question: string) => void;
  className?: string;
}

export const EnhancedMessageFormatter: React.FC<EnhancedMessageFormatterProps> = ({
  content,
  onQuestionClick,
  className = ""
}) => {
  if (typeof content !== 'string') {
    return <div className={className}>{JSON.stringify(content)}</div>;
  }

  // Extract numbered questions/options from the response
  const extractQuestions = (text: string): string[] => {
    const patterns = [
      // Pattern: "1. Option text 2. Another option"
      /(\d+\.\s*[^.]+?)(?=\s*\d+\.\s*|\s*$)/g,
      // Pattern: "- Option text"  
      /^[-•]\s*(.+)$/gm
    ];

    for (const pattern of patterns) {
      const matches = Array.from(text.matchAll(pattern));
      if (matches.length >= 2) {
        return matches.map(match => 
          match[1] ? match[1].trim() : match[0].replace(/^(\d+\.|-|•)\s*/, '').trim()
        ).filter(q => q.length > 0);
      }
    }
    return [];
  };

  const questions = extractQuestions(content);
  
  // Remove the numbered questions from the main content if they exist
  let mainContent = content;
  if (questions.length > 0) {
    // Remove numbered list pattern if found
    mainContent = content.replace(/(\d+\.\s*[^.]+?)(?=\s*\d+\.\s*|\s*$)/g, '').trim();
    if (!mainContent) {
      // If content was mostly questions, keep a shortened version
      mainContent = content.split(/\d+\./)[0].trim() || "What would you like to know about?";
    }
  }

  const formatInlineText = (text: string) => {
    return text.split(/(\*\*[^**]+\*\*)/).map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-semibold text-foreground">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  const formatMessage = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    
    return lines.map((line, index) => {
      const trimmedLine = line.trim();
      
      // Headers
      if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
        return (
          <h3 key={index} className="font-semibold text-lg text-foreground mb-2">
            {trimmedLine.slice(2, -2)}
          </h3>
        );
      }
      
      // Bullet points
      if (trimmedLine.match(/^[-•*]\s/)) {
        return (
          <div key={index} className="flex items-start gap-2 mb-1">
            <span className="text-primary mt-1.5 text-xs">•</span>
            <span className="flex-1 text-sm leading-relaxed">
              {formatInlineText(trimmedLine.substring(2))}
            </span>
          </div>
        );
      }
      
      // Numbered lists (if not converted to buttons)
      if (trimmedLine.match(/^\d+\.\s/)) {
        return (
          <div key={index} className="flex items-start gap-2 mb-1">
            <span className="text-primary font-medium text-sm mt-0.5">
              {trimmedLine.match(/^\d+/)?.[0]}.
            </span>
            <span className="flex-1 text-sm leading-relaxed">
              {formatInlineText(trimmedLine.replace(/^\d+\.\s/, ''))}
            </span>
          </div>
        );
      }
      
      // Regular paragraphs
      return (
        <p key={index} className="text-sm leading-relaxed mb-2 last:mb-0">
          {formatInlineText(trimmedLine)}
        </p>
      );
    });
  };

  return (
    <div className={className}>
      <div className="prose prose-sm max-w-none">
        {formatMessage(mainContent)}
      </div>
      
      {questions.length > 0 && onQuestionClick && (
        <QuestionButtons
          questions={questions}
          onQuestionClick={onQuestionClick}
          className="mt-3"
        />
      )}
    </div>
  );
};
