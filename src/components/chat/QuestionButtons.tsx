import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';

interface QuestionButtonsProps {
  questions: string[];
  onQuestionClick: (question: string) => void;
  className?: string;
}

export const QuestionButtons: React.FC<QuestionButtonsProps> = ({
  questions,
  onQuestionClick,
  className = ""
}) => {
  if (!questions.length) return null;

  return (
    <div className={`space-y-2 mt-3 ${className}`}>
      {questions.map((question, index) => (
        <Button
          key={index}
          variant="outline"
          onClick={() => onQuestionClick(question)}
          className="w-full justify-between text-left h-auto py-2 px-3 text-sm hover:bg-accent/50 border transition-all duration-200"
        >
          <span className="flex-1 text-left">{question}</span>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        </Button>
      ))}
    </div>
  );
};