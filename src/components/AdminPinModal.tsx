import React, { useState, useEffect } from 'react';
import { ShieldAlert, X, Delete, Lock, KeyRound } from 'lucide-react';

interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminPinModal: React.FC<AdminPinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isShaking, setIsShaking] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setErrorMsg('');
      setIsShaking(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDigitClick = (digit: string) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setErrorMsg('');
      if (nextPin.length === 4) {
        verifyPin(nextPin);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleClear = () => {
    setPin('');
    setErrorMsg('');
  };

  const verifyPin = async (inputPin: string) => {
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/admin/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: inputPin }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        onSuccess();
        onClose();
      } else {
        triggerError(data.message || '인증번호 4자리가 일치하지 않습니다.');
      }
    } catch {
      // Fallback check if server offline (check localStorage or default 1234)
      const savedPin = localStorage.getItem('admin_pin') || '1234';
      if (inputPin === savedPin) {
        onSuccess();
        onClose();
      } else {
        triggerError('비밀번호가 일치하지 않습니다.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setIsShaking(true);
    setPin('');
    setTimeout(() => setIsShaking(false), 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div
        className={`bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 text-center relative transition-transform ${
          isShaking ? 'animate-shake' : ''
        }`}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
          <Lock className="w-7 h-7" />
        </div>

        <h3 className="text-lg font-bold text-slate-900">관리자 모드 인증</h3>
        <p className="text-xs text-slate-500 mt-1">
          전체 이수 현황 및 관리를 위해 4자리 PIN을 입력하세요.
        </p>

        {/* PIN Indicators */}
        <div className="flex justify-center items-center gap-3 my-6">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                index < pin.length
                  ? 'bg-amber-500 border-amber-500 scale-110 shadow-xs'
                  : 'bg-slate-100 border-slate-300'
              }`}
            />
          ))}
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div className="mb-4 text-xs font-medium text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xl flex items-center justify-center gap-1.5">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[240px] mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              disabled={isSubmitting}
              onClick={() => handleDigitClick(num)}
              className="h-12 text-lg font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 rounded-xl border border-slate-200 shadow-xs transition-all active:scale-95 disabled:opacity-50"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            disabled={isSubmitting || pin.length === 0}
            onClick={handleClear}
            className="h-12 text-xs font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all active:scale-95 disabled:opacity-30"
          >
            전체취소
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleDigitClick('0')}
            className="h-12 text-lg font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 rounded-xl border border-slate-200 shadow-xs transition-all active:scale-95 disabled:opacity-50"
          >
            0
          </button>
          <button
            type="button"
            disabled={isSubmitting || pin.length === 0}
            onClick={handleDelete}
            className="h-12 flex items-center justify-center text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all active:scale-95 disabled:opacity-30"
            title="지우기"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Hint Notice */}
        <div className="mt-5 text-[11px] text-slate-400 flex items-center justify-center gap-1">
          <Lock className="w-3.5 h-3.5 text-slate-400" />
          <span>관리자 전용 비밀번호를 입력하세요.</span>
        </div>
      </div>
    </div>
  );
};
