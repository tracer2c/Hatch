
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import HouseManager from "@/components/dashboard/HouseManager";
import DataTypeSelection from "@/components/dashboard/DataTypeSelection";

const DataEntryPage = () => {
  const { houseId } = useParams<{ houseId?: string }>();
  const [selectedHouseId, setSelectedHouseId] = useState<string | null>(null);

  // Auto-select house if houseId is in URL
  useEffect(() => {
    if (houseId) {
      setSelectedHouseId(houseId);
    }
  }, [houseId]);

  const handleHouseSelect = (houseId: string) => {
    setSelectedHouseId(houseId);
  };

  const handleBackToHouseSelection = () => {
    setSelectedHouseId(null);
  };

  // If a house is selected, show the data type selection
  if (selectedHouseId) {
    return (
      <div className="p-6">
        <DataTypeSelection 
          houseId={selectedHouseId} 
          onBack={handleBackToHouseSelection}
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <HouseManager 
        onHouseSelect={handleHouseSelect}
        selectedHouse={selectedHouseId}
      />
    </div>
  );
};

export default DataEntryPage;
