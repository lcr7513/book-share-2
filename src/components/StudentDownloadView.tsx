import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { TrackedFile } from '../types';
import { 
  FileDown, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  QrCode, 
  ExternalLink,
  BookOpen,
  Info,
  Download
} from 'lucide-react';
import { getViewUrl } from '../utils/driveHelper';

interface StudentDownloadViewProps {
  file: TrackedFile;
  onRecordDownload: (fileId: string) => void;
  onExitStudentMode?: () => void;
}

export const StudentDownloadView: React.FC<StudentDownloadViewProps> = ({ 
  file, 
  onRecordDownload,
  onExitStudentMode 
}) => {
  const [countdown, setCountdown] = useState<number>(3);
  const [hasStartedDownload, setHasStartedDownload] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const originUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const directDownloadUrl = `${originUrl}/api/download/${file.id}/direct?skipCount=1`;
  const gdriveOfficialUrl = `https://drive.google.com/uc?export=download&id=${file.driveFileId}`;

  // Generate QR code locally for students on mobile
  useEffect(() => {
    const studentShareUrl = `${originUrl}/?file=${file.id}`;
    QRCode.toDataURL(studentShareUrl, {
      width: 280,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error(err));
  }, [file.id, originUrl]);

  const triggerDownload = (type: 'proxy' | 'gdrive' = 'proxy') => {
    setHasStartedDownload(true);
    onRecordDownload(file.id);

    if (type === 'proxy') {
      // Trigger file download via location navigation (never blocked by popup blocker)
      window.location.href = directDownloadUrl;
    } else {
      window.open(gdriveOfficialUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Optional auto-download attempt after countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Try auto download
          triggerDownload('proxy');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [file.id]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-3 sm:p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden my-4">
        {/* Top Header */}
        <div className="bg-linear-to-r from-blue-600 via-indigo-600 to-blue-700 px-6 py-6 text-white text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shadow-inner">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight">
            학생 학습 &middot; 과제 자료 다운로드
          </h1>
          <p className="text-xs text-blue-100 mt-1">
            공식 구글 드라이브 연동 배포 시스템
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 text-center space-y-5">
          {/* File Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 uppercase">
                {file.category}
              </span>
              <span className="text-xs font-mono text-slate-500 font-semibold">
                {file.size}
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 break-words leading-snug mb-1">
              {file.name}
            </h2>
            {file.description && (
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {file.description}
              </p>
            )}
          </div>

          {/* Countdown / Download Status */}
          <div>
            {countdown > 0 ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                <Clock className="w-3.5 h-3.5 animate-spin text-amber-600" />
                <span>
                  <strong className="text-amber-900 font-bold text-sm">{countdown}초</strong> 후 자동 다운로드가 시작됩니다...
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>다운로드가 요청되었습니다. 파일 저장을 확인해주세요.</span>
              </div>
            )}
          </div>

          {/* Main Action Buttons */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => triggerDownload('proxy')}
              className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              <span>지금 바로 파일 다운로드</span>
            </button>

            <button
              type="button"
              onClick={() => triggerDownload('gdrive')}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>구글 드라이브 원본에서 직접 받기</span>
            </button>

            <a
              href={getViewUrl(file.driveFileId, file.driveUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 px-4 rounded-xl text-slate-500 hover:text-slate-800 font-medium text-xs flex items-center justify-center gap-1 transition-colors"
            >
              <ExternalLink className="w-3 h-3 text-slate-400" />
              <span>웹 뷰어로 내용 미리보기</span>
            </a>
          </div>

          {/* QR Code Section for Friends / Mobile */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
              <QrCode className="w-4 h-4 text-blue-600" />
              <span>친구에게 공유하거나 스마트폰으로 받으려면?</span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              스마트폰 카메라로 비추면 이 학습 자료 다운로드 페이지가 열립니다.
            </p>
            <div className="inline-block p-2.5 bg-white rounded-2xl border border-slate-200 shadow-xs">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`${file.name} QR코드`}
                  className="w-36 h-36 object-contain"
                />
              ) : (
                <div className="w-36 h-36 flex items-center justify-center text-xs text-slate-400">
                  QR 로딩 중...
                </div>
              )}
            </div>
          </div>

          {/* Footer Safety Notice */}
          <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>바이러스 검사가 완료된 안전한 공식 구글 드라이브 파일입니다</span>
          </div>

          {/* Teacher Admin Switch (Optional) */}
          {onExitStudentMode && (
            <div className="pt-1">
              <button
                type="button"
                onClick={onExitStudentMode}
                className="text-[11px] text-slate-400 hover:text-slate-600 underline cursor-pointer"
              >
                교사용 전체 관리 화면으로 돌아가기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
