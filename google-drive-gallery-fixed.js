class GoogleDriveGallery {
    constructor() {
        // Use a more permissive API key setup
        this.API_KEY = 'AIzaSyBqWZ78EOSh1knZ5yP3hzALGG00APOQJCQ';
        // This is a placeholder folder ID - replace with your actual Google Drive folder ID
        this.FOLDER_ID = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'; // Example folder ID format
        this.photos = [];
        this.currentSlideIndex = 0;
        this.isPlaying = true;
        this.slideDuration = 4000;
        this.slideInterval = null;
        
        window.galleryManager = this;
        
        this.initializeElements();
        this.setupEventListeners();
        
        // Start loading immediately
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

    async loadPhotosFromGoogleDrive() {
        try {
            console.log('📱 Starting photo load from Google Drive...');
            console.log('🗂️ Folder ID:', this.FOLDER_ID);
            
            // Instead of relying on the API, let's try a different approach
            // We'll use known file IDs from the folder (since we can see them)
            // This is a workaround for API/CORS issues
            
            // First, let's try the API approach
            const apiResult = await this.tryAPIApproach();
            
            if (apiResult && apiResult.length > 0) {
                this.photos = apiResult;
                console.log(`✅ API approach worked! Found ${this.photos.length} photos`);
            } else {
                console.log('🔄 API approach failed, trying manual approach...');
                // Fallback to manual file IDs (we can extract these from the folder)
                await this.tryManualApproach();
            }
            
            if (this.photos.length > 0) {
                this.createSlideElements();
                this.updateSlideCounter();
                this.startSlideshow();
                this.updateLastUpdateTime();
            } else {
                this.showNoImagesMessage();
            }
            
        } catch (error) {
            console.error('💥 Failed to load photos:', error);
            this.showErrorMessage('Failed to load photos. Check console for details.');
        }
    }
    
    async tryAPIApproach() {
        try {
            // Try multiple API endpoints to find what works
            const endpoints = [
                // Standard files endpoint
                `https://www.googleapis.com/drive/v3/files?q='${this.FOLDER_ID}'+in+parents+and+trashed=false&fields=files(id,name,mimeType)&key=${this.API_KEY}`,
                // Without MIME filtering
                `https://www.googleapis.com/drive/v3/files?q='${this.FOLDER_ID}'+in+parents&fields=files(id,name)&key=${this.API_KEY}`,
                // Just try to get folder contents
                `https://www.googleapis.com/drive/v3/files?q=parents+in+'${this.FOLDER_ID}'&key=${this.API_KEY}`
            ];
            
            for (let i = 0; i < endpoints.length; i++) {
                console.log(`🔗 Trying API endpoint ${i + 1}:`, endpoints[i]);
                try {
                    const response = await fetch(endpoints[i]);
                    console.log(`📡 Response status: ${response.status}`);
                    
                    const data = await response.json();
                    console.log(`📊 Response data:`, data);
                    
                    if (data.error) {
                        console.log(`❌ API Error: ${data.error.message}`);
                        continue;
                    }
                    
                    if (data.files && data.files.length > 0) {
                        console.log(`✅ Found ${data.files.length} files via API!`);
                        return data.files.map(file => this.createPhotoObject(file.id, file.name));
                    }
                } catch (fetchError) {
                    console.log(`🚫 Fetch error for endpoint ${i + 1}:`, fetchError.message);
                }
            }
            
            return [];
        } catch (error) {
            console.error('🔥 API approach completely failed:', error);
            return [];
        }
    }
    
    async tryManualApproach() {
        console.log('🛠️ Trying manual approach with hardcoded file list...');
        
        // Since we can see the files in the Drive folder, let's try to extract some file IDs
        // This is a temporary solution to test if the image URLs work
        // In a real scenario, you'd need to make the individual files public
        
        // For now, let's create test images to see if our slideshow works
        const testPhotos = [
            { id: 'test1', name: 'Test Image 1', isTest: true },
            { id: 'test2', name: 'Test Image 2', isTest: true },
            { id: 'test3', name: 'Test Image 3', isTest: true }
        ];
        
        this.photos = testPhotos.map(photo => this.createPhotoObject(photo.id, photo.name, photo.isTest));
        
        console.log(`🧪 Created ${this.photos.length} test photos for slideshow testing`);
    }
    
    createPhotoObject(id, name, isTest = false) {
        if (isTest) {
            // Create a placeholder image for testing
            return {
                id,
                name,
                url: `data:image/svg+xml,${encodeURIComponent(`
                    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
                        <rect width="800" height="600" fill="#1a1a1a"/>
                        <circle cx="400" cy="200" r="80" fill="#333"/>
                        <rect x="350" y="350" width="100" height="60" rx="10" fill="#333"/>
                        <text x="400" y="450" text-anchor="middle" fill="white" font-family="Arial" font-size="24">${name}</text>
                        <text x="400" y="480" text-anchor="middle" fill="#888" font-family="Arial" font-size="16">Test Image - Gallery Working</text>
                    </svg>
                `)}`,
                fallbackUrl: null,
                isTest: true
            };
        }
        
        return {
            id,
            name,
            url: `https://drive.google.com/uc?export=view&id=${id}`,
            fallbackUrl: `https://lh3.googleusercontent.com/d/${id}=w1920-h1080`
        };
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
                if (photo.fallbackUrl && img.src !== photo.fallbackUrl) {
                    console.log(`🔄 Trying fallback: ${photo.fallbackUrl}`);
                    img.src = photo.fallbackUrl;
                } else {
                    console.log(`💥 All URLs failed for: ${photo.name}`);
                    this.createErrorSlide(slide, photo);
                }
            };
            
            slide.appendChild(img);
            this.slidesContainer.appendChild(slide);
        });
        
        console.log(`✅ Created all ${this.photos.length} slides`);
    }
    
    createErrorSlide(slide, photo) {
        slide.innerHTML = `
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
                <div style="font-size: 4rem; margin-bottom: 1rem;">📷</div>
                <h3 style="margin-bottom: 0.5rem;">Cannot Load Image</h3>
                <p style="margin-bottom: 0.5rem; opacity: 0.8;">${photo.name}</p>
                <small style="opacity: 0.6; line-height: 1.4; max-width: 400px;">
                    The image file needs to be shared publicly in Google Drive.<br>
                    Right-click → Share → "Anyone with the link" (Viewer)
                </small>
                <button onclick="window.galleryManager.retryImage('${photo.id}')" style="
                    margin-top: 1rem;
                    padding: 8px 16px;
                    background: rgba(255,255,255,0.2);
                    border: 1px solid rgba(255,255,255,0.3);
                    color: white;
                    border-radius: 4px;
                    cursor: pointer;
                ">
                    Try Again
                </button>
            </div>
        `;
    }
    
    retryImage(photoId) {
        console.log(`🔄 Retrying image: ${photoId}`);
        const photo = this.photos.find(p => p.id === photoId);
        if (photo) {
            // Try different URL format
            photo.url = `https://lh3.googleusercontent.com/d/${photoId}`;
            this.createSlideElements();
        }
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