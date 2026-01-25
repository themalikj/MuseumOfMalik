class SlideshowManager {
    constructor() {
        this.slides = [];
        this.currentSlideIndex = 0;
        this.isPlaying = true;
        this.slideInterval = null;
        this.slideDuration = 4000; // 4 seconds per slide
        this.updateInterval = 30000; // Check for new images every 30 seconds
        this.updateTimer = null;
        this.inactivityTimer = null;
        this.inactivityDelay = 3000; // Hide controls after 3 seconds of inactivity
        
        this.imageFolder = 'images/slideshow/'; // Folder to scan for images
        this.supportedFormats = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
        
        this.initializeElements();
        this.setupEventListeners();
        this.loadImages();
        this.startUpdateTimer();
        this.setupInactivityHiding();
    }
    
    initializeElements() {
        this.slideshowWrapper = document.getElementById('slideshowWrapper');
        this.slidesContainer = document.getElementById('slidesContainer');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.fullscreenBtn = document.getElementById('fullscreenBtn');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.slideCounter = document.getElementById('slideCounter');
        this.currentSlideSpan = document.getElementById('currentSlide');
        this.totalSlidesSpan = document.getElementById('totalSlides');
        this.lastUpdateSpan = document.getElementById('lastUpdate');
        this.infoOverlay = document.getElementById('infoOverlay');
    }
    
    setupEventListeners() {
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        this.prevBtn.addEventListener('click', () => this.previousSlide());
        this.nextBtn.addEventListener('click', () => this.nextSlide());
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
        
        // Fullscreen change events
        document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('webkitfullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('mozfullscreenchange', () => this.handleFullscreenChange());
        
        // Mouse movement for hiding controls in fullscreen
        document.addEventListener('mousemove', () => this.resetInactivityTimer());
        document.addEventListener('touchstart', () => this.resetInactivityTimer());
    }
    
    async loadImages() {
        try {
            // Since we can't directly scan a directory from the browser,
            // we'll try to load a predefined set of images
            // In a real implementation, you'd have a server endpoint that returns available images
            const imageList = await this.fetchImageList();
            
            if (imageList.length === 0) {
                this.showNoImagesMessage();
                return;
            }
            
            this.slides = imageList;
            await this.preloadImages();
            this.createSlideElements();
            this.updateSlideCounter();
            this.startSlideshow();
            this.updateLastUpdateTime();
            
        } catch (error) {
            console.error('Error loading images:', error);
            this.showErrorMessage();
        }
    }
    
    async fetchImageList() {
        // This is a simplified approach - in a real implementation, 
        // you'd have a server endpoint that scans the directory
        // For now, we'll create a demo with some sample images
        const possibleImages = [
            'slide1.jpg', 'slide2.jpg', 'slide3.jpg', 'slide4.jpg', 'slide5.jpg',
            'slide1.png', 'slide2.png', 'slide3.png', 'slide4.png', 'slide5.png',
            'photo1.jpg', 'photo2.jpg', 'photo3.jpg', 'photo4.jpg', 'photo5.jpg',
            'image1.jpg', 'image2.jpg', 'image3.jpg', 'image4.jpg', 'image5.jpg'
        ];
        
        const existingImages = [];
        
        // Test which images actually exist
        for (const imageName of possibleImages) {
            try {
                const response = await fetch(`${this.imageFolder}${imageName}`, { method: 'HEAD' });
                if (response.ok) {
                    existingImages.push(`${this.imageFolder}${imageName}`);
                }
            } catch (e) {
                // Image doesn't exist, skip it
            }
        }
        
        return existingImages;
    }
    
    async preloadImages() {
        const preloadPromises = this.slides.map(src => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error(`Failed to load ${src}`));
                img.src = src;
            });
        });
        
        try {
            await Promise.all(preloadPromises);
            console.log('All images preloaded successfully');
        } catch (error) {
            console.warn('Some images failed to preload:', error);
        }
    }
    
    createSlideElements() {
        // Remove loading slide
        const loadingSlide = document.getElementById('loadingSlide');
        if (loadingSlide) {
            loadingSlide.remove();
        }
        
        // Create slide elements
        this.slides.forEach((src, index) => {
            const slide = document.createElement('div');
            slide.className = `slide ${index === 0 ? 'active' : ''}`;
            
            const img = document.createElement('img');
            img.src = src;
            img.alt = `Slide ${index + 1}`;
            img.loading = 'eager';
            
            slide.appendChild(img);
            this.slidesContainer.appendChild(slide);
        });
    }
    
    startSlideshow() {
        if (this.slides.length <= 1) return;
        
        this.slideInterval = setInterval(() => {
            if (this.isPlaying) {
                this.nextSlide();
            }
        }, this.slideDuration);
    }
    
    nextSlide() {
        if (this.slides.length === 0) return;
        
        this.currentSlideIndex = (this.currentSlideIndex + 1) % this.slides.length;
        this.showSlide(this.currentSlideIndex);
    }
    
    previousSlide() {
        if (this.slides.length === 0) return;
        
        this.currentSlideIndex = this.currentSlideIndex === 0 
            ? this.slides.length - 1 
            : this.currentSlideIndex - 1;
        this.showSlide(this.currentSlideIndex);
    }
    
    showSlide(index) {
        const slideElements = this.slidesContainer.querySelectorAll('.slide');
        slideElements.forEach((slide, i) => {
            slide.classList.toggle('active', i === index);
        });
        
        this.updateSlideCounter();
    }
    
    togglePlayPause() {
        this.isPlaying = !this.isPlaying;
        this.playPauseBtn.textContent = this.isPlaying ? 'Pause' : 'Play';
    }
    
    async toggleFullscreen() {
        try {
            if (!document.fullscreenElement) {
                await this.slideshowWrapper.requestFullscreen();
                this.fullscreenBtn.textContent = 'Exit Fullscreen';
                this.slideshowWrapper.classList.add('fullscreen-active');
            } else {
                await document.exitFullscreen();
                this.fullscreenBtn.textContent = 'Fullscreen';
                this.slideshowWrapper.classList.remove('fullscreen-active');
            }
        } catch (error) {
            console.error('Fullscreen toggle failed:', error);
        }
    }
    
    handleFullscreenChange() {
        const isFullscreen = !!(document.fullscreenElement || 
                                document.webkitFullscreenElement || 
                                document.mozFullScreenElement);
        
        if (!isFullscreen) {
            this.fullscreenBtn.textContent = 'Fullscreen';
            this.slideshowWrapper.classList.remove('fullscreen-active', 'hide-controls');
        }
    }
    
    setupInactivityHiding() {
        this.resetInactivityTimer();
    }
    
    resetInactivityTimer() {
        clearTimeout(this.inactivityTimer);
        this.slideshowWrapper.classList.remove('hide-controls');
        
        if (document.fullscreenElement) {
            this.inactivityTimer = setTimeout(() => {
                this.slideshowWrapper.classList.add('hide-controls');
            }, this.inactivityDelay);
        }
    }
    
    handleKeydown(event) {
        switch(event.code) {
            case 'Space':
                event.preventDefault();
                this.togglePlayPause();
                break;
            case 'ArrowRight':
                event.preventDefault();
                this.nextSlide();
                break;
            case 'ArrowLeft':
                event.preventDefault();
                this.previousSlide();
                break;
            case 'KeyF':
                event.preventDefault();
                this.toggleFullscreen();
                break;
            case 'Escape':
                if (document.fullscreenElement) {
                    document.exitFullscreen();
                }
                break;
        }
    }
    
    updateSlideCounter() {
        if (this.slides.length > 0) {
            this.currentSlideSpan.textContent = this.currentSlideIndex + 1;
            this.totalSlidesSpan.textContent = this.slides.length;
        }
    }
    
    updateLastUpdateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });
        this.lastUpdateSpan.textContent = timeString;
    }
    
    startUpdateTimer() {
        this.updateTimer = setInterval(async () => {
            await this.checkForNewImages();
        }, this.updateInterval);
    }
    
    async checkForNewImages() {
        try {
            const newImageList = await this.fetchImageList();
            
            if (newImageList.length !== this.slides.length) {
                console.log('New images detected, updating slideshow...');
                await this.updateSlideshow(newImageList);
            }
        } catch (error) {
            console.error('Error checking for new images:', error);
        }
    }
    
    async updateSlideshow(newImageList) {
        const wasPlaying = this.isPlaying;
        
        // Pause slideshow during update
        this.isPlaying = false;
        
        // Update slides array
        this.slides = newImageList;
        
        // Preload new images
        await this.preloadImages();
        
        // Remove old slide elements (except currently active one)
        const slideElements = this.slidesContainer.querySelectorAll('.slide');
        slideElements.forEach(slide => slide.remove());
        
        // Create new slide elements
        this.createSlideElements();
        
        // Adjust current slide index if necessary
        if (this.currentSlideIndex >= this.slides.length) {
            this.currentSlideIndex = 0;
        }
        
        this.showSlide(this.currentSlideIndex);
        this.updateSlideCounter();
        this.updateLastUpdateTime();
        
        // Resume playback if it was playing
        this.isPlaying = wasPlaying;
    }
    
    showNoImagesMessage() {
        const slide = document.getElementById('loadingSlide');
        if (slide) {
            slide.innerHTML = `
                <div class="loading-message">
                    <h2>No images found</h2>
                    <p>Add images to the '${this.imageFolder}' folder</p>
                    <p>Supported formats: ${this.supportedFormats.join(', ')}</p>
                </div>
            `;
        }
    }
    
    showErrorMessage() {
        const slide = document.getElementById('loadingSlide');
        if (slide) {
            slide.innerHTML = `
                <div class="loading-message">
                    <h2>Error loading slideshow</h2>
                    <p>Please check your connection and try again</p>
                </div>
            `;
        }
    }
    
    destroy() {
        if (this.slideInterval) {
            clearInterval(this.slideInterval);
        }
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
        }
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
        }
    }
}

// Initialize slideshow when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.slideshowManager = new SlideshowManager();
});

// Cleanup when page is unloaded
window.addEventListener('beforeunload', () => {
    if (window.slideshowManager) {
        window.slideshowManager.destroy();
    }
});