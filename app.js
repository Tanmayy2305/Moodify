// Application Data and State Management
const AppData = {
    songs: [], // Songs will be loaded from the database
    emotions: ["happy", "sad", "angry", "relaxed", "excited", "calm", "energetic"],
    genres: ["Bollywood"], // Only Bollywood genre is used
    mockUser: {
        id: 1,
        username: "demo_user",
        email: "demo@modify.com",
        likedSongs: [1, 5, 7],
        skippedSongs: [2, 8]
    }
};

// Application State
const AppState = {
    currentUser: null,
    currentPage: 'home',
    currentRecommendations: [],
    currentSong: null,
    cameraStream: null,
    selectedEmotion: null,
    detectedEmotion: null,
    detectedConfidence: 0,
    detectedVibe: null,
    detectedEnergy: 0,
    recommendationHistory: []
};

// Utility Functions
const Utils = {
    showLoading: (message = 'Loading...') => {
        const overlay = document.getElementById('loadingOverlay');
        const text = overlay.querySelector('p');
        text.textContent = message;
        overlay.classList.remove('hidden');
    },
    hideLoading: () => {
        document.getElementById('loadingOverlay').classList.add('hidden');
    },
    delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
    getRandomItems: (array, count) => {
        const shuffled = [...array].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    },
    formatTime: (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
};

// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// Authentication System
const Auth = {
    isAuthenticated: () => localStorage.getItem('modifyToken') !== null,
    getToken: () => localStorage.getItem('modifyToken'),
    // API methods now use direct fetch calls with proper error handling
    login: async (email, password) => {
        Utils.showLoading('Logging in...');
        try {
            const url = `${API_BASE_URL}/auth/login`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                if (data.details && Array.isArray(data.details)) {
                    // Format validation errors nicely
                    const errorMessages = data.details.map(err => err.msg).join('\n• ');
                    throw new Error(`Validation failed:\n• ${errorMessages}`);
                } else {
                    throw new Error(data.error || 'Login failed');
                }
            }
            
            localStorage.setItem('modifyToken', data.token);
            localStorage.setItem('modifyUser', JSON.stringify(data.user));
            AppState.currentUser = data.user;
            Utils.hideLoading();
            return { success: true, message: data.message };
        } catch (error) {
            Utils.hideLoading();
            return { success: false, message: error.message };
        }
    },
    signup: async (username, email, password) => {
        Utils.showLoading('Creating account...');
        try {
            const url = `${API_BASE_URL}/auth/signup`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                if (data.details && Array.isArray(data.details)) {
                    // Format validation errors nicely
                    const errorMessages = data.details.map(err => err.msg).join('\n• ');
                    throw new Error(`Validation failed:\n• ${errorMessages}`);
                } else {
                    throw new Error(data.error || 'Signup failed');
                }
            }
            
            localStorage.setItem('modifyToken', data.token);
            localStorage.setItem('modifyUser', JSON.stringify(data.user));
            AppState.currentUser = data.user;
            Utils.hideLoading();
            return { success: true, message: data.message };
        } catch (error) {
            Utils.hideLoading();
            return { success: false, message: error.message };
        }
    },
    verifyToken: async () => {
        try {
            const token = Auth.getToken();
            if (!token) return false;
            
            const url = `${API_BASE_URL}/auth/verify`;
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Invalid token');
            }
            
            const data = await response.json();
            AppState.currentUser = data.user;
            return true;
        } catch (error) {
            console.error('Token verification failed:', error.message);
            Auth.logout();
            return false;
        }
    },
    getUserProfile: async () => {
        try {
            const token = Auth.getToken();
            if (!token) return null;
            
            const url = `${API_BASE_URL}/user/profile`;
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to get profile');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Failed to get user profile:', error.message);
            return null;
        }
    },
    updatePreferences: async (preferences) => {
        try {
            const token = Auth.getToken();
            if (!token) return { success: false, message: 'Not authenticated' };
            
            const url = `${API_BASE_URL}/user/preferences`;
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(preferences)
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to update preferences');
            }
            
            return { success: true, message: data.message };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },
    saveRecommendation: async (type, criteria, songs) => {
        try {
            const token = Auth.getToken();
            if (!token) return { success: false, message: 'Not authenticated' };
            
            const url = `${API_BASE_URL}/recommendations`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ type, criteria, songs })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to save recommendation');
            }
            
            return { success: true, message: data.message };
        } catch (error) {
            console.error('Failed to save recommendation:', error.message);
            return { success: false, message: error.message };
        }
    },
    logout: () => {
        localStorage.removeItem('modifyToken');
        localStorage.removeItem('modifyUser');
        AppState.currentUser = null;
        Navigation.showPage('home');
        Auth.updateAuthUI();
    },
    updateAuthUI: () => {
        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');
        const userMenu = document.getElementById('userMenu');
        const userName = document.getElementById('userName');
        if (Auth.isAuthenticated()) {
            const user = JSON.parse(localStorage.getItem('modifyUser') || '{}');
            AppState.currentUser = user;
            loginBtn.classList.add('hidden');
            signupBtn.classList.add('hidden');
            userMenu.classList.remove('hidden');
            userName.textContent = user.username || 'User';
        } else {
            loginBtn.classList.remove('hidden');
            signupBtn.classList.remove('hidden');
            userMenu.classList.add('hidden');
        }
    }
};

