import React, { useState, useEffect } from 'react';
import { CertificateSubmission, ToastMessage } from './types';
import { Header } from './components/Header';
import { UserSubmissionWizard } from './components/UserSubmissionWizard';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminPinModal } from './components/AdminPinModal';
import { GasSettingsModal } from './components/GasSettingsModal';
import { Toast } from './components/Toast';

export default function App() {
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [isAdminPinModalOpen, setIsAdminPinModalOpen] = useState<boolean>(false);
  const [isGasSettingsModalOpen, setIsGasSettingsModalOpen] = useState<boolean>(false);

  const [submissions, setSubmissions] = useState<CertificateSubmission[]>([]);
  const [gasUrl, setGasUrl] = useState<string>('');
  const [targetStaffCount, setTargetStaffCount] = useState<number>(20);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Add Toast Notification Helper
  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch Initial Data
  const fetchData = async () => {
    try {
      const res = await fetch('/api/submissions');
      if (res.ok) {
        const json = await res.json();
        if (json.submissions) setSubmissions(json.submissions);
        if (json.gasUrl !== undefined) setGasUrl(json.gasUrl);
        if (json.targetStaffCount) setTargetStaffCount(json.targetStaffCount);
      }
    } catch (err) {
      console.warn('Backend fetch error (using fallback):', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Save GAS Settings & Target Staff Count
  const handleSaveGasSettings = async (newGasUrl: string, newTargetCount: number) => {
    setGasUrl(newGasUrl);
    setTargetStaffCount(newTargetCount);

    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gasUrl: newGasUrl, targetStaffCount: newTargetCount }),
      });
      addToast('success', '구글 시트 연동 및 시스템 설정이 저장되었습니다.');
    } catch {
      addToast('info', '설정이 브라우저 메모리에 저장되었습니다.');
    }
  };

  // User Submission Success Callback
  const handleSubmitSuccess = (
    newSubmission: CertificateSubmission,
    msg: string
  ) => {
    setSubmissions((prev) => [newSubmission, ...prev]);
    addToast('success', msg);
  };

  // Admin Delete Submission
  const handleDeleteSubmission = async (id: string) => {
    try {
      const res = await fetch(`/api/submissions/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSubmissions((prev) => prev.filter((s) => s.id !== id));
        addToast('success', '제출 내역이 성공적으로 삭제되었습니다.');
      } else {
        setSubmissions((prev) => prev.filter((s) => s.id !== id));
        addToast('success', '삭제되었습니다.');
      }
    } catch {
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
      addToast('success', '삭제되었습니다.');
    }
  };

  // Admin Manual Submission
  const handleAddManualSubmission = async (newSub: CertificateSubmission) => {
    setSubmissions((prev) => [newSub, ...prev]);
    addToast('success', `[${newSub.userName}] 교직원 이수증이 수동 등록되었습니다.`);

    try {
      await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSub),
      });
    } catch (err) {
      console.warn('Manual sub post error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col antialiased">
      {/* Header Navigation */}
      <Header
        isAdmin={isAdminMode}
        onOpenAdminModal={() => setIsAdminPinModalOpen(true)}
        onSwitchToUser={() => {
          setIsAdminMode(false);
          addToast('info', '사용자 모드로 전환되었습니다.');
        }}
        onOpenSettings={() => setIsGasSettingsModalOpen(true)}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {isAdminMode ? (
          <AdminDashboard
            submissions={submissions}
            targetStaffCount={targetStaffCount}
            onDeleteSubmission={handleDeleteSubmission}
            onAddManualSubmission={handleAddManualSubmission}
            onSwitchToUser={() => {
              setIsAdminMode(false);
              addToast('info', '사용자 모드로 전환되었습니다.');
            }}
            onRefresh={fetchData}
            onToast={addToast}
          />
        ) : (
          <UserSubmissionWizard
            submissions={submissions}
            onSubmitSuccess={handleSubmitSuccess}
            onError={(msg) => addToast('error', msg)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            © 2026 현동숲유치원 (Hyeondong Forest Kindergarten). All rights reserved.
          </span>
          <span className="text-slate-400">
            교직원 연수 이수증 취합 및 AI 자동 분석 시스템 v1.0
          </span>
        </div>
      </footer>

      {/* Admin PIN Verification Modal */}
      <AdminPinModal
        isOpen={isAdminPinModalOpen}
        onClose={() => setIsAdminPinModalOpen(false)}
        onSuccess={() => {
          setIsAdminMode(true);
          addToast('success', '관리자 모드로 전환되었습니다.');
        }}
      />

      {/* GAS Settings Modal */}
      <GasSettingsModal
        isOpen={isGasSettingsModalOpen}
        onClose={() => setIsGasSettingsModalOpen(false)}
        gasUrl={gasUrl}
        targetStaffCount={targetStaffCount}
        onSave={handleSaveGasSettings}
      />

      {/* Floating Toast Alerts */}
      <Toast toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}
