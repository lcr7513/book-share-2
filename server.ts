import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Persistent Data Storage Path
const DATA_DIR = path.join(__dirname, 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface TrackedFile {
  id: string;
  name: string;
  driveUrl: string;
  driveFileId: string;
  category: string;
  size: string;
  downloadCount: number;
  createdAt: string;
  lastDownloadedAt?: string;
  description?: string;
  customTargetUrl?: string;
}

interface DownloadLog {
  id: string;
  fileId: string;
  fileName: string;
  timestamp: string;
  referrer: string;
  device: string;
  ip: string;
  status: 'success' | 'redirected';
}

interface StorageSchema {
  files: TrackedFile[];
  logs: DownloadLog[];
}

/**
 * Format date in Korea Standard Time (KST, Asia/Seoul, UTC+9)
 */
function getKoreanTimestamp(date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const getPart = (t: string) => parts.find((p) => p.type === t)?.value || '';

    const year = getPart('year');
    const month = getPart('month');
    const day = getPart('day');
    const hour = getPart('hour');
    const minute = getPart('minute');
    const second = getPart('second');

    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  } catch (e) {
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstDate = new Date(date.getTime() + kstOffset);
    return kstDate.toISOString().replace('T', ' ').slice(0, 19);
  }
}

function getKoreanCreatedAt(date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: true,
    });
    return formatter.format(date);
  } catch (e) {
    return getKoreanTimestamp(date);
  }
}

const INITIAL_STORE: StorageSchema = {
  files: [
    {
      id: 'file-ai-inquiry',
      name: 'AI를_활용한_사회문제탐구.pdf',
      driveUrl: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view?usp=sharing',
      driveFileId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      category: 'pdf',
      size: '4.2 MB',
      downloadCount: 15,
      createdAt: '2026. 11. 11. 오후 7:00:00',
      lastDownloadedAt: '2026-11-12 15:50:12',
      description: '인공지능을 활용한 사회문제 해결 탐구 학습 자료 및 학생 과제 양식',
    },
    {
      id: 'file-1',
      name: '2026학년도_학교_교육과정_운영계획_및_학사일정.pdf',
      driveUrl: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view?usp=sharing',
      driveFileId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      category: 'pdf',
      size: '3.4 MB',
      downloadCount: 42,
      createdAt: '2026. 11. 01. 오전 9:30:00',
      lastDownloadedAt: '2026-11-12 14:22:15',
      description: '학부모 및 교직원용 학사일정 및 연간 교육 계획 안내 문서',
    },
  ],
  logs: [
    {
      id: 'log-101',
      fileId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      fileName: 'AI를_활용한_사회문제탐구.pdf',
      timestamp: '2026-11-12 15:50:12',
      referrer: '학생 다운로드 링크',
      device: 'Mobile (Android / Chrome)',
      ip: '211.234.***.***',
      status: 'success',
    },
  ],
};

function readStore(): StorageSchema {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const data = fs.readFileSync(STORE_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading store:', err);
  }
  writeStore(INITIAL_STORE);
  return INITIAL_STORE;
}

function writeStore(data: StorageSchema): void {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing store:', err);
  }
}

// Ensure store is readable
readStore();

