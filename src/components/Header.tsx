import React from 'react';
import { ShieldCheck, UserCheck, Settings, Award, BookOpen } from 'lucide-react';

interface HeaderProps {
  isAdmin: boolean;
  onOpenAdminModal: () => void;
  onSwitchToUser: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isAdmin,
  onOpenAdminModal,
  onSwitchToUser,
  onOpenSettings,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
        {/* Branding & Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold tracking-wider text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                <Award className="w-3 h-3 text-blue-600" /> 2026학년도 현동숲유치원
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight mt-0.5">
              교직원 연수 이수증 통합 관리 시스템
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenSettings}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
            title="구글 시트 연동 및 시스템 설정"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            <span>시트 연동</span>
          </button>

          {isAdmin ? (
            <button
              onClick={onSwitchToUser}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors shadow-xs"
            >
              <UserCheck className="w-4 h-4" />
              <span>👤 사용자 모드</span>
            </button>
          ) : (
            <button
              onClick={onOpenAdminModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-all duration-150 border border-slate-800"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>🔐 관리자 모드</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

