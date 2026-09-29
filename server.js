const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Directories
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'surprises.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({}, null, 2), 'utf8');

// Helper to read & write surprises
function getSurprises() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading surprises.json:', err);
    return {};
  }
}

function saveSurprises(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving surprises.json:', err);
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
      return `/uploads/${sid}/${file.filename}`;
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
      finalWallPhotos = parsedWallConfig.map((item, idx) => {
        if (typeof item === 'string' && item.startsWith('upload:')) {
          if (wallPhotoFiles[wallUploadIdx]) {
            const f = wallPhotoFiles[wallUploadIdx++];
            return `/uploads/${sid}/${f.filename}`;
          }
          return `/library/viral_${idx + 1}.jpg`;
        }
        if (typeof item === 'string' && item.trim()) {
          const trimmed = item.trim();
          return trimmed.startsWith('/') || trimmed.startsWith('http') ? trimmed : `/${trimmed}`;
        }
        return `/library/viral_${idx + 1}.jpg`;
      });
    } else {
      // Default to first 6 viral library memes
      finalWallPhotos = [1, 2, 3, 4, 5, 6].map(i => `/library/viral_${i}.jpg`);
    }

    // Process custom uploaded song
    let customSongUrl = null;
    let customSongTitle = songTitle || '';
    if (req.files && req.files['song'] && req.files['song'][0]) {
      const songFile = req.files['song'][0];
      customSongUrl = `/uploads/${sid}/${songFile.filename}`;
      if (!customSongTitle) {
        customSongTitle = songFile.originalname.replace(/\.[^/.]+$/, "");
      }
    }

    // Process optional voice note
    let voiceNoteUrl = null;
    if (req.files && req.files['voiceNote'] && req.files['voiceNote'][0]) {
      const vFile = req.files['voiceNote'][0];
      voiceNoteUrl = `/uploads/${sid}/${vFile.filename}`;
    }

    // Process optional witness photo
    let witnessPhotoUrl = null;
    if (req.files && req.files['witnessPhoto'] && req.files['witnessPhoto'][0]) {
      const wFile = req.files['witnessPhoto'][0];
      witnessPhotoUrl = `/uploads/${sid}/${wFile.filename}`;
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
      musicUrl: customSongUrl || musicUrl || '',
      songTitle: customSongTitle || 'Our Song',
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
  const record = surprises[req.params.id];
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

// Start Server
app.listen(PORT, () => {
  console.log(`Boyfriend's Day server running at http://localhost:${PORT}`);
});