// Navigation System
const Navigation = {
    showPage: (pageId) => {
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
            AppState.currentPage = pageId;
        }
        Navigation.updateNavigation();
        Navigation.loadPageContent(pageId);
    },
    updateNavigation: () => {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.page === AppState.currentPage) {
                link.classList.add('active');
            }
        });
    },
    loadPageContent: (pageId) => {
        switch (pageId) {
            case 'library': Library.loadAllSongs(); break;
            case 'profile': Profile.loadProfile(); break;
            case 'dashboard': if (!Auth.isAuthenticated()) Navigation.showPage('auth'); break;
        }
    }
};

// ===================
// MACHINE LEARNING API (Connected to backend Python model)
// ===================
const ML = {
    detectEmotion: async () => {
        Utils.showLoading('Analyzing facial expression...');
        try {
            // Capture image from video stream
            const video = document.getElementById('cameraVideo');
            const canvas = document.getElementById('cameraCanvas');
            const context = canvas.getContext('2d');
            
            // Make sure video is playing and has valid dimensions
            if (!video.videoWidth || !video.videoHeight) {
                throw new Error('Video stream not ready');
            }
            
            // Set canvas dimensions to match video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            // Draw the current video frame to the canvas
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Convert canvas to blob
            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, 'image/jpeg', 0.9);
            });
            
            if (!blob) {
                throw new Error('Failed to capture image');
            }
            
            // Create form data and append the image
            const formData = new FormData();
            formData.append('image', blob, 'emotion-capture.jpg');
            
            // Send to server for emotion detection
            const response = await fetch('/api/emotion-detect', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to detect emotion');
            }
            
            const result = await response.json();
            console.log('Emotion detection response:', result);
            
            if (!result.emotion || result.emotion === 'unknown') {
                throw new Error('No emotion detected');
            }
            
            // If we have songs in the response, update AppData.songs with the latest data
            // This ensures we have the file_path property for local MP3 playback
            if (result.songs && Array.isArray(result.songs)) {
                // Update or add songs from the response
                result.songs.forEach(song => {
                    const existingIndex = AppData.songs.findIndex(s => s.id === song.id);
                    if (existingIndex >= 0) {
                        AppData.songs[existingIndex] = { ...AppData.songs[existingIndex], ...song };
                    } else {
                        AppData.songs.push(song);
                    }
                });
                
                // Store the detected emotion but don't show recommendations yet
                // User will need to click the "Get Recommendations" button
                AppState.detectedEmotion = result.emotion;
                AppState.detectedConfidence = result.confidence;
            }
            
            Utils.hideLoading();
            return result;
        } catch (error) {
            Utils.hideLoading();
            console.error('Error detecting emotion:', error);
            alert(error.message || 'Failed to detect emotion. Please try again.');
            return { emotion: 'unknown', confidence: 0 };
        }
    },
    detectImageVibe: async (imageFile) => {
        Utils.showLoading('Analyzing image aesthetic...');
        await Utils.delay(1800);
        const vibes = ['energetic', 'chill', 'dark', 'bright', 'aesthetic', 'moody', 'vibrant'];
        const detectedVibe = vibes[Math.floor(Math.random() * vibes.length)];
        const energy = Math.floor(Math.random() * 100);
        Utils.hideLoading();
        return { vibe: detectedVibe, energy };
    },
    recommendMusic: async (criteria) => {
        Utils.showLoading('Generating personalized recommendations...');
        await Utils.delay(1500);
        let filteredSongs = [...AppData.songs];
        if (criteria.emotion) {
            filteredSongs = filteredSongs.filter(song =>
                song.mood_tag === criteria.emotion || ML.getCompatibleMoods(criteria.emotion).includes(song.mood_tag)
            );
        }
        if (criteria.intensity !== undefined) {
            const targetEnergy = criteria.intensity * 10;
            filteredSongs = filteredSongs.sort((a, b) =>
                Math.abs(a.energy_level - targetEnergy) - Math.abs(b.energy_level - targetEnergy)
            );
        }
        if (criteria.vibe) {
            const vibeToMoodMap = {
                'energetic': ['energetic', 'excited', 'happy'],
                'chill': ['calm', 'relaxed'],
                'dark': ['sad', 'angry'],
                'bright': ['happy', 'excited'],
                'aesthetic': ['calm', 'relaxed'],
                'moody': ['sad', 'angry'],
                'vibrant': ['energetic', 'excited', 'happy']
            };
            const compatibleMoods = vibeToMoodMap[criteria.vibe] || [];
            filteredSongs = filteredSongs.filter(song => compatibleMoods.includes(song.mood_tag));
        }
        if (filteredSongs.length === 0) {
            filteredSongs = Utils.getRandomItems(AppData.songs, 5);
        }
        const recommendations = filteredSongs.slice(0, 6);
        Utils.hideLoading();
        return recommendations;
    },
    getCompatibleMoods: (emotion) => {
        const moodMap = {
            'happy': ['excited', 'energetic'],
            'sad': ['calm', 'relaxed'],
            'angry': ['energetic'],
            'relaxed': ['calm', 'sad'],
            'excited': ['happy', 'energetic'],
            'calm': ['relaxed'],
            'energetic': ['excited', 'happy'],
            'party': ['happy', 'excited', 'energetic']
        };
        return moodMap[emotion] || [];
    },
    
    recommendSongsForEmotion: async (emotion) => {
        try {
            Utils.showLoading('Finding songs for your mood...');
            
            // Map relaxed to happy as per requirements
            if (emotion === 'relaxed') {
                emotion = 'happy';
            }
            
            // Get selected music source (bollywood or hollywood)
            const musicSourceElements = document.getElementsByName('musicSource');
            let musicSource = 'bollywood'; // Default to bollywood
            
            for (const radioButton of musicSourceElements) {
                if (radioButton.checked) {
                    musicSource = radioButton.value;
                    break;
                }
            }
            
            console.log(`Selected music source: ${musicSource} for emotion: ${emotion}`);
            
            // Fetch songs from the server based on the detected emotion and music source
            const fetchUrl = `${API_BASE_URL}/songs?mood=${emotion}&source=${musicSource}`;
            console.log(`Fetching songs from: ${fetchUrl}`);
            
            const response = await fetch(fetchUrl);
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                throw new Error('Failed to fetch song recommendations');
            }
            
            const data = await response.json();
            console.log(`Received ${data.songs ? data.songs.length : 0} songs from server`);
            console.log('First song:', data.songs && data.songs.length > 0 ? data.songs[0] : 'No songs');
            
            if (!data.songs || data.songs.length === 0) {
                Utils.hideLoading();
                alert('No songs found for this emotion. Please try again.');
                return;
            }
            
            // Show recommendations
            Recommendations.showRecommendations(
                data.songs,
                `${emotion.charAt(0).toUpperCase() + emotion.slice(1)} ${musicSource.charAt(0).toUpperCase() + musicSource.slice(1)} Music`,
                `${musicSource.charAt(0).toUpperCase() + musicSource.slice(1)} songs recommended for your ${emotion} mood`
            );
            
            Utils.hideLoading();
        } catch (error) {
            Utils.hideLoading();
            console.error('Error recommending songs:', error);
            alert('Failed to get song recommendations. Please try again.');
        }
    }
};

