// ==============================
// Imports and Config
// ==============================
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');
const path = require('path');
const multer = require('multer');
const { execFile } = require('child_process');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// Ensure uploads directory exists
const uploadsDir = 'uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Configure multer for handling file uploads
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// ==============================
// Security & Middleware
// ==============================
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://127.0.0.1:3001'],
  credentials: true
}));
app.use(express.json());
app.use(express.static('.'));

// Set up music directory for serving MP3 files
const musicDir = path.join(__dirname, 'music');
if (!fs.existsSync(musicDir)) {
  fs.mkdirSync(musicDir, { recursive: true });
}

// Serve static files from the music directory
app.use('/music', express.static(path.join(__dirname, 'music')));

// Rate limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again later.'
});

// ==============================
// Database
// ==============================
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

// ==============================
// Auth Helpers
// ==============================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// ==============================
// Validation Rules
// ==============================
const validateSignup = [
  body('username')
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be 3–20 chars')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, underscores'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be ≥ 6 chars')
];

const validateLogin = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

// ==============================
// Routes: Health + Auth
// ==============================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Modify Music App API is running' });
});

// Signup
app.post('/api/auth/signup', authLimiter, validateSignup, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { username, email, password } = req.body;
    db.get('SELECT id FROM users WHERE email = ? OR username = ?', [email, username], async (err, row) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (row) return res.status(409).json({ error: 'User already exists' });

      const passwordHash = await bcrypt.hash(password, 12);
      db.run(
        'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
        [username, email, passwordHash],
        function(err) {
          if (err) return res.status(500).json({ error: 'Failed to create user' });
          const userId = this.lastID;
          db.run('INSERT INTO user_preferences (user_id, preference_key, preference_value) VALUES (?, ?, ?)', [userId, 'favorite_genre', null]);

          const token = jwt.sign({ id: userId, username, email }, JWT_SECRET, { expiresIn: '7d' });
          res.status(201).json({
            message: 'User created successfully',
            token,
            user: { id: userId, username, email }
          });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
app.post('/api/auth/login', authLimiter, validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });

    const { email, password } = req.body;
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!user) return res.status(401).json({ error: 'Invalid email or password' });

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) return res.status(401).json({ error: 'Invalid email or password' });

      const token = jwt.sign({ id: user.id, username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ message: 'Login successful', token, user: { id: user.id, username: user.username, email: user.email } });
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==============================
// Routes: User, Preferences, Recommendations
// ==============================

// Get profile
app.get('/api/user/profile', authenticateToken, (req, res) => {
  const userId = req.user.id;
  db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!user) return res.status(404).json({ error: 'User not found' });

    db.all('SELECT song_id, interaction_type FROM user_interactions WHERE user_id = ?', [userId], (err, interactions) => {
      if (err) return res.status(500).json({ error: 'Database error' });

      const likedSongs = interactions.filter(i => i.interaction_type === 'like').map(i => i.song_id);
      const skippedSongs = interactions.filter(i => i.interaction_type === 'skip').map(i => i.song_id);

      res.json({
        user: { id: user.id, username: user.username, email: user.email, createdAt: user.created_at },
        preferences: {
          liked_songs: likedSongs,
          skipped_songs: skippedSongs,
          favorite_genre: null
        }
      });
    });
  });
});

// Update preferences
app.put('/api/user/preferences', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { liked_songs, skipped_songs } = req.body;

  if (liked_songs) {
    db.run('DELETE FROM user_interactions WHERE user_id = ? AND interaction_type = ?', [userId, 'like']);
    if (liked_songs.length > 0) {
      const stmt = db.prepare('INSERT INTO user_interactions (user_id, song_id, interaction_type) VALUES (?, ?, ?)');
      liked_songs.forEach(songId => stmt.run([userId, songId, 'like']));
      stmt.finalize();
    }
  }

  if (skipped_songs) {
    db.run('DELETE FROM user_interactions WHERE user_id = ? AND interaction_type = ?', [userId, 'skip']);
    if (skipped_songs.length > 0) {
      const stmt = db.prepare('INSERT INTO user_interactions (user_id, song_id, interaction_type) VALUES (?, ?, ?)');
      skipped_songs.forEach(songId => stmt.run([userId, songId, 'skip']));
      stmt.finalize();
    }
  }

  res.json({ message: 'Preferences updated successfully' });
});

// Save recommendation history
app.post('/api/recommendations', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { type, criteria, songs } = req.body;
  if (!type || !criteria || !songs) return res.status(400).json({ error: 'Missing required fields' });

  db.run(
    'INSERT INTO recommendation_history (user_id, recommendation_type, criteria, songs) VALUES (?, ?, ?, ?)',
    [userId, type, JSON.stringify(criteria), JSON.stringify(songs)],
    function(err) {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.status(201).json({ message: 'Recommendation saved successfully', id: this.lastID });
    }
  );
});

// Get recommendation history
app.get('/api/recommendations', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const limit = req.query.limit || 10;
  db.all('SELECT * FROM recommendation_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?', [userId, limit], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    const recommendations = rows.map(row => ({
      id: row.id,
      type: row.recommendation_type,
      criteria: JSON.parse(row.criteria),
      songs: JSON.parse(row.songs),
      createdAt: row.created_at
    }));
    res.json({ recommendations });
  });
});

// Verify token
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({ valid: true, user: { id: req.user.id, username: req.user.username, email: req.user.email } });
});

