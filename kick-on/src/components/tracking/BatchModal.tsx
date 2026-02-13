'use client';

import { useState } from 'react';

interface BatchModalProps {
  open: boolean;
  onConfirm: (leftTotal: number, leftScored: number, rightTotal: number, rightScored: number) => void;
  onClose: () => void;
}

export default function BatchModal({ open, onConfirm, onClose }: BatchModalProps) {
  const [leftTotal, setLeftTotal] = useState(0);
  const [leftScored, setLeftScored] = useState(0);
  const [rightTotal, setRightTotal] = useState(0);
  const [rightScored, setRightScored] = useState(0);

  if (!open) return null;

  const handleConfirm = () => {
    if (leftScored > leftTotal) {
      alert('Left foot scored shots cannot exceed total shots!');
      return;
    }
    if (rightScored > rightTotal) {
      alert('Right foot scored shots cannot exceed total shots!');
      return;
    }
    if (leftTotal + rightTotal < 1) {
      alert('Please enter at least 1 shot!');
      return;
    }
    onConfirm(leftTotal, leftScored, rightTotal, rightScored);
    // Reset
    setLeftTotal(0);
    setLeftScored(0);
    setRightTotal(0);
    setRightScored(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-sm">
        <div className="p-4 border-b border-grey-light">
          <h3 className="text-base font-semibold text-primary dark:text-text">Batch Entry</h3>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-xs text-text-muted text-center">Enter total and scored shots per foot</p>
          <div className="flex gap-4">
            {/* Left foot */}
            <div className="flex-1 space-y-2">
              <div className="text-xs font-semibold text-center text-primary dark:text-text">Left Foot</div>
              <div>
                <label className="block text-[10px] text-text-muted mb-0.5">Total</label>
                <input type="number" min={0} value={leftTotal} onChange={(e) => setLeftTotal(parseInt(e.target.value) || 0)} className="w-full bg-surface border border-grey rounded-lg px-3 py-1.5 text-sm text-center" />
              </div>
              <div>
                <label className="block text-[10px] text-text-muted mb-0.5">Scored</label>
                <input type="number" min={0} value={leftScored} onChange={(e) => setLeftScored(parseInt(e.target.value) || 0)} className="w-full bg-surface border border-grey rounded-lg px-3 py-1.5 text-sm text-center" />
              </div>
            </div>
            {/* Right foot */}
            <div className="flex-1 space-y-2">
              <div className="text-xs font-semibold text-center text-primary dark:text-text">Right Foot</div>
              <div>
                <label className="block text-[10px] text-text-muted mb-0.5">Total</label>
                <input type="number" min={0} value={rightTotal} onChange={(e) => setRightTotal(parseInt(e.target.value) || 0)} className="w-full bg-surface border border-grey rounded-lg px-3 py-1.5 text-sm text-center" />
              </div>
              <div>
                <label className="block text-[10px] text-text-muted mb-0.5">Scored</label>
                <input type="number" min={0} value={rightScored} onChange={(e) => setRightScored(parseInt(e.target.value) || 0)} className="w-full bg-surface border border-grey rounded-lg px-3 py-1.5 text-sm text-center" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-grey-light">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm font-semibold text-text-muted bg-grey-light hover:bg-grey transition-colors">Cancel</button>
          <button onClick={handleConfirm} className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary-dark transition-colors">Confirm</button>
        </div>
      </div>
    </div>
  );
}
