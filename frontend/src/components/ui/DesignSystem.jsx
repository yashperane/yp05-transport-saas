import React from 'react';
import { Loader2, AlertCircle, Inbox, X } from 'lucide-react';

/**
 * Enterprise B2B Design System Primitives (Medium-Tone Industrial Slate System)
 * Soft slate surfaces (#222B38), muted page background (#181E29), balanced contrast.
 */

export const Card = ({ children, className = '', header, footer, action, ...props }) => (
  <div
    className={`bg-[#222B38] border border-slate-700/60 rounded-xl shadow-sm transition-all duration-150 ${className}`}
    {...props}
  >
    {header && (
      <div className="px-5 py-3.5 border-b border-slate-700/50 flex items-center justify-between">
        <div className="font-semibold text-slate-100 text-xs tracking-tight">{header}</div>
        {action && <div>{action}</div>}
      </div>
    )}
    <div className="p-5">{children}</div>
    {footer && (
      <div className="px-5 py-3 border-t border-slate-700/50 bg-[#1A222D]/80 rounded-b-xl flex items-center justify-between text-xs">
        {footer}
      </div>
    )}
  </div>
);

export const Button = ({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'emerald'
  size = 'md', // 'sm' | 'md' | 'lg'
  loading = false,
  disabled = false,
  icon: Icon,
  className = '',
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#181E29] disabled:opacity-40 disabled:cursor-not-allowed select-none active:scale-[0.98]';

  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-xs px-3.5 py-2 gap-2',
    lg: 'text-sm px-4 py-2.5 gap-2.5',
  };

  const variants = {
    primary:
      'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-sm focus:ring-blue-500 border border-blue-400/30',
    secondary:
      'bg-[#2A3444] hover:bg-[#323E52] text-slate-200 border border-slate-600/60 shadow-sm focus:ring-slate-400',
    outline:
      'bg-transparent hover:bg-slate-700/40 text-slate-300 border border-slate-600/60 focus:ring-slate-400',
    danger:
      'bg-rose-600/90 hover:bg-rose-600 active:bg-rose-700 text-white shadow-sm focus:ring-rose-500 border border-rose-500/30',
    emerald:
      'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-sm focus:ring-emerald-500 border border-emerald-500/30',
    ghost:
      'bg-transparent hover:bg-slate-700/40 text-slate-300 hover:text-white focus:ring-slate-400',
  };

  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant] || variants.primary} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
      ) : (
        Icon && <Icon className="w-3.5 h-3.5 shrink-0" />
      )}
      {children}
    </button>
  );
};

export const Input = ({ label, error, helper, className = '', ...props }) => (
  <div className="w-full space-y-1.5">
    {label && <label className="block text-xs font-medium text-slate-300">{label}</label>}
    <input
      className={`w-full bg-[#131720] border text-slate-100 text-xs rounded-lg px-3 py-2 placeholder-slate-500 transition-all focus:outline-none focus:ring-2 ${
        error
          ? 'border-rose-500/80 focus:ring-rose-500/30'
          : 'border-slate-700 hover:border-slate-600 focus:border-blue-500 focus:ring-blue-500/20'
      } ${className}`}
      {...props}
    />
    {error && <p className="text-[11px] text-rose-400 font-medium">{error}</p>}
    {helper && !error && <p className="text-[11px] text-slate-400">{helper}</p>}
  </div>
);

export const Select = ({ label, error, children, className = '', ...props }) => (
  <div className="w-full space-y-1.5">
    {label && <label className="block text-xs font-medium text-slate-300">{label}</label>}
    <select
      className={`w-full bg-[#131720] border text-slate-100 text-xs rounded-lg px-3 py-2 transition-all focus:outline-none focus:ring-2 ${
        error
          ? 'border-rose-500/80 focus:ring-rose-500/30'
          : 'border-slate-700 hover:border-slate-600 focus:border-blue-500 focus:ring-blue-500/20'
      } ${className}`}
      {...props}
    >
      {children}
    </select>
    {error && <p className="text-[11px] text-rose-400 font-medium">{error}</p>}
  </div>
);

export const Badge = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'bg-slate-700/80 text-slate-300 border-slate-600/60',
    primary: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    danger: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    purple: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    teal: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border tracking-wide ${
        variants[variant] || variants.default
      } ${className}`}
    >
      {children}
    </span>
  );
};

export const Modal = ({ isOpen, onClose, title, children, footer, maxWidth = 'max-w-lg' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={`w-full ${maxWidth} bg-[#222B38] border border-slate-700 rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden`}
      >
        <div className="px-5 py-4 border-b border-slate-700/70 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto space-y-4">{children}</div>
        {footer && (
          <div className="px-5 py-3 border-t border-slate-700/70 bg-[#1A222D]/90 flex items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
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
  <div
    className={`text-center py-12 px-4 rounded-xl border border-dashed border-slate-700/80 bg-[#1A222D]/40 ${className}`}
  >
    <div className="w-10 h-10 rounded-lg bg-slate-800/80 flex items-center justify-center text-slate-400 mx-auto mb-3 border border-slate-700/60">
      <Icon className="w-5 h-5 text-slate-400" />
    </div>
    <h3 className="text-xs font-semibold text-slate-200">{title}</h3>
    <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-1">{description}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const LoadingSkeleton = ({ count = 3, className = '' }) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="h-16 bg-slate-700/30 border border-slate-700/50 rounded-xl animate-pulse"
      />
    ))}
  </div>
);

export const TableSkeleton = ({ rows = 5, cols = 4 }) => (
  <div className="w-full bg-[#222B38]/60 border border-slate-700/70 rounded-xl overflow-hidden animate-pulse">
    <div className="h-10 bg-slate-700/40 border-b border-slate-700/60" />
    <div className="divide-y divide-slate-700/40">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3.5">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="h-3.5 bg-slate-700/50 rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  </div>
);

export const Toast = ({ type = 'success', message, onClose }) => {
  if (!message) return null;
  return (
    <div
      className={`fixed top-4 right-4 z-[100] flex items-center gap-2.5 px-4 py-2.5 rounded-lg border text-xs font-medium shadow-2xl backdrop-blur-md transition-all ${
        type === 'success'
          ? 'bg-[#222B38] border-emerald-500/50 text-emerald-300'
          : 'bg-[#222B38] border-rose-500/50 text-rose-300'
      }`}
    >
      {type === 'success' ? (
        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
      )}
      <span>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-3 text-slate-400 hover:text-slate-200 text-xs font-mono"
        >
          ✕
        </button>
      )}
    </div>
  );
};
