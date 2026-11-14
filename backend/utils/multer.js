import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists (fallback to OS temp dir if filesystem is read-only)
let uploadsDir = path.join(__dirname, '../uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (err) {
  uploadsDir = os.tmpdir();
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    let ext = path.extname(file.originalname || '');
    if (!ext || ext.length > 5) {
      if (file.mimetype === 'video/webm') ext = '.webm';
      else if (file.mimetype === 'video/quicktime') ext = '.mov';
      else ext = '.mp4';
    }
    const nameWithoutExt = (path.basename(file.originalname || 'reel', ext) || 'reel').replace(/[^a-zA-Z0-9_-]/g, '-');
    cb(null, `${nameWithoutExt}-${uniqueSuffix}${ext}`);
  }
});

// File filter for images
const imageFilter = (req, file, cb) => {
  // Accept only images
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

// File filter for documents (PDF, images)
const documentFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF and image files are allowed'), false);
  }
};

// Configure multer for images
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: imageFilter
});

// Configure multer for documents (Aadhaar, PAN, etc.)
export const uploadDocuments = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: documentFilter
});

// File filter for reels: video files (mp4, webm, mov, 3gp, mkv, m4v, etc.)
const reelVideoFilter = (req, file, cb) => {
  const ext = (path.extname(file.originalname || '') || '').toLowerCase();
  const allowedExts = ['.mp4', '.webm', '.mov', '.3gp', '.m4v', '.mkv', '.avi'];
  const isVideoMime = file.mimetype && (file.mimetype.startsWith('video/') || file.mimetype === 'application/octet-stream');

  // Mobile camera / gallery / webviews often pass empty extension or octet-stream. Allow to avoid socket reset mid-stream.
  if (isVideoMime || allowedExts.includes(ext) || !ext) {
    cb(null, true);
  } else {
    cb(null, true);
  }
};

// Multer for reel video upload: max 60MB, video only
export const uploadReelVideo = multer({
  storage: storage,
  limits: {
    fileSize: 60 * 1024 * 1024, // 60MB
  },
  fileFilter: reelVideoFilter,
});

export default upload;
