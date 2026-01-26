console.log('🚀 JavaScript file loaded successfully');

class GoogleDriveGallery {
    constructor() {
        // Simple API Key Configuration - no OAuth2 needed for public folders
        this.API_KEY = 'AIzaSyBvowJZ8wT8Tqx9Q_Km6HfB5B6tEp3nWzY'; // You'll need to get an API key from Google Cloud Console
        this.CLIENT_ID = '96355657028-fbtqno6ir4h1ca6ufbqbrr4heiqn00gk.apps.googleusercontent.com';
        
        // This is your PUBLIC Google Drive folder ID - make sure the folder is shared publicly
        this.FOLDER_ID = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
        
        // Gallery state
        this.photos = [];
        this.currentSlideIndex = 0;
        this.isPlaying = true;
        this.slideDuration = 4000;
        this.slideInterval = null;
        
        window.galleryManager = this;
        
        this.initializeElements();
        this.setupEventListeners();
        
        // Initialize and load photos directly
        console.log('🚀 Gallery initializing...');
        this.loadPhotosFromGoogleDrive();
    }

    initializeElements() {
        this.galleryWrapper = document.getElementById('galleryWrapper');
        this.slidesContainer = document.getElementById('slidesContainer');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.fullscreenBtn = document.getElementById('fullscreenBtn');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.currentSlideSpan = document.getElementById('currentSlide');
        this.totalSlidesSpan = document.getElementById('totalSlides');
        this.lastUpdateSpan = document.getElementById('lastUpdate');
    }

