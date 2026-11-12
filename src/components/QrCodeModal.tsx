import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { TrackedFile } from '../types';
import { 
  X, 
  QrCode, 
  Copy, 
  Check, 
  Download, 
  ExternalLink, 
  Printer, 
  ShieldCheck,
  Smartphone,
  Globe,
  FileDown,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

interface QrCodeModalProps {
  file: TrackedFile;
  onClose: () => void;
}

type LinkType = 'student_page' | 'direct_stream' | 'gdrive_official';

export const QrCodeModal: React.FC<QrCodeModalProps> = ({ file, onClose }) => {
  const [selectedLinkType, setSelectedLinkType] = useState<LinkType>('student_page');
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGeneratingQr, setIsGeneratingQr] = useState<boolean>(true);

  // Dynamic origin URL
  const originUrl = typeof window !== 'undefined' ? window.location.origin : '';

  // 1. Student dedicated landing view: shows this file card only (no admin UI)
  const studentPageUrl = `${originUrl}/?file=${file.id}`;

  // 2. Direct counter download: downloads file immediately and increments count
  const directDownloadUrl = `${originUrl}/api/download/${file.id}/direct`;

  // 3. Official Google Drive direct download
  const gdriveOfficialUrl = `https://drive.google.com/uc?export=download&id=${file.driveFileId}`;

  // Currently active link for QR generation
  const activeUrl = 
    selectedLinkType === 'student_page' 
      ? studentPageUrl 
      : selectedLinkType === 'direct_stream' 
      ? directDownloadUrl 
      : gdriveOfficialUrl;

  // Generate high-resolution QR code locally via JavaScript (no external server dependency)
  useEffect(() => {
    setIsGeneratingQr(true);
    QRCode.toDataURL(activeUrl, {
      width: 380,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        setQrDataUrl(url);
        setIsGeneratingQr(false);
      })
      .catch((err) => {
        console.error('Failed to generate local QR code:', err);
        setIsGeneratingQr(false);
      });
  }, [activeUrl]);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleDownloadQrImage = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    const typeLabel = selectedLinkType === 'student_page' ? '학생화면' : selectedLinkType === 'direct_stream' ? '직다운로드' : '드라이브';
    a.download = `QR코드_${typeLabel}_${file.name.replace(/\.[^/.]+$/, '')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    if (!qrDataUrl) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const linkTitle = 
      selectedLinkType === 'student_page' 
        ? '학생 전용 다운로드 페이지' 
        : selectedLinkType === 'direct_stream' 
        ? '즉시 파일 다운로드' 
        : '구글 드라이브 원본 다운로드';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${file.name} - 학생 배포용 QR코드</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; padding: 40px; margin: 0; background: #fff; }
          .container { max-width: 480px; margin: 0 auto; border: 2px dashed #94a3b8; border-radius: 24px; padding: 36px; box-sizing: border-box; }
          .badge { display: inline-block; background: #dbeafe; color: #1e40af; padding: 5px 14px; border-radius: 999px; font-size: 13px; font-weight: bold; margin-bottom: 14px; }
          h2 { margin: 0 0 10px; font-size: 22px; color: #0f172a; word-break: break-all; line-height: 1.3; }
          p { color: #64748b; font-size: 14px; margin: 0 0 24px; }
          img { width: 280px; height: 280px; margin-bottom: 16px; border-radius: 12px; }
          .meta { font-size: 12px; color: #64748b; margin-bottom: 16px; font-family: monospace; }
          .footer { font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="badge">수업 &middot; 과제 학습 자료 (${linkTitle})</div>
          <h2>${file.name}</h2>
          <p>스마트폰 기본 카메라로 아래 QR 코드를 비추면 자료를 바로 다운로드할 수 있습니다.</p>
          <img src="${qrDataUrl}" alt="QR코드" />
          <div class="meta">자료 용량: ${file.size} &middot; 공식 파일 ID: ${file.driveFileId}</div>
          <div class="footer">안전한 구글 드라이브 학습 자료 연동 시스템</div>
        </div>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden relative my-6">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-bold">학생 배포용 QR코드 &amp; 다운로드 링크 생성</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-center">
          {/* Target File Info Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 uppercase">
                {file.category}
              </span>
              <span className="text-xs font-mono text-slate-500 font-semibold">
                용량: {file.size} &middot; 누적: {file.downloadCount}회
              </span>
            </div>
            <div className="text-sm font-bold text-slate-900 break-words leading-snug">
              {file.name}
            </div>
            {file.description && (
              <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                {file.description}
              </p>
            )}
          </div>

          {/* Link Type Selector Tabs */}
          <div className="space-y-1.5 text-left">
            <label className="text-xs font-bold text-slate-700 block">
              생성할 QR코드 &amp; 링크 방식 선택:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Type 1: Student Landing Page */}
              <button
                type="button"
                onClick={() => setSelectedLinkType('student_page')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedLinkType === 'student_page'
                    ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-100'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-blue-900 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-blue-600" />
                    학생 전용 화면
                  </span>
                  <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.2 rounded">
                    추천 ⭐
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  단독 파일 안내 카드와 다운로드 버튼 제공
                </p>
              </button>

              {/* Type 2: Direct Counter Stream */}
              <button
                type="button"
                onClick={() => setSelectedLinkType('direct_stream')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedLinkType === 'direct_stream'
                    ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-100'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-indigo-900 flex items-center gap-1">
                    <FileDown className="w-3.5 h-3.5 text-indigo-600" />
                    즉시 직다운로드
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  스캔/클릭 즉시 카운트 +1 및 파일 다운로드
                </p>
              </button>

              {/* Type 3: Google Drive Official Direct */}
              <button
                type="button"
                onClick={() => setSelectedLinkType('gdrive_official')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedLinkType === 'gdrive_official'
                    ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-100'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    구글 원본 직링크
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  구글 드라이브 공식 서버에서 직접 파일 수신
                </p>
              </button>
            </div>
          </div>

          {/* QR Code Presentation Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col items-center">
            <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-200 mb-3 relative">
              {isGeneratingQr ? (
                <div className="w-44 h-44 flex items-center justify-center text-xs text-slate-400">
                  QR코드 생성 중...
                </div>
              ) : qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`${file.name} QR 코드`}
                  className="w-44 h-44 object-contain"
                />
              ) : (
                <div className="w-44 h-44 flex items-center justify-center text-xs text-rose-500">
                  QR 생성 오류
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
              <Smartphone className="w-4 h-4 text-blue-600" />
              <span>
                {selectedLinkType === 'student_page'
                  ? '카메라로 비추면 학생 전용 다운로드 화면으로 이동'
                  : selectedLinkType === 'direct_stream'
                  ? '카메라로 비추면 기기에 즉시 파일 다운로드 시작'
                  : '구글 드라이브 원본 다운로드 시작'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 max-w-sm">
              인터넷 브라우저 내에서 직접 생성되어 외부 방화벽 차단 없이 100% 정상 작동합니다.
            </p>

            {/* QR Code Action Buttons */}
            <div className="flex items-center gap-2 mt-4 flex-wrap justify-center">
              <button
                type="button"
                onClick={handleDownloadQrImage}
                disabled={!qrDataUrl}
                className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>QR코드 이미지 PNG 저장</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                disabled={!qrDataUrl}
                className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>안내장 인쇄 창 열기</span>
              </button>

              <a
                href={activeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>다운로드 직접 테스트 (새 창)</span>
              </a>
            </div>
          </div>

          {/* Active URL Copy Box */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-left">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                현재 선택된 배포 링크 주소
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {selectedLinkType === 'student_page' ? '학생 단독 화면' : selectedLinkType === 'direct_stream' ? '카운터 직다운로드' : '드라이브 원본'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={activeUrl}
                className="grow px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg text-slate-700 select-all"
              />
              <button
                type="button"
                onClick={() => handleCopy(activeUrl, 'active')}
                className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
              >
                {copiedType === 'active' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedType === 'active' ? '복사됨!' : '링크 복사'}</span>
              </button>
            </div>
          </div>

          {/* Privacy Note */}
          <div className="pt-1 text-[11px] text-slate-400 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>선생님의 관리 화면, 통계 로그, 다른 파일 목록은 학생에게 일체 노출되지 않습니다</span>
          </div>
        </div>
      </div>
    </div>
  );
};
