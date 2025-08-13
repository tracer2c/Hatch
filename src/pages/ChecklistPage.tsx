import React from 'react';
import { useParams } from 'react-router-dom';
import Navigation from "@/components/Navigation";
import DailyChecklist from "@/components/dashboard/DailyChecklist";
import { CheckSquare } from "lucide-react";

const ChecklistPage = () => {
  const { batchId } = useParams();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <Navigation />
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <CheckSquare className="h-8 w-8" />
            Daily Checklist
          </h1>
          <p className="text-gray-600 text-lg">
            Track and complete daily incubation tasks and procedures
          </p>
        </div>

        {/* Checklist Interface */}
        <DailyChecklist selectedBatchId={batchId} />
      </div>
    </div>
  );
};

export default ChecklistPage;