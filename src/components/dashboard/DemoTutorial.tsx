
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, ChevronLeft, ChevronRight, Play, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface DemoStep {
  id: string;
  title: string;
  description: string;
  target: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

interface DemoTutorialProps {
  steps: DemoStep[];
  isActive: boolean;
  onClose: () => void;
  pageName: string;
}

const DemoTutorial = ({ steps, isActive, onClose, pageName }: DemoTutorialProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isStarted, setIsStarted] = useState(false);

  if (!isActive) return null;

  const handleStart = () => {
    setIsStarted(true);
    setCurrentStep(0);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setIsStarted(false);
    setCurrentStep(0);
    onClose();
  };

  const currentStepData = steps[currentStep];

  if (!isStarted) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <Card className="w-96 mx-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                {pageName} Demo
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Take a guided tour of the {pageName} page to understand each visualization and feature.
            </p>
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                This demo will highlight different parts of the dashboard and explain what each component does.
              </p>
            </div>
            <div className="flex justify-between items-center">
              <Badge variant="secondary">{steps.length} steps</Badge>
              <Button onClick={handleStart} className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                Start Demo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-30 z-40" />
      
      {/* Highlight target element */}
      <style>
        {`
          [data-demo-id="${currentStepData.target}"] {
            position: relative !important;
            z-index: 45 !important;
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 20px rgba(59, 130, 246, 0.3) !important;
            border-radius: 8px !important;
          }
        `}
      </style>

      {/* Tutorial popup */}
      <div className="fixed z-50 w-80">
        <Card className="shadow-xl border-2 border-blue-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="default">{currentStep + 1}/{steps.length}</Badge>
                <CardTitle className="text-lg">{currentStepData.title}</CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">{currentStepData.description}</p>
            
            <div className="flex justify-between items-center">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              
              <Button 
                onClick={handleNext}
                size="sm"
                className="flex items-center gap-1"
              >
                {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
                {currentStep !== steps.length - 1 && <ChevronRight className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default DemoTutorial;
