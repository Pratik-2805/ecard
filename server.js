const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

const os = require('os');

// Storage Directories: Support Vercel / Serverless read-only environments
const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY);
const BASE_STORAGE_DIR = isServerless ? os.tmpdir() : __dirname;

const UPLOADS_DIR = path.join(BASE_STORAGE_DIR, 'uploads');
const DATA_DIR = path.join(BASE_STORAGE_DIR, 'data');
const DATA_FILE = path.join(DATA_DIR, 'surprises.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// In-memory surprises cache
let inMemorySurprises = {};

try {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({}, null, 2), 'utf8');
  } else {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    inMemorySurprises = JSON.parse(raw);
  }
} catch (e) {
  console.warn('Note: Running with in-memory storage fallback:', e.message);
}

// Helper to read & write surprises
function getSurprises() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      inMemorySurprises = Object.assign({}, inMemorySurprises, parsed);
    }
  } catch (err) {
    console.warn('Could not read from DATA_FILE, using memory store:', err.message);
  }
  return inMemorySurprises;
}

function saveSurprises(data) {
  inMemorySurprises = Object.assign({}, inMemorySurprises, data);
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.warn('Could not persist surprises to disk, kept safely in memory:', err.message);
  }
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const sid = req.surpriseId || 'temp';
    const targetDir = path.join(UPLOADS_DIR, sid);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    cb(null, targetDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 60 * 1024 * 1024 }, // 60MB limit
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.startsWith('image/') || 
      file.mimetype.startsWith('audio/') || 
      /\.(mp3|wav|m4a|ogg|aac|flac|opus)$/i.test(file.originalname)
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only image and audio files are allowed!'), false);
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(PUBLIC_DIR));

// Backward compatibility for /library -> memes
app.use('/library', express.static(path.join(PUBLIC_DIR, 'memes')));

// Serve default category songs
app.use('/songs', express.static(path.join(PUBLIC_DIR, 'songs')));

// Default music for each event category (plays if user doesn't upload device audio)
const DEFAULT_CATEGORY_SONGS = {
  boyfriend: { url: 'songs/boyfriend.mp3', title: 'I Love You - Acoustic Vibes' },
  girlfriend: { url: 'songs/girlfriend.mp3', title: 'There is Romance - Sweet Melody' },
  bestfriend: { url: 'songs/bestfriend.mp3', title: 'Carefree - Besties Forever' },
  valentines: { url: 'songs/valentines.mp3', title: 'Heartwarming - Valentine Serenade' },
  missyou: { url: 'songs/missyou.mp3', title: 'Clear Air - Distance & Memories' },
  anniversary: { url: 'songs/anniversary.mp3', title: 'Canon in D Major - Forever Love' },
  birthday: { url: 'songs/birthday.mp3', title: 'Happy Birthday - Festive Melody' },
  custom: { url: 'songs/custom.mp3', title: 'Carefree Melody - Special Surprise' }
};

// Serve uploaded images statically
app.use('/uploads', express.static(UPLOADS_DIR));

// Middleware to assign a unique surpriseId before multer handles files
app.use('/api/create', (req, res, next) => {
  req.surpriseId = crypto.randomUUID();
  next();
});

// API: Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Function to detect LAN IPv4 for mobile testing
function getLanIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (
        iface.family === 'IPv4' && 
        !iface.internal && 
        !iface.address.startsWith('172.27.') && 
        !iface.address.startsWith('169.254.')
      ) {
        return iface.address;
      }
    }
  }
  return null;
}

// API: Server Network Info (enables phone scanning of QR codes over local Wi-Fi)
app.get('/api/info', (req, res) => {
  res.json({
    status: 'ok',
    lanIp: getLanIp(),
    port: PORT,
    isServerless: isServerless
  });
});

