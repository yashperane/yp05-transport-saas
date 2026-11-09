import React from 'react';
import { Loader2, AlertCircle, Inbox, X } from 'lucide-react';

/**
 * Enterprise Design System Primitives
 * Clean, subtle, accessible B2B components modeled after Stripe / Linear design quality.
 */

export const Card = ({ children, className = '', header, footer, ...props }) => (
  <div className={`bg-slate-900/90 border border-slate-800 rounded-xl shadow-sm hover:border-slate-700/80 transition-colors ${className}`} {...props}>
    {header && <div className="px-5 py-4 border-b border-slate-800/80 font-medium text-slate-200 text-sm flex items-center justify-between">{header}</div>}
    <div className="p-5">{children}</div>
    {footer && <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-950/40 rounded-b-xl">{footer}</div>}
  </div>
);

export const Button = ({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  size = 'md', // 'sm' | 'md' | 'lg'
  loading = false,
  disabled = false,
  icon: Icon,
  className = '',
  ...props
}) => {
  const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed select-none';
  
  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-xs px-3.5 py-2 gap-2',
    lg: 'text-sm px-4 py-2.5 gap-2.5',
  };

  const variants = {
    primary: 'bg-sky-600 hover:bg-sky-500 text-white focus:ring-sky-500 shadow-sm',
    secondary: 'bg-slate-800 hover:bg-slate-700/80 text-slate-200 border border-slate-700 focus:ring-slate-600',
    outline: 'bg-transparent hover:bg-slate-800/50 text-slate-300 border border-slate-700 focus:ring-slate-600',
    danger: 'bg-red-600/90 hover:bg-red-600 text-white focus:ring-red-500 shadow-sm',
    ghost: 'bg-transparent hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 focus:ring-slate-600',
  };

  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> : Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      {children}
    </button>
  );
};

export const Input = ({ label, error, helper, className = '', ...props }) => (
  <div className="w-full space-y-1.5">
    {label && <label className="block text-xs font-medium text-slate-300">{label}</label>}
    <input
      className={`w-full bg-slate-950 border text-slate-100 text-xs rounded-lg px-3 py-2 placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
        error ? 'border-red-500/80 focus:ring-red-500/50' : 'border-slate-800 hover:border-slate-700 focus:border-sky-500 focus:ring-sky-500/20'
      } ${className}`}
      {...props}
    />
    {error && <p className="text-[11px] text-red-400 font-medium">{error}</p>}
    {helper && !error && <p className="text-[11px] text-slate-500">{helper}</p>}
  </div>
);

export const Select = ({ label, error, children, className = '', ...props }) => (
  <div className="w-full space-y-1.5">
    {label && <label className="block text-xs font-medium text-slate-300">{label}</label>}
    <select
      className={`w-full bg-slate-950 border text-slate-100 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 transition-all ${
        error ? 'border-red-500/80 focus:ring-red-500/50' : 'border-slate-800 hover:border-slate-700 focus:border-sky-500 focus:ring-sky-500/20'
      } ${className}`}
      {...props}
    >
      {children}
    </select>
    {error && <p className="text-[11px] text-red-400 font-medium">{error}</p>}
  </div>
);

export const Badge = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'bg-slate-800/80 text-slate-300 border-slate-700/60',
    primary: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    danger: 'bg-red-500/10 text-red-400 border-red-500/30',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    teal: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${variants[variant] || variants.default} ${className}`}>
      {children}
    </span>
  );
};

export const Modal = ({ isOpen, onClose, title, children, footer, maxWidth = 'max-w-lg' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className={`w-full ${maxWidth} bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden`}>
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto space-y-4">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/50 flex items-center justify-end gap-2.5">{footer}</div>}
      </div>
    </div>
  );
};

export const EmptyState = ({
  title = 'No records found',
  description = 'There are no items to display at this time.',
  action,
  icon: Icon = Inbox,
  className = '',
}) => (
  <div className={`text-center py-12 px-4 rounded-xl border border-dashed border-slate-800/80 bg-slate-950/20 ${className}`}>
    <div className="w-10 h-10 rounded-lg bg-slate-800/50 flex items-center justify-center text-slate-400 mx-auto mb-3 border border-slate-700/40">
      <Icon className="w-5 h-5" />
    </div>
    <h3 className="text-xs font-semibold text-slate-200">{title}</h3>
    <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-1">{description}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const LoadingSkeleton = ({ count = 3, className = '' }) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="h-16 bg-slate-800/40 border border-slate-800/60 rounded-xl animate-pulse" />
    ))}
  </div>
);

export const TableSkeleton = ({ rows = 5, cols = 4 }) => (
  <div className="w-full bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden animate-pulse">
    <div className="h-10 bg-slate-800/50 border-b border-slate-800" />
    <div className="divide-y divide-slate-800/60">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3.5">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="h-4 bg-slate-800/60 rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  </div>
);

export const MetricsSkeleton = ({ count = 4 }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="h-24 bg-slate-900/70 border border-slate-800 rounded-xl p-4 animate-pulse">
        <div className="h-3 w-16 bg-slate-800 rounded mb-2" />
        <div className="h-7 w-12 bg-slate-800 rounded" />
      </div>
    ))}
  </div>
);

export const Toast = ({ type = 'success', message, onClose }) => {
  if (!message) return null;
  return (
    <div className={`fixed top-4 right-4 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-lg border text-xs font-medium shadow-2xl backdrop-blur-md transition-all ${
      type === 'success' 
        ? 'bg-slate-900/95 border-emerald-500/40 text-emerald-300'
        : 'bg-slate-900/95 border-red-500/40 text-red-300'
    }`}>
      {type === 'success' ? <span className="w-2 h-2 rounded-full bg-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
      <span>{message}</span>
      {onClose && (
        <button onClick={onClose} className="ml-3 text-slate-500 hover:text-slate-300 text-xs font-mono">✕</button>
      )}
    </div>
  );
};
