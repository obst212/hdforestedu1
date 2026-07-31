import React, { useState, useMemo } from 'react';
import { CertificateSubmission, StaffCategory } from '../types';
import {
  Users,
  Clock,
  CheckCircle2,
  Search,
  Filter,
  Trash2,
  Plus,
  ShieldCheck,
  UserCheck,
  Award,
  RefreshCw,
  X,
  FileSpreadsheet,
  BookOpen,
  ListFilter,
  GraduationCap,
  ChevronRight,
  FolderCheck,
  Sparkles,
} from 'lucide-react';

interface AdminDashboardProps {
  submissions: CertificateSubmission[];
  targetStaffCount: number;
  onDeleteSubmission: (id: string) => void;
  onAddManualSubmission: (newSub: CertificateSubmission) => void;
  onSwitchToUser: () => void;
  onRefresh: () => void;
}

type ViewMode = 'all' | 'byCourse';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  submissions,
  targetStaffCount,
  onDeleteSubmission,
  onAddManualSubmission,
  onSwitchToUser,
  onRefresh,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [selectedCourseName, setSelectedCourseName] = useState<string>('전체');

  // New Manual Submission Form State
  const [manualName, setManualName] = useState('');
  const [manualPosition, setManualPosition] = useState('교사');
  const [manualCategory, setManualCategory] = useState<StaffCategory>('교원');
  const [manualCourse, setManualCourse] = useState('');
  const [manualHours, setManualHours] = useState('15');
  const [manualIssuer, setManualIssuer] = useState('경상남도교육청연수원');
  const [manualCertNo, setManualCertNo] = useState('');
  const [manualDate, setManualDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  // Calculate General Metrics
  const uniqueStaffNames = Array.from(
    new Set(submissions.map((s) => s.userName.trim().toLowerCase()))
  );
  const totalSubmittedCount = uniqueStaffNames.length;
  const totalHoursSum = submissions.reduce((sum, s) => sum + s.hours, 0);
  const completionRate = Math.min(
    100,
    Math.round((totalSubmittedCount / (targetStaffCount || 20)) * 100)
  );

  // Group Submissions by Course Name
  const courseGroups = useMemo(() => {
    const map = new Map<string, {
      courseName: string;
      submissions: CertificateSubmission[];
      totalHours: number;
      uniqueStaff: Set<string>;
      issuers: Set<string>;
    }>();

    submissions.forEach((sub) => {
      const course = sub.courseName.trim() || '미지정 연수과정';
      if (!map.has(course)) {
        map.set(course, {
          courseName: course,
          submissions: [],
          totalHours: 0,
          uniqueStaff: new Set(),
          issuers: new Set(),
        });
      }
      const group = map.get(course)!;
      group.submissions.push(sub);
      group.totalHours += sub.hours;
      group.uniqueStaff.add(sub.userName.trim());
      if (sub.issuer) group.issuers.add(sub.issuer);
    });

    return Array.from(map.values()).sort((a, b) => b.submissions.length - a.submissions.length);
  }, [submissions]);

  // Filter Submissions for "All View"
  const filteredSubmissions = submissions.filter((s) => {
    const matchesSearch =
      s.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.issuer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.certificateNo.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === '전체' || s.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Filter Courses for "By Course View"
  const filteredCourseGroups = courseGroups.filter((g) => {
    const matchesSearch =
      g.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      Array.from(g.issuers).some((i: string) => i.toLowerCase().includes(searchTerm.toLowerCase()));

    if (selectedCourseName === '전체') return matchesSearch;
    return matchesSearch && g.courseName === selectedCourseName;
  });

  // Export to CSV with UTF-8 BOM
  const handleExportCSV = (targetSubmissions = filteredSubmissions, filenamePrefix = '2026_현동숲유치원_교직원연수이수현황') => {
    const headers = [
      '제출일시',
      '제출 교직원 성명',
      '직급',
      '직종',
      '연수과정명',
      '이수시간',
      '인증기관',
      '이수번호',
      '이수완료일자',
      '이수여부',
      '제출완료여부',
    ];

    const rows = targetSubmissions.map((s) => [
      `"${s.submittedAt}"`,
      `"${s.userName}"`,
      `"${s.position}"`,
      `"${s.category}"`,
      `"${s.courseName.replace(/"/g, '""')}"`,
      s.hours,
      `"${s.issuer.replace(/"/g, '""')}"`,
      `"${s.certificateNo}"`,
      `"${s.completionDate}"`,
      '"이수완료"',
      '"제출완료"',
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `${filenamePrefix}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !manualCourse.trim()) return;

    const newSub: CertificateSubmission = {
      id: 'sub-manual-' + Date.now(),
      submittedAt: new Date()
        .toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' })
        .replace('T', ' ')
        .substring(0, 16),
      userName: manualName.trim(),
      position: manualPosition.trim(),
      category: manualCategory,
      certificateNo: manualCertNo.trim(),
      hours: Number(manualHours) || 0,
      completionDate: manualDate,
      issuer: manualIssuer.trim(),
      courseName: manualCourse.trim(),
      isCompleted: true,
      isSubmitted: true,
      fileName: '관리자 수동 등록',
    };

    onAddManualSubmission(newSub);
    setShowAddModal(false);
    // Reset manual form
    setManualName('');
    setManualCourse('');
    setManualCertNo('');
  };

  return (
    <div className="space-y-6">
      {/* Top Admin Banner - Geometric Balance Styling */}
      <div className="bg-slate-900 text-white rounded-xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-blue-300 bg-blue-950/80 border border-blue-800 px-2.5 py-0.5 rounded-md">
                🔐 PIN 인증완료 | 총괄 관리자
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight mt-1 text-slate-100">
              2026 현동숲유치원 교직원 연수 관리자 대시보드
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              교직원 전체 연수 이수 현황 실시간 모니터링, 과정별 정리 및 데이터 분석
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onRefresh}
            className="p-2.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
            title="새로고침"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onSwitchToUser}
            className="px-4 py-2.5 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-lg shadow-sm transition-colors flex items-center gap-2 border border-slate-200"
          >
            <UserCheck className="w-4 h-4 text-blue-600" />
            <span>사용자 모드로 전환</span>
          </button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">총 제출 인원</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <h2 className="text-3xl font-bold text-slate-900">{totalSubmittedCount}명</h2>
            <span className="text-sm text-blue-600 font-semibold">/ {targetStaffCount}명 ({completionRate}%)</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">총 이수시간 합계</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <h2 className="text-3xl font-bold text-slate-900">{totalHoursSum.toLocaleString()}시간</h2>
          </div>
          <p className="text-xs text-slate-400 mt-3">등록 이수증 합계 누적</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">개설 연수과정 수</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <h2 className="text-3xl font-bold text-slate-900">{courseGroups.length}개 과정</h2>
          </div>
          <p className="text-xs text-slate-400 mt-3">과정별 제출건 자동 분류</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-amber-200 shadow-sm bg-gradient-to-br from-white to-amber-50/50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-amber-800">총 제출 이수증 수</span>
            <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <h2 className="text-3xl font-bold text-amber-900">{submissions.length}건</h2>
          </div>
          <p className="text-xs text-amber-700 mt-3 font-medium">실시간 데이터 수집 완료</p>
        </div>
      </div>

      {/* Main View Mode Selector Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Tab Controls */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-lg shrink-0">
            <button
              onClick={() => setViewMode('all')}
              className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-md transition-all flex items-center gap-2 ${
                viewMode === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListFilter className="w-4 h-4 text-blue-600" />
              <span>전체 이수 목록 ({submissions.length})</span>
            </button>
            <button
              onClick={() => setViewMode('byCourse')}
              className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-md transition-all flex items-center gap-2 ${
                viewMode === 'byCourse'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>📚 연수과정별 정리 탭 ({courseGroups.length})</span>
            </button>
          </div>

          {/* Controls Bar Right Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>수동 이수증 등록</span>
            </button>
            <button
              onClick={() => handleExportCSV()}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-green-600" />
              <span>전체 엑셀 다운로드</span>
            </button>
          </div>
        </div>

        {/* ----------------- VIEW MODE 1: ALL SUBMISSIONS ----------------- */}
        {viewMode === 'all' && (
          <div>
            {/* Filter Bar */}
            <div className="p-4 bg-white border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="교직원 성명, 연수과정명, 인증기관 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200 self-start sm:self-auto">
                <Filter className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
                {['전체', '교원', '행정직', '공무직', '기타'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                      selectedCategory === cat
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200/60'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Submissions Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                  <tr>
                    <th className="px-6 py-3.5">제출일시</th>
                    <th className="px-6 py-3.5">성명</th>
                    <th className="px-6 py-3.5">직급/직종</th>
                    <th className="px-6 py-3.5 min-w-[200px]">연수과정명</th>
                    <th className="px-6 py-3.5 text-center">이수시간</th>
                    <th className="px-6 py-3.5">인증기관</th>
                    <th className="px-6 py-3.5 text-center">이수번호</th>
                    <th className="px-6 py-3.5 text-right">상태 / 관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {filteredSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                        조건에 일치하는 이수증 제출 내역이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredSubmissions.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 text-xs font-mono text-slate-500 whitespace-nowrap">
                          {s.submittedAt}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-900 whitespace-nowrap">
                          {s.userName}
                        </td>
                        <td className="px-6 py-4 text-xs whitespace-nowrap">
                          <span className="font-semibold text-slate-800">{s.position}</span>
                          <span className="ml-1.5 px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {s.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">
                          {s.courseName}
                        </td>
                        <td className="px-6 py-4 text-sm text-center font-mono font-bold text-blue-700 whitespace-nowrap">
                          {s.hours}시간
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-600 whitespace-nowrap">
                          {s.issuer || '-'}
                        </td>
                        <td className="px-6 py-4 text-xs text-center font-mono text-slate-500 whitespace-nowrap">
                          {s.certificateNo || '-'}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded">
                              이수완료
                            </span>
                            <button
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `[${s.userName}] 교직원의 '${s.courseName}' 이수증 내역을 삭제하시겠습니까?`
                                  )
                                ) {
                                  onDeleteSubmission(s.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="삭제"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 flex justify-between items-center">
              <span>총 <strong className="text-slate-800">{filteredSubmissions.length}</strong>건 제출 기록</span>
              <span>2026 현동숲유치원 교직원 연수 관리</span>
            </div>
          </div>
        )}

        {/* ----------------- VIEW MODE 2: BY COURSE TABS ----------------- */}
        {viewMode === 'byCourse' && (
          <div className="p-6 space-y-6">
            {/* Header / Intro for By Course */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl p-5 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-blue-600/30 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-500/40">
                    자동 수집 분류
                  </span>
                  <span className="text-xs text-slate-400">
                    총 {courseGroups.length}개의 연수과정이 등록되었습니다.
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-1">
                  연수과정별 이수 교직원 취합 현황
                </h3>
              </div>

              {/* Course Search */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="연수과정명 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-800 border border-slate-700 text-white rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Course Selector Tabs (Horizontal Scroll / Rail) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <FolderCheck className="w-4 h-4 text-blue-600" />
                  연수과정 선택 탭
                </span>
                {selectedCourseName !== '전체' && (
                  <button
                    onClick={() => setSelectedCourseName('전체')}
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    전체 과정 보기
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                <button
                  onClick={() => setSelectedCourseName('전체')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold shrink-0 border transition-all flex items-center gap-2 ${
                    selectedCourseName === '전체'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>전체 연수과정</span>
                  <span className={`px-2 py-0.5 text-[10px] rounded-full font-extrabold ${
                    selectedCourseName === '전체' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {courseGroups.length}개
                  </span>
                </button>

                {courseGroups.map((group) => {
                  const isSelected = selectedCourseName === group.courseName;
                  return (
                    <button
                      key={group.courseName}
                      onClick={() => setSelectedCourseName(group.courseName)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold shrink-0 border transition-all flex items-center gap-2.5 max-w-xs truncate ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                          : 'bg-white text-slate-800 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
                      }`}
                    >
                      <span className="truncate">{group.courseName}</span>
                      <span className={`px-2 py-0.5 text-[10px] rounded-full font-extrabold shrink-0 ${
                        isSelected ? 'bg-white text-blue-700' : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {group.submissions.length}명
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filtered Course Cards or Detail Table */}
            {filteredCourseGroups.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-xl border border-slate-200 text-slate-400 text-xs">
                검색된 연수과정이 없거나 제출 내역이 없습니다.
              </div>
            ) : (
              <div className="space-y-6">
                {filteredCourseGroups.map((group) => (
                  <div
                    key={group.courseName}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                  >
                    {/* Course Group Banner */}
                    <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-[11px] font-bold rounded">
                            과정명
                          </span>
                          <span className="text-xs text-slate-500 font-mono">
                            총 {group.totalHours}시간 / {Array.from(group.issuers).join(', ') || '기관미지정'}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-blue-600 shrink-0" />
                          <span>{group.courseName}</span>
                        </h4>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="text-xs text-slate-500 font-medium">이수 교직원</div>
                          <div className="text-lg font-black text-blue-600">
                            {group.uniqueStaff.size}명 제출
                          </div>
                        </div>

                        <button
                          onClick={() =>
                            handleExportCSV(
                              group.submissions,
                              `2026_현동숲유치원_연수과정_${group.courseName.replace(/[^a-zA-Z0-9가-힣]/g, '_')}`
                            )
                          }
                          className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                          title="이 연수과정 이수자 명단만 엑셀 다운로드"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" />
                          <span>과정별 엑셀</span>
                        </button>
                      </div>
                    </div>

                    {/* Submissions List under this Course */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-100/70 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                          <tr>
                            <th className="px-6 py-3">교직원 성명</th>
                            <th className="px-6 py-3">직급 / 직종</th>
                            <th className="px-6 py-3 text-center">이수시간</th>
                            <th className="px-6 py-3">발급기관</th>
                            <th className="px-6 py-3 text-center">이수번호</th>
                            <th className="px-6 py-3">제출일시</th>
                            <th className="px-6 py-3 text-right">관리</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-800">
                          {group.submissions.map((s) => (
                            <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                                {s.userName}
                              </td>
                              <td className="px-6 py-3.5 text-xs whitespace-nowrap">
                                <span className="font-semibold text-slate-800">{s.position}</span>
                                <span className="ml-1.5 px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-600 border border-slate-200">
                                  {s.category}
                                </span>
                              </td>
                              <td className="px-6 py-3.5 text-xs text-center font-bold text-blue-700 whitespace-nowrap">
                                {s.hours}시간
                              </td>
                              <td className="px-6 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                                {s.issuer || '-'}
                              </td>
                              <td className="px-6 py-3.5 text-xs text-center font-mono text-slate-500 whitespace-nowrap">
                                {s.certificateNo || '-'}
                              </td>
                              <td className="px-6 py-3.5 text-xs font-mono text-slate-500 whitespace-nowrap">
                                {s.submittedAt}
                              </td>
                              <td className="px-6 py-3.5 text-right whitespace-nowrap">
                                <button
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        `[${s.userName}] 교직원의 '${s.courseName}' 이수증 내역을 삭제하시겠습니까?`
                                      )
                                    ) {
                                      onDeleteSubmission(s.id);
                                    }
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="내역 삭제"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manual Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                <span>관리자 수동 이수증 등록</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    교직원 성명 *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="예: 홍길동"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    직급/직위 *
                  </label>
                  <input
                    type="text"
                    required
                    value={manualPosition}
                    onChange={(e) => setManualPosition(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    직종 *
                  </label>
                  <select
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value as StaffCategory)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  >
                    <option value="교원">교원</option>
                    <option value="행정직">행정직</option>
                    <option value="공무직">공무직</option>
                    <option value="기타">기타</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    이수시간 *
                  </label>
                  <input
                    type="number"
                    required
                    step="0.5"
                    value={manualHours}
                    onChange={(e) => setManualHours(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  연수과정명 *
                </label>
                <input
                  type="text"
                  required
                  placeholder="예: 2026 유아언어발달 직무연수"
                  value={manualCourse}
                  onChange={(e) => setManualCourse(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    인증기관명
                  </label>
                  <input
                    type="text"
                    value={manualIssuer}
                    onChange={(e) => setManualIssuer(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    이수번호
                  </label>
                  <input
                    type="text"
                    placeholder="예: 2026-001"
                    value={manualCertNo}
                    onChange={(e) => setManualCertNo(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                >
                  등록 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

