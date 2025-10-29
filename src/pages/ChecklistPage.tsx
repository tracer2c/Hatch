import React from 'react';
import { useParams } from 'react-router-dom';
import DailyChecklist from "@/components/dashboard/DailyChecklist";

const ChecklistPage = () => {
  const { batchId } = useParams();

  return (
    <div className="p-6">
      <DailyChecklist selectedBatchId={batchId} />
    </div>
  );
};

export default ChecklistPage;