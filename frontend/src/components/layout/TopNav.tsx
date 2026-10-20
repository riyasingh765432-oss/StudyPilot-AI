import React, { useEffect, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Menu, Wifi, WifiOff, LogOut, LogIn } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { checkBackendHealth, type HealthCheckResponse } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface TopNavProps {
  onOpenSidebar: () => void;
}

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Overview of your learning journey & study coach status' },
  '/notes': { title: 'Notes Studio', subtitle: 'Organize, annotate, and synthesize study documents' },
  '/planner': { title: 'Smart Study Planner', subtitle: 'AI-assisted schedule management and milestone tracking' },
  '/quiz': { title: 'Quiz Lab', subtitle: 'Active recall and adaptive evaluation practice' },
  '/flashcards': { title: 'Flashcards', subtitle: 'Spaced repetition decks and memory mastery' },
  '/ask': { title: 'Ask Your Notes', subtitle: 'Semantic inquiry & AI explanation engine' },
  '/progress': { title: 'Progress & Analytics', subtitle: 'Study metrics, mastery distribution, and habit trends' },
  '/login': { title: 'Sign In', subtitle: 'Access your personalized StudyPilot AI space' },
  '/signup': { title: 'Create Account', subtitle: 'Get started with your intelligent study companion' },
};

export const TopNav: React.FC<TopNavProps> = ({ onOpenSidebar }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [healthStatus, setHealthStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const verifyBackend = async () => {
      try {
        const data = await checkBackendHealth();
        if (isMounted) {
          setHealth(data);
          setHealthStatus('connected');
        }
      } catch {
        if (isMounted) {
          setHealthStatus('disconnected');
        }
      }
    };

    verifyBackend();
    const interval = setInterval(verifyBackend, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const currentMeta = pageTitles[location.pathname] || {
    title: 'StudyPilot AI',
    subtitle: 'AI-powered personal study coach',
  };

  return (
    <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between">
      {/* Left: Mobile hamburger & breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white leading-tight">
            {currentMeta.title}
          </h1>
          <p className="hidden md:block text-[11px] text-slate-500 dark:text-slate-400">
            {currentMeta.subtitle}
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Backend Status Indicator */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
            healthStatus === 'connected'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/60'
              : healthStatus === 'checking'
              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60'
              : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/60'
          }`}
          title={
            healthStatus === 'connected' && health
              ? `FastAPI ${health.version} (${health.environment}) healthy`
              : healthStatus === 'checking'
              ? 'Checking backend status...'
              : 'FastAPI backend unreachable at /api/health'
          }
        >
          {healthStatus === 'connected' ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <Wifi className="w-3 h-3" />
              <span className="hidden sm:inline">Backend API: Online</span>
              <span className="sm:hidden">API Online</span>
            </>
          ) : healthStatus === 'checking' ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <WifiOff className="w-3 h-3" />
              <span className="hidden sm:inline">Backend: Offline</span>
              <span className="sm:hidden">API Offline</span>
            </>
          )}
        </div>

        {/* Theme Toggle Button */}
        <ThemeToggle />

        {/* User Profile / Auth Action */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold uppercase shadow-xs">
                {user.name.charAt(0)}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {user.name}
                </span>
                <span className="text-[10px] text-slate-400 truncate max-w-[140px]">
                  {user.email}
                </span>
              </div>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Log out"
                aria-label="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
