import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Save, Trash2, Thermometer, Activity, Droplets, RotateCcw, Timer, Scale, AlertTriangle, Building, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface BatchInfo {
  id: string;
  batch_number: string;
  flock_name: string;
  flock_number: number;
  machine_id: string;
  house_number?: string;
}

interface Machine {
  id: string;
  machine_number: string;
  machine_type: string;
  location: string;
  status: string;
}

interface QADataEntryProps {
  data: any[];
  onDataUpdate: (data: any[]) => void;
  batchInfo: BatchInfo;
}

const QADataEntry: React.FC<QADataEntryProps> = ({ data, onDataUpdate, batchInfo }) => {
  const { toast } = useToast();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [currentMachine, setCurrentMachine] = useState<Machine | null>(null);

  useEffect(() => {
    loadMachines();
    loadCurrentMachine();
  }, [batchInfo.machine_id]);

  const loadMachines = async () => {
    const { data: machinesData, error } = await supabase
      .from('machines')
      .select('*')
      .order('machine_number');
    
    if (error) {
      toast({
        title: "Error loading machines",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setMachines(machinesData || []);
    }
  };

  const loadCurrentMachine = async () => {
    if (batchInfo.machine_id) {
      const { data: machineData, error } = await supabase
        .from('machines')
        .select('*')
        .eq('id', batchInfo.machine_id)
        .single();
      
      if (!error && machineData) {
        setCurrentMachine(machineData);
      }
    }
  };

  // Get setter machines for dropdown
  const setterMachines = machines.filter(m => m.machine_type === 'setter' || m.machine_type === 'combo');
  
  // Get location options based on facility setup
  const locationOptions = [
    { value: 'hatcher', label: 'Hatcher (104-106°F)', temp_range: '104-106°F' },
    { value: 'chick_room', label: 'Chick Room (103-105°F)', temp_range: '103-105°F' },
    { value: 'separator_room', label: 'Separator Room (104-106°F)', temp_range: '104-106°F' },
    ...(currentMachine?.location ? [{ 
      value: currentMachine.location.toLowerCase().replace(/\s+/g, '_'), 
      label: `${currentMachine.location} (104-106°F)`, 
      temp_range: '104-106°F' 
    }] : [])
  ];

  // Form states for different sections - with pre-populated flock numbers
  const [setterTemps, setSetterTemps] = useState({
    setterNumber: currentMachine?.machine_number || '',
    leftTopTemp: '',
    leftMiddleTemp: '',
    leftBottomTemp: '',
    rightTopTemp: '',
    rightMiddleTemp: '',
    rightBottomTemp: '',
    checkDate: new Date().toISOString().split('T')[0]
  });

  const [rectalTemps, setRectalTemps] = useState({
    location: 'hatcher',
    temperature: '',
    checkTime: '',
    checkDate: new Date().toISOString().split('T')[0]
  });

  const [trayWashTemps, setTrayWashTemps] = useState({
    firstCheck: '',
    secondCheck: '',
    thirdCheck: '',
    washDate: new Date().toISOString().split('T')[0]
  });

  const [cullChecks, setCullChecks] = useState({
    flockNumber: batchInfo.flock_number.toString(),
    maleCount: '',
    femaleCount: '',
    defectType: '',
    checkDate: new Date().toISOString().split('T')[0]
  });

  const [specificGravity, setSpecificGravity] = useState({
    flockNumber: batchInfo.flock_number.toString(),
    age: '',
    floatPercentage: '',
    testDate: new Date().toISOString().split('T')[0]
  });

  const [setterAngles, setSetterAngles] = useState({
    setterNumber: currentMachine?.machine_number || '',
    topLeft: '',
    midLeft: '',
    bottomLeft: '',
    topRight: '',
    midRight: '',
    bottomRight: '',
    checkDate: new Date().toISOString().split('T')[0]
  });

  const [hatchProgression, setHatchProgression] = useState({
    flockNumber: batchInfo.flock_number.toString(),
    stage: 'A',
    percentageOut: '',
    totalCount: '',
    hatchedCount: '',
    checkHour: '',
    hatchDate: new Date().toISOString().split('T')[0]
  });

  const [moistureLoss, setMoistureLoss] = useState({
    flockNumber: batchInfo.flock_number.toString(),
    day1Weight: '',
    day18Weight: '',
    lossPercentage: '',
    testDate: new Date().toISOString().split('T')[0]
  });

  // Update form states when currentMachine changes
  useEffect(() => {
    if (currentMachine) {
      setSetterTemps(prev => ({ ...prev, setterNumber: currentMachine.machine_number }));
      setSetterAngles(prev => ({ ...prev, setterNumber: currentMachine.machine_number }));
    }
  }, [currentMachine]);

  const handleAddSetterTemp = () => {
    const leftAvg = ((parseFloat(setterTemps.leftTopTemp) + parseFloat(setterTemps.leftMiddleTemp) + parseFloat(setterTemps.leftBottomTemp)) / 3).toFixed(1);
    const rightAvg = ((parseFloat(setterTemps.rightTopTemp) + parseFloat(setterTemps.rightMiddleTemp) + parseFloat(setterTemps.rightBottomTemp)) / 3).toFixed(1);
    
    const newEntry = {
      id: Date.now(),
      type: 'setter_temperature',
      setterNumber: setterTemps.setterNumber,
      leftTemps: {
        top: parseFloat(setterTemps.leftTopTemp),
        middle: parseFloat(setterTemps.leftMiddleTemp),
        bottom: parseFloat(setterTemps.leftBottomTemp),
        average: parseFloat(leftAvg)
      },
      rightTemps: {
        top: parseFloat(setterTemps.rightTopTemp),
        middle: parseFloat(setterTemps.rightMiddleTemp),
        bottom: parseFloat(setterTemps.rightBottomTemp),
        average: parseFloat(rightAvg)
      },
      isWithinRange: parseFloat(leftAvg) >= 99.5 && parseFloat(leftAvg) <= 100.5 && parseFloat(rightAvg) >= 99.5 && parseFloat(rightAvg) <= 100.5,
      checkDate: setterTemps.checkDate,
      timestamp: new Date().toISOString()
    };

    const updatedData = [...data, newEntry];
    onDataUpdate(updatedData);
    
    setSetterTemps({
      setterNumber: currentMachine?.machine_number || '',
      leftTopTemp: '',
      leftMiddleTemp: '',
      leftBottomTemp: '',
      rightTopTemp: '',
      rightMiddleTemp: '',
      rightBottomTemp: '',
      checkDate: new Date().toISOString().split('T')[0]
    });

    toast({
      title: "Setter Temperature Added",
      description: `Added temperature readings for Setter ${newEntry.setterNumber}`,
    });
  };

  const handleAddRectalTemp = () => {
    const temp = parseFloat(rectalTemps.temperature);
    let isWithinRange = false;
    
    switch (rectalTemps.location) {
      case 'hatcher':
        isWithinRange = temp >= 104 && temp <= 106;
        break;
      case 'chick_room':
        isWithinRange = temp >= 103 && temp <= 105;
        break;
      case 'separator_room':
        isWithinRange = temp >= 104 && temp <= 106;
        break;
    }

    const newEntry = {
      id: Date.now(),
      type: 'rectal_temperature',
      location: rectalTemps.location,
      temperature: temp,
      isWithinRange: isWithinRange,
      checkTime: rectalTemps.checkTime,
      checkDate: rectalTemps.checkDate,
      timestamp: new Date().toISOString()
    };

    const updatedData = [...data, newEntry];
    onDataUpdate(updatedData);
    
    setRectalTemps({
      location: 'hatcher',
      temperature: '',
      checkTime: '',
      checkDate: new Date().toISOString().split('T')[0]
    });

    toast({
      title: "Rectal Temperature Added",
      description: `Added ${rectalTemps.location} temperature reading`,
    });
  };

  const handleAddTrayWash = () => {
    const first = parseFloat(trayWashTemps.firstCheck);
    const second = parseFloat(trayWashTemps.secondCheck);
    const third = parseFloat(trayWashTemps.thirdCheck);
    
    const newEntry = {
      id: Date.now(),
      type: 'tray_wash_temperature',
      firstCheck: first,
      secondCheck: second,
      thirdCheck: third,
      allPassed: first >= 140 && second >= 140 && third >= 140,
      washDate: trayWashTemps.washDate,
      timestamp: new Date().toISOString()
    };

    const updatedData = [...data, newEntry];
    onDataUpdate(updatedData);
    
    setTrayWashTemps({
      firstCheck: '',
      secondCheck: '',
      thirdCheck: '',
      washDate: new Date().toISOString().split('T')[0]
    });

    toast({
      title: "Tray Wash Temperatures Added",
      description: `Sanitation check ${newEntry.allPassed ? 'passed' : 'failed'}`,
    });
  };

  const handleAddCullCheck = () => {
    const newEntry = {
      id: Date.now(),
      type: 'cull_check',
      flockNumber: cullChecks.flockNumber,
      maleCount: parseInt(cullChecks.maleCount) || 0,
      femaleCount: parseInt(cullChecks.femaleCount) || 0,
      totalCulls: (parseInt(cullChecks.maleCount) || 0) + (parseInt(cullChecks.femaleCount) || 0),
      defectType: cullChecks.defectType,
      checkDate: cullChecks.checkDate,
      timestamp: new Date().toISOString()
    };

    const updatedData = [...data, newEntry];
    onDataUpdate(updatedData);
    
    setCullChecks({
      flockNumber: batchInfo.flock_number.toString(),
      maleCount: '',
      femaleCount: '',
      defectType: '',
      checkDate: new Date().toISOString().split('T')[0]
    });

    toast({
      title: "Cull Check Added",
      description: `Added cull data for Flock ${newEntry.flockNumber}`,
    });
  };

  const handleAddSpecificGravity = () => {
    const floatPct = parseFloat(specificGravity.floatPercentage);
    const age = parseInt(specificGravity.age);
    const isGoodQuality = (age >= 25 && age <= 40) ? floatPct < 10 : floatPct < 15;
    
    const newEntry = {
      id: Date.now(),
      type: 'specific_gravity',
      flockNumber: specificGravity.flockNumber,
      age: age,
      floatPercentage: floatPct,
      isGoodQuality: isGoodQuality,
      testDate: specificGravity.testDate,
      timestamp: new Date().toISOString()
    };

    const updatedData = [...data, newEntry];
    onDataUpdate(updatedData);
    
    setSpecificGravity({
      flockNumber: batchInfo.flock_number.toString(),
      age: '',
      floatPercentage: '',
      testDate: new Date().toISOString().split('T')[0]
    });

    toast({
      title: "Specific Gravity Test Added",
      description: `Shell quality ${isGoodQuality ? 'good' : 'poor'} for Flock ${newEntry.flockNumber}`,
    });
  };

  const handleAddSetterAngle = () => {
    const angles = {
      topLeft: parseFloat(setterAngles.topLeft) || 0,
      midLeft: parseFloat(setterAngles.midLeft) || 0,
      bottomLeft: parseFloat(setterAngles.bottomLeft) || 0,
      topRight: parseFloat(setterAngles.topRight) || 0,
      midRight: parseFloat(setterAngles.midRight) || 0,
      bottomRight: parseFloat(setterAngles.bottomRight) || 0
    };
    
    const leftAvg = (angles.topLeft + angles.midLeft + angles.bottomLeft) / 3;
    const rightAvg = (angles.topRight + angles.midRight + angles.bottomRight) / 3;
    const isBalanced = Math.abs(leftAvg - rightAvg) <= 5 && leftAvg >= 35 && leftAvg <= 45 && rightAvg >= 35 && rightAvg <= 45;
    
    const newEntry = {
      id: Date.now(),
      type: 'setter_angle',
      setterNumber: setterAngles.setterNumber,
      angles: angles,
      leftAverage: leftAvg,
      rightAverage: rightAvg,
      isBalanced: isBalanced,
      checkDate: setterAngles.checkDate,
      timestamp: new Date().toISOString()
    };

    const updatedData = [...data, newEntry];
    onDataUpdate(updatedData);
    
    setSetterAngles({
      setterNumber: currentMachine?.machine_number || '',
      topLeft: '',
      midLeft: '',
      bottomLeft: '',
      topRight: '',
      midRight: '',
      bottomRight: '',
      checkDate: new Date().toISOString().split('T')[0]
    });

    toast({
      title: "Setter Angle Added",
      description: `Setter ${newEntry.setterNumber} angles ${isBalanced ? 'balanced' : 'need adjustment'}`,
    });
  };

  const handleAddHatchProgression = () => {
    const pctOut = parseFloat(hatchProgression.percentageOut);
    const totalCount = parseInt(hatchProgression.totalCount);
    const hatchedCount = parseInt(hatchProgression.hatchedCount);
    const calculatedPct = totalCount > 0 ? (hatchedCount / totalCount * 100).toFixed(1) : '0';
    
    const newEntry = {
      id: Date.now(),
      type: 'hatch_progression',
      flockNumber: hatchProgression.flockNumber,
      stage: hatchProgression.stage,
      percentageOut: pctOut || parseFloat(calculatedPct),
      totalCount: totalCount,
      hatchedCount: hatchedCount,
      checkHour: parseInt(hatchProgression.checkHour),
      hatchDate: hatchProgression.hatchDate,
      timestamp: new Date().toISOString()
    };

    const updatedData = [...data, newEntry];
    onDataUpdate(updatedData);
    
    setHatchProgression({
      flockNumber: batchInfo.flock_number.toString(),
      stage: 'A',
      percentageOut: '',
      totalCount: '',
      hatchedCount: '',
      checkHour: '',
      hatchDate: new Date().toISOString().split('T')[0]
    });

    toast({
      title: "Hatch Progression Added",
      description: `Added hatch data for Flock ${newEntry.flockNumber}`,
    });
  };

  const handleAddMoistureLoss = () => {
    const day1 = parseFloat(moistureLoss.day1Weight);
    const day18 = parseFloat(moistureLoss.day18Weight);
    const lossPct = moistureLoss.lossPercentage ? parseFloat(moistureLoss.lossPercentage) : ((day1 - day18) / day1 * 100);
    const isOptimal = lossPct >= 10 && lossPct <= 12;
    
    const newEntry = {
      id: Date.now(),
      type: 'moisture_loss',
      flockNumber: moistureLoss.flockNumber,
      day1Weight: day1,
      day18Weight: day18,
      lossPercentage: parseFloat(lossPct.toFixed(2)),
      isOptimal: isOptimal,
      testDate: moistureLoss.testDate,
      timestamp: new Date().toISOString()
    };

    const updatedData = [...data, newEntry];
    onDataUpdate(updatedData);
    
    setMoistureLoss({
      flockNumber: batchInfo.flock_number.toString(),
      day1Weight: '',
      day18Weight: '',
      lossPercentage: '',
      testDate: new Date().toISOString().split('T')[0]
    });

    toast({
      title: "Moisture Loss Added",
      description: `Added moisture loss data for Flock ${newEntry.flockNumber}`,
    });
  };

  const deleteEntry = (id: number) => {
    const updatedData = data.filter(entry => entry.id !== id);
    onDataUpdate(updatedData);
    toast({
      title: "Entry Deleted",
      description: "QA record has been removed",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Quality Assurance Data Entry
          </CardTitle>
          <p className="text-sm text-gray-600">
            Monitor incubation conditions, chick health, and equipment performance
          </p>
          
          {/* Batch Context Header */}
          <div className="mt-4 p-4 bg-muted rounded-lg border">
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Building className="h-4 w-4" />
              Batch Context
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="space-y-1">
                <span className="text-muted-foreground">Batch Number:</span>
                <div className="font-medium">{batchInfo.batch_number}</div>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground">Flock:</span>
                <div className="font-medium">{batchInfo.flock_name} (#{batchInfo.flock_number})</div>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground">House:</span>
                <div className="font-medium">{batchInfo.house_number || 'N/A'}</div>
              </div>
              <div className="space-y-1 flex items-center gap-2">
                <span className="text-muted-foreground">Machine:</span>
                <div className="font-medium flex items-center gap-1">
                  {currentMachine ? (
                    <>
                      <MapPin className="h-3 w-3" />
                      {currentMachine.machine_number} ({currentMachine.location})
                    </>
                  ) : (
                    'Loading...'
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="setter-temps" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
              <TabsTrigger value="setter-temps" className="flex items-center gap-1 text-xs">
                <Thermometer className="h-3 w-3" />
                Setter
              </TabsTrigger>
              <TabsTrigger value="rectal-temps" className="flex items-center gap-1 text-xs">
                <Thermometer className="h-3 w-3" />
                Rectal
              </TabsTrigger>
              <TabsTrigger value="tray-wash" className="flex items-center gap-1 text-xs">
                <Droplets className="h-3 w-3" />
                Wash
              </TabsTrigger>
              <TabsTrigger value="culls" className="flex items-center gap-1 text-xs">
                <AlertTriangle className="h-3 w-3" />
                Culls
              </TabsTrigger>
              <TabsTrigger value="gravity" className="flex items-center gap-1 text-xs">
                <Scale className="h-3 w-3" />
                Gravity
              </TabsTrigger>
              <TabsTrigger value="angles" className="flex items-center gap-1 text-xs">
                <RotateCcw className="h-3 w-3" />
                Angles
              </TabsTrigger>
              <TabsTrigger value="hatch" className="flex items-center gap-1 text-xs">
                <Timer className="h-3 w-3" />
                Hatch
              </TabsTrigger>
              <TabsTrigger value="moisture" className="flex items-center gap-1 text-xs">
                <Droplets className="h-3 w-3" />
                Moisture
              </TabsTrigger>
            </TabsList>

            <TabsContent value="setter-temps" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Setter Temperature Monitoring</CardTitle>
                  <p className="text-sm text-gray-600">Ideal range: 99.5–100.5°F</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="setter-number">Setter Machine</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={setterTemps.setterNumber}
                        onChange={(e) => setSetterTemps({...setterTemps, setterNumber: e.target.value})}
                      >
                        <option value="">Select setter machine</option>
                        {setterMachines.map((machine) => (
                          <option key={machine.id} value={machine.machine_number}>
                            {machine.machine_number} - {machine.location} ({machine.status})
                          </option>
                        ))}
                      </select>
                      {currentMachine && (
                        <p className="text-xs text-muted-foreground">
                          Current batch machine: {currentMachine.machine_number}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="check-date">Check Date</Label>
                      <Input
                        id="check-date"
                        type="date"
                        value={setterTemps.checkDate}
                        onChange={(e) => setSetterTemps({...setterTemps, checkDate: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="font-medium">Left Side Temperatures (°F)</h4>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor="left-top">Top</Label>
                          <Input
                            id="left-top"
                            type="number"
                            step="0.1"
                            value={setterTemps.leftTopTemp}
                            onChange={(e) => setSetterTemps({...setterTemps, leftTopTemp: e.target.value})}
                            placeholder="100.0"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="left-middle">Middle</Label>
                          <Input
                            id="left-middle"
                            type="number"
                            step="0.1"
                            value={setterTemps.leftMiddleTemp}
                            onChange={(e) => setSetterTemps({...setterTemps, leftMiddleTemp: e.target.value})}
                            placeholder="100.0"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="left-bottom">Bottom</Label>
                          <Input
                            id="left-bottom"
                            type="number"
                            step="0.1"
                            value={setterTemps.leftBottomTemp}
                            onChange={(e) => setSetterTemps({...setterTemps, leftBottomTemp: e.target.value})}
                            placeholder="100.0"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <h4 className="font-medium">Right Side Temperatures (°F)</h4>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor="right-top">Top</Label>
                          <Input
                            id="right-top"
                            type="number"
                            step="0.1"
                            value={setterTemps.rightTopTemp}
                            onChange={(e) => setSetterTemps({...setterTemps, rightTopTemp: e.target.value})}
                            placeholder="100.0"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="right-middle">Middle</Label>
                          <Input
                            id="right-middle"
                            type="number"
                            step="0.1"
                            value={setterTemps.rightMiddleTemp}
                            onChange={(e) => setSetterTemps({...setterTemps, rightMiddleTemp: e.target.value})}
                            placeholder="100.0"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="right-bottom">Bottom</Label>
                          <Input
                            id="right-bottom"
                            type="number"
                            step="0.1"
                            value={setterTemps.rightBottomTemp}
                            onChange={(e) => setSetterTemps({...setterTemps, rightBottomTemp: e.target.value})}
                            placeholder="100.0"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Button onClick={handleAddSetterTemp} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Setter Temperature Reading
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rectal-temps" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Rectal Temperature Monitoring</CardTitle>
                  <p className="text-sm text-gray-600">Monitor chick health post-hatch</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={rectalTemps.location}
                        onChange={(e) => setRectalTemps({...rectalTemps, location: e.target.value})}
                      >
                        {locationOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {currentMachine && (
                        <p className="text-xs text-muted-foreground">
                          Machine location: {currentMachine.location}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="temperature">Temperature (°F)</Label>
                      <Input
                        id="temperature"
                        type="number"
                        step="0.1"
                        value={rectalTemps.temperature}
                        onChange={(e) => setRectalTemps({...rectalTemps, temperature: e.target.value})}
                        placeholder="104.5"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="check-time">Check Time</Label>
                      <Input
                        id="check-time"
                        type="time"
                        value={rectalTemps.checkTime}
                        onChange={(e) => setRectalTemps({...rectalTemps, checkTime: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rectal-date">Date</Label>
                      <Input
                        id="rectal-date"
                        type="date"
                        value={rectalTemps.checkDate}
                        onChange={(e) => setRectalTemps({...rectalTemps, checkDate: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <Button onClick={handleAddRectalTemp} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Rectal Temperature
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tray-wash" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tray Wash Temperature Validation</CardTitle>
                  <p className="text-sm text-gray-600">Must be &gt;140°F to kill pathogens</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first-check">1st Check (°F)</Label>
                      <Input
                        id="first-check"
                        type="number"
                        step="0.1"
                        value={trayWashTemps.firstCheck}
                        onChange={(e) => setTrayWashTemps({...trayWashTemps, firstCheck: e.target.value})}
                        placeholder="145.0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="second-check">2nd Check (°F)</Label>
                      <Input
                        id="second-check"
                        type="number"
                        step="0.1"
                        value={trayWashTemps.secondCheck}
                        onChange={(e) => setTrayWashTemps({...trayWashTemps, secondCheck: e.target.value})}
                        placeholder="145.0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="third-check">3rd Check (°F)</Label>
                      <Input
                        id="third-check"
                        type="number"
                        step="0.1"
                        value={trayWashTemps.thirdCheck}
                        onChange={(e) => setTrayWashTemps({...trayWashTemps, thirdCheck: e.target.value})}
                        placeholder="145.0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="wash-date">Wash Date</Label>
                      <Input
                        id="wash-date"
                        type="date"
                        value={trayWashTemps.washDate}
                        onChange={(e) => setTrayWashTemps({...trayWashTemps, washDate: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <Button onClick={handleAddTrayWash} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Tray Wash Temperatures
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="culls" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Cull Checks</CardTitle>
                  <p className="text-sm text-gray-600">Track chick defects and culling rates</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="flock-number">Flock Number (Auto-filled)</Label>
                      <Input
                        id="flock-number"
                        value={cullChecks.flockNumber}
                        readOnly
                        className="bg-muted cursor-not-allowed"
                      />
                      <p className="text-xs text-muted-foreground">
                        From batch: {batchInfo.flock_name}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="male-count">Male Culls</Label>
                      <Input
                        id="male-count"
                        type="number"
                        value={cullChecks.maleCount}
                        onChange={(e) => setCullChecks({...cullChecks, maleCount: e.target.value})}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="female-count">Female Culls</Label>
                      <Input
                        id="female-count"
                        type="number"
                        value={cullChecks.femaleCount}
                        onChange={(e) => setCullChecks({...cullChecks, femaleCount: e.target.value})}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="defect-type">Defect Type</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={cullChecks.defectType}
                        onChange={(e) => setCullChecks({...cullChecks, defectType: e.target.value})}
                      >
                        <option value="">Select defect</option>
                        <option value="deformity">Deformity</option>
                        <option value="weak">Weak/Lethargic</option>
                        <option value="injury">Injury</option>
                        <option value="infection">Infection</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cull-date">Check Date</Label>
                      <Input
                        id="cull-date"
                        type="date"
                        value={cullChecks.checkDate}
                        onChange={(e) => setCullChecks({...cullChecks, checkDate: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <Button onClick={handleAddCullCheck} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Cull Check
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="gravity" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Specific Gravity Testing</CardTitle>
                  <p className="text-sm text-gray-600">Eggshell quality assessment (Float % should be &lt;10% for ages 25-40 weeks)</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sg-flock">Flock Number (Auto-filled)</Label>
                      <Input
                        id="sg-flock"
                        value={specificGravity.flockNumber}
                        readOnly
                        className="bg-muted cursor-not-allowed"
                      />
                      <p className="text-xs text-muted-foreground">
                        From batch: {batchInfo.flock_name}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="flock-age">Age (weeks)</Label>
                      <Input
                        id="flock-age"
                        type="number"
                        value={specificGravity.age}
                        onChange={(e) => setSpecificGravity({...specificGravity, age: e.target.value})}
                        placeholder="32"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="float-percentage">Float Percentage</Label>
                      <Input
                        id="float-percentage"
                        type="number"
                        step="0.1"
                        value={specificGravity.floatPercentage}
                        onChange={(e) => setSpecificGravity({...specificGravity, floatPercentage: e.target.value})}
                        placeholder="8.5"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sg-date">Test Date</Label>
                      <Input
                        id="sg-date"
                        type="date"
                        value={specificGravity.testDate}
                        onChange={(e) => setSpecificGravity({...specificGravity, testDate: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <Button onClick={handleAddSpecificGravity} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Specific Gravity Test
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="angles" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Setter Angle Monitoring</CardTitle>
                  <p className="text-sm text-gray-600">Angles should be balanced (35–45°)</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="angle-setter">Setter Machine</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={setterAngles.setterNumber}
                        onChange={(e) => setSetterAngles({...setterAngles, setterNumber: e.target.value})}
                      >
                        <option value="">Select setter machine</option>
                        {setterMachines.map((machine) => (
                          <option key={machine.id} value={machine.machine_number}>
                            {machine.machine_number} - {machine.location} ({machine.status})
                          </option>
                        ))}
                      </select>
                      {currentMachine && (
                        <p className="text-xs text-muted-foreground">
                          Current batch machine: {currentMachine.machine_number}
                        </p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <h4 className="font-medium mb-3">Left Side Angles (°)</h4>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor="top-left">Top Left</Label>
                          <Input
                            id="top-left"
                            type="number"
                            step="0.1"
                            value={setterAngles.topLeft}
                            onChange={(e) => setSetterAngles({...setterAngles, topLeft: e.target.value})}
                            placeholder="42.0"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="mid-left">Mid Left</Label>
                          <Input
                            id="mid-left"
                            type="number"
                            step="0.1"
                            value={setterAngles.midLeft}
                            onChange={(e) => setSetterAngles({...setterAngles, midLeft: e.target.value})}
                            placeholder="43.0"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="bottom-left">Bottom Left</Label>
                          <Input
                            id="bottom-left"
                            type="number"
                            step="0.1"
                            value={setterAngles.bottomLeft}
                            onChange={(e) => setSetterAngles({...setterAngles, bottomLeft: e.target.value})}
                            placeholder="41.0"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <h4 className="font-medium mb-3">Right Side Angles (°)</h4>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor="top-right">Top Right</Label>
                          <Input
                            id="top-right"
                            type="number"
                            step="0.1"
                            value={setterAngles.topRight}
                            onChange={(e) => setSetterAngles({...setterAngles, topRight: e.target.value})}
                            placeholder="40.0"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="mid-right">Mid Right</Label>
                          <Input
                            id="mid-right"
                            type="number"
                            step="0.1"
                            value={setterAngles.midRight}
                            onChange={(e) => setSetterAngles({...setterAngles, midRight: e.target.value})}
                            placeholder="39.0"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="bottom-right">Bottom Right</Label>
                          <Input
                            id="bottom-right"
                            type="number"
                            step="0.1"
                            value={setterAngles.bottomRight}
                            onChange={(e) => setSetterAngles({...setterAngles, bottomRight: e.target.value})}
                            placeholder="38.0"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="angle-date">Check Date</Label>
                      <Input
                        id="angle-date"
                        type="date"
                        value={setterAngles.checkDate}
                        onChange={(e) => setSetterAngles({...setterAngles, checkDate: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <Button onClick={handleAddSetterAngle} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Setter Angle Check
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="hatch" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Hatch Progression Monitoring</CardTitle>
                  <p className="text-sm text-gray-600">Track hatch timing and efficiency</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="hatch-flock">Flock Number (Auto-filled)</Label>
                      <Input
                        id="hatch-flock"
                        value={hatchProgression.flockNumber}
                        readOnly
                        className="bg-muted cursor-not-allowed"
                      />
                      <p className="text-xs text-muted-foreground">
                        From batch: {batchInfo.flock_name}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hatch-stage">Stage</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={hatchProgression.stage}
                        onChange={(e) => setHatchProgression({...hatchProgression, stage: e.target.value})}
                      >
                        <option value="A">Stage A</option>
                        <option value="B">Stage B</option>
                        <option value="C">Stage C</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="total-count">Total Count</Label>
                      <Input
                        id="total-count"
                        type="number"
                        value={hatchProgression.totalCount}
                        onChange={(e) => setHatchProgression({...hatchProgression, totalCount: e.target.value})}
                        placeholder="648"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hatched-count">Hatched Count</Label>
                      <Input
                        id="hatched-count"
                        type="number"
                        value={hatchProgression.hatchedCount}
                        onChange={(e) => setHatchProgression({...hatchProgression, hatchedCount: e.target.value})}
                        placeholder="120"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="check-hour">Check Hour</Label>
                      <Input
                        id="check-hour"
                        type="number"
                        value={hatchProgression.checkHour}
                        onChange={(e) => setHatchProgression({...hatchProgression, checkHour: e.target.value})}
                        placeholder="16"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hatch-date-input">Hatch Date</Label>
                      <Input
                        id="hatch-date-input"
                        type="date"
                        value={hatchProgression.hatchDate}
                        onChange={(e) => setHatchProgression({...hatchProgression, hatchDate: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <Button onClick={handleAddHatchProgression} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Hatch Progression
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="moisture" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Moisture Loss Monitoring</CardTitle>
                  <p className="text-sm text-gray-600">Ideal moisture loss: 10-12%</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="moisture-flock">Flock Number (Auto-filled)</Label>
                      <Input
                        id="moisture-flock"
                        value={moistureLoss.flockNumber}
                        readOnly
                        className="bg-muted cursor-not-allowed"
                      />
                      <p className="text-xs text-muted-foreground">
                        From batch: {batchInfo.flock_name}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="day1-weight">Day 1 Weight (g)</Label>
                      <Input
                        id="day1-weight"
                        type="number"
                        step="0.1"
                        value={moistureLoss.day1Weight}
                        onChange={(e) => setMoistureLoss({...moistureLoss, day1Weight: e.target.value})}
                        placeholder="65.0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="day18-weight">Day 18 Weight (g)</Label>
                      <Input
                        id="day18-weight"
                        type="number"
                        step="0.1"
                        value={moistureLoss.day18Weight}
                        onChange={(e) => setMoistureLoss({...moistureLoss, day18Weight: e.target.value})}
                        placeholder="58.4"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="moisture-date">Test Date</Label>
                      <Input
                        id="moisture-date"
                        type="date"
                        value={moistureLoss.testDate}
                        onChange={(e) => setMoistureLoss({...moistureLoss, testDate: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  {/* Real-time calculation display */}
                  {useMemo(() => {
                    const day1 = parseFloat(moistureLoss.day1Weight);
                    const day18 = parseFloat(moistureLoss.day18Weight);
                    if (day1 && day18) {
                      const calculatedLoss = ((day1 - day18) / day1 * 100);
                      const isOptimal = calculatedLoss >= 10 && calculatedLoss <= 12;
                      const isAcceptable = calculatedLoss >= 8 && calculatedLoss <= 14;
                      
                      return (
                        <div className={`p-3 rounded-lg border-2 ${
                          isOptimal ? 'bg-green-50 border-green-200' :
                          isAcceptable ? 'bg-yellow-50 border-yellow-200' :
                          'bg-red-50 border-red-200'
                        }`}>
                          <div className="text-sm font-medium mb-1">
                            Calculated Moisture Loss: <span className={`text-lg ${
                              isOptimal ? 'text-green-700' :
                              isAcceptable ? 'text-yellow-700' :
                              'text-red-700'
                            }`}>{calculatedLoss.toFixed(2)}%</span>
                          </div>
                          <div className={`text-xs ${
                            isOptimal ? 'text-green-600' :
                            isAcceptable ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {isOptimal ? 'Optimal range (10-12%)' :
                             isAcceptable ? 'Acceptable range (8-14%)' :
                             'Outside acceptable range'}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }, [moistureLoss.day1Weight, moistureLoss.day18Weight])}
                  
                  <Button onClick={handleAddMoistureLoss} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Moisture Loss Data
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Data Display */}
      {data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent QA Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.slice(-10).reverse().map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium capitalize">
                      {entry.type.replace('_', ' ')} Record
                    </div>
                    <div className="text-sm text-gray-600">
                      {entry.checkDate || entry.testDate || entry.hatchDate || entry.washDate} | 
                      {entry.type === 'setter_temperature' && ` Setter ${entry.setterNumber} - Avg: ${entry.leftTemps.average}°F / ${entry.rightTemps.average}°F`}
                      {entry.type === 'rectal_temperature' && ` ${entry.location} - ${entry.temperature}°F`}
                      {entry.type === 'tray_wash_temperature' && ` Wash Temps: ${entry.firstCheck}°F, ${entry.secondCheck}°F, ${entry.thirdCheck}°F`}
                      {entry.type === 'cull_check' && ` Flock ${entry.flockNumber} - ${entry.totalCulls} culls`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(entry.isWithinRange || entry.allPassed || entry.isGoodQuality || entry.isBalanced || entry.isOptimal) && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                        ✓ Good
                      </span>
                    )}
                    {(entry.isWithinRange === false || entry.allPassed === false || entry.isGoodQuality === false || entry.isBalanced === false || entry.isOptimal === false) && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                        ⚠ Alert
                      </span>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteEntry(entry.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default QADataEntry;
