import React from 'react';
import { AlertTriangle, ExternalLink, ArrowRight, X } from 'lucide-react';
import OrderStatusBadge from './OrderStatusBadge.jsx';

export default function DuplicateWarningModal({
  isOpen,
  topMatch,
  onCancel,
  onProceedAnyway,
  onViewMatchingOrder,
}) {
  if (!isOpen || !topMatch) return null;

  const candidate = topMatch.candidate;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-amber-600/60 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Possible Duplicate Order Detected</h3>
              <p className="text-xs text-slate-400">
                Confidence Match Score: <span className="text-amber-400 font-bold">{topMatch.score}%</span>
              </p>
            </div>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          An existing order was found for the same customer, pickup/destination, or time slot. Please inspect the matching record before creating a duplicate job.
        </p>

        {/* Existing Order Preview Box */}
        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold text-sky-400 text-xs">
              {candidate.orderNumber}
            </span>
            <OrderStatusBadge status={candidate.status} />
          </div>

          <div className="text-slate-400">
            Customer / Company:{' '}
            <span className="text-slate-200 font-medium">
              {candidate.companyId?.companyName || candidate.customerName || 'Private Customer'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
            <div className="p-2 bg-slate-900/60 rounded border border-slate-800/80">
              <span className="text-slate-500 block">Pickup</span>
              <span className="text-slate-300 truncate block">{candidate.pickupLocation?.address}</span>
            </div>
            <div className="p-2 bg-slate-900/60 rounded border border-slate-800/80">
              <span className="text-slate-500 block">Destination</span>
              <span className="text-slate-300 truncate block">{candidate.destinationLocation?.address}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span>Date: {new Date(candidate.requiredDate).toLocaleDateString()}</span>
            <span>Time: {candidate.requiredTime || 'N/A'}</span>
          </div>

          {topMatch.reasons && topMatch.reasons.length > 0 && (
            <div className="pt-2 border-t border-slate-900">
              <span className="text-[10px] text-slate-500 block mb-1">Match Indicators:</span>
              <div className="flex flex-wrap gap-1">
                {topMatch.reasons.map((r, i) => (
                  <span
                    key={i}
                    className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          {onViewMatchingOrder && (
            <button
              type="button"
              onClick={() => onViewMatchingOrder(candidate._id)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Inspect Matching Order</span>
            </button>
          )}

          <button
            type="button"
            onClick={onProceedAnyway}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow transition"
          >
            <span>Confirm & Create Separate Order</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