// ===================
// RECOMMENDATIONS + CAMERA + IMAGE UPLOAD
// (The rest of your code continues unchanged...)
// ===================

// ⬇️ To avoid cutting off here, do you want me to paste the **rest of the file (Recommendations, AudioPlayer, Camera, ImageUpload, Library, Profile, Event Listeners)** in the next message?  


// ===================
// Recommendation Engine
// ===================
const Recommendations = {
    showRecommendations: (songs, title, subtitle) => {
        AppState.currentRecommendations = songs;
        document.getElementById('recTitle').textContent = title;
        document.getElementById('recSubtitle').textContent = subtitle;
        const grid = document.getElementById('recommendationsGrid');
        grid.innerHTML = '';
        songs.forEach(song => {
            const songCard = Recommendations.createSongCard(song);
            grid.appendChild(songCard);
        });
        Navigation.showPage('recommendations');
        AppState.recommendationHistory.push({
            timestamp: Date.now(),
            title,
            subtitle,
            songs
        });
        
        // Hide the Get More Recommendations and Save My Preferences buttons
        document.getElementById('getMoreRecs').style.display = 'none';
        document.getElementById('saveFeedback').style.display = 'none';
    },
    createSongCard: (song) => {
        const card = document.createElement('div');
        card.className = 'song-card';
        card.setAttribute('data-id', song.id);
        
        // Get liked songs from local storage
        const userPrefs = JSON.parse(localStorage.getItem('userPreferences') || '{}');
        const likedSongs = userPrefs.likedSongs || [];
        const isLiked = likedSongs.includes(song.id);
        
        // Create audio element for local MP3 playback
        const audioPlayer = song.file_path ? `
            <div class="audio-player">
                <audio controls>
                    <source src="${song.file_path}" type="audio/mpeg">
                    Your browser does not support the audio element.
                </audio>
            </div>
        ` : '';
        
        card.innerHTML = `
            <div class="song-header">
                <div class="title-like-container">
                    <h4 class="song-title">${song.title}</h4>
                    <button class="action-btn like ${isLiked ? 'liked' : ''}" 
                            onclick="Recommendations.toggleLike(${song.id}, this)">
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
                <p class="song-artist">${song.artist}</p>
            </div>
            <div class="song-meta">
                <span class="song-genre">${song.genre}</span>
                <span class="mood-tag ${song.mood_tag}">${song.mood_tag}</span>
            </div>
            ${audioPlayer}
            <div class="song-actions">
                <button class="action-btn play" onclick="AudioPlayer.playSong(${song.id})">
                    <i class="fas fa-play"></i> Play
                </button>
            </div>
        `;
        
        // Prevent the play button from triggering other events
        const playButton = card.querySelector('.action-btn.play');
        playButton.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        // Prevent the like button from triggering other events
        const likeButton = card.querySelector('.action-btn.like');
        likeButton.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        // Prevent the skip button from triggering other events
        const skipButton = card.querySelector('.action-btn');
        skipButton.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        return card;
    },
    toggleLike: async (songId, button) => {
        if (!Auth.isAuthenticated()) {
            Navigation.showPage('auth');
            return;
        }
        
        // Stop event propagation to prevent the song card click from triggering
        event.stopPropagation();
        
        // Get current liked songs from the server profile
        const profileData = await Auth.getUserProfile();
        if (!profileData) return;
        
        const likedSongs = JSON.parse(profileData.preferences.liked_songs || '[]');
        const isLiked = likedSongs.includes(songId);
        let newLikedSongs;
        
        if (isLiked) {
            newLikedSongs = likedSongs.filter(id => id !== songId);
            // Update all instances of this song's like button
            const allButtons = document.querySelectorAll(`.song-card[data-id="${songId}"] .action-btn.like`);
            allButtons.forEach(btn => {
                btn.classList.remove('liked');
                btn.innerHTML = '<i class="fas fa-heart"></i>';
            });
        } else {
            newLikedSongs = [...likedSongs, songId];
            // Update all instances of this song's like button
            const allButtons = document.querySelectorAll(`.song-card[data-id="${songId}"] .action-btn.like`);
            allButtons.forEach(btn => {
                btn.classList.add('liked');
                btn.innerHTML = '<i class="fas fa-heart"></i>';
            });
        }
        
        // Update local storage
        const userPrefs = JSON.parse(localStorage.getItem('userPreferences') || '{}');
        userPrefs.likedSongs = newLikedSongs;
        localStorage.setItem('userPreferences', JSON.stringify(userPrefs));
        
        // Update server
        try {
            await Auth.updatePreferences({ liked_songs: newLikedSongs });
            
            // If we're on the library page or profile page, refresh it to show updated liked songs
            if (AppState.currentPage === 'library' || AppState.currentPage === 'profile') {
                Library.loadAllSongs();
            }
            
            // Update the liked songs count in the profile page
            document.getElementById('totalLiked').textContent = newLikedSongs.length;
        } catch (error) {
            console.error('Failed to update preferences:', error);
        }
    },
    skipSong: (songId) => {
        if (!AppData.mockUser.skippedSongs.includes(songId)) {
            AppData.mockUser.skippedSongs.push(songId);
        }
        Recommendations.getMoreRecommendations();
    },
    getMoreRecommendations: async () => {
        const newSongs = Utils.getRandomItems(
            AppData.songs.filter(song =>
                !AppState.currentRecommendations.some(rec => rec.id === song.id)
            ),
            3
        );
        const grid = document.getElementById('recommendationsGrid');
        newSongs.forEach(song => {
            const songCard = Recommendations.createSongCard(song);
            grid.appendChild(songCard);
        });
        AppState.currentRecommendations.push(...newSongs);
    }
};

