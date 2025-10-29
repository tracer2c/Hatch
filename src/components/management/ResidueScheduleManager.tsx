import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, AlertTriangle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, format, parseISO } from 'date-fns';

interface ResidueSchedule {
  id: string;
  batch_id: string;
  scheduled_date: string;
  due_date: string;
  status: 'pending' | 'completed' | 'overdue';
  completed_at?: string;
  completed_by?: string;
  notes?: string;
  batch: {
    batch_number: string;
    set_date: string;
    flock: {
      flock_name: string;
    };
  };
}

export const ResidueScheduleManager = () => {
  const [schedules, setSchedules] = useState<ResidueSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'overdue' | 'completed'>('all');
  const { toast } = useToast();

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('residue_analysis_schedule')
        .select(`
          *,
          batch:batches(
            batch_number,
            set_date,
            flock:flocks(flock_name)
          )
        `)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;

      // Update overdue status
      const today = new Date().toISOString().split('T')[0];
      const updatedSchedules = data.map(schedule => ({
        ...schedule,
        status: (schedule.status === 'pending' && schedule.due_date < today ? 'overdue' : schedule.status) as 'pending' | 'completed' | 'overdue'
      }));

      setSchedules(updatedSchedules);
    } catch (error) {
      console.error('Error loading schedules:', error);
      toast({
        title: "Error loading schedules",
        description: "Failed to load residue analysis schedules",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const markCompleted = async (scheduleId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('residue_analysis_schedule')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: user.id
        })
        .eq('id', scheduleId);

      if (error) throw error;

      toast({
        title: "Analysis completed",
        description: "Residue analysis has been marked as completed"
      });

      loadSchedules();
    } catch (error) {
      console.error('Error marking completed:', error);
      toast({
        title: "Error updating status",
        description: "Failed to mark analysis as completed",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string, dueDate: string) => {
    const daysUntilDue = differenceInDays(parseISO(dueDate), new Date());
    
    switch (status) {
      case 'completed':
        return 'default';
      case 'overdue':
        return 'destructive';
      case 'pending':
        return daysUntilDue <= 1 ? 'secondary' : 'outline';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'overdue':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const filteredSchedules = schedules.filter(schedule => {
    if (filter === 'all') return true;
    return schedule.status === filter;
  });

  const stats = {
    total: schedules.length,
    pending: schedules.filter(s => s.status === 'pending').length,
    overdue: schedules.filter(s => s.status === 'overdue').length,
    completed: schedules.filter(s => s.status === 'completed').length
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p>Loading schedules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Residue Analysis Schedule</h2>
        <p className="text-muted-foreground">Track scheduled and completed residue analyses</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-destructive">{stats.overdue}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        {['all', 'pending', 'overdue', 'completed'].map((filterOption) => (
          <Button
            key={filterOption}
            variant={filter === filterOption ? 'default' : 'outline'}
            onClick={() => setFilter(filterOption as any)}
            size="sm"
          >
            {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
          </Button>
        ))}
      </div>

      {/* Schedules Table */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch</TableHead>
                <TableHead>Flock</TableHead>
                <TableHead>Set Date</TableHead>
                <TableHead>Scheduled Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSchedules.map((schedule) => {
                const daysUntilDue = differenceInDays(parseISO(schedule.due_date), new Date());
                
                return (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-medium">
                      {schedule.batch.batch_number}
                    </TableCell>
                    <TableCell>{schedule.batch.flock.flock_name}</TableCell>
                    <TableCell>{format(parseISO(schedule.batch.set_date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>{format(parseISO(schedule.scheduled_date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {format(parseISO(schedule.due_date), 'MMM dd, yyyy')}
                        {schedule.status === 'pending' && daysUntilDue <= 1 && (
                          <Badge variant="secondary" className="text-xs">
                            {daysUntilDue === 0 ? 'Due Today' : `${Math.abs(daysUntilDue)} days overdue`}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(schedule.status, schedule.due_date)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(schedule.status)}
                          {schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1)}
                        </div>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {schedule.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => markCompleted(schedule.id)}
                          >
                            Mark Complete
                          </Button>
                        )}
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {filteredSchedules.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No {filter !== 'all' ? filter : ''} schedules found.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};