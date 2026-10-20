import React from 'react';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className = '',
  label,
}) => {
  const sizeMap = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-3',
  };

  return (
    <div className={`inline-flex items-center gap-2.5 text-slate-500 dark:text-slate-400 ${className}`} role="status">
      <div
        className={`${sizeMap[size]} rounded-full border-slate-300 dark:border-slate-700 border-t-indigo-600 dark:border-t-indigo-400 animate-spin`}
        aria-hidden="true"
      />
      {label && <span className="text-xs font-medium">{label}</span>}
      <span className="sr-only">{label || 'Loading...'}</span>
    </div>
  );
};

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded ${className}`}
      aria-hidden="true"
    />
  );
};
