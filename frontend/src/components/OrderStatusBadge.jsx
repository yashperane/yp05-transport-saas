import React from 'react';

export default function OrderStatusBadge({ status }) {
  const statusConfig = {
    pending: { label: 'Pending', bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
    available: { label: 'Available', bg: 'bg-sky-500/20', text: 'text-sky-400', border: 'border-sky-500/30' },
    assigned: { label: 'Assigned', bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/30' },
    accepted: { label: 'Accepted', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
    in_progress: { label: 'In Progress', bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
    completed: { label: 'Completed', bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    cancelled: { label: 'Cancelled', bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/30' },
    failed: { label: 'Failed', bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  };

  const current = statusConfig[status] || {
    label: status,
    bg: 'bg-slate-500/20',
    text: 'text-slate-400',
    border: 'border-slate-500/30',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${current.bg} ${current.text} ${current.border}`}
    >
      {current.label}
    </span>
  );
}
