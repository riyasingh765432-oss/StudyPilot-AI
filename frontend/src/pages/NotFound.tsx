import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
        <Compass className="w-8 h-8" />
      </div>
      <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">404</h2>
      <p className="text-base font-semibold text-slate-700 dark:text-slate-300 mt-2">
        Page Not Found
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
        The route you are looking for does not exist in StudyPilot AI.
      </p>
      <div className="mt-6">
        <Link to="/">
          <Button variant="primary" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};