// ===================
// Audio Player
// ===================
const AudioPlayer = {
    currentSongId: null,
    isPlaying: false,
    audioElement: null,
    playSong: (songId) => {
        const song = AppData.songs.find(s => s.id === songId);
        if (!song) return;
        
        // If song has a file_path, use it for playback
        if (song.file_path) {
            // If we already have an audio element playing, pause it
            if (AudioPlayer.audioElement) {
                AudioPlayer.audioElement.pause();
            }
            
            // Find the audio element in the song card
            const songCard = document.querySelector(`.song-card[data-id="${songId}"]`);
            if (songCard) {
                const audio = songCard.querySelector('audio');
                if (audio) {
                    audio.play();
                    AudioPlayer.audioElement = audio;
                    AudioPlayer.currentSongId = songId;
                    AudioPlayer.isPlaying = true;
                    return;
                }
            }
        }
        
        // Fallback to the old player if no file_path or audio element found
        document.getElementById('playerTitle').textContent = song.title;
        document.getElementById('playerArtist').textContent = song.artist;
        document.getElementById('audioPlayer').classList.remove('hidden');
        const playBtn = document.getElementById('playerPlay');
        playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        AudioPlayer.currentSongId = songId;
        AudioPlayer.isPlaying = true;
        AudioPlayer.simulatePlayback();
    },
    togglePlay: () => {
        const playBtn = document.getElementById('playerPlay');
        if (AudioPlayer.isPlaying) {
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
            AudioPlayer.isPlaying = false;
        } else {
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            AudioPlayer.isPlaying = true;
            AudioPlayer.simulatePlayback();
        }
    },
    simulatePlayback: () => {
        if (!AudioPlayer.isPlaying) return;
        const progressFill = document.getElementById('progressFill');
        const currentTime = document.getElementById('playerCurrentTime');
        const duration = document.getElementById('playerDuration');
        duration.textContent = '3:45';
        let progress = 0;
        const interval = setInterval(() => {
            if (!AudioPlayer.isPlaying) {
                clearInterval(interval);
                return;
            }
            progress += 0.5;
            progressFill.style.width = `${progress}%`;
            currentTime.textContent = Utils.formatTime((progress / 100) * 225);
            if (progress >= 100) {
                clearInterval(interval);
                AudioPlayer.nextSong();
            }
        }, 1000);
    },
    nextSong: () => {
        if (AppState.currentRecommendations.length > 0) {
            const currentIndex = AppState.currentRecommendations.findIndex(s => s.id === AudioPlayer.currentSongId);
            const nextIndex = (currentIndex + 1) % AppState.currentRecommendations.length;
            AudioPlayer.playSong(AppState.currentRecommendations[nextIndex].id);
        }
    },
    prevSong: () => {
        if (AppState.currentRecommendations.length > 0) {
            const currentIndex = AppState.currentRecommendations.findIndex(s => s.id === AudioPlayer.currentSongId);
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : AppState.currentRecommendations.length - 1;
            AudioPlayer.playSong(AppState.currentRecommendations[prevIndex].id);
        }
    }
};

