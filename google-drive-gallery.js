class GoogleDriveGallery {
    constructor() {
        // Configuration - Replace these with your actual values
        this.FOLDER_ID = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'; // Replace with your folder ID
        
        // Since API key doesn't work, we'll use a demo array for now
        // In production, you would need OAuth2 or server-side proxy
        this.photos = [];
        this.currentSlideIndex = 0;
        this.isPlaying = true;
        this.slideDuration = 4000;
        this.slideInterval = null;
        this.hasPhotos = false;
        
        window.galleryManager = this;
        
        this.initializeElements();
        this.setupEventListeners();
        
        // Try to load photos, but provide fallback
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
        document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('webkitfullscreenchange', () => this.handleFullscreenChange());
    }

    async loadPhotosFromGoogleDrive() {
        // Show loading message
        this.showLoadingMessage();
        
        try {
            // Since Google Drive API requires OAuth2, show instructions for setup
            this.showSetupInstructions();
            
        } catch (error) {
            console.error('❌ Failed to load photos:', error);
            this.showErrorMessage(error.message);
        }
    }

    showLoadingMessage() {
        this.slidesContainer.innerHTML = `
            <div class="slide active" id="loadingSlide">
                <div class="loading-message" style="text-align: center; color: white;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">📁</div>
                    <h2>Loading Gallery...</h2>
                    <p>Connecting to Google Drive...</p>
                    <div class="loading-spinner" style="margin-top: 1rem;">
                        <div style="animation: spin 2s linear infinite; font-size: 2rem;">⟳</div>
                    </div>
                </div>
            </div>
            <style>
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            </style>
        `;
    }

    showSetupInstructions() {
        const slide = document.getElementById('loadingSlide');
        if (slide) {
            slide.innerHTML = `
                <div class="loading-message" style="text-align: center; color: white; max-width: 600px; padding: 2rem;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">🔧</div>
                    <h2>Google Drive Setup Required</h2>
                    <div style="text-align: left; background: rgba(0,0,0,0.3); padding: 1.5rem; border-radius: 8px; margin: 1rem 0;">
                        <h3 style="margin-top: 0; color: #4CAF50;">Setup Instructions:</h3>
                        <ol style="line-height: 1.6;">
                            <li>Go to <a href="https://console.cloud.google.com" target="_blank" style="color: #2196F3;">Google Cloud Console</a></li>
                            <li>Create a new project or select existing one</li>
                            <li>Enable the Google Drive API</li>
                            <li>Create OAuth 2.0 credentials (not API key)</li>
                            <li>Add your domain to authorized origins</li>
                            <li>Update the gallery code with your client ID</li>
                        </ol>
                    </div>
                    <div style="margin-top: 1.5rem;">
                        <p style="color: #ffeb3b; margin-bottom: 1rem;">⚠️ Current Issue:</p>
                        <p style="font-size: 0.9rem; opacity: 0.8; line-height: 1.4;">
                            Google Drive API requires OAuth2 authentication, not API keys. 
                            The current configuration cannot access Google Drive directly.
                        </p>
                    </div>
                    <div style="margin-top: 2rem; display: flex; gap: 10px; justify-content: center;">
                        <button onclick="window.open('https://console.cloud.google.com/apis/library/drive.googleapis.com', '_blank')" style="
                            background: #4285F4;
                            border: none;
                            color: white;
                            padding: 10px 20px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 0.9rem;
                        ">🚀 Open Cloud Console</button>
                        <button onclick="this.showDemoGallery()" style="
                            background: #FF9800;
                            border: none;
                            color: white;
                            padding: 10px 20px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 0.9rem;
                        " id="demoBtn">📸 Load Demo Images</button>
                    </div>
                </div>
            `;
            
            // Attach demo function to button
            document.getElementById('demoBtn').onclick = () => this.showDemoGallery();
        }
    }

    showDemoGallery() {
        // Create demo images using placeholder services
        this.photos = [
            {
                id: 'demo1',
                name: 'Demo Image 1',
                url: 'https://picsum.photos/1920/1080?random=1',
                createdTime: new Date().toISOString()
            },
            {
                id: 'demo2', 
                name: 'Demo Image 2',
                url: 'https://picsum.photos/1920/1080?random=2',
                createdTime: new Date().toISOString()
            },
            {
                id: 'demo3',
                name: 'Demo Image 3', 
                url: 'https://picsum.photos/1920/1080?random=3',
                createdTime: new Date().toISOString()
            },
            {
                id: 'demo4',
                name: 'Demo Image 4',
                url: 'https://picsum.photos/1920/1080?random=4', 
                createdTime: new Date().toISOString()
            },
            {
                id: 'demo5',
                name: 'Demo Image 5',
                url: 'https://picsum.photos/1920/1080?random=5',
                createdTime: new Date().toISOString()
            }
        ];

        this.hasPhotos = true;
        this.createSlideElements();
        this.updateSlideCounter();
        this.startSlideshow();
        this.updateLastUpdateTime();
    }

    createSlideElements() {

        const loadingSlide = document.getElementById('loadingSlide');
        if (loadingSlide) {
            loadingSlide.remove();
        }

        this.slidesContainer.innerHTML = '';

        this.photos.forEach((photo, index) => {
            const slide = document.createElement('div');
            slide.className = `slide ${index === 0 ? 'active' : ''}`;

            const img = document.createElement('img');
            img.src = photo.url;
            img.alt = photo.name;
            img.loading = 'eager';

            img.onerror = () => {
                img.style.display = 'none';
                const errorDiv = document.createElement('div');
                errorDiv.className = 'image-error';
                errorDiv.innerHTML = `
                    <div style="font-size: 4rem; margin-bottom: 1rem;">📸</div>
                    <h3>Image Loading Issue</h3>
                    <p style="opacity: 0.8;">${photo.name}</p>
                `;
                errorDiv.style.cssText = `
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    color: white;
                    text-align: center;
                    opacity: 0.8;
                `;
                slide.appendChild(errorDiv);
            };

            slide.appendChild(img);
            this.slidesContainer.appendChild(slide);
        });
    }

    startSlideshow() {
        if (this.photos.length <= 1 || !this.hasPhotos) return;

        this.slideInterval = setInterval(() => {
            if (this.isPlaying) {
                this.nextSlide();
            }
        }, this.slideDuration);
    }

    stopSlideshow() {
        if (this.slideInterval) {
            clearInterval(this.slideInterval);
            this.slideInterval = null;
        }
    }

    nextSlide() {
        if (!this.hasPhotos || this.photos.length === 0) return;
        
        this.currentSlideIndex = (this.currentSlideIndex + 1) % this.photos.length;
        this.showSlide(this.currentSlideIndex);
    }

    previousSlide() {
        if (!this.hasPhotos || this.photos.length === 0) return;
        
        this.currentSlideIndex = (this.currentSlideIndex - 1 + this.photos.length) % this.photos.length;
        this.showSlide(this.currentSlideIndex);
    }

    showSlide(index) {
        const slides = this.slidesContainer.querySelectorAll('.slide');
        slides.forEach((slide, i) => {
            slide.classList.toggle('active', i === index);
        });
        this.updateSlideCounter();
    }

    togglePlayPause() {
        this.isPlaying = !this.isPlaying;
        if (this.playPauseBtn) {
            this.playPauseBtn.textContent = this.isPlaying ? 'Pause' : 'Play';
        }
        
        if (this.isPlaying && !this.slideInterval) {
            this.startSlideshow();
        }
    }

    toggleFullscreen() {
        if (!this.galleryWrapper) return;

        if (!document.fullscreenElement) {
            this.galleryWrapper.requestFullscreen().catch(err => {
                // Fullscreen failed, but that's okay
            });
        } else {
            document.exitFullscreen();
        }
    }

    handleFullscreenChange() {
        const isFullscreen = !!document.fullscreenElement;
        if (this.fullscreenBtn) {
            this.fullscreenBtn.textContent = isFullscreen ? 'Exit Fullscreen' : 'Fullscreen';
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
            case 'Escape':
                if (document.fullscreenElement) {
                    document.exitFullscreen();
                }
                break;
        }
    }

    updateSlideCounter() {
        if (this.currentSlideSpan && this.totalSlidesSpan) {
            this.currentSlideSpan.textContent = this.hasPhotos ? this.currentSlideIndex + 1 : 0;
            this.totalSlidesSpan.textContent = this.photos.length;
        }
    }

    updateLastUpdateTime() {
        if (this.lastUpdateSpan) {
            const now = new Date();
            const timeString = now.toLocaleString();
            this.lastUpdateSpan.textContent = timeString;
        }
    }

    showErrorMessage(errorDetails = 'Unknown error') {
        const slide = document.getElementById('loadingSlide');
        if (slide) {
            slide.innerHTML = `
                <div class="loading-message" style="text-align: center; color: white;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">❌</div>
                    <h2>Error Loading Gallery</h2>
                    <p><strong>Error:</strong> ${errorDetails}</p>
                    <p style="margin-top: 1rem; font-size: 0.9rem; opacity: 0.8;">
                        Check the browser console for more details
                    </p>
                    <button onclick="location.reload()" style="
                        background: rgba(255,255,255,0.2);
                        border: 1px solid rgba(255,255,255,0.3);
                        color: white;
                        padding: 0.75rem 1.5rem;
                        border-radius: 8px;
                        cursor: pointer;
                        margin-top: 1.5rem;
                        font-size: 1rem;
                    ">🔄 Retry</button>
                </div>
            `;
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.galleryManager = new GoogleDriveGallery();
});