# Modify - AI Music Recommendation App

A modern, AI-powered music recommendation app with real authentication and user preferences.

## Features

- 🔐 **Real Authentication** - Signup/Login with SQLite database
- 🎵 **AI Music Recommendations** - 3 modes: Emotion selector, Face detection, Image vibe analysis
- 🎧 **Music Player** - Play, pause, skip, progress tracking
- 📚 **Music Library** - Browse and filter songs by genre/mood
- 👤 **User Profiles** - Track liked songs, preferences, and history
- 🌙 **Dark/Light Mode** - Automatic theme switching
- 📱 **Responsive Design** - Works on all devices

## Tech Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with CSS Grid/Flexbox
- **Vanilla JavaScript** - No frameworks, pure ES6+
- **Font Awesome** - Icons
- **Google Fonts** - Typography

### Backend
- **Node.js** - Server runtime
- **Express.js** - Web framework
- **SQLite3** - Embedded database
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **CORS** - Cross-origin requests
- **Helmet** - Security headers
- **Rate Limiting** - API protection

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Initialize Database
```bash
npm run init-db
```

### 3. Start the Server
```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

### 4. Open the App
Visit: http://localhost:3000

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Login user
- `GET /api/auth/verify` - Verify JWT token

### User Management
- `GET /api/user/profile` - Get user profile and preferences
- `PUT /api/user/preferences` - Update user preferences

### Recommendations
- `POST /api/recommendations` - Save recommendation history
- `GET /api/recommendations` - Get user's recommendation history

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### User Preferences Table
```sql
CREATE TABLE user_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    liked_songs TEXT DEFAULT '[]',
    skipped_songs TEXT DEFAULT '[]',
    favorite_genre TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
```

### Recommendation History Table
```sql
CREATE TABLE recommendation_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    recommendation_type TEXT NOT NULL,
    criteria TEXT NOT NULL,
    songs TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
```

## Security Features

- **Password Hashing** - bcrypt with 12 salt rounds
- **JWT Tokens** - Secure authentication with 7-day expiration
- **Rate Limiting** - 5 auth attempts per 15 minutes
- **Input Validation** - Server-side validation for all inputs
- **CORS Protection** - Configured for localhost and file protocols
- **Security Headers** - Helmet.js for additional protection

## File Structure

```
modify-music-app/
├── index.html          # Main HTML file
├── app.js             # Frontend JavaScript
├── style.css          # CSS styles
├── server.js          # Express server
├── init-db.js         # Database initialization
├── package.json       # Dependencies
├── database.sqlite    # SQLite database (created after init)
└── README.md          # This file
```

## Development

### Adding New Features
1. Update the frontend in `app.js`
2. Add new API endpoints in `server.js`
3. Update database schema in `init-db.js` if needed
4. Test with the running server

### Environment Variables
Create a `.env` file for production:
```
PORT=3000
JWT_SECRET=your-super-secret-jwt-key
```

## Production Deployment

1. Set environment variables
2. Run `npm install --production`
3. Initialize database: `npm run init-db`
4. Start server: `npm start`

## Troubleshooting

### Database Issues
- Delete `database.sqlite` and run `npm run init-db` to reset
- Check file permissions in the project directory

### Authentication Issues
- Clear browser localStorage
- Check server logs for error messages
- Verify JWT_SECRET is set

### CORS Issues
- Ensure you're accessing via `http://localhost:3000`
- Check server CORS configuration

## License

MIT License - feel free to use and modify!