// ===================
// Camera Interface
// ===================
const Camera = {
    startCamera: async () => {
        try {
            const video = document.getElementById('cameraVideo');
            const canvas = document.getElementById('cameraCanvas');
            
            // Request camera with specific constraints for better face detection
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            });
            
            video.srcObject = stream;
            AppState.cameraStream = stream;
            
            // Wait for video to be ready
            await new Promise((resolve) => {
                video.onloadedmetadata = () => {
                    video.play();
                    resolve();
                };
            });
            
            // Set canvas size to match video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            document.getElementById('startCamera').classList.add('hidden');
            document.getElementById('captureEmotion').classList.remove('hidden');
            
            console.log('[Camera] Started successfully:', {
                videoWidth: video.videoWidth,
                videoHeight: video.videoHeight,
                canvasWidth: canvas.width,
                canvasHeight: canvas.height
            });
            
        } catch (error) {
            console.error('[Camera] Error starting camera:', error);
            alert('Camera access denied. Please allow camera permissions.');
        }
    },
    stopCamera: () => {
        if (AppState.cameraStream) {
            AppState.cameraStream.getTracks().forEach(track => track.stop());
            AppState.cameraStream = null;
        }
        const video = document.getElementById('cameraVideo');
        video.srcObject = null;
        document.getElementById('startCamera').classList.remove('hidden');
        document.getElementById('captureEmotion').classList.add('hidden');
        document.getElementById('emotionResult').classList.add('hidden');
    },
    captureEmotion: async () => {
        try {
            // Show loading overlay
            Utils.showLoading('Analyzing your facial expression...');
            
            // Call ML module to detect emotion
            const result = await ML.detectEmotion();
            
            // Hide loading overlay
            Utils.hideLoading();
            
            // Update UI with detected emotion
            document.getElementById('detectedEmotion').textContent = result.emotion;
            document.getElementById('emotionConfidence').textContent = result.confidence.toFixed(1);
            document.getElementById('emotionResult').classList.remove('hidden');
            
            // The music source selection is already part of the emotionResult div
            // which is now visible
            
            // Store detected emotion in app state
            AppState.detectedEmotion = result.emotion;
            
            console.log('Emotion detection result:', result);
        } catch (error) {
            Utils.hideLoading();
            console.error('Error in emotion capture:', error);
            alert('Failed to detect emotion. Please try again.');
        }
    }
};

// ===================
// Image Upload Handler
// ===================
const ImageUpload = {
    handleUpload: (file) => {
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            const img = document.getElementById('uploadedImage');
            img.src = e.target.result;
            document.getElementById('uploadZone').classList.add('hidden');
            document.getElementById('imagePreview').classList.remove('hidden');
            const result = await ML.detectImageVibe(file);
            document.getElementById('detectedVibe').textContent = result.vibe;
            document.getElementById('vibeEnergy').textContent = result.energy;
            document.getElementById('vibeAnalysis').classList.remove('hidden');
            AppState.detectedVibe = result.vibe;
            AppState.detectedEnergy = result.energy;
        };
        reader.readAsDataURL(file);
    }
};

