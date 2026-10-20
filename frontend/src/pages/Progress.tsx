import React from 'react';
import { BarChart3, TrendingUp, Target, Award, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const Progress: React.FC = () => {
  // Honest baseline data (0 hours logged over the last 14 days)
  const emptyTrendData = [
    { date: 'Oct 7', hours: 0 },
    { date: 'Oct 9', hours: 0 },
    { date: 'Oct 11', hours: 0 },
    { date: 'Oct 13', hours: 0 },
    { date: 'Oct 15', hours: 0 },
    { date: 'Oct 17', hours: 0 },
    { date: 'Oct 19', hours: 0 },
    { date: 'Oct 21', hours: 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Progress & Analytics
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Quantitative tracking of study hours, quiz mastery rates, and consistency habits.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-medium">Study Consistency</span>
              <TrendingUp className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-2">0%</p>
            <p className="text-[11px] text-slate-400 mt-0.5">0 of 7 target days active</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-medium">Cumulative Hours</span>
              <Clock className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-2">0.0 hrs</p>
            <p className="text-[11px] text-slate-400 mt-0.5">All time tracked</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-medium">Retention Mastery</span>
              <Award className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-2">—</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Awaiting first quiz</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-medium">Goals Met</span>
              <Target className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-2">0</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Milestones achieved</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Study Velocity (14-Day Baseline)</CardTitle>
            <CardDescription>Daily study time trend vs baseline target</CardDescription>
          </div>
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            Zero Baseline
          </span>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={emptyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={[0, 5]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                  formatter={(value: any) => [`${value} hrs`, 'Study Time']}
                />
                <Area
                  type="monotone"
                  dataKey="hours"
                  stroke="#4f46e5"
                  fill="#4f46e5"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">No session logs yet.</span>{' '}
              Real data will plot here automatically when study timers and quiz attempts are recorded in Stage 2.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Empty State Card */}
      <Card>
        <CardContent className="p-6">
          <EmptyState
            compact
            icon={<BarChart3 className="w-6 h-6" />}
            title="Topic breakdown awaiting activity"
            description="Topic-level proficiency heatmaps and forgetting curves will activate after your first active study session."
            stageTag="Stage 1: Analytics Ready"
          />
        </CardContent>
      </Card>
    </div>
  );
};
