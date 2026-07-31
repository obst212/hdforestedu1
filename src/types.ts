export type StaffCategory = '교원' | '행정직' | '공무직' | '기타';

export interface CertificateSubmission {
  id: string;
  submittedAt: string; // e.g., '2026-07-31 14:30'
  userName: string; // 성명
  position: string; // 직급/직위 (e.g. 원장, 원감, 교사, 수석교사, 행정실장 등)
  category: StaffCategory; // 직종
  certificateNo: string; // 이수번호
  hours: number; // 이수시간
  completionDate: string; // 이수완료일자 (YYYY-MM-DD)
  issuer: string; // 인증기관명
  courseName: string; // 연수과정명
  isCompleted: boolean; // 이수여부 (default: true)
  isSubmitted: boolean; // 제출완료여부 (default: true)
  fileName?: string; // 파일명
  fileData?: string; // Base64 or URL if stored
}

export interface GeminiExtractionResult {
  certificateNo: string;
  hours: number;
  completionDate: string;
  issuer: string;
  courseName: string;
}

export interface AdminStats {
  totalSubmittedCount: number;
  totalHoursSum: number;
  uniqueStaffCount: number;
  completionRate: number; // percentage
  targetStaffCount: number;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
