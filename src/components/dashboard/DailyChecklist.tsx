import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useActiveBatches } from "@/hooks/useHouseData";
import { useDailyChecklistItems, useChecklistCompletions, useCompleteChecklistItem, useBatchChecklistProgress } from "@/hooks/useSOPData";
import { useAuth } from "@/hooks/useAuth";
import { CheckCircle, Circle, Calendar, Clock, User, AlertTriangle, CheckSquare } from "lucide-react";

interface DailyChecklistProps {
  selectedBatchId?: string;
}

const DailyChecklist = ({ selectedBatchId }: DailyChecklistProps) => {
  const { data: activeBatches } = useActiveBatches();
  const { profile } = useAuth();
  const [currentBatchId, setCurrentBatchId] = useState(selectedBatchId || '');
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [noteValues, setNoteValues] = useState<Record<string, string>>({});

  // Calculate current day of incubation for selected batch
  const selectedBatch = activeBatches?.find(b => b.id === currentBatchId);
  const dayOfIncubation = selectedBatch ? 
    Math.floor((new Date().getTime() - new Date(selectedBatch.set_date).getTime()) / (1000 * 60 * 60 * 24)) + 1 : 1;

  const { data: checklistItems } = useDailyChecklistItems(dayOfIncubation);
  const { data: completions } = useChecklistCompletions(currentBatchId, dayOfIncubation);
  const { data: progress } = useBatchChecklistProgress(currentBatchId, dayOfIncubation);
  const completeItem = useCompleteChecklistItem();

  const completedItemIds = new Set(completions?.map(c => c.checklist_item_id) || []);

  const handleCompleteItem = async (itemId: string, isCompleted: boolean) => {
    if (!currentBatchId) return;

    if (isCompleted) {
      const notes = noteValues[itemId] || '';
      const completedBy = profile ? `${profile.first_name} ${profile.last_name}`.trim() || profile.email : 'Unknown User';
      
      await completeItem.mutateAsync({
        checklistItemId: itemId,
        batchId: currentBatchId,
        dayOfIncubation,
        completedBy,
        notes
      });
    }
  };

  const toggleNoteExpansion = (itemId: string) => {
    setExpandedNotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const requiredItems = checklistItems?.filter(item => item.is_required) || [];
  const optionalItems = checklistItems?.filter(item => !item.is_required) || [];
  const completedRequired = requiredItems.filter(item => completedItemIds.has(item.id)).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Daily Checklist - Day {dayOfIncubation}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <label className="text-sm font-medium">Select House:</label>
              <Select value={currentBatchId} onValueChange={setCurrentBatchId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose a house" />
                </SelectTrigger>
                <SelectContent>
                  {activeBatches?.map((batch) => (
                    <SelectItem key={batch.id} value={batch.id}>
                      {batch.batch_number} - {batch.flocks?.flock_name} (Day {Math.floor((new Date().getTime() - new Date(batch.set_date).getTime()) / (1000 * 60 * 60 * 24)) + 1})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {currentBatchId && progress && (
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{completedRequired}</div>
                  <div className="text-xs text-muted-foreground">/ {requiredItems.length} Required</div>
                </div>
                <div className="w-32">
                  <Progress value={progress.progressPercent} className="h-2" />
                  <div className="text-xs text-center mt-1">{Math.round(progress.progressPercent)}% Complete</div>
                </div>
                {progress.isComplete && (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Complete
                  </Badge>
                )}
              </div>
            )}
          </div>

          {!currentBatchId && (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Select a house to view today's checklist</p>
            </div>
          )}
        </CardContent>
      </Card>

      {currentBatchId && (
        <>
          {/* Required Items */}
          {requiredItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-5 w-5" />
                  Required Items ({completedRequired}/{requiredItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-96">
                  <div className="space-y-4">
                    {requiredItems.map((item) => {
                      const isCompleted = completedItemIds.has(item.id);
                      const completion = completions?.find(c => c.checklist_item_id === item.id);
                      const isNotesExpanded = expandedNotes.has(item.id);

                      return (
                        <div key={item.id} className="border rounded-lg p-4 hover:bg-muted/50">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={isCompleted}
                              onCheckedChange={(checked) => handleCompleteItem(item.id, !!checked)}
                              className="mt-1"
                            />
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className={`font-medium ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                                  {item.title}
                                </h4>
                                <Badge variant="destructive" className="text-xs">Required</Badge>
                              </div>
                              
                              <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                              
                              {isCompleted && completion && (
                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3 text-green-600" />
                                    Completed
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {new Date(completion.completed_at).toLocaleTimeString()}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {completion.completed_by}
                                  </div>
                                </div>
                              )}

                              {!isCompleted && (
                                <div className="mt-3">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleNoteExpansion(item.id)}
                                    className="text-xs"
                                  >
                                    {isNotesExpanded ? 'Hide' : 'Add'} Notes
                                  </Button>
                                  
                                  {isNotesExpanded && (
                                    <Textarea
                                      value={noteValues[item.id] || ''}
                                      onChange={(e) => setNoteValues(prev => ({ ...prev, [item.id]: e.target.value }))}
                                      placeholder="Add notes or observations..."
                                      className="mt-2"
                                      rows={2}
                                    />
                                  )}
                                </div>
                              )}

                              {completion?.notes && (
                                <div className="mt-2 p-2 bg-muted rounded text-xs">
                                  <strong>Notes:</strong> {completion.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Optional Items */}
          {optionalItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-700">
                  <Circle className="h-5 w-5" />
                  Optional Items ({optionalItems.filter(item => completedItemIds.has(item.id)).length}/{optionalItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-64">
                  <div className="space-y-4">
                    {optionalItems.map((item) => {
                      const isCompleted = completedItemIds.has(item.id);
                      const completion = completions?.find(c => c.checklist_item_id === item.id);
                      const isNotesExpanded = expandedNotes.has(item.id);

                      return (
                        <div key={item.id} className="border rounded-lg p-4 hover:bg-muted/50">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={isCompleted}
                              onCheckedChange={(checked) => handleCompleteItem(item.id, !!checked)}
                              className="mt-1"
                            />
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className={`font-medium ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                                  {item.title}
                                </h4>
                                <Badge variant="outline" className="text-xs">Optional</Badge>
                              </div>
                              
                              <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                              
                              {isCompleted && completion && (
                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3 text-green-600" />
                                    Completed
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {new Date(completion.completed_at).toLocaleTimeString()}
                                  </div>
                                </div>
                              )}

                              {!isCompleted && (
                                <div className="mt-3">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleNoteExpansion(item.id)}
                                    className="text-xs"
                                  >
                                    {isNotesExpanded ? 'Hide' : 'Add'} Notes
                                  </Button>
                                  
                                  {isNotesExpanded && (
                                    <Textarea
                                      value={noteValues[item.id] || ''}
                                      onChange={(e) => setNoteValues(prev => ({ ...prev, [item.id]: e.target.value }))}
                                      placeholder="Add notes or observations..."
                                      className="mt-2"
                                      rows={2}
                                    />
                                  )}
                                </div>
                              )}

                              {completion?.notes && (
                                <div className="mt-2 p-2 bg-muted rounded text-xs">
                                  <strong>Notes:</strong> {completion.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default DailyChecklist;