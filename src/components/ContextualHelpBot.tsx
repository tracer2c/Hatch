import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useContextualHelp } from '@/hooks/useContextualHelp';
import { useHelpContext } from '@/contexts/HelpContext';
import { EnhancedMessageFormatter } from '@/components/chat/EnhancedMessageFormatter';
import { ContextualSuggestions } from '@/components/chat/ContextualSuggestions';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const ContextualHelpBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hi! I\'m your hatchery assistant. I can help explain features, data, and answer questions about what you\'re looking at. What would you like to know?',
      timestamp: new Date(),
    }
  ]);
  
  const { sendMessage, isLoading, currentPageContext } = useContextualHelp();
  const { contextData } = useHelpContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');

    try {
      // Send last 4 messages as history for context
      const recentHistory = messages.slice(-4).map(m => ({ role: m.role, content: m.content }));
      const response = await sendMessage(textToSend, contextData, recentHistory);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuestionClick = (question: string) => {
    handleSendMessage(question);
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground"
          size="sm"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Card className={cn(
        "w-[420px] transition-all duration-300 ease-in-out shadow-xl border-border/20",
        isMinimized ? "h-12" : "h-[500px]"
      )}>
        <CardHeader className="flex flex-row items-center justify-between p-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Hatchery Assistant</span>
            {currentPageContext && (
              <Badge variant="secondary" className="text-xs">
                {currentPageContext}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-6 w-6 p-0"
            >
              <Minimize2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>

        {!isMinimized && (
          <CardContent className="p-0 flex flex-col h-[456px]">
            <ScrollArea className="flex-1 p-3">
              {messages.length === 0 ? (
                <div className="space-y-4">
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-4">
                      Hi! I can help explain features, data, and answer questions about what you're looking at.
                    </p>
                  </div>
                  <ContextualSuggestions onSuggestionClick={handleQuestionClick} />
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex flex-col gap-2",
                        message.role === 'user' ? "items-end" : "items-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] rounded-lg px-4 py-3 text-sm break-words",
                          message.role === 'user'
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted/50 border rounded-bl-sm"
                        )}
                      >
                        {message.role === 'user' ? (
                          <p className="text-sm leading-relaxed">{message.content}</p>
                        ) : (
                          <EnhancedMessageFormatter
                            content={message.content}
                            onQuestionClick={handleQuestionClick}
                          />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground px-1">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-muted/50 border rounded-lg px-4 py-3 text-sm rounded-bl-sm">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-pulse"></div>
                          <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-pulse delay-100"></div>
                          <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-pulse delay-200"></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div ref={messagesEndRef} />
            </ScrollArea>

            <div className="p-3 border-t bg-background">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about this page or hatchery operations..."
                  className="flex-1 text-sm"
                  disabled={isLoading}
                />
                <Button
                  onClick={() => handleSendMessage()}
                  disabled={!input.trim() || isLoading}
                  size="sm"
                  className="px-3"
                >
                  <Send className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default ContextualHelpBot;