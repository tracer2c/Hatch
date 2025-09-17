import React from 'react';
import { useParams } from 'react-router-dom';
import DailyChecklist from "@/components/dashboard/DailyChecklist";

const ChecklistPage = () => {
  const { houseId } = useParams();

  return (
    <div className="p-6">
      <DailyChecklist selectedBatchId={houseId} />
    </div>
  );
};

export default ChecklistPage;