// ===================
// Library Management
// ===================
const Library = {
    loadAllSongs: async () => {
        const grid = document.getElementById('libraryGrid');
        grid.innerHTML = '';
        
        // Check if user is authenticated
        if (Auth.isAuthenticated()) {
            try {
                // Get user profile to get liked songs
                const profileData = await Auth.getUserProfile();
                if (profileData) {
                    const likedSongs = JSON.parse(profileData.preferences.liked_songs || '[]');
                    
                    // Update local storage with server data
                    const userPrefs = JSON.parse(localStorage.getItem('userPreferences') || '{}');
                    userPrefs.likedSongs = likedSongs;
                    localStorage.setItem('userPreferences', JSON.stringify(userPrefs));
                    
                    // Show message if no liked songs
                    if (likedSongs.length === 0) {
                        grid.innerHTML = '<p style="text-align: center; color: var(--color-text-secondary);">No liked songs yet. Start exploring music!</p>';
                        return;
                    }
                    
                    // Filter songs to only show liked songs
                    const userLikedSongs = AppData.songs.filter(song => likedSongs.includes(song.id));
                    userLikedSongs.forEach(song => {
                        const songCard = Recommendations.createSongCard(song);
                        grid.appendChild(songCard);
                    });
                    
                    // Update the liked songs count in the profile page
                    document.getElementById('totalLiked').textContent = likedSongs.length;
                    
                    // Also update the liked songs grid in the profile page
                    const likedSongsGrid = document.getElementById('likedSongsGrid');
                    if (likedSongsGrid) {
                        likedSongsGrid.innerHTML = '';
                        userLikedSongs.forEach(song => {
                            const songCard = Recommendations.createSongCard(song);
                            likedSongsGrid.appendChild(songCard);
                        });
                    }
                    
                    return;
                }
            } catch (error) {
                console.error('Error loading liked songs:', error);
            }
        }
        
        // If not authenticated or error occurred, show message to login
        grid.innerHTML = '<p style="text-align: center; color: var(--color-text-secondary);">Please log in to see your library.</p>';
    },
    filterSongs: async () => {
        const genreFilter = document.getElementById('genreFilter').value;
        const moodFilter = document.getElementById('moodFilter').value;
        let filteredSongs = [];
        
        // If user is authenticated, only filter liked songs
        if (Auth.isAuthenticated()) {
            try {
                const profileData = await Auth.getUserProfile();
                if (profileData) {
                    const likedSongs = profileData.preferences.liked_songs || [];
                    filteredSongs = AppData.songs.filter(song => likedSongs.includes(song.id));
                } else {
                    filteredSongs = AppData.songs;
                }
            } catch (error) {
                console.error('Error loading liked songs for filtering:', error);
                filteredSongs = AppData.songs;
            }
        } else {
            filteredSongs = AppData.songs;
        }
        
        // Apply genre and mood filters
        if (genreFilter) filteredSongs = filteredSongs.filter(song => song.genre === genreFilter);
        if (moodFilter) filteredSongs = filteredSongs.filter(song => song.mood_tag === moodFilter);
        
        const grid = document.getElementById('libraryGrid');
        grid.innerHTML = '';
        
        if (filteredSongs.length === 0) {
            grid.innerHTML = '<p style="text-align: center; color: var(--color-text-secondary);">No songs match your filters.</p>';
            return;
        }
        
        filteredSongs.forEach(song => {
            const songCard = Recommendations.createSongCard(song);
            grid.appendChild(songCard);
        });
    }
};

