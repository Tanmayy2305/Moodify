const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database file path
const dbPath = path.join(__dirname, 'database.sqlite');

// Create new database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Create tables based on recommended schema
db.serialize(() => {
  // Users Table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Error creating users table:', err.message);
    } else {
      console.log('Users table created successfully');
    }
  });

  // Songs Table
  db.run(`CREATE TABLE IF NOT EXISTS songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    genre TEXT NOT NULL,
    mood_tag TEXT,
    energy_level INTEGER,
    valence REAL,
    danceability REAL,
    acousticness REAL,
    preview_url TEXT
  )`, (err) => {
    if (err) {
      console.error('Error creating songs table:', err.message);
    } else {
      console.log('Songs table created successfully');
    }
  });

  // User Interactions Table
  db.run(`CREATE TABLE IF NOT EXISTS user_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    song_id INTEGER NOT NULL,
    interaction_type TEXT NOT NULL, -- 'like', 'skip', 'play'
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (song_id) REFERENCES songs (id) ON DELETE CASCADE
  )`, (err) => {
    if (err) {
      console.error('Error creating user_interactions table:', err.message);
    } else {
      console.log('User interactions table created successfully');
    }
  });
  
  // User Preferences Table
  db.run(`CREATE TABLE IF NOT EXISTS user_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    preference_key TEXT NOT NULL,
    preference_value TEXT,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  )`, (err) => {
    if (err) {
      console.error('Error creating user_preferences table:', err.message);
    } else {
      console.log('User preferences table created successfully');
    }
  });
  
  // Recommendation History Table
  db.run(`CREATE TABLE IF NOT EXISTS recommendation_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    recommendation_type TEXT NOT NULL,
    criteria TEXT NOT NULL,
    songs TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  )`, (err) => {
    if (err) {
      console.error('Error creating recommendation_history table:', err.message);
    } else {
      console.log('Recommendation history table created successfully');
    }
  });

  // Insert sample songs
  const sampleSongs = [
    { title: "Sunny Days", artist: "Alex Rivers", genre: "Pop", mood_tag: "happy", energy_level: 85, valence: 0.9, danceability: 0.8, acousticness: 0.2, preview_url: "#" },
    { title: "Midnight Blues", artist: "Sarah Moon", genre: "Blues", mood_tag: "sad", energy_level: 30, valence: 0.2, danceability: 0.3, acousticness: 0.9, preview_url: "#" },
    { title: "Thunder Strike", artist: "Metal Warriors", genre: "Rock", mood_tag: "angry", energy_level: 95, valence: 0.1, danceability: 0.6, acousticness: 0.1, preview_url: "#" },
    { title: "Ocean Waves", artist: "Calm Collective", genre: "Ambient", mood_tag: "relaxed", energy_level: 15, valence: 0.7, danceability: 0.2, acousticness: 0.95, preview_url: "#" },
    { title: "Party Tonight", artist: "DJ Pulse", genre: "Electronic", mood_tag: "excited", energy_level: 90, valence: 0.85, danceability: 0.9, acousticness: 0.05, preview_url: "#" },
    { title: "Forest Path", artist: "Nature Sounds", genre: "Ambient", mood_tag: "calm", energy_level: 10, valence: 0.6, danceability: 0.1, acousticness: 0.98, preview_url: "#" },
    { title: "Electric Rush", artist: "Synth Masters", genre: "Electronic", mood_tag: "energetic", energy_level: 88, valence: 0.8, danceability: 0.85, acousticness: 0.1, preview_url: "#" },
    { title: "Heartbreak Hotel", artist: "Emo Kid", genre: "Alternative", mood_tag: "sad", energy_level: 40, valence: 0.25, danceability: 0.4, acousticness: 0.7, preview_url: "#" },
    { title: "Chill Vibes", artist: "Lo-Fi Master", genre: "Electronic", mood_tag: "calm", energy_level: 25, valence: 0.65, danceability: 0.6, acousticness: 0.8, preview_url: "#" },
    { title: "Victory March", artist: "Epic Orchestra", genre: "Classical", mood_tag: "energetic", energy_level: 92, valence: 0.88, danceability: 0.3, acousticness: 0.9, preview_url: "#" }
  ];

  // Check if songs already exist
  db.get("SELECT COUNT(*) as count FROM songs", (err, row) => {
    if (err) {
      console.error('Error checking songs:', err.message);
    } else if (row.count === 0) {
      // Insert sample songs
      const stmt = db.prepare(`INSERT INTO songs (title, artist, genre, mood_tag, energy_level, valence, danceability, acousticness, preview_url) 
                               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      
      sampleSongs.forEach(song => {
        stmt.run([song.title, song.artist, song.genre, song.mood_tag, song.energy_level, song.valence, song.danceability, song.acousticness, song.preview_url]);
      });
      
      stmt.finalize();
      console.log('Sample songs inserted successfully');
    } else {
      console.log('Songs already exist, skipping insertion');
    }
  });
});

// Close database connection
db.close((err) => {
  if (err) {
    console.error('Error closing database:', err.message);
  } else {
    console.log('Database connection closed');
    console.log('Database initialization complete!');
  }
});
