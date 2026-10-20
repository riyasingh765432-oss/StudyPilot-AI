import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  HelpCircle,
  Activity,
  PlusCircle,
  BookOpen,
  ArrowRight,
  Sparkles,
  Flame,
  CheckCircle2,
  Circle,
  X,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { useAuth } from '../context/AuthContext';
import {
  type StudyTask,
  type StudySession,
  type QuizAttempt,
  apiGetTasks,
  apiGetSessions,
  apiGetQuizAttempts,
  apiCreateTask,
  apiUpdateTask,
} from '../services/api';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [quizzes, setQuizzes] = useState<QuizAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Quick Task Creation Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskSubject, setTaskSubject] = useState('');
  const [taskDate, setTaskDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [taskMinutes, setTaskMinutes] = useState(30);
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  const loadDashboardData = async () => {
    try {
      const [fetchedTasks, fetchedSessions, fetchedQuizzes] = await Promise.all([
        apiGetTasks(),
        apiGetSessions(),
        apiGetQuizAttempts(),
      ]);
      setTasks(fetchedTasks);
      setSessions(fetchedSessions);
      setQuizzes(fetchedQuizzes);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleToggleTask = async (task: StudyTask) => {
    try {
      const updated = await apiUpdateTask(task.id, { completed: !task.completed });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !taskSubject.trim()) return;

    setIsCreatingTask(true);
    try {
      const newTask = await apiCreateTask(taskTitle.trim(), taskSubject.trim(), taskDate, taskMinutes);
      setTasks((prev) => [newTask, ...prev]);
      setTaskTitle('');
      setTaskSubject('');
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setIsCreatingTask(false);
    }
  };

  // Metrics computation
  const totalMinutes = sessions.reduce((acc, s) => acc + s.duration_minutes, 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMins = totalMinutes % 60;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayTasks = tasks.filter((t) => t.scheduled_date === todayStr);
  const displayTasks = todayTasks.length > 0 ? todayTasks : tasks.slice(0, 5);
  const completedTodayCount = todayTasks.filter((t) => t.completed).length;

  const avgQuizScore =
    quizzes.length > 0
      ? Math.round(quizzes.reduce((acc, q) => acc + q.score_percentage, 0) / quizzes.length)
      : null;

  // Build weekly chart data (Mon-Sun)
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weeklyData = daysOfWeek.map((day) => ({
    day,
    hours: 0,
    target: 2,
  }));

  // Distribute sessions into weekly chart
  sessions.forEach((s) => {
    const sessionDate = new Date(s.completed_at);
    const dayIndex = (sessionDate.getDay() + 6) % 7; // Monday = 0
    if (dayIndex >= 0 && dayIndex < 7) {
      weeklyData[dayIndex].hours += Number((s.duration_minutes / 60).toFixed(1));
    }
  });

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-6 sm:p-8 text-white shadow-sm border border-indigo-700/50">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Stage 3: AI Study Coach Active</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Hello, {user?.name || 'Learner'}! Welcome to StudyPilot AI.
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-indigo-100/90 leading-relaxed">
            Your personal learning profile is connected to SQLite and Google Gemini. Upload lecture notes in Notes Studio
            to extract key concepts, generate AI summaries, and ask grounded questions.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="bg-white text-indigo-900 hover:bg-indigo-50 font-semibold"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Add Study Task
            </Button>
            <Link to="/planner">
              <Button
                variant="outline"
                size="sm"
                className="border-indigo-400/40 text-white hover:bg-white/10"
                leftIcon={<BookOpen className="w-4 h-4" />}
              >
                Open Smart Planner
              </Button>
            </Link>
          </div>
        </div>

        {/* Ambient decorative elements */}
        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 right-24 w-48 h-48 rounded-full bg-indigo-400/10 blur-xl pointer-events-none" />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Study Time</p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {totalHours}h {remainingMins}m
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Logged sessions</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Tasks Completed</p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {todayTasks.length > 0
                  ? `${completedTodayCount} / ${todayTasks.length}`
                  : `${tasks.filter((t) => t.completed).length} / ${tasks.length}`}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {todayTasks.length > 0 ? "Today's goal" : "Total tasks"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Streak</p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {sessions.length > 0 ? `${sessions.length} Sessions` : '0 Days'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {sessions.length > 0 ? 'Consistency growing' : 'Start today'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Flame className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Average Quiz Score</p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {avgQuizScore !== null ? `${avgQuizScore}%` : '—'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {quizzes.length > 0 ? `${quizzes.length} completed` : 'No attempts yet'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <HelpCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Today's Tasks + Study-Time Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Study Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Today's Study Tasks</CardTitle>
              <CardDescription>Scheduled study blocks and review milestones</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              leftIcon={<PlusCircle className="w-4 h-4" />}
            >
              Add Task
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 flex justify-center">
                <LoadingSpinner label="Loading tasks..." />
              </div>
            ) : displayTasks.length > 0 ? (
              <ul className="space-y-2.5">
                {displayTasks.map((task) => (
                  <li
                    key={task.id}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between gap-3 transition-colors hover:border-slate-300 dark:hover:border-slate-700"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => handleToggleTask(task)}
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
                          className={`text-xs font-semibold truncate ${
                            task.completed
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {task.title}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {task.subject} &middot; {task.estimated_minutes} mins &middot; {task.scheduled_date}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                        task.completed
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                          : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                      }`}
                    >
                      {task.completed ? 'Done' : 'Pending'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                compact
                icon={<Calendar className="w-6 h-6" />}
                title="No study tasks scheduled yet"
                description="Your study checklist is empty. Add a task to start tracking your revision blocks."
                stageTag="Study Planner"
                action={
                  <Button variant="outline" size="sm" onClick={() => setIsModalOpen(true)}>
                    Create First Task
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>

        {/* Study-Time Summary (with Recharts Chart) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Study-Time Summary</CardTitle>
              <CardDescription>Hours logged vs daily targets this week</CardDescription>
            </div>
            <span className="text-xs font-medium text-slate-400">
              {totalHours}h {remainingMins}m total
            </span>
          </CardHeader>
          <CardContent>
            <div className="h-48 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={[0, 'auto']} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                    formatter={(value: any) => [`${value} hrs`, 'Logged Time']}
                  />
                  <Bar dataKey="hours" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {sessions.length > 0 ? (
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    Live session tracking active ({sessions.length} sessions recorded).
                  </span>
                ) : (
                  <>
                    <span className="font-medium text-slate-700 dark:text-slate-300">Zero-baseline tracking:</span>{' '}
                    Sessions will record real study hours once timer or interactive learning begins.
                  </>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Grid: Quiz Performance Card + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quiz Performance Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Quiz Performance</CardTitle>
              <CardDescription>Accuracy and concept retention breakdown</CardDescription>
            </div>
            <Link to="/quiz">
              <Button variant="ghost" size="sm">
                View Lab
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {quizzes.length > 0 ? (
              <ul className="space-y-2.5">
                {quizzes.slice(0, 4).map((q) => (
                  <li
                    key={q.id}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{q.topic}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {q.correct_answers} of {q.total_questions} correct
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                        {q.score_percentage}%
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                compact
                icon={<HelpCircle className="w-6 h-6" />}
                title="No quizzes completed yet"
                description="Complete quizzes generated from your notes in the Quiz Lab to see accuracy ratings, weak spots, and mastery metrics here."
                stageTag="Quiz Lab"
                action={
                  <Link to="/quiz">
                    <Button variant="outline" size="sm">
                      Generate First Quiz
                    </Button>
                  </Link>
                }
              />
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Timeline of your interactions and study events</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {tasks.length > 0 || sessions.length > 0 ? (
              <div className="space-y-3">
                {tasks.slice(0, 2).map((t) => (
                  <div key={`task-${t.id}`} className="flex items-start gap-2.5 text-xs">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {t.completed ? 'Completed task:' : 'Created task:'}
                      </span>{' '}
                      <span className="text-slate-600 dark:text-slate-400">{t.title}</span>
                    </div>
                  </div>
                ))}
                {sessions.slice(0, 2).map((s) => (
                  <div key={`session-${s.id}`} className="flex items-start gap-2.5 text-xs">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Studied:</span>{' '}
                      <span className="text-slate-600 dark:text-slate-400">
                        {s.subject} ({s.duration_minutes} mins)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                compact
                icon={<Activity className="w-6 h-6" />}
                title="No recent activity recorded"
                description="Your document uploads, flashcard reviews, study planner updates, and AI queries will be logged here as you study."
                stageTag="Activity Log"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Add Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Add New Study Task
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
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
                  placeholder="e.g. Read Organic Chemistry Chapter 3"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
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
                  placeholder="e.g. Chemistry"
                  value={taskSubject}
                  onChange={(e) => setTaskSubject(e.target.value)}
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
                    value={taskDate}
                    onChange={(e) => setTaskDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Estimated Time (mins)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="480"
                    required
                    value={taskMinutes}
                    onChange={(e) => setTaskMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isCreatingTask}
                >
                  Save Task
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