// ===================
// Profile Management
// ===================
const Profile = {
    loadProfile: async () => {
        if (!Auth.isAuthenticated()) {
            Navigation.showPage('auth');
            return;
        }
        try {
            const profileData = await Auth.getUserProfile();
            if (!profileData) return;
            const { user, preferences } = profileData;
            document.getElementById('profileName').textContent = user.username;
            document.getElementById('profileEmail').textContent = user.email;
            const likedSongs = preferences.liked_songs || [];
            const skippedSongs = preferences.skipped_songs || [];
            document.getElementById('totalLiked').textContent = likedSongs.length;
            document.getElementById('totalRecommendations').textContent = AppState.recommendationHistory.length;
            document.getElementById('favoriteGenre').textContent = preferences.favorite_genre || 'None yet';
            Profile.loadLikedSongs(likedSongs);
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    },
    loadLikedSongs: (likedSongs = null) => {
        const grid = document.getElementById('likedSongsGrid');
        grid.innerHTML = '';
        if (!likedSongs) {
            const userPrefs = localStorage.getItem('userPreferences');
            likedSongs = userPrefs ? JSON.parse(userPrefs).likedSongs || [] : [];
        }
        const songs = AppData.songs.filter(song => likedSongs.includes(song.id));
        if (songs.length === 0) {
            grid.innerHTML = '<p style="text-align: center; color: var(--color-text-secondary);">No liked songs yet. Start exploring music!</p>';
            return;
        }
        songs.forEach(song => {
            const songCard = Recommendations.createSongCard(song);
            grid.appendChild(songCard);
        });
    }
};

// ===================
// Event Listeners
// ===================
// Function to load songs from the database
const loadSongsFromDatabase = async () => {
    try {
        Utils.showLoading('Loading songs...');
        const response = await fetch(`${API_BASE_URL}/songs`);
        const data = await response.json();
        
        if (response.ok && data.songs) {
            // Load all songs (both Bollywood and Hollywood)
            AppData.songs = data.songs;
            console.log(`Loaded ${AppData.songs.length} songs from database (${data.songs.filter(song => song.genre === 'Bollywood').length} Bollywood, ${data.songs.filter(song => song.genre === 'Hollywood').length} Hollywood)`);
        } else {
            console.error('Failed to load songs:', data.error || 'Unknown error');
        }
        Utils.hideLoading();
    } catch (error) {
        console.error('Error loading songs:', error);
        Utils.hideLoading();
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    // Load songs from database first
    await loadSongsFromDatabase();
    
    if (Auth.isAuthenticated()) {
        const isValid = await Auth.verifyToken();
        if (!isValid) console.log('Token expired or invalid, user logged out');
    }
    Auth.updateAuthUI();
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            if (page === 'dashboard' && !Auth.isAuthenticated()) {
                Navigation.showPage('auth');
            } else {
                Navigation.showPage(page);
            }
        });
    });
    document.getElementById('loginBtn').addEventListener('click', () => {
        Navigation.showPage('auth');
        document.querySelector('[data-tab="login"]').click();
    });
    document.getElementById('signupBtn').addEventListener('click', () => {
        Navigation.showPage('auth');
        document.querySelector('[data-tab="signup"]').click();
    });
    document.getElementById('logoutBtn').addEventListener('click', Auth.logout);
    document.getElementById('getStartedBtn').addEventListener('click', () => {
        if (Auth.isAuthenticated()) Navigation.showPage('dashboard');
        else Navigation.showPage('auth');
    });
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab + 'Form').classList.add('active');
        });
    });
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        // Clear any previous error messages
        const errorContainer = document.getElementById('loginErrorContainer') || createErrorContainer('loginForm');
        errorContainer.innerHTML = '';
        errorContainer.style.display = 'none';
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const result = await Auth.login(email, password);
        
        if (result.success) {
            Auth.updateAuthUI();
            Navigation.showPage('dashboard');
        } else {
            // Display error in the error container
            errorContainer.innerHTML = result.message.replace(/\n• /g, '<br>• ');
            errorContainer.style.display = 'block';
        }
    });
    document.getElementById('signupForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        // Clear any previous error messages
        const errorContainer = document.getElementById('signupErrorContainer') || createErrorContainer('signupForm');
        errorContainer.innerHTML = '';
        errorContainer.style.display = 'none';
        
        const username = document.getElementById('signupUsername').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const result = await Auth.signup(username, email, password);
        
        if (result.success) {
            Auth.updateAuthUI();
            Navigation.showPage('dashboard');
        } else {
            // Display error in the error container
            errorContainer.innerHTML = result.message.replace(/\n• /g, '<br>• ');
            errorContainer.style.display = 'block';
        }
    });
    
    // Helper function to create error container if it doesn't exist
    function createErrorContainer(formId) {
        const form = document.getElementById(formId);
        const errorContainer = document.createElement('div');
        errorContainer.id = formId + 'ErrorContainer';
        errorContainer.className = 'error-container';
        errorContainer.style.display = 'none';
        errorContainer.style.color = '#e74c3c';
        errorContainer.style.backgroundColor = '#fdecea';
        errorContainer.style.padding = '10px';
        errorContainer.style.borderRadius = '4px';
        errorContainer.style.marginBottom = '15px';
        form.insertBefore(errorContainer, form.firstChild);
        return errorContainer;
    }
    document.querySelectorAll('.mode-card').forEach(card => {
        card.addEventListener('click', () => {
            const mode = card.dataset.mode;
            Navigation.showPage(mode + 'Mode');
        });
    });
    document.getElementById('selectEmotionBtn').addEventListener('click', () => {
        const emotion = document.getElementById('emotionSelect').value;
        if (!emotion) {
            alert('Please select an emotion');
            return;
        }
        // Show music source selection
        document.getElementById('emotionMusicSourceSelection').classList.remove('hidden');
        AppState.selectedEmotion = emotion;
    });
    
    document.getElementById('getEmotionRecs').addEventListener('click', async () => {
        const emotion = AppState.selectedEmotion;
        if (!emotion) {
            alert('Please select an emotion first');
            return;
        }
        
        // Get selected music source
        const musicSourceElements = document.getElementsByName('emotionMusicSource');
        let musicSource = 'bollywood'; // Default to bollywood
        
        for (const radioButton of musicSourceElements) {
            if (radioButton.checked) {
                musicSource = radioButton.value;
                break;
            }
        }
        
        try {
            Utils.showLoading('Finding songs for your mood...');
            
            // Fetch songs from the server based on the selected emotion and music source
            const fetchUrl = `${API_BASE_URL}/songs?mood=${emotion}&source=${musicSource}`;
            console.log(`Fetching songs from: ${fetchUrl}`);
            
            const response = await fetch(fetchUrl);
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                throw new Error('Failed to fetch song recommendations');
            }
            
            const data = await response.json();
            console.log(`Received ${data.songs ? data.songs.length : 0} songs from server`);
            
            if (!data.songs || data.songs.length === 0) {
                Utils.hideLoading();
                alert('No songs found for this emotion. Please try again.');
                return;
            }
            
            // Show recommendations
            Recommendations.showRecommendations(
                data.songs,
                `${emotion.charAt(0).toUpperCase() + emotion.slice(1)} ${musicSource.charAt(0).toUpperCase() + musicSource.slice(1)} Music`,
                `${musicSource.charAt(0).toUpperCase() + musicSource.slice(1)} songs recommended for your ${emotion} mood`
            );
            
            Utils.hideLoading();
        } catch (error) {
            Utils.hideLoading();
            console.error('Error recommending songs:', error);
            alert('Failed to get song recommendations. Please try again.');
        }
    });
    
    // Event listener for the "Get Recommendations" button in the emotion detection section is defined below
    document.getElementById('startCamera').addEventListener('click', Camera.startCamera);
    document.getElementById('stopCamera').addEventListener('click', Camera.stopCamera);
    document.getElementById('captureEmotion').addEventListener('click', Camera.captureEmotion);
    document.getElementById('getFaceRecs').addEventListener('click', async () => {
        if (AppState.detectedEmotion) {
            // Get selected music source
            const musicSourceElements = document.getElementsByName('musicSource');
            let musicSource = 'bollywood'; // Default to bollywood
            
            for (const radioButton of musicSourceElements) {
                if (radioButton.checked) {
                    musicSource = radioButton.value;
                    break;
                }
            }
            
            try {
                Utils.showLoading('Finding songs for your mood...');
                
                // Fetch songs from the server based on the detected emotion and music source
                const fetchUrl = `${API_BASE_URL}/songs?mood=${AppState.detectedEmotion}&source=${musicSource}`;
                console.log(`Fetching songs from: ${fetchUrl}`);
                
                const response = await fetch(fetchUrl);
                console.log('Response status:', response.status);
                
                if (!response.ok) {
                    throw new Error('Failed to fetch song recommendations');
                }
                
                const data = await response.json();
                console.log(`Received ${data.songs ? data.songs.length : 0} songs from server`);
                
                if (!data.songs || data.songs.length === 0) {
                    Utils.hideLoading();
                    alert('No songs found for this emotion. Please try again.');
                    return;
                }
                
                // Show recommendations
                Recommendations.showRecommendations(
                    data.songs,
                    `${AppState.detectedEmotion.charAt(0).toUpperCase() + AppState.detectedEmotion.slice(1)} ${musicSource.charAt(0).toUpperCase() + musicSource.slice(1)} Music`,
                    `${musicSource.charAt(0).toUpperCase() + musicSource.slice(1)} songs based on facial emotion detection`
                );
                
                Utils.hideLoading();
            } catch (error) {
                Utils.hideLoading();
                console.error('Error recommending songs:', error);
                alert('Failed to get song recommendations. Please try again.');
            }
        } else {
            alert('No emotion detected. Please try again.');
        }
    });
    const uploadZone = document.getElementById('uploadZone');
    const imageInput = document.getElementById('imageInput');
    uploadZone.addEventListener('click', () => imageInput.click());
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'var(--color-primary)';
    });
    uploadZone.addEventListener('dragleave', () => {
        uploadZone.style.borderColor = 'var(--color-border)';
    });
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'var(--color-border)';
        const file = e.dataTransfer.files[0];
        if (file) ImageUpload.handleUpload(file);
    });
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) ImageUpload.handleUpload(file);
    });
    document.getElementById('getImageRecs').addEventListener('click', async () => {
        if (AppState.detectedVibe) {
            const recommendations = await ML.recommendMusic({
                vibe: AppState.detectedVibe,
                energy: AppState.detectedEnergy
            });
            Recommendations.showRecommendations(
                recommendations,
                `${AppState.detectedVibe.charAt(0).toUpperCase() + AppState.detectedVibe.slice(1)} Vibes`,
                'Based on image aesthetic analysis'
            );
        }
    });
    document.getElementById('backToDashboard').addEventListener('click', () => {
        Navigation.showPage('dashboard');
    });
    document.getElementById('getMoreRecs').addEventListener('click', Recommendations.getMoreRecommendations);
    document.getElementById('saveFeedback').addEventListener('click', () => {
        alert('Preferences saved! We\'ll use this to improve future recommendations.');
    });
    document.getElementById('genreFilter').addEventListener('change', Library.filterSongs);
    document.getElementById('moodFilter').addEventListener('change', Library.filterSongs);
    document.getElementById('playerPlay').addEventListener('click', AudioPlayer.togglePlay);
    document.getElementById('playerNext').addEventListener('click', AudioPlayer.nextSong);
    document.getElementById('playerPrev').addEventListener('click', AudioPlayer.prevSong);
    const savedPrefs = localStorage.getItem('userPreferences');
    if (savedPrefs) {
        AppData.mockUser = { ...AppData.mockUser, ...JSON.parse(savedPrefs) };
    }
});
