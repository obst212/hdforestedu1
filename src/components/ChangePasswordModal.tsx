import React, { useState } from 'react';
import { KeyRound, X, Check, ShieldAlert, Lock } from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onError,
}) => {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  if (!isOpen) return null;

  const handleClose = () => {
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setLocalError('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!currentPin) {
      setLocalError('현재 비밀번호를 입력해주세요.');
      return;
    }

    if (!newPin || newPin.length < 4) {
      setLocalError('새 비밀번호는 4자리 이상 입력해주세요.');
      return;
    }

    if (newPin !== confirmPin) {
      setLocalError('새 비밀번호가 서로 일치하지 않습니다.');
      return;
    }

    if (currentPin === newPin) {
      setLocalError('현재 비밀번호와 다른 새 비밀번호를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/admin/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPin, newPin }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Also sync local storage fallback
        localStorage.setItem('admin_pin', newPin);
        onSuccess('관리자 비밀번호가 성공적으로 변경되었습니다.');
        handleClose();
      } else {
        setLocalError(data.message || '비밀번호 변경에 실패했습니다. 현재 비밀번호를 확인해주세요.');
      }
    } catch {
      // Fallback local check
      const savedPin = localStorage.getItem('admin_pin') || '1234';
      if (currentPin === savedPin) {
        localStorage.setItem('admin_pin', newPin);
        onSuccess('관리자 비밀번호가 성공적으로 변경되었습니다.');
        handleClose();
      } else {
        setLocalError('현재 비밀번호가 일치하지 않습니다.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-left relative">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-4">
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0 shadow-xs">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">관리자 비밀번호 변경</h3>
            <p className="text-xs text-slate-500">
              안전한 관리를 위해 비밀번호(PIN)를 변경합니다.
            </p>
          </div>
        </div>

        {localError && (
          <div className="mb-4 text-xs font-medium text-rose-600 bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{localError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>현재 비밀번호</span>
            </label>
            <input
              type="password"
              maxLength={20}
              placeholder="현재 비밀번호 입력"
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 tracking-wider"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5 text-slate-400" />
              <span>새 비밀번호 (4자리 이상)</span>
            </label>
            <input
              type="password"
              maxLength={20}
              placeholder="새 비밀번호 입력"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 tracking-wider"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-slate-400" />
              <span>새 비밀번호 확인</span>
            </label>
            <input
              type="password"
              maxLength={20}
              placeholder="새 비밀번호 재입력"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 tracking-wider"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>비밀번호 변경 완료</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