// API: Create new surprise with uploaded photos, song, voice note, and custom modules
app.post('/api/create', upload.fields([
  { name: 'photos', maxCount: 6 },
  { name: 'wallPhotos', maxCount: 6 },
  { name: 'song', maxCount: 1 },
  { name: 'voiceNote', maxCount: 1 },
  { name: 'witnessPhoto', maxCount: 1 }
]), (req, res) => {
  try {
    const sid = req.surpriseId;
    const { 
      sender, 
      receiver, 
      message, 
      payment_id,
      eventType = 'boyfriend',
      eventTitle,
      envelopeStamp,
      envelopeLetterTitle,
      envelopeLetterSub,
      certificateBadge,
      certificateTitle,
      certificateTerms,
      certificateSigner,
      memoryNotes,
      themeColors,
      musicUrl,
      songTitle,
      wallPhotosConfig,
      // Optional emotional modules
      secretQuestion,
      secretAnswer,
      secretHint,
      vibe = 'romantic',
      scratchCoupons,
      witnessType,
      witnessName,
      voiceNoteTitle
    } = req.body;

    if (!sender || !receiver) {
      return res.status(400).json({ error: 'Sender and receiver names are required.' });
    }

    // Process uploaded photos
    const photoFiles = req.files && req.files['photos'] ? req.files['photos'] : [];
    const photoUrls = photoFiles.map(file => {
      return `uploads/${sid}/${file.filename}`;
    });

    // Process custom wall photos (viral library memes or personal uploads)
    let finalWallPhotos = [];
    let parsedWallConfig = null;
    if (wallPhotosConfig) {
      try {
        parsedWallConfig = typeof wallPhotosConfig === 'string' ? JSON.parse(wallPhotosConfig) : wallPhotosConfig;
      } catch (e) {
        parsedWallConfig = null;
      }
    }

    const wallPhotoFiles = req.files && req.files['wallPhotos'] ? req.files['wallPhotos'] : [];
    let wallUploadIdx = 0;

    if (Array.isArray(parsedWallConfig) && parsedWallConfig.length === 6) {
      const defaultWallMemes = [1, 2, 3, 4, 5, 6].map(i => `memes/viral_${i}.jpg`);
      finalWallPhotos = parsedWallConfig.map((item, idx) => {
        if (typeof item === 'string' && item.startsWith('upload:')) {
          if (wallPhotoFiles[wallUploadIdx]) {
            const f = wallPhotoFiles[wallUploadIdx++];
            return `uploads/${sid}/${f.filename}`;
          }
          return defaultWallMemes[idx] || 'memes/viral_1.jpg';
        }
        if (typeof item === 'string' && item.trim()) {
          const trimmed = item.trim();
          // Remove leading slash for safe relative paths across subpaths
          return trimmed.replace(/^\//, '');
        }
        return defaultWallMemes[idx] || 'memes/viral_1.jpg';
      });
    } else {
      // Default to first 6 viral library memes
      finalWallPhotos = [1, 2, 3, 4, 5, 6].map(i => `memes/viral_${i}.jpg`);
    }

    // Process custom uploaded song
    let customSongUrl = null;
    let customSongTitle = songTitle || '';
    if (req.files && req.files['song'] && req.files['song'][0]) {
      const songFile = req.files['song'][0];
      customSongUrl = `uploads/${sid}/${songFile.filename}`;
      if (!customSongTitle) {
        customSongTitle = songFile.originalname.replace(/\.[^/.]+$/, "");
      }
    }

    // Process optional voice note
    let voiceNoteUrl = null;
    if (req.files && req.files['voiceNote'] && req.files['voiceNote'][0]) {
      const vFile = req.files['voiceNote'][0];
      voiceNoteUrl = `uploads/${sid}/${vFile.filename}`;
    }

    // Process optional witness photo
    let witnessPhotoUrl = null;
    if (req.files && req.files['witnessPhoto'] && req.files['witnessPhoto'][0]) {
      const wFile = req.files['witnessPhoto'][0];
      witnessPhotoUrl = `uploads/${sid}/${wFile.filename}`;
    }

    let parsedTerms = null;
    if (certificateTerms) {
      try {
        parsedTerms = typeof certificateTerms === 'string' ? JSON.parse(certificateTerms) : certificateTerms;
      } catch (e) {
        parsedTerms = [certificateTerms];
      }
    }

    let parsedMemories = null;
    if (memoryNotes) {
      try {
        parsedMemories = typeof memoryNotes === 'string' ? JSON.parse(memoryNotes) : memoryNotes;
      } catch (e) {
        parsedMemories = [memoryNotes];
      }
    }

    let parsedCoupons = null;
    if (scratchCoupons) {
      try {
        parsedCoupons = typeof scratchCoupons === 'string' ? JSON.parse(scratchCoupons) : scratchCoupons;
      } catch (e) {
        parsedCoupons = [scratchCoupons];
      }
    }

    let parsedTheme = null;
    if (themeColors) {
      try {
        parsedTheme = typeof themeColors === 'string' ? JSON.parse(themeColors) : themeColors;
      } catch (e) {
        parsedTheme = null;
      }
    }

    const surprises = getSurprises();
    const newRecord = {
      id: sid,
      eventType: eventType || 'boyfriend',
      eventTitle: eventTitle || '',
      envelopeStamp: envelopeStamp || '',
      envelopeLetterTitle: envelopeLetterTitle || '',
      envelopeLetterSub: envelopeLetterSub || '',
      certificateBadge: certificateBadge || '',
      certificateTitle: certificateTitle || '',
      certificateTerms: parsedTerms,
      certificateSigner: certificateSigner || '',
      memoryNotes: parsedMemories,
      themeColors: parsedTheme,
      musicUrl: customSongUrl || musicUrl || (DEFAULT_CATEGORY_SONGS[eventType] || DEFAULT_CATEGORY_SONGS.boyfriend).url,
      songTitle: customSongTitle || (musicUrl ? (songTitle || 'Our Song') : (DEFAULT_CATEGORY_SONGS[eventType] || DEFAULT_CATEGORY_SONGS.boyfriend).title),
      // Optional interactive modules
      secretQuestion: (secretQuestion || '').trim(),
      secretAnswer: (secretAnswer || '').trim(),
      secretHint: (secretHint || '').trim(),
      vibe: vibe || 'romantic',
      scratchCoupons: parsedCoupons,
      witnessType: witnessType || 'cat',
      witnessName: witnessName || '',
      witnessPhotoUrl,
      voiceNoteUrl,
      voiceNoteTitle: voiceNoteTitle || 'A special voice note for you',
      sender: sender.trim(),
      receiver: receiver.trim(),
      message: (message || '').trim(),
      photos: photoUrls,
      wallPhotos: finalWallPhotos,
      payment_id: payment_id || 'LOCAL-FREE-' + Date.now(),
      createdAt: new Date().toISOString()
    };

    surprises[sid] = newRecord;
    saveSurprises(surprises);

    console.log(`[Created] E-Card (${newRecord.eventType}) ${sid} for ${newRecord.receiver} from ${newRecord.sender} with vibe: ${newRecord.vibe}`);

    res.json({
      success: true,
      id: sid,
      shareUrl: `/?id=${sid}`,
      data: newRecord
    });
  } catch (err) {
    console.error('Error creating surprise:', err);
    res.status(500).json({ error: 'Failed to create surprise: ' + err.message });
  }
});

// API: Alternative upload for single/multiple photos directly
app.post('/api/upload', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No photo provided' });
  const sid = req.surpriseId || 'misc';
  res.json({ url: `/uploads/${sid}/${req.file.filename}` });
});

// API: Fetch surprise by ID
app.get('/api/surprise/:id', (req, res) => {
  const surprises = getSurprises();
  const targetId = (req.params.id || '').trim();
  let record = surprises[targetId];
  if (!record) {
    const key = Object.keys(surprises).find(k => k.toLowerCase() === targetId.toLowerCase());
    if (key) record = surprises[key];
  }
  if (!record) {
    return res.status(404).json({ error: 'Surprise not found' });
  }
  res.json(record);
});

// API: List all surprises (metadata summary)
app.get('/api/surprises', (req, res) => {
  const surprises = getSurprises();
  const list = Object.values(surprises).map(s => ({
    id: s.id,
    sender: s.sender,
    receiver: s.receiver,
    photoCount: (s.photos || []).length,
    createdAt: s.createdAt
  }));
  res.json(list);
});

// Start Server if directly run
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    const lan = getLanIp();
    console.log(`Boyfriend's Day server running at:`);
    console.log(`  - Local:   http://localhost:${PORT}`);
    if (lan) console.log(`  - Network: http://${lan}:${PORT}`);
  });
}

module.exports = app;
