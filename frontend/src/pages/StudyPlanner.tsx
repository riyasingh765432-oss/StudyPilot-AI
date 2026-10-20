import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Plus,
  Clock,
  Target,
  CheckSquare,
  CheckCircle2,
  Circle,
  Trash2,
  X,
  PlayCircle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import {
  type StudyTask,
  apiGetTasks,
  apiCreateTask,
  apiUpdateTask,
  apiDeleteTask,
  apiCreateSession,
} from '../services/api';

export const StudyPlanner: React.FC = () => {
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Task Modal state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [minutes, setMinutes] = useState(45);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  // Log Session Modal state
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [sessionSubject, setSessionSubject] = useState('');
  const [sessionMinutes, setSessionMinutes] = useState(30);
  const [isSubmittingSession, setIsSubmittingSession] = useState(false);
  const [sessionSuccess, setSessionSuccess] = useState<string | null>(null);

  const loadTasks = async () => {
    try {
      const data = await apiGetTasks();
      setTasks(data);
    } catch (err) {
      console.error('Failed to load study tasks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleToggleComplete = async (task: StudyTask) => {
    try {
      const updated = await apiUpdateTask(task.id, { completed: !task.completed });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      await apiDeleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !subject.trim()) return;

    setIsSubmittingTask(true);
    try {
      const newTask = await apiCreateTask(title.trim(), subject.trim(), date, minutes);
      setTasks((prev) => [newTask, ...prev]);
      setTitle('');
      setSubject('');
      setIsTaskModalOpen(false);
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const handleLogSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionSubject.trim()) return;

    setIsSubmittingSession(true);
    try {
      await apiCreateSession(sessionSubject.trim(), sessionMinutes);
      setSessionSuccess(`Successfully logged ${sessionMinutes} minutes for ${sessionSubject}!`);
      setTimeout(() => setSessionSuccess(null), 4000);
      setSessionSubject('');
      setIsSessionModalOpen(false);
    } catch (err) {
      console.error('Failed to log session:', err);
    } finally {
      setIsSubmittingSession(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Smart Study Planner
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Dynamic study scheduling calibrated to your exam targets, deadlines, and daily capacity.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSessionModalOpen(true)}
            leftIcon={<PlayCircle className="w-4 h-4" />}
          >
            Log Session
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsTaskModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Study Task
          </Button>
        </div>
      </div>

      {sessionSuccess && (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
          {sessionSuccess}
        </div>
      )}

      {/* Main Task List or Empty State */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Scheduled Study Milestones</CardTitle>
            <CardDescription>
              {tasks.length} active or completed task{tasks.length === 1 ? '' : 's'} in SQLite database
            </CardDescription>
          </div>
          <span className="text-xs text-slate-400">
            {tasks.filter((t) => t.completed).length} / {tasks.length} completed
          </span>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner label="Loading study milestones..." />
            </div>
          ) : tasks.length > 0 ? (
            <div className="space-y-2.5">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => handleToggleComplete(task)}
                      className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shrink-0"
                      title={task.completed ? 'Mark incomplete' : 'Mark completed'}
                    >
                      {task.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <p
                        className={`text-xs sm:text-sm font-semibold truncate ${
                          task.completed
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="font-medium text-indigo-600 dark:text-indigo-400">
                          {task.subject}
                        </span>
                        <span>&middot;</span>
                        <span>{task.estimated_minutes} minutes</span>
                        <span>&middot;</span>
                        <span>Due {task.scheduled_date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        task.completed
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                          : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                      }`}
                    >
                      {task.completed ? 'Completed' : 'Scheduled'}
                    </span>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-1 rounded text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Delete task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Calendar className="w-8 h-8" />}
              title="No study schedules or milestones configured"
              description="You haven't set up any study routines yet. Add your first study task to schedule review blocks and track progress."
              stageTag="Stage 2: SQLite Active"
              action={
                <Button variant="outline" size="sm" onClick={() => setIsTaskModalOpen(true)}>
                  Create First Study Task
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2">
              <Clock className="w-4 h-4" />
            </div>
            <CardTitle className="text-sm">Adaptive Spaced Scheduling</CardTitle>
            <CardDescription>Prevents cramming with distributed intervals</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-slate-500 dark:text-slate-400">
            Automatically schedules follow-up review sessions 1, 3, 7, and 14 days after reading new topics.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
              <Target className="w-4 h-4" />
            </div>
            <CardTitle className="text-sm">Target Exam Milestones</CardTitle>
            <CardDescription>Backwards planning from exam day</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-slate-500 dark:text-slate-400">
            Input your test date and syllabus coverage; StudyPilot will divide your course into manageable daily increments.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2">
              <CheckSquare className="w-4 h-4" />
            </div>
            <CardTitle className="text-sm">Daily Actionable Checklists</CardTitle>
            <CardDescription>Zero-friction morning task delivery</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-slate-500 dark:text-slate-400">
            Start each day with clear 25-45 minute focus blocks, avoiding decision fatigue before studying.
          </CardContent>
        </Card>
      </div>

      {/* Task Creation Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Add Study Task
              </h3>
              <button
                onClick={() => setIsTaskModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Binary Search Trees"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Computer Science"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Scheduled Date
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Duration (mins)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="480"
                    required
                    value={minutes}
                    onChange={(e) => setMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsTaskModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSubmittingTask}
                >
                  Save Task
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Session Modal */}
      {isSessionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Log Completed Study Session
              </h3>
              <button
                onClick={() => setIsSessionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogSession} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subject / Topic
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Physics Mechanics"
                  value={sessionSubject}
                  onChange={(e) => setSessionSubject(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="720"
                  required
                  value={sessionMinutes}
                  onChange={(e) => setSessionMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSessionModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSubmittingSession}
                >
                  Record Session
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
