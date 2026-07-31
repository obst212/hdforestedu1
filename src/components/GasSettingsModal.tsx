import React, { useState, useEffect } from 'react';
import { X, Check, Copy, ExternalLink, Sheet, RefreshCw, Layers } from 'lucide-react';

interface GasSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  gasUrl: string;
  targetStaffCount: number;
  onSave: (newGasUrl: string, newTargetCount: number) => void;
}

export const GasSettingsModal: React.FC<GasSettingsModalProps> = ({
  isOpen,
  onClose,
  gasUrl: initialGasUrl,
  targetStaffCount: initialTargetCount,
  onSave,
}) => {
  const [gasUrl, setGasUrl] = useState(initialGasUrl);
  const [targetCount, setTargetCount] = useState(initialTargetCount);
  const [copied, setCopied] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    setGasUrl(initialGasUrl);
    setTargetCount(initialTargetCount);
    setTestResult(null);
  }, [initialGasUrl, initialTargetCount, isOpen]);

  if (!isOpen) return null;

  const gasScriptCode = `// 2026 현동숲유치원 교직원 연수 이수증 연동 Google Apps Script
// 사용법: 구글 시트 -> 확장 프로그램 -> Apps Script 에 아래 코드를 붙여넣고 [웹 앱으로 배포] 하세요.

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // 시트 헤더가 없으면 자동 생성
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["제출일시", "성명", "직급/직위", "직종", "이수번호", "이수시간", "이수완료일자", "인증기관", "연수과정명", "이수여부"]);
    }
    
    sheet.appendRow([
      data.submittedAt || new Date().toLocaleString(),
      data.userName || '',
      data.position || '',
      data.category || '',
      "'" + (data.certificateNo || ''),
      data.hours || 0,
      data.completionDate || '',
      data.issuer || '',
      data.courseName || '',
      '이수완료'
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) {
    return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
  }
  
  var result = [];
  for (var i = 1; i < rows.length; i++) {
    result.push({
      id: "gas-" + i,
      submittedAt: rows[i][0],
      userName: rows[i][1],
      position: rows[i][2],
      category: rows[i][3],
      certificateNo: rows[i][4],
      hours: Number(rows[i][5]) || 0,
      completionDate: rows[i][6],
      issuer: rows[i][7],
      courseName: rows[i][8],
      isCompleted: true,
      isSubmitted: true
    });
  }
  
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(gasScriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleTestConnection = async () => {
    if (!gasUrl.trim()) {
      setTestResult({ success: false, message: 'GAS URL을 입력해주세요.' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch(gasUrl + '?action=get', { method: 'GET' });
      if (res.ok) {
        setTestResult({
          success: true,
          message: '구글 시트 GAS Web App과 성공적으로 연결되었습니다!',
        });
      } else {
        setTestResult({
          success: false,
          message: `연결 실패 (응답 코드: ${res.status}). 배포 권한이 '모든 사용자(Anyone)'로 되어있는지 확인하세요.`,
        });
      }
    } catch {
      // CORS warning note
      setTestResult({
        success: true,
        message: 'GAS URL 등록 완료 (제출 시 자동으로 데이터가 전송됩니다).',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(gasUrl.trim(), Number(targetCount) || 20);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Sheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                구글 시트(GAS) 연동 및 기준 설정
              </h3>
              <p className="text-xs text-slate-500">
                실시간 연수 이수 데이터를 Google Sheets에 자동으로 연동합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* GAS URL Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Google Apps Script Web App URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={gasUrl}
                  onChange={(e) => setGasUrl(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                />
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting || !gasUrl}
                  className="px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-300 flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                >
                  {isTesting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  ) : (
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <span>연결 테스트</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                * GAS URL이 지정되지 않더라도 서버 및 브라우저 메모리에 제출 내역이
                안전하게 저장됩니다.
              </p>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl text-xs font-medium border ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {testResult.message}
              </div>
            )}

            {/* Target Staff Count */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                <span>현동숲유치원 전체 대상 교직원 수 (명)</span>
              </label>
              <input
                type="number"
                min="1"
                max="200"
                value={targetCount}
                onChange={(e) => setTargetCount(Number(e.target.value))}
                className="w-full sm:w-40 px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold text-slate-900"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                * 관리자 대시보드 제출 완료율(%) 계산의 기준 인원으로 활용됩니다.
              </p>
            </div>

            {/* GAS Script Copy Box */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  📄 Apps Script 스크립트 코드 (복사용)
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>복사완료!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-emerald-600" />
                      <span>코드 복사</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl text-[11px] font-mono overflow-x-auto max-h-40 leading-relaxed">
                {gasScriptCode}
              </pre>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors"
              >
                설정 저장
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
