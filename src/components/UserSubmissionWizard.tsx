import React, { useState } from 'react';
import {
  CertificateSubmission,
  StaffCategory,
  GeminiExtractionResult,
} from '../types';
import {
  User,
  FileText,
  UploadCloud,
  CheckCircle,
  Sparkles,
  Calendar,
  Clock,
  Building,
  Award,
  RefreshCw,
  PlusCircle,
  AlertCircle,
  FileCheck2,
  Users,
} from 'lucide-react';

interface UserSubmissionWizardProps {
  submissions: CertificateSubmission[];
  onSubmitSuccess: (newSubmission: CertificateSubmission, msg: string) => void;
  onError: (msg: string) => void;
}

export const UserSubmissionWizard: React.FC<UserSubmissionWizardProps> = ({
  submissions,
  onSubmitSuccess,
  onError,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1 State
  const [userName, setUserName] = useState<string>('');
  const [position, setPosition] = useState<string>('');
  const [category, setCategory] = useState<StaffCategory>('교원');

  // Step 2 State
  const [inputTab, setInputTab] = useState<'ai' | 'manual'>('ai');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState<boolean>(false);
  const [aiSuccess, setAiSuccess] = useState<boolean>(false);

  // 7 Extracted / Input Fields
  const [certificateNo, setCertificateNo] = useState<string>('');
  const [hours, setHours] = useState<string>('15');
  const [completionDate, setCompletionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [issuer, setIssuer] = useState<string>('');
  const [courseName, setCourseName] = useState<string>('');

  // Step 3 State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Quick Position Recommendations
  const positionPresets = [
    '원장',
    '원감',
    '교사',
    '수석교사',
    '행정실장',
    '주무관',
    '조리사',
    '방과후전담사',
  ];

  // Handle Step 1 -> Step 2
  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) {
      onError('성명을 입력해주세요.');
      return;
    }
    if (!position.trim()) {
      onError('직급/직위를 선택하거나 입력해주세요.');
      return;
    }
    setCurrentStep(2);
  };

  // Convert File to Base64 with optional Image Compression
  const fileToBase64 = (file: File): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      // If image file, compress via canvas to avoid giant payload errors
      if (file.type.startsWith('image/')) {
        const img = new Image();
        const reader = new FileReader();
        reader.onload = (e) => {
          const rawUrl = e.target?.result as string;
          img.src = rawUrl;
          img.onload = () => {
            const maxWidth = 1600;
            let width = img.width;
            let height = img.height;
            if (width > maxWidth || height > maxWidth) {
              if (width > height) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
              } else {
                width = Math.round((width * maxWidth) / height);
                height = maxWidth;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              return resolve({ base64: rawUrl, mimeType: file.type });
            }
            ctx.drawImage(img, 0, 0, width, height);
            const compressedUrl = canvas.toDataURL('image/jpeg', 0.82);
            resolve({
              base64: compressedUrl,
              mimeType: 'image/jpeg',
            });
          };
          img.onerror = () => {
            resolve({ base64: rawUrl, mimeType: file.type || 'image/jpeg' });
          };
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
      } else {
        // PDF or other documents
        const reader = new FileReader();
        reader.onload = () => {
          const base64Str = reader.result as string;
          // Check payload size for Vercel 4.5MB limit
          if (base64Str.length > 3.2 * 1024 * 1024) {
            return reject(new Error('PDF 파일 용량이 너무 큽니다 (Vercel 서버 수신 제한 3MB 초과). 3MB 이하의 PDF 또는 이미지 파일로 업로드하시거나 아래에서 \'직접 입력\'을 이용해 주세요.'));
          }
          resolve({
            base64: base64Str,
            mimeType: file.type || 'application/pdf',
          });
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
      }
    });
  };

  // Safe helper to parse JSON responses and handle Vercel serverless errors gracefully
  const safeParseJson = async (res: Response) => {
    const text = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    if (data) {
      if (data.error) {
        throw new Error(data.error);
      }
      return data;
    }

    // Handle non-JSON HTML response cases (Vercel Serverless Function errors)
    if (res.status === 413) {
      throw new Error('파일 용량이 Vercel 서버 제한(4.5MB)을 초과했습니다. 3MB 이하의 PDF/이미지를 업로드해 주세요.');
    }
    if (res.status === 504 || res.status === 500) {
      throw new Error(`Vercel 서버 처리 중 오류(HTTP ${res.status})가 발생했습니다. Vercel 환경변수 (GEMINI_API_KEY) 설정 상태를 확인하시거나 하단 '직접 입력'을 이용해 주세요.`);
    }
    if (!res.ok) {
      throw new Error(`서버 응답 오류 (HTTP ${res.status}). 하단 양식에서 직접 입력할 수 있습니다.`);
    }
    throw new Error('서버에서 올바르지 않은 응답이 반환되었습니다. 하단 양식에서 직접 입력해 주세요.');
  };

  // Handle File Selection and AI Extraction
  const handleFileChange = async (file: File) => {
    setSelectedFile(file);
    setAiSuccess(false);

    // Check file size warning (> 20MB)
    if (file.size > 20 * 1024 * 1024) {
      onError('파일 용량이 20MB를 초과합니다. 10MB 이하의 이수증 파일(PDF 또는 이미지)을 업로드해주세요.');
      return;
    }

    // Image preview
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setFilePreview(url);
    } else {
      setFilePreview(null);
    }

    // Call /api/gemini
    setIsAiProcessing(true);
    try {
      const { base64: base64Data, mimeType } = await fileToBase64(file);
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileData: base64Data,
          mimeType: mimeType,
          fileName: file.name,
        }),
      });

      const json = await safeParseJson(res);

      if (res.ok && json.success && json.data) {
        const ext: GeminiExtractionResult = json.data;
        if (ext.certificateNo) setCertificateNo(ext.certificateNo);
        if (ext.hours !== undefined) setHours(String(ext.hours));
        if (ext.completionDate) setCompletionDate(ext.completionDate);
        if (ext.issuer) setIssuer(ext.issuer);
        if (ext.courseName) setCourseName(ext.courseName);

        setAiSuccess(true);
      } else {
        onError(
          json.error || 'Gemini AI 추출 중 오류가 발생했습니다. 직접 입력해 주세요.'
        );
      }
    } catch (err: any) {
      onError('AI 분석 오류: ' + (err.message || '서버 통신 실패'));
    } finally {
      setIsAiProcessing(false);
    }
  };

  // Handle Step 2 Submission
  const handleSubmitCertificate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userName.trim() || !position.trim()) {
      onError('교직원 정보(성명, 직급)를 확인해주세요.');
      setCurrentStep(1);
      return;
    }
    if (!courseName.trim()) {
      onError('연수과정명을 입력해주세요.');
      return;
    }
    if (!hours || Number(hours) <= 0) {
      onError('이수시간은 0보다 큰 수치이어야 합니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        userName: userName.trim(),
        position: position.trim(),
        category,
        certificateNo: certificateNo.trim(),
        hours: Number(hours) || 0,
        completionDate,
        issuer: issuer.trim(),
        courseName: courseName.trim(),
        fileName: selectedFile ? selectedFile.name : '직접 입력',
      };

      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await safeParseJson(res);

      if (res.ok && json.success && json.submission) {
        onSubmitSuccess(json.submission, json.message);
        setCurrentStep(3);
      } else {
        onError(json.error || '제출 저장에 실패했습니다.');
      }
    } catch (err: any) {
      onError('제출 오류: ' + (err.message || '서버 연결 실패'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset for another submission
  const handleAddNew = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setCertificateNo('');
    setHours('15');
    setIssuer('');
    setCourseName('');
    setAiSuccess(false);
    setCurrentStep(2);
  };

  // Filter My Submissions
  const mySubmissions = submissions.filter(
    (s) => s.userName.trim().toLowerCase() === userName.trim().toLowerCase()
  );
  const myTotalHours = mySubmissions.reduce((acc, s) => acc + s.hours, 0);
  const kindergartenTotalHours = submissions.reduce((acc, s) => acc + s.hours, 0);

  return (
    <div className="space-y-6">
      {/* Wizard Progress Stepper */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between max-w-2xl mx-auto relative">
          {/* Progress Bar Line */}
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-100 -translate-y-1/2 -z-0 rounded-full" />
          <div
            className="absolute top-1/2 left-0 h-1 bg-emerald-500 -translate-y-1/2 -z-0 rounded-full transition-all duration-300"
            style={{
              width:
                currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%',
            }}
          />

          {/* Step 1 Circle */}
          <div className="relative z-10 flex flex-col items-center gap-1.5">
            <button
              onClick={() => setCurrentStep(1)}
              className={`w-9 h-9 sm:w-11 sm:h-11 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center transition-all duration-200 shadow-xs ${
                currentStep >= 1
                  ? 'bg-emerald-600 text-white shadow-emerald-200 ring-4 ring-emerald-50'
                  : 'bg-white text-slate-400 border border-slate-300'
              }`}
            >
              1
            </button>
            <span className="text-xs font-semibold text-slate-800 hidden sm:block">
              교직원 정보
            </span>
          </div>

          {/* Step 2 Circle */}
          <div className="relative z-10 flex flex-col items-center gap-1.5">
            <button
              onClick={() => userName && position && setCurrentStep(2)}
              disabled={!userName || !position}
              className={`w-9 h-9 sm:w-11 sm:h-11 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center transition-all duration-200 shadow-xs ${
                currentStep >= 2
                  ? 'bg-emerald-600 text-white shadow-emerald-200 ring-4 ring-emerald-50'
                  : 'bg-white text-slate-400 border border-slate-300'
              }`}
            >
              2
            </button>
            <span className="text-xs font-semibold text-slate-800 hidden sm:block">
              이수증 첨부 & AI
            </span>
          </div>

          {/* Step 3 Circle */}
          <div className="relative z-10 flex flex-col items-center gap-1.5">
            <div
              className={`w-9 h-9 sm:w-11 sm:h-11 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center transition-all duration-200 shadow-xs ${
                currentStep === 3
                  ? 'bg-emerald-600 text-white shadow-emerald-200 ring-4 ring-emerald-50'
                  : 'bg-white text-slate-400 border border-slate-300'
              }`}
            >
              3
            </div>
            <span className="text-xs font-semibold text-slate-800 hidden sm:block">
              제출 및 현황
            </span>
          </div>
        </div>
      </div>

      {/* STEP 1: 교직원 정보 입력 */}
      {currentStep === 1 && (
        <form
          onSubmit={handleStep1Next}
          className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6"
        >
          <div className="border-b border-slate-100 pb-4">
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full inline-flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> 1단계: 교직원 기본 정보
            </span>
            <h2 className="text-lg font-bold text-slate-900 mt-2">
              제출자 인적사항 입력
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              이수증 취합 명부에 기록될 본인의 정확한 성명과 직급/직종을 선택해주세요.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 성명 */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                성명 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="예: 김숲아"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-4 py-3 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium text-slate-900"
              />
            </div>

            {/* 직급 / 직위 */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                직급 / 직위 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="예: 원장, 원감, 교사 등"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full px-4 py-3 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium text-slate-900 mb-2"
              />
              {/* Quick Preset Badges */}
              <div className="flex flex-wrap gap-1.5">
                {positionPresets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPosition(p)}
                    className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                      position === p
                        ? 'bg-emerald-600 text-white border-emerald-600 font-semibold'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 직종 선택 */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2">
              직종 <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(['교원', '행정직', '공무직', '기타'] as StaffCategory[]).map(
                (cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`p-3.5 rounded-xl border text-center transition-all ${
                      category === cat
                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-900 font-bold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <div className="text-sm">{cat}</div>
                  </button>
                )
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-200 flex items-center gap-2 transition-all active:scale-98"
            >
              <span>이수증 첨부 및 AI 분석 단계로 (2단계)</span>
            </button>
          </div>
        </form>
      )}

      {/* STEP 2: 이수증 첨부 및 AI 추출 */}
      {currentStep === 2 && (
        <form
          onSubmit={handleSubmitCertificate}
          className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6"
        >
          <div className="border-b border-slate-100 pb-4 flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> 2단계: 이수증 등록 및 정보
                확인
              </span>
              <h2 className="text-lg font-bold text-slate-900 mt-2">
                이수증 PDF/이미지 첨부 (Gemini AI 추출)
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline"
            >
              ← 교직원 정보 수정
            </button>
          </div>

          {/* User Info Badge Banner */}
          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900">{userName}</span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-700">{position}</span>
              <span className="bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-md text-[11px]">
                {category}
              </span>
            </div>
            <span className="text-slate-500 font-medium">제출자 정보 확인 완료</span>
          </div>

          {/* Mode Tabs: AI Upload vs Manual */}
          <div className="flex border-b border-slate-200">
            <button
              type="button"
              onClick={() => setInputTab('ai')}
              className={`py-3 px-4 font-bold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-2 ${
                inputTab === 'ai'
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>PDF/이미지 첨부 (Gemini AI 자동입력)</span>
            </button>
            <button
              type="button"
              onClick={() => setInputTab('manual')}
              className={`py-3 px-4 font-bold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-2 ${
                inputTab === 'manual'
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-4 h-4 text-slate-500" />
              <span>직접 입력</span>
            </button>
          </div>

          {/* Tab 1: AI Auto Extraction Upload Box */}
          {inputTab === 'ai' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/20 rounded-2xl p-6 text-center transition-all cursor-pointer relative">
                <input
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileChange(e.target.files[0]);
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

                {isAiProcessing ? (
                  <div className="flex flex-col items-center justify-center py-6 space-y-3">
                    <RefreshCw className="w-10 h-10 text-emerald-600 animate-spin" />
                    <div>
                      <p className="font-bold text-sm text-slate-900">
                        Gemini AI가 이수증 문서를 분석 중입니다...
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        이수번호, 이수시간, 이수완료일자, 발급기관, 연수명을 자동으로 추출합니다.
                      </p>
                    </div>
                  </div>
                ) : selectedFile ? (
                  <div className="flex flex-col items-center justify-center py-2 space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <FileCheck2 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • 다른 파일로 변경하려면 클릭하세요.
                      </p>
                    </div>
                    {aiSuccess && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full mt-2">
                        <Sparkles className="w-3.5 h-3.5" /> AI 자동 정보 추출 완료!
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-xs">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900">
                        이수증 파일(PDF, PNG, JPG)을 드래그하거나 클릭하여 업로드하세요
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Gemini AI가 이수증의 5개 필수 항목을 자동으로 분석해드립니다.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {filePreview && (
                <div className="max-w-xs mx-auto rounded-xl overflow-hidden border border-slate-200 shadow-xs">
                  <img
                    src={filePreview}
                    alt="이수증 미리보기"
                    className="w-full h-auto max-h-48 object-contain bg-slate-100"
                  />
                </div>
              )}
            </div>
          )}

          {/* 7 Integrated Form Fields Section */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-600" />
              <span>이수증 항목 확인 및 검토 (필수 7개 항목)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. 성명 */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  1. 성명 (1단계에서 전달됨)
                </label>
                <input
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white font-medium text-slate-900"
                />
              </div>

              {/* 2. 직급/직위 */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  2. 직급 / 직위 (1단계에서 전달됨)
                </label>
                <input
                  type="text"
                  required
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white font-medium text-slate-900"
                />
              </div>

              {/* 3. 이수번호 */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <span>3. 이수번호</span>
                  {aiSuccess && (
                    <span className="text-[10px] text-emerald-600 font-bold">
                      (AI 추출됨)
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  placeholder="예: 2026-HD-0012"
                  value={certificateNo}
                  onChange={(e) => setCertificateNo(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500/20 font-mono text-slate-900"
                />
              </div>

              {/* 4. 이수시간 */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>4. 이수시간 (시간) *</span>
                </label>
                <input
                  type="number"
                  required
                  step="0.5"
                  min="0.5"
                  placeholder="예: 15"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500/20 font-bold text-slate-900"
                />
              </div>

              {/* 5. 이수완료일자 */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>5. 이수완료일자 *</span>
                </label>
                <input
                  type="date"
                  required
                  value={completionDate}
                  onChange={(e) => setCompletionDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500/20 font-medium text-slate-900"
                />
              </div>

              {/* 6. 인증기관명 */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-emerald-600" />
                  <span>6. 인증기관명 *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="예: 경상남도교육청연수원"
                  value={issuer}
                  onChange={(e) => setIssuer(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500/20 font-medium text-slate-900"
                />
              </div>

              {/* 7. 연수명 (Full Width) */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  7. 연수과정명 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="예: 2026 유치원 교원 안전교육 및 누리과정 직무연수"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500/20 font-medium text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Submission Submit Button */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
            >
              이전 단계
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isAiProcessing}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-200 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>제출 및 구글 시트 저장 중...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>이수증 제출 (구글 시트 자동 입력)</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* STEP 3: 제출 완료 및 현황 조회 */}
      {currentStep === 3 && (
        <div className="space-y-6">
          {/* Success Banner Card */}
          <div className="bg-emerald-600 text-white rounded-2xl p-6 sm:p-8 shadow-lg shadow-emerald-200 relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl" />
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <div>
                  <span className="text-xs font-bold text-emerald-100 bg-emerald-800/50 px-2.5 py-0.5 rounded-full inline-block mb-1">
                    제출 완료되었습니다
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                    {userName} {position}님, 연수 이수증 제출이 완료되었습니다!
                  </h2>
                  <p className="text-xs text-emerald-100 mt-1">
                    현동숲유치원 교직원 연수 취합 시스템 및 구글 시트에 데이터가 기록되었습니다.
                  </p>
                </div>
              </div>

              <button
                onClick={handleAddNew}
                className="px-5 py-2.5 bg-white text-emerald-900 font-bold text-xs sm:text-sm rounded-xl shadow-sm hover:bg-emerald-50 transition-all shrink-0 flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4 text-emerald-700" />
                <span>추가 이수증 제출하기</span>
              </button>
            </div>
          </div>

          {/* Personal & School Summary Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>내 제출 건수</span>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {mySubmissions.length}건
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>내 누적 이수시간</span>
              </div>
              <div className="text-2xl font-black text-amber-600 mt-2">
                {myTotalHours} 시간
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-teal-600" />
                <span>현동숲유치원 전체 누계 이수시간</span>
              </div>
              <div className="text-2xl font-black text-teal-700 mt-2">
                {kindergartenTotalHours} 시간
              </div>
            </div>
          </div>

          {/* My Submitted Certificates Cards List */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600" />
              <span>실시간 내 이수증 제출 내역 ({mySubmissions.length}건)</span>
            </h3>

            {mySubmissions.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                아직 제출한 이수증 내역이 없습니다.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {mySubmissions.map((s) => (
                  <div
                    key={s.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-sm text-slate-900 line-clamp-1">
                        {s.courseName}
                      </h4>
                      <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md text-[11px] shrink-0">
                        {s.hours}시간
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1 border-t border-slate-200/60">
                      <div>
                        <span className="text-slate-400">발급기관:</span>{' '}
                        {s.issuer || '-'}
                      </div>
                      <div>
                        <span className="text-slate-400">이수일자:</span>{' '}
                        {s.completionDate || '-'}
                      </div>
                      <div>
                        <span className="text-slate-400">이수번호:</span>{' '}
                        <span className="font-mono">{s.certificateNo || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">제출일시:</span>{' '}
                        {s.submittedAt}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
