import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartDownloadButton } from "@/components/ui/chart-download-button";
import { Calendar, Thermometer, Droplets } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, subMonths } from 'date-fns';

interface HeatmapCalendarProps {
  className?: string;
}

const HeatmapCalendar = ({ className }: HeatmapCalendarProps) => {
  const { data: qaData, isLoading } = useQuery({
    queryKey: ['heatmap-calendar-data'],
    queryFn: async () => {
      const startDate = startOfMonth(subMonths(new Date(), 2));
      const endDate = endOfMonth(new Date());
      
      const { data, error } = await supabase
        .from('qa_monitoring')
        .select(`
          check_date,
          temperature,
          humidity,
          day_of_incubation,
          batches (
            batch_number,
            status
          )
        `)
        .gte('check_date', format(startDate, 'yyyy-MM-dd'))
        .lte('check_date', format(endDate, 'yyyy-MM-dd'))
        .order('check_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const getTemperatureColor = (temp: number) => {
    if (temp < 99) return 'bg-blue-500'; // Too cold
    if (temp >= 99 && temp <= 101) return 'bg-green-500'; // Optimal
    if (temp > 101 && temp <= 103) return 'bg-yellow-500'; // Warning
    return 'bg-red-500'; // Critical
  };

  const getHumidityColor = (humidity: number) => {
    if (humidity < 55) return 'bg-orange-500'; // Too dry
    if (humidity >= 55 && humidity <= 65) return 'bg-green-500'; // Optimal
    if (humidity > 65 && humidity <= 70) return 'bg-yellow-500'; // Warning
    return 'bg-red-500'; // Too humid
  };

  const generateCalendarDays = () => {
    const startDate = startOfMonth(subMonths(new Date(), 2));
    const endDate = endOfMonth(new Date());
    return eachDayOfInterval({ start: startDate, end: endDate });
  };

  const getDayData = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return qaData?.filter(item => item.check_date === dateStr) || [];
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Temperature & Humidity Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse text-muted-foreground">Loading calendar data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const calendarDays = generateCalendarDays();
  const currentMonth = new Date();
  const oneMonthAgo = subMonths(currentMonth, 1);
  const twoMonthsAgo = subMonths(currentMonth, 2);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Temperature & Humidity Calendar
            </CardTitle>
            <CardDescription>
              Daily environmental conditions across all active batches
            </CardDescription>
          </div>
          <ChartDownloadButton chartId="heatmap-calendar" filename="temperature-humidity-calendar" />
        </div>
      </CardHeader>
      <CardContent>
        <div id="heatmap-calendar" className="space-y-6">
          {/* Legend */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4" />
                <span className="font-medium">Temperature:</span>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span className="text-xs">Cold</span>
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span className="text-xs">Optimal</span>
                  <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                  <span className="text-xs">Warm</span>
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span className="text-xs">Hot</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4" />
                <span className="font-medium">Humidity:</span>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-orange-500 rounded"></div>
                  <span className="text-xs">Dry</span>
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span className="text-xs">Optimal</span>
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span className="text-xs">Humid</span>
                </div>
              </div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[twoMonthsAgo, oneMonthAgo, currentMonth].map((monthDate, monthIndex) => {
              const monthDays = calendarDays.filter(day => 
                day.getMonth() === monthDate.getMonth() && day.getFullYear() === monthDate.getFullYear()
              );
              
              return (
                <div key={monthIndex} className="space-y-3">
                  <h3 className="text-lg font-semibold text-center">
                    {format(monthDate, 'MMMM yyyy')}
                  </h3>
                  
                  {/* Days of week header */}
                  <div className="grid grid-cols-7 gap-1 text-xs text-muted-foreground text-center">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="p-1">{day}</div>
                    ))}
                  </div>
                  
                  {/* Calendar days */}
                  <div className="grid grid-cols-7 gap-1">
                    {/* Empty cells for start of month */}
                    {Array.from({ length: monthDays[0]?.getDay() || 0 }).map((_, i) => (
                      <div key={i} className="h-8"></div>
                    ))}
                    
                    {monthDays.map(day => {
                      const dayData = getDayData(day);
                      const avgTemp = dayData.length > 0 
                        ? dayData.reduce((sum, item) => sum + item.temperature, 0) / dayData.length
                        : null;
                      const avgHumidity = dayData.length > 0 
                        ? dayData.reduce((sum, item) => sum + item.humidity, 0) / dayData.length
                        : null;
                      
                      return (
                        <div
                          key={format(day, 'yyyy-MM-dd')}
                          className="h-8 border rounded-sm flex flex-col relative group cursor-pointer transition-all hover:scale-110"
                          title={dayData.length > 0 
                            ? `${format(day, 'MMM d')}\nTemp: ${avgTemp?.toFixed(1)}°F\nHumidity: ${avgHumidity?.toFixed(1)}%\n${dayData.length} readings`
                            : `${format(day, 'MMM d')}\nNo data`
                          }
                        >
                          {/* Temperature indicator (top half) */}
                          <div 
                            className={`h-1/2 w-full rounded-t-sm ${
                              avgTemp ? getTemperatureColor(avgTemp) : 'bg-gray-200'
                            }`}
                          ></div>
                          
                          {/* Humidity indicator (bottom half) */}
                          <div 
                            className={`h-1/2 w-full rounded-b-sm ${
                              avgHumidity ? getHumidityColor(avgHumidity) : 'bg-gray-200'
                            }`}
                          ></div>
                          
                          {/* Day number */}
                          <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white mix-blend-difference">
                            {format(day, 'd')}
                          </div>
                          
                          {/* Tooltip on hover */}
                          {dayData.length > 0 && (
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                              {format(day, 'MMM d')}: {avgTemp?.toFixed(1)}°F, {avgHumidity?.toFixed(1)}%
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {qaData?.filter(item => item.temperature >= 99 && item.temperature <= 101).length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Days with Optimal Temperature</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {qaData?.filter(item => item.humidity >= 55 && item.humidity <= 65).length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Days with Optimal Humidity</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {qaData?.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Total QA Readings</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HeatmapCalendar;