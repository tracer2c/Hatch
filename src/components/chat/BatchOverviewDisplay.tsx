import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, List } from 'lucide-react';

interface BatchOverviewDisplayProps {
  payload: {
    type: 'batches_overview';
    summary: {
      totals: {
        count: number;
        total_eggs_set: number;
        total_chicks_hatched: number;
        avg_hatch_rate: number;
      };
      by_status: Record<string, number>;
      upcoming_count: number;
      overdue_count: number;
    };
    items: Array<{
      id: string;
      batch_number: string;
      set_date: string;
      expected_hatch_date: string;
      days_since_set: number;
      days_to_hatch: number | null;
      status: string;
      machine_number: string;
      machine_type: string;
      flock_name: string;
      breed: string;
      total_eggs_set: number;
      chicks_hatched: number;
      hatch_rate: number;
    }>;
    params?: any;
  };
  onShowMore?: () => void;
  onDownloadCSV?: () => void;
}

const statusColors = {
  planned: 'bg-muted text-muted-foreground',
  setting: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  incubating: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  hatching: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
};

export const BatchOverviewDisplay: React.FC<BatchOverviewDisplayProps> = ({ 
  payload, 
  onShowMore, 
  onDownloadCSV 
}) => {
  const { summary, items } = payload;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  const getDaysDisplay = (days: number | null) => {
    if (days === null) return 'N/A';
    if (days < 0) return `${Math.abs(days)}d overdue`;
    if (days === 0) return 'Today';
    return `${days}d`;
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{summary.totals.count}</div>
            <div className="text-sm text-muted-foreground">Total Batches</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{summary.totals.total_eggs_set.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Eggs Set</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{summary.totals.total_chicks_hatched.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Chicks Hatched</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{summary.totals.avg_hatch_rate}%</div>
            <div className="text-sm text-muted-foreground">Avg Hatch Rate</div>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown & Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(summary.by_status).map(([status, count]) => (
                <Badge 
                  key={status}
                  variant="secondary"
                  className={statusColors[status as keyof typeof statusColors] || 'bg-muted text-muted-foreground'}
                >
                  {status}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Alerts & Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summary.upcoming_count > 0 && (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-amber-500 rounded-full"></div>
                  <span className="text-sm">{summary.upcoming_count} batches expected within 7 days</span>
                </div>
              )}
              {summary.overdue_count > 0 && (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                  <span className="text-sm">{summary.overdue_count} batches overdue</span>
                </div>
              )}
              {summary.upcoming_count === 0 && summary.overdue_count === 0 && (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">All batches on schedule</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Batch Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Recent Batches</CardTitle>
            <div className="flex gap-2">
              {onShowMore && (
                <Button variant="outline" size="sm" onClick={onShowMore}>
                  <List className="h-4 w-4 mr-2" />
                  Show All
                </Button>
              )}
              {onDownloadCSV && (
                <Button variant="outline" size="sm" onClick={onDownloadCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch</TableHead>
                  <TableHead>Set Date</TableHead>
                  <TableHead>Expected Hatch</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Machine</TableHead>
                  <TableHead>Flock</TableHead>
                  <TableHead className="text-right">Eggs</TableHead>
                  <TableHead className="text-right">Chicks</TableHead>
                  <TableHead className="text-right">Hatch %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-medium">{batch.batch_number}</TableCell>
                    <TableCell>{formatDate(batch.set_date)}</TableCell>
                    <TableCell>{batch.expected_hatch_date ? formatDate(batch.expected_hatch_date) : 'N/A'}</TableCell>
                    <TableCell>
                      <span className={batch.days_to_hatch !== null && batch.days_to_hatch < 0 ? 'text-red-600 font-medium' : ''}>
                        {getDaysDisplay(batch.days_to_hatch)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary"
                        className={statusColors[batch.status as keyof typeof statusColors] || 'bg-muted text-muted-foreground'}
                      >
                        {batch.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{batch.machine_number}</div>
                        <div className="text-sm text-muted-foreground">{batch.machine_type}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{batch.flock_name}</div>
                        <div className="text-sm text-muted-foreground">{batch.breed}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{batch.total_eggs_set.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{batch.chicks_hatched.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{batch.hatch_rate}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {items.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No batch data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};