// Get all songs
app.get('/api/songs', (req, res) => {
  const mood = req.query.mood;
  const source = req.query.source || 'bollywood'; // Default to bollywood if not specified
  
  if (mood) {
    // If mood is specified, filter by mood
    if (source === 'hollywood') {
      // For Hollywood songs, we'll use the extracted files
      try {
        // Fix the path to match the actual directory name
        const hollywoodPath = path.join(__dirname, 'extracted_hollywood_songs', 'Hollyood songs');
        console.log('Hollywood songs base path:', hollywoodPath);
        let moodFolder = mood;
        
        // Map the mood to the corresponding folder in the Hollywood songs directory
        // The Hollywood songs have Happy, Party, and Sad folders
        if (mood === 'happy') {
          moodFolder = 'Happy';
        } else if (mood === 'sad') {
          moodFolder = 'Sad';
        } else if (mood === 'party' || mood === 'energetic' || mood === 'excited') {
          moodFolder = 'Party';
        } else {
          // Default to Happy if the mood doesn't match any folder
          moodFolder = 'Happy';
        }
        
        const moodPath = path.join(hollywoodPath, moodFolder);
        console.log('Looking for Hollywood songs in:', moodPath);
        
        if (fs.existsSync(moodPath)) {
          const files = fs.readdirSync(moodPath);
          console.log(`Found ${files.length} files in ${moodPath}`);
          
          const songs = files
            .filter(file => file.endsWith('.mp3'))
            .map((file, index) => {
              // Extract artist and title from filename
              const fileNameWithoutExt = file.replace('.mp3', '');
              let artist = 'Unknown Artist';
              let title = fileNameWithoutExt;
              
              // Try to extract artist and title from the filename
              const dashIndex = fileNameWithoutExt.indexOf(' - ');
              if (dashIndex !== -1) {
                artist = fileNameWithoutExt.substring(0, dashIndex);
                title = fileNameWithoutExt.substring(dashIndex + 3);
              }
              
              return {
                id: 10000 + index, // Use a different ID range for Hollywood songs
                title: title,
                artist: artist,
                mood_tag: mood,
                genre: 'Hollywood',
                energy_level: Math.floor(Math.random() * 100),
                file_path: `/extracted_hollywood_songs/Hollyood songs/${moodFolder}/${encodeURIComponent(file)}`,
                source: 'hollywood'
              };
            });
          
          console.log(`Returning ${songs.length} Hollywood songs for mood: ${mood}`);
          res.json({ songs });
        } else {
          console.error(`Hollywood mood folder not found: ${moodPath}`);
          res.status(404).json({ error: `No Hollywood songs found for mood: ${mood}` });
        }
      } catch (error) {
        console.error('Error serving Hollywood songs:', error);
        res.status(500).json({ error: 'Failed to retrieve Hollywood songs' });
      }
    } else {
      // For Bollywood songs, use the database as before
      db.all('SELECT * FROM songs WHERE mood_tag = ?', [mood], (err, songs) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        
        // Add source property to each song
        const songsWithSource = songs.map(song => ({
          ...song,
          source: 'bollywood'
        }));
        
        res.json({ songs: songsWithSource });
      });
    }
  } else {
    // Otherwise, return all songs
    db.all('SELECT * FROM songs', (err, songs) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      
      // Add source property to each song
      const songsWithSource = songs.map(song => ({
        ...song,
        source: 'bollywood'
      }));
      
      res.json({ songs: songsWithSource });
    });
  }
});

// ==============================
// NEW: Emotion Detection (Python + Multer)
// ==============================
app.post('/api/emotion-detect', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded' });
  }

  console.log('Processing image:', req.file.path);
  console.log('File details:', {
    filename: req.file.filename,
    mimetype: req.file.mimetype,
    size: req.file.size
  });

  // Verify file exists
  if (!fs.existsSync(req.file.path)) {
    return res.status(500).json({ error: 'Upload failed - file not saved' });
  }

  // Execute Python script with absolute path
  const scriptPath = path.join(__dirname, 'emotion_inference.py');
  console.log('Executing Python script:', scriptPath);

  execFile('python3', [scriptPath, req.file.path], (error, stdout, stderr) => {
    // Clean up the uploaded file
    fs.unlink(req.file.path, (unlinkError) => {
      if (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      } else {
        console.log('Successfully deleted uploaded file');
      }
    });

    if (error) {
      console.error('Python execution error:', error);
      console.error('Python stderr:', stderr);
      return res.status(500).json({ error: 'Emotion detection failed: ' + stderr });
    }

    try {
      console.log('Python script output:', stdout);
      // Extract the JSON part from the output (last line)
      const lines = stdout.trim().split('\n');
      const jsonLine = lines[lines.length - 1];
      const result = JSON.parse(jsonLine);
      
      if (result.error) {
        console.error('Python script reported error:', result.error);
        return res.status(400).json({ error: result.error });
      }

      let { emotion, confidence } = result;

      if (!emotion || emotion === 'unknown') {
        return res.status(400).json({ error: 'No face or emotion detected in image' });
      }
      
      // Map 'relaxed' to 'happy' as per requirements
      if (emotion === 'relaxed') {
        console.log('Mapping detected emotion "relaxed" to "happy"');
        emotion = 'happy';
      }

      // We don't need to fetch songs here as the client will make a separate request
      // with the detected emotion and selected source (Bollywood/Hollywood)
      const response = { 
        emotion, 
        confidence, 
        message: `Detected ${emotion} with ${confidence.toFixed(2)}% confidence`
      };
      
      console.log('Sending emotion detection response:', response);
      res.json(response);
    } catch (e) {
      console.error('Failed to parse Python output:', stdout);
      console.error('Parse error:', e);
      res.status(500).json({ error: 'Invalid response from Python model' });
    }
  });
});

// ==============================
// Error & Startup
// ==============================
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  db.close();
  process.exit(0);
});