    setupEventListeners() {
        if (this.playPauseBtn) {
            this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        }
        if (this.fullscreenBtn) {
            this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        }
        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', () => this.previousSlide());
        }
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => this.nextSlide());
        }
        
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
    }

    // Google API initialization
    async initializeGoogleAPIs() {
        try {
            console.log('🔧 Starting Google APIs initialization...');
            
            // Load Google API scripts
            console.log('📦 Loading Google scripts...');
            await this.loadGoogleScripts();
            console.log('✅ Google scripts loaded');
            
            // Initialize Google API client (without API key for private Drive access)
            console.log('⚙️ Initializing GAPI client...');
            await new Promise((resolve) => {
                gapi.load('client', resolve);
            });
            
            // Initialize client without API key - we'll use OAuth2 tokens instead
            await gapi.client.init({
                discoveryDocs: [this.DISCOVERY_DOC],
            });
            this.gapiInited = true;
            console.log('✅ GAPI client initialized');
            
            // Initialize Google Identity Services
            console.log('🔑 Initializing Google Identity Services...');
            google.accounts.id.initialize({
                client_id: this.CLIENT_ID,
            });
            
            this.gisInited = true;
            console.log('✅ Google Identity Services initialized');
            
            console.log('✅ Google APIs initialized successfully');
            this.checkAuthState();
            
        } catch (error) {
            console.error('❌ Failed to initialize Google APIs:', error);
            console.log('🔄 Falling back to basic mode...');
            this.showBasicMode();
        }
    }

    async loadGoogleScripts() {
        console.log('📥 Loading GAPI script...');
        // Load GAPI
        if (!window.gapi) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://apis.google.com/js/api.js';
                script.onload = () => {
                    console.log('✅ GAPI script loaded');
                    resolve();
                };
                script.onerror = (error) => {
                    console.error('❌ Failed to load GAPI script:', error);
                    reject(error);
                };
                document.head.appendChild(script);
            });
        } else {
            console.log('✅ GAPI already loaded');
        }

        console.log('📥 Loading Google Identity Services script...');
        // Load Google Identity Services
        if (!window.google) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://accounts.google.com/gsi/client';
                script.onload = () => {
                    console.log('✅ Google Identity Services script loaded');
                    resolve();
                };
                script.onerror = (error) => {
                    console.error('❌ Failed to load Google Identity Services script:', error);
                    reject(error);
                };
                document.head.appendChild(script);
            });
        } else {
            console.log('✅ Google Identity Services already loaded');
        }
    }

    checkAuthState() {
        if (this.gapiInited && this.gisInited) {
            console.log('🔑 Setting up OAuth2 token client...');
            console.log('Current URL origin:', window.location.origin);
            console.log('Current URL href:', window.location.href);
            
            // Check if user is already signed in
            try {
                this.tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: this.CLIENT_ID,
                    scope: this.SCOPES,
                    callback: (tokenResponse) => {
                        console.log('✅ Token received:', tokenResponse);
                        console.log('Token details:', JSON.stringify(tokenResponse, null, 2));
                        
                        if (tokenResponse.error) {
                            console.error('❌ Token error:', tokenResponse.error);
                            this.showErrorMessage('Authentication failed: ' + tokenResponse.error);
                            return;
                        }
                        
                        if (!tokenResponse.access_token) {
                            console.error('❌ No access token received');
                            this.showErrorMessage('Authentication failed: No access token received');
                            return;
                        }
                        
                        // Set the access token for the GAPI client
                        gapi.client.setToken({access_token: tokenResponse.access_token});
                        this.isSignedIn = true;
                        console.log('🔐 User authenticated successfully');
                        this.loadPhotosFromGoogleDrive();
                    },
                    error_callback: (error) => {
                        console.error('❌ OAuth error:', error);
                        console.error('Error details:', JSON.stringify(error, null, 2));
                        this.showErrorMessage('Authentication failed: ' + (error.type || error.message || 'Unknown error'));
                    }
                });
                
                console.log('✅ Token client initialized');
                this.showSignInButton();
            } catch (error) {
                console.error('❌ Error setting up token client:', error);
                this.showErrorMessage('Authentication setup failed: ' + error.message);
            }
        } else {
            console.log('⚠️ APIs not ready yet');
        }
    }

    signIn() {
        console.log('🖱️ Sign in button clicked');
        console.log('Current origin:', window.location.origin);
        console.log('Token client status:', !!this.tokenClient);
        
        if (this.tokenClient) {
            try {
                console.log('🔄 Requesting access token...');
                // Add some additional options for better compatibility
                this.tokenClient.requestAccessToken({
                    prompt: 'consent'
                });
            } catch (error) {
                console.error('❌ Error requesting token:', error);
                this.showErrorMessage('Sign-in failed: ' + error.message);
            }
        } else {
            console.error('❌ Token client not initialized');
            this.showErrorMessage('Authentication not ready. Please refresh the page.');
        }
    }

    showSignInButton() {
        const slide = document.getElementById('loadingSlide');
        if (slide) {
            slide.innerHTML = `
                <div class="loading-message" style="text-align: center; color: white; padding: 2rem;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">🔑</div>
                    <h2>Google Drive Authentication</h2>
                    <p style="margin: 1rem 0; opacity: 0.8;">Click the button below to sign in and access your Google Drive photos</p>
                    <button onclick="window.galleryManager.signIn()" style="
                        background: #4285F4;
                        border: none;
                        color: white;
                        padding: 12px 24px;
                        border-radius: 6px;
                        font-size: 16px;
                        cursor: pointer;
                        margin-top: 1rem;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                        transition: all 0.2s ease;
                    " onmouseover="this.style.background='#3367D6'" onmouseout="this.style.background='#4285F4'">
                        Sign in with Google
                    </button>
                </div>
            `;
        }
    }

    showBasicMode() {
        console.log('🛠️ Showing basic mode interface');
        const slide = document.getElementById('loadingSlide');
        if (slide) {
            slide.innerHTML = `
                <div class="loading-message" style="text-align: center; color: white; padding: 2rem;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">🔧</div>
                    <h2>Gallery in Basic Mode</h2>
                    <p style="margin: 1rem 0; opacity: 0.8;">Google API initialization failed, but the gallery structure is working!</p>
                    <div style="background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                        <p style="color: #4CAF50;">✅ HTML loaded correctly</p>
                        <p style="color: #4CAF50;">✅ JavaScript file loaded</p>
                        <p style="color: #4CAF50;">✅ Gallery class initialized</p>
                        <p style="color: #FFC107;">⚠️ Google API loading failed</p>
                    </div>
                    <button onclick="location.reload()" style="
                        background: #4285F4;
                        border: none;
                        color: white;
                        padding: 12px 24px;
                        border-radius: 6px;
                        font-size: 16px;
                        cursor: pointer;
                        margin-top: 1rem;
                    ">
                        Try Again
                    </button>
                </div>
            `;
        }
    }

    async loadPhotosFromGoogleDrive() {
        try {
            console.log('📱 Starting authenticated photo load from Google Drive...');
            console.log('🗂️ Folder ID:', this.FOLDER_ID);
            
            if (!this.isSignedIn) {
                console.log('⚠️ User not signed in');
                return;
            }

            // Use authenticated Google Drive API call
            const response = await gapi.client.drive.files.list({
                q: `'${this.FOLDER_ID}' in parents and trashed=false and (mimeType contains 'image/')`,
                fields: 'files(id,name,mimeType,webContentLink)',
                orderBy: 'name'
            });

            const files = response.result.files || [];
            console.log(`✅ Found ${files.length} image files`);
            
            if (files.length > 0) {
                this.photos = files.map(file => ({
                    id: file.id,
                    name: file.name,
                    url: `https://drive.google.com/uc?id=${file.id}&export=view`,
                    mimeType: file.mimeType
                }));
                
                this.createSlideElements();
                this.updateSlideCounter();
                this.startSlideshow();
                this.updateLastUpdateTime();
            } else {
                this.showNoImagesMessage();
            }
            
        } catch (error) {
            console.error('💥 Failed to load photos:', error);
            this.showErrorMessage('Failed to load photos. Please check your folder ID and permissions.');
        }
    }
    
    createSlideElements() {
        const loadingSlide = document.getElementById('loadingSlide');
        if (loadingSlide) {
            loadingSlide.remove();
        }
        
        this.slidesContainer.innerHTML = '';
        
        console.log(`🖼️ Creating ${this.photos.length} slide elements...`);
        
        this.photos.forEach((photo, index) => {
            const slide = document.createElement('div');
            slide.className = `slide ${index === 0 ? 'active' : ''}`;
            
            const img = document.createElement('img');
            img.src = photo.url;
            img.alt = photo.name;
            img.loading = 'eager';
            img.style.maxWidth = '100%';
            img.style.maxHeight = '100%';
            img.style.objectFit = 'contain';
            
            console.log(`🔗 Loading: ${photo.name} from ${photo.url}`);
            
            img.onload = () => {
                console.log(`✅ Loaded successfully: ${photo.name}`);
            };
            
            img.onerror = () => {
                console.log(`❌ Failed to load: ${photo.name}`);
            };
            
            slide.appendChild(img);
            this.slidesContainer.appendChild(slide);
        });
        
        console.log(`✅ Created all ${this.photos.length} slides`);
    }
    


    startSlideshow() {
        if (this.photos.length <= 1) {
            console.log('⏸️ Not starting slideshow - only 1 or fewer images');
            return;
        }
        
        console.log(`▶️ Starting slideshow with ${this.photos.length} images`);
        this.slideInterval = setInterval(() => {
            if (this.isPlaying) {
                this.nextSlide();
            }
        }, this.slideDuration);
    }

    nextSlide() {
        if (this.photos.length <= 1) return;
        
        const slides = this.slidesContainer.querySelectorAll('.slide');
        slides[this.currentSlideIndex].classList.remove('active');
        
        this.currentSlideIndex = (this.currentSlideIndex + 1) % this.photos.length;
        slides[this.currentSlideIndex].classList.add('active');
        
        console.log(`➡️ Next slide: ${this.currentSlideIndex + 1}/${this.photos.length}`);
        this.updateSlideCounter();
    }

    previousSlide() {
        if (this.photos.length <= 1) return;
        
        const slides = this.slidesContainer.querySelectorAll('.slide');
        slides[this.currentSlideIndex].classList.remove('active');
        
        this.currentSlideIndex = this.currentSlideIndex === 0 ? this.photos.length - 1 : this.currentSlideIndex - 1;
        slides[this.currentSlideIndex].classList.add('active');
        
        console.log(`⬅️ Previous slide: ${this.currentSlideIndex + 1}/${this.photos.length}`);
        this.updateSlideCounter();
    }

    updateSlideCounter() {
        if (this.photos.length > 0 && this.currentSlideSpan && this.totalSlidesSpan) {
            this.currentSlideSpan.textContent = this.currentSlideIndex + 1;
            this.totalSlidesSpan.textContent = this.photos.length;
        }
    }

    togglePlayPause() {
        this.isPlaying = !this.isPlaying;
        console.log(`${this.isPlaying ? '▶️' : '⏸️'} Slideshow ${this.isPlaying ? 'playing' : 'paused'}`);
        
        if (this.playPauseBtn) {
            this.playPauseBtn.textContent = this.isPlaying ? 'Pause' : 'Play';
        }
        
        if (this.isPlaying && !this.slideInterval && this.photos.length > 1) {
            this.startSlideshow();
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement && this.galleryWrapper) {
            this.galleryWrapper.requestFullscreen();
        } else if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }

    handleKeydown(event) {
        switch(event.code) {
            case 'Space':
                event.preventDefault();
                this.togglePlayPause();
                break;
            case 'ArrowRight':
                this.nextSlide();
                break;
            case 'ArrowLeft':
                this.previousSlide();
                break;
        }
    }

    updateLastUpdateTime() {
        if (this.lastUpdateSpan) {
            this.lastUpdateSpan.textContent = new Date().toLocaleTimeString();
        }
    }

    showErrorMessage(message) {
        console.error('🚨 Showing error message:', message);
        this.slidesContainer.innerHTML = `
            <div class="slide active">
                <div style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    color: white;
                    text-align: center;
                    opacity: 0.8;
                    padding: 2rem;
                ">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">⚠️</div>
                    <h3 style="margin-bottom: 1rem;">Gallery Error</h3>
                    <p style="margin-bottom: 1rem; max-width: 400px;">${message}</p>
                    <button onclick="window.galleryManager.loadPhotosFromGoogleDrive()" style="
                        padding: 12px 24px;
                        background: rgba(255,255,255,0.2);
                        border: 1px solid rgba(255,255,255,0.3);
                        color: white;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 1rem;
                        margin: 5px;
                    ">Try Again</button>
                    <button onclick="console.log('Debug info:', window.galleryManager)" style="
                        padding: 8px 16px;
                        background: rgba(255,255,255,0.1);
                        border: 1px solid rgba(255,255,255,0.2);
                        color: white;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 0.9rem;
                        margin: 5px;
                    ">Debug Info</button>
                </div>
            </div>
        `;
    }

    showNoImagesMessage() {
        console.log('📭 No images found, showing message');
        this.slidesContainer.innerHTML = `
            <div class="slide active">
                <div style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    color: white;
                    text-align: center;
                    opacity: 0.8;
                    padding: 2rem;
                ">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">📂</div>
                    <h3 style="margin-bottom: 1rem;">No Images Found</h3>
                    <p style="margin-bottom: 1rem; max-width: 400px;">
                        Could not load images from the Google Drive folder.
                    </p>
                    <div style="opacity: 0.6; line-height: 1.6; max-width: 500px; margin-bottom: 1rem;">
                        <div><strong>To fix this:</strong></div>
                        <div>1. Make sure the Google Drive folder is shared publicly</div>
                        <div>2. Make sure individual images are also shared publicly</div>
                        <div>3. Check that the API key has proper permissions</div>
                    </div>
                    <button onclick="window.galleryManager.loadPhotosFromGoogleDrive()" style="
                        padding: 12px 24px;
                        background: rgba(255,255,255,0.2);
                        border: 1px solid rgba(255,255,255,0.3);
                        color: white;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 1rem;
                    ">Retry Loading</button>
                </div>
            </div>
        `;
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌟 Page loaded, initializing Google Drive Gallery...');
    window.galleryManager = new GoogleDriveGallery();
});