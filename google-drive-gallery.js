class GoogleDriveGallery {
    constructor() {
        // Google Drive API Configuration - Single folder for all photos
        this.API_KEY = 'AIzaSyBqWZ78EOSh1knZ5yP3hzALGG00APOQJCQ';
        this.FOLDER_ID = '1KV4NETKYwFJYbPzCdZNC1WDkCH5Q5OVq3w_JIWqhDXOln2bVUJLVn3uGZxjpDCKrCVXqZbmf';
        this.photos = [];
        this.currentSlideIndex = 0;
        this.isPlaying = true;
        this.slideDuration = 4000;
        this.slideInterval = null;
        
        // Cache photos to avoid rate limits
        this.loadFromCache();
        
        this.initializeElements();
        this.setupEventListeners();
        
        // Load photos from Google Drive
        this.loadPhotosFromGoogleDrive();
        
        // Add network status monitoring
        this.setupNetworkMonitoring();
        
        // Auto-refresh to check for new photos every 5 minutes (reduced from 30s to avoid rate limits)
        this.setupAutoRefresh();
    }
    
    loadFromCache() {
        try {
            const cached = localStorage.getItem('gallery_photos');
            if (cached) {
                const data = JSON.parse(cached);
                if (Date.now() - data.timestamp < 600000) {
                    this.photos = data.photos;
                    if (this.photos.length > 0) {
                        this.createSlideElements();
                        this.updateSlideCounter();
                        this.startSlideshow();
                    }
                }
            }
        } catch (error) {
            console.error('Cache error:', error);
        }
    }
    
    saveToCache() {
        try {
            localStorage.setItem('gallery_photos', JSON.stringify({
                photos: this.photos,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.error('Cache save error:', error);
        }
    }
    }
    
    setupNetworkMonitoring() {
        if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
            window.addEventListener('online', () => {
                this.loadPhotosFromGoogleDrive();
            });
            
            window.addEventListener('offline', () => {
                this.showErrorMessage('You are currently offline. Some features may not work until you reconnect.');
            });
        }
    }
    
    setupAutoRefresh() {
        setInterval(async () => {
            try {
                await this.checkAndUpdatePhotos();
            } catch (error) {
                console.error('Auto-refresh error:', error);
            }
        }, 300000);
    }
    
    async checkAndUpdatePhotos() {
        try {
            // Load photos from the single folder
            const newPhotos = await this.loadPhotosFromFolder(this.FOLDER_ID, 'gallery');
            
            // Check if there are new photos
            if (newPhotos.length !== this.photos.length) {
                this.photos = newPhotos;
                
                // Remember current slide position
                const wasPlaying = this.isPlaying;
                
                // Recreate slides with new photos
                this.createSlideElements();
                this.updateSlideCounter();
                
                // Resume playing if it was playing
                if (wasPlaying && !this.isPlaying) {
                    this.startSlideshow();
                }
                
                this.updateLastUpdateTime();
            }
        } catch (error) {
            console.error('Error checking for new photos:', error);
        }
    }
    
    initializeElements() {
        try {
            this.galleryWrapper = document.getElementById('galleryWrapper');
            this.slidesContainer = document.getElementById('slidesContainer');
            this.playPauseBtn = document.getElementById('playPauseBtn');
            this.fullscreenBtn = document.getElementById('fullscreenBtn');
            this.prevBtn = document.getElementById('prevBtn');
            this.nextBtn = document.getElementById('nextBtn');
            this.currentSlideSpan = document.getElementById('currentSlide');
            this.totalSlidesSpan = document.getElementById('totalSlides');
            this.lastUpdateSpan = document.getElementById('lastUpdate');
            
            // Verify critical elements exist
            if (!this.galleryWrapper || !this.slidesContainer) {
                throw new Error('Critical gallery elements not found');
            }
        } catch (error) {
            console.error('Failed to initialize DOM elements:', error);
            this.showErrorMessage('Gallery initialization failed. Please refresh the page.');
        }
    }
    
    setupEventListeners() {
        try {
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
            
            // Add window error handler
            window.addEventListener('error', (event) => {
                console.error('Global error caught:', event.error);
            });
        } catch (error) {
            console.error('Failed to setup event listeners:', error);
        }
    }
    
    async loadPhotosFromGoogleDrive() {
        const maxRetries = 3;
        let retryCount = 0;
        
        while (retryCount < maxRetries) {
            try {
                // Load from single folder with timeout
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Request timeout')), 15000)
                );
                
                this.photos = await Promise.race([
                    this.loadPhotosFromFolder(this.FOLDER_ID, 'gallery'),
                    timeoutPromise
                ]);
                
                if (this.photos.length === 0) {
                    this.showNoImagesMessage();
                    return;
                }
                
                this.createSlideElements();
                this.updateSlideCounter();
                this.startSlideshow();
                this.updateLastUpdateTime();
                this.saveToCache(); // Cache the photos
                return; // Success, exit retry loop
                
            } catch (error) {
                retryCount++;
                
                if (retryCount < maxRetries) {
                    const delay = Math.pow(2, retryCount) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    this.showErrorMessage(`Failed to load photos after ${maxRetries} attempts. Please check your internet connection and refresh the page.`);
                }
            }
        }
    }
    
    async loadPhotosFromFolder(folderId, source) {
        try {
            const apiUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false+and+(mimeType='image/jpeg'+or+mimeType='image/jpg'+or+mimeType='image/png'+or+mimeType='image/webp'+or+mimeType='image/gif')&fields=files(id,name,mimeType,createdTime,thumbnailLink)&orderBy=createdTime+desc&key=${this.API_KEY}`;
            
            const response = await fetch(apiUrl);
            const data = await response.json();
            
            if (data.error) {
                console.error('API Error:', data.error);
                return [];
            }
            
            if (!data.files || data.files.length === 0) {
                return [];
            }
            
            const sortedFiles = data.files.sort((a, b) => 
                new Date(b.createdTime) - new Date(a.createdTime)
            );
            
            return sortedFiles.map(file => {
                const imageUrl = file.thumbnailLink ? file.thumbnailLink.replace(/=s\d+/, '=s2000') : `https://lh3.googleusercontent.com/d/${file.id}=w2000`;
                return {
                    id: file.id,
                    name: file.name,
                    url: imageUrl,
                    thumbnailLink: file.thumbnailLink,
                    createdTime: file.createdTime,
                    source: source
                };
            });
            
        } catch (error) {
            console.error(`Error loading from ${source} folder:`, error);
            return [];
        }
    }
    
    createSlideElements() {
        const loadingSlide = document.getElementById('loadingSlide');
        if (loadingSlide) {
            loadingSlide.remove();
        }
        
        this.photos.forEach((photo, index) => {
            const slide = document.createElement('div');
            slide.className = `slide ${index === 0 ? 'active' : ''}`;
            
            const img = document.createElement('img');
            img.src = photo.url;
            img.alt = photo.name;
            img.loading = 'eager';
            
            
            let urlAttempts = 0;
            const urls = [
                photo.url,
                photo.thumbnailLink,
                `https://lh3.googleusercontent.com/d/${photo.id}=w2000`,
                `https://lh3.googleusercontent.com/d/${photo.id}`
            ].filter(url => url);
            
            
            img.onerror = () => {
                urlAttempts++;
                
                if (urlAttempts < urls.length) {
                    img.src = urls[urlAttempts];
                } else {
                    console.error(`All URL attempts failed for ${photo.name}`);
                    console.log('Failed URLs:', urls);
                    
                    // Show a more informative error message
                    img.style.display = 'none';
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'image-error';
                    errorDiv.innerHTML = `
                        <div style="font-size: 4rem; margin-bottom: 1rem;">📸</div>
                        <h3 style="margin-bottom: 0.5rem;">Image Loading Issue</h3>
                        <p style="margin-bottom: 0.5rem; opacity: 0.8;">${photo.name}</p>
                        <small style="opacity: 0.6; max-width: 300px; line-height: 1.4;">
                            This image may need to be made public in Google Drive, or the folder permissions need updating.
                        </small>
                        <button onclick="window.galleryManager.retryImage('${photo.id}', this.parentElement.parentElement)" 
                               style="
                                   margin-top: 1rem;
                                   padding: 0.5rem 1rem;
                                   background: rgba(255,255,255,0.2);
                                   border: 1px solid rgba(255,255,255,0.3);
                                   color: white;
                                   border-radius: 4px;
                                   cursor: pointer;
                                   font-size: 0.9rem;
                               ">Try Again</button>
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
                        padding: 2rem;
                    `;
                    slide.appendChild(errorDiv);
                }
            };
            
            img.onload = () => {};
            
            slide.appendChild(img);
            this.slidesContainer.appendChild(slide);
        });
    }
    
    startSlideshow() {
        if (this.photos.length <= 1) return;
        
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
        
        this.updateSlideCounter();
    }
    
    previousSlide() {
        if (this.photos.length <= 1) return;
        
        const slides = this.slidesContainer.querySelectorAll('.slide');
        slides[this.currentSlideIndex].classList.remove('active');
        
        this.currentSlideIndex = this.currentSlideIndex === 0 ? this.photos.length - 1 : this.currentSlideIndex - 1;
        slides[this.currentSlideIndex].classList.add('active');
        
        this.updateSlideCounter();
    }
    
    updateSlideCounter() {
        if (this.photos.length > 0) {
            this.currentSlideSpan.textContent = this.currentSlideIndex + 1;
            this.totalSlidesSpan.textContent = this.photos.length;
        }
    }
    
    togglePlayPause() {
        this.isPlaying = !this.isPlaying;
        this.playPauseBtn.textContent = this.isPlaying ? 'Pause' : 'Play';
        
        if (this.isPlaying && !this.slideInterval && this.photos.length > 1) {
            this.startSlideshow();
        }
    }
    
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            this.galleryWrapper.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }


    
    handleFullscreenChange() {
        const isFullscreen = !!document.fullscreenElement;
        this.fullscreenBtn.textContent = isFullscreen ? 'Exit Fullscreen' : 'Fullscreen';
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
        const now = new Date();
        const timeString = now.toLocaleString();
        this.lastUpdateSpan.textContent = timeString;
    }
    
    showErrorMessage(errorDetails = 'Unknown error') {
        const slide = document.getElementById('loadingSlide');
        if (slide) {
            slide.innerHTML = `
                <div class="loading-message">
                    <h2>Error loading slideshow</h2>
                    <p><strong>Error:</strong> ${errorDetails}</p>
                    <p>Check browser console for more details</p>
                    <button onclick="location.reload()" style="
                        background: rgba(255,255,255,0.2);
                        border: 1px solid rgba(255,255,255,0.3);
                        color: white;
                        padding: 0.5rem 1rem;
                        border-radius: 8px;
                        cursor: pointer;
                        margin-top: 1rem;
                        font-size: 1rem;
                    ">Retry</button>
                </div>
            `;
        }
    }
    
    showNoImagesMessage() {
        const slide = document.getElementById('loadingSlide');
        if (slide) {
            slide.innerHTML = `
                <div class="loading-message">
                    <h2>No Images Found</h2>
                    <p>No images were found in the Google Drive folder.</p>
                    <p style="margin-top: 1rem; font-size: 0.9rem; opacity: 0.8;">
                        Make sure the Google Drive folder is shared publicly with "Anyone with the link can view" permission.
                    </p>
                    <button onclick="window.open('https://drive.google.com/drive/folders/${this.FOLDER_ID}', '_blank')" style="
                        background: #4285F4;
                        border: none;
                        color: white;
                        padding: 0.75rem 1.5rem;
                        border-radius: 8px;
                        cursor: pointer;
                        margin-top: 1rem;
                        font-size: 1rem;
                    ">📁 Open Google Drive Folder</button>
                    <button onclick="location.reload()" style="
                        background: rgba(255,255,255,0.2);
                        border: 1px solid rgba(255,255,255,0.3);
                        color: white;
                        padding: 0.5rem 1rem;
                        border-radius: 8px;
                        cursor: pointer;
                        margin-top: 1rem;
                        margin-left: 0.5rem;
                        font-size: 1rem;
                    ">🔄 Refresh</button>
                </div>
            `;
        }
    }
    

    

    
    retryImage(photoId, slideElement) {
        const photo = this.photos.find(p => p.id === photoId);
        if (!photo) {
            return;
        }
        
        // Remove error div
        const errorDiv = slideElement.querySelector('.image-error');
        if (errorDiv) {
            errorDiv.remove();
        }
        
        // Create new img element
        const img = document.createElement('img');
        img.alt = photo.name;
        img.loading = 'eager';
        
        const retryUrls = [
            `https://lh3.googleusercontent.com/d/${photo.id}=w2000`,
            `https://lh3.googleusercontent.com/d/${photo.id}`,
            `https://drive.google.com/thumbnail?id=${photo.id}&sz=w2000`
        ];
        
        let attemptIndex = 0;
        
        const tryNextUrl = () => {
            if (attemptIndex < retryUrls.length) {
                img.src = retryUrls[attemptIndex];
                attemptIndex++;
            } else {
                console.log(`
📁 FOLDER SHARING INSTRUCTIONS:
1. Open Google Drive and find your folder
2. Right-click the folder → Share
3. Under "General access" click "Restricted" 
4. Change to "Anyone with the link" 
5. Set permission to "Viewer"
6. Click "Done" and refresh this page
`);
                // Show retry failed message
                const failDiv = document.createElement('div');
                failDiv.innerHTML = `
                    <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                    <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">Image Not Accessible</p>
                    <small style="opacity: 0.8; margin-bottom: 0.3rem; display: block; max-width: 400px;">
                        The Google Drive folder needs to be shared publicly
                    </small>
                    <small style="opacity: 0.6; display: block; font-size: 0.85rem; max-width: 400px; line-height: 1.4;">
                        Right-click folder → Share → "Anyone with the link" (Viewer)
                    </small>
                `;
                failDiv.style.cssText = `
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    color: white;
                    text-align: center;
                    opacity: 0.7;
                `;
                slideElement.appendChild(failDiv);
            }
        };
        
        img.onload = () => {
            console.log(`✅ Retry successful for ${photo.name}`);
        };
        
        img.onerror = tryNextUrl;
        
        slideElement.appendChild(img);
        tryNextUrl();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.galleryManager = new GoogleDriveGallery();
});