function getDirectUrl(fileId: string, driveUrl: string = ''): string {
  if (driveUrl.includes('docs.google.com/document')) {
    return `https://docs.google.com/document/d/${fileId}/export?format=pdf`;
  }
  if (driveUrl.includes('docs.google.com/presentation')) {
    return `https://docs.google.com/presentation/d/${fileId}/export?format=pptx`;
  }
  if (driveUrl.includes('docs.google.com/spreadsheets')) {
    return `https://docs.google.com/spreadsheets/d/${fileId}/export?format=xlsx`;
  }
  return `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;
}

// -------------------------------------------------------------
// REST API Routes
// -------------------------------------------------------------

// 1. GET all tracked files
app.get('/api/files', (_req: Request, res: Response) => {
  const store = readStore();
  res.json({ success: true, files: store.files });
});

// 2. GET single tracked file by ID or driveFileId (for Student page)
app.get('/api/file/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const store = readStore();
  const file = store.files.find((f) => f.id === id || f.driveFileId === id);
  if (!file) {
    return res.status(404).json({ success: false, message: '해당 파일을 찾을 수 없습니다.' });
  }
  res.json({ success: true, file });
});

// 3. POST create new tracked file
app.post('/api/files', (req: Request, res: Response) => {
  const { name, driveUrl, driveFileId, category, size, description } = req.body;
  if (!driveFileId || !name) {
    return res.status(400).json({ success: false, message: '파일명과 파일 ID는 필수입니다.' });
  }

  const store = readStore();
  const nowStr = getKoreanCreatedAt(new Date());

  const newFile: TrackedFile = {
    id: `file-${Date.now()}`,
    name,
    driveUrl: driveUrl || '',
    driveFileId,
    category: category || 'pdf',
    size: size || '2.0 MB',
    downloadCount: 0,
    createdAt: nowStr,
    description: description || '영구 저장된 추적 파일',
  };

  store.files.unshift(newFile);
  writeStore(store);

  res.json({ success: true, file: newFile });
});

// 4. DELETE a tracked file
app.delete('/api/files/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const store = readStore();
  store.files = store.files.filter((f) => f.id !== id && f.driveFileId !== id);
  writeStore(store);
  res.json({ success: true, message: '파일이 영구 삭제되었습니다.' });
});

// 5. POST record a download (increment count & log with KST timestamp)
app.post('/api/download/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const store = readStore();
  const file = store.files.find((f) => f.id === id || f.driveFileId === id);

  if (!file) {
    return res.status(404).json({ success: false, message: '해당 파일을 찾을 수 없습니다.' });
  }

  const timestamp = getKoreanTimestamp(new Date());

  file.downloadCount += 1;
  file.lastDownloadedAt = timestamp;

  const userAgent = req.headers['user-agent'] || '';
  const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);
  const platform = isMobile ? 'Mobile' : 'Desktop';
  const browser = userAgent.includes('Chrome')
    ? 'Chrome'
    : userAgent.includes('Whale')
    ? 'Whale'
    : userAgent.includes('Safari')
    ? 'Safari'
    : 'Browser';

  const newLog: DownloadLog = {
    id: `log-${Date.now()}`,
    fileId: file.driveFileId,
    fileName: file.name,
    timestamp,
    referrer: (req.headers.referer as string) || '웹 앱 다운로드 버튼',
    device: `${platform} (${browser})`,
    ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '203.241.***.***',
    status: 'success',
  };

  store.logs.unshift(newLog);
  writeStore(store);

  const directUrl = getDirectUrl(file.driveFileId, file.driveUrl);
  res.json({ success: true, file, directUrl });
});

// 6. GET direct proxy stream/download link (Student direct link with UTF-8 filename preservation)
// e.g. /api/download/:fileId/direct?skipCount=1
app.get('/api/download/:fileId/direct', async (req: Request, res: Response) => {
  const { fileId } = req.params;
  const skipCount = req.query.skipCount === '1' || req.query.skipCount === 'true';

  const store = readStore();
  const file = store.files.find((f) => f.driveFileId === fileId || f.id === fileId);

  const timestamp = getKoreanTimestamp(new Date());

  let fileName = file ? file.name : `파일_${fileId}.pdf`;
  if (!fileName.includes('.')) {
    fileName = `${fileName}.pdf`;
  }

  // Record count and log if not explicitly skipped
  if (!skipCount) {
    if (file) {
      file.downloadCount += 1;
      file.lastDownloadedAt = timestamp;
    }

    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);
    const platform = isMobile ? 'Mobile' : 'Desktop';
    const browser = userAgent.includes('Chrome')
      ? 'Chrome'
      : userAgent.includes('Whale')
      ? 'Whale'
      : userAgent.includes('Safari')
      ? 'Safari'
      : 'Browser';

    const newLog: DownloadLog = {
      id: `log-${Date.now()}`,
      fileId: file ? file.driveFileId : fileId,
      fileName,
      timestamp,
      referrer: (req.headers.referer as string) || '학생 직접 다운로드 링크 (QR / 직링크)',
      device: `${platform} (${browser})`,
      ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '203.241.***.***',
      status: 'success',
    };

    store.logs.unshift(newLog);
    writeStore(store);
  }

  const actualFileId = file ? file.driveFileId : fileId;
  const actualDriveUrl = file ? file.driveUrl : '';
  const directUrl = getDirectUrl(actualFileId, actualDriveUrl);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const upstream = await fetch(directUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (upstream.ok && upstream.body) {
      const encodedFilename = encodeURIComponent(fileName);
      res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/octet-stream');
      // RFC 5987 / RFC 6266 standard ensures Korean and middle dot (·) characters never get broken
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`
      );
      const cl = upstream.headers.get('content-length');
      if (cl) {
        res.setHeader('Content-Length', cl);
      }
      return Readable.fromWeb(upstream.body as any).pipe(res);
    }
  } catch (err) {
    console.warn('Proxy streaming fallback to direct redirect:', err);
  }

  return res.redirect(directUrl);
});

// 7. GET logs
app.get('/api/logs', (_req: Request, res: Response) => {
  const store = readStore();
  res.json({ success: true, logs: store.logs });
});

// 8. DELETE logs
app.delete('/api/logs', (_req: Request, res: Response) => {
  const store = readStore();
  store.logs = [];
  writeStore(store);
  res.json({ success: true, message: '로그가 초기화되었습니다.' });
});

// -------------------------------------------------------------
// Vite Middleware / Static Serving
// -------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
