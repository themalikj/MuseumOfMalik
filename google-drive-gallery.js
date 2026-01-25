class GoogleDriveGallery {
    constructor() {
        this.API_KEY = 'AIzaSyBqWZ78EOSh1knZ5yP3hzALGG00APOQJCQ';
        this.FOLDER_ID = '103ev806ae7UjAaQ650QhnIsVIauFT4Fz';
        this.photos = [];
        this.currentSlideIndex = 0;
        this.isPlaying = true;
        this.slideDuration = 4000;
        this.slideInterval = null;
        
        this.initializeElements();
        this.setupEventListeners();
        this.loadPhotosFromGoogleDrive();
    }
    
    initializeElements() {
        this.galleryWrapper = document.getElementById('galleryWrapper');
        this.slidesContainer = document.getElementById('slidesContainer');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.fullscreenBtn = document.getElementById('fullscreenBtn');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.currentSlideSpan = document.getElementById('currentSlide');
        this.totalSlidesSpan = document.getElementById('totalSlides');
        this.lastUpdateSpan = document.getElementById('lastUpdate');
        
        // Upload modal elements
        this.uploadModal = document.getElementById('uploadModal');
        this.closeModal = document.getElementById('closeModal');
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.uploadProgress = document.getElementById('uploadProgress');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
    }
    
    setupEventListeners() {
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        this.uploadBtn.addEventListener('click', () => this.showUploadModal());
        this.prevBtn.addEventListener('click', () => this.previousSlide());
        this.nextBtn.addEventListener('click', () => this.nextSlide());
        
        // Upload modal listeners
        this.closeModal.addEventListener('click', () => this.hideUploadModal());
        this.uploadModal.addEventListener('click', (e) => {
            if (e.target === this.uploadModal) this.hideUploadModal();
        });
        
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Drag and drop
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
        document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('webkitfullscreenchange', () => this.handleFullscreenChange());
    }
    
    async loadPhotosFromGoogleDrive() {
        try {
            console.log('Starting Google Drive API request...');
            console.log('Folder ID:', this.FOLDER_ID);
            console.log('API Key:', this.API_KEY);
            
            const apiUrl = `https://www.googleapis.com/drive/v3/files?q='${this.FOLDER_ID}'+in+parents+and+trashed=false+and+(mimeType='image/jpeg'+or+mimeType='image/jpg'+or+mimeType='image/png'+or+mimeType='image/webp'+or+mimeType='image/gif')&fields=files(id,name,mimeType,createdTime)&orderBy=createdTime+desc&key=${this.API_KEY}`;
            
            console.log('Making API request to:', apiUrl);
            const response = await fetch(apiUrl);
            console.log('Response status:', response.status, response.statusText);
            
            const data = await response.json();
            console.log('Full API response:', data);
            
            if (data.error) {
                console.error('Google Drive API error:', data.error);
                throw new Error(`Google Drive API Error: ${data.error.message} (Code: ${data.error.code})`);
            }
            
            if (!data.files) {
                console.log('No files property in response');
                this.showNoImagesMessage();
                return;
            }
            
            console.log(`Found ${data.files.length} files in Google Drive`);
            
            if (data.files.length === 0) {
                console.log('No files found in Google Drive folder');
                this.showNoImagesMessage();
                return;
            }
            
            // Try multiple URL formats for better compatibility
            this.photos = data.files.map(file => {
                console.log(`Processing file: ${file.name} (ID: ${file.id})`);
                return {
                    id: file.id,
                    name: file.name,
                    url: `https://drive.google.com/uc?export=view&id=${file.id}`,
                    altUrl: `https://drive.google.com/thumbnail?id=${file.id}&sz=w2000-h2000`,
                    createdTime: file.createdTime
                };
            });
            
            console.log(`Processed ${this.photos.length} photos for display`);
            this.createSlideElements();
            this.updateSlideCounter();
            this.startSlideshow();
            this.updateLastUpdateTime();
            
        } catch (error) {
            console.error('Error loading photos:', error);
            this.showErrorMessage(error.message);
        }
    }
    
    createSlideElements() {
        const loadingSlide = document.getElementById('loadingSlide');
        if (loadingSlide) {
            loadingSlide.remove();
        }
        
        console.log(`Creating slide elements for ${this.photos.length} photos`);
        
        this.photos.forEach((photo, index) => {
            console.log(`Creating slide ${index + 1}: ${photo.name}`);
            
            const slide = document.createElement('div');
            slide.className = `slide ${index === 0 ? 'active' : ''}`;
            
            const img = document.createElement('img');
            img.src = photo.url;
            img.alt = photo.name;
            img.loading = 'eager';
            
            // Add comprehensive error handling
            let urlAttempts = 0;
            const urls = [
                photo.url,
                photo.altUrl,
                `https://lh3.googleusercontent.com/d/${photo.id}=w2000-h2000`,
                `https://drive.google.com/uc?export=download&id=${photo.id}`
            ];
            
            img.onerror = () => {
                urlAttempts++;
                console.log(`Image load failed for ${photo.name}, attempt ${urlAttempts}`);
                
                if (urlAttempts < urls.length) {
                    console.log(`Trying alternate URL: ${urls[urlAttempts]}`);
                    img.src = urls[urlAttempts];
                } else {
                    console.error(`All URL attempts failed for ${photo.name}`);
                    // Show a placeholder or error message
                    img.style.display = 'none';
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'image-error';
                    errorDiv.innerHTML = `
                        <h3>Image failed to load</h3>
                        <p>${photo.name}</p>
                        <small>Check Google Drive permissions</small>
                    `;
                    errorDiv.style.cssText = `
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        height: 100%;
                        color: white;
                        text-align: center;
                        opacity: 0.7;
                    `;
                    slide.appendChild(errorDiv);
                }
            };
            
            img.onload = () => {
                console.log(`Successfully loaded image: ${photo.name} on attempt ${urlAttempts + 1}`);
            };
            
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
        if (this.photos.length === 0) return;
        
        this.currentSlideIndex = (this.currentSlideIndex + 1) % this.photos.length;
        this.showSlide(this.currentSlideIndex);
    }
    
    previousSlide() {
        if (this.photos.length === 0) return;
        
        this.currentSlideIndex = this.currentSlideIndex === 0 
            ? this.photos.length - 1 
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
                await this.galleryWrapper.requestFullscreen();
                this.fullscreenBtn.textContent = 'Exit Fullscreen';
            } else {
                await document.exitFullscreen();
                this.fullscreenBtn.textContent = 'Fullscreen';
            }
        } catch (error) {
            console.error('Fullscreen toggle failed:', error);
        }
    }
    
    showUploadModal() {
        this.uploadModal.style.display = 'block';
    }
    
    hideUploadModal() {
        this.uploadModal.style.display = 'none';
        this.resetUploadState();
    }
    
    resetUploadState() {
        this.uploadProgress.style.display = 'none';
        this.progressFill.style.width = '0%';
        this.progressText.textContent = 'Uploading...';
        this.fileInput.value = '';
        this.uploadArea.classList.remove('dragover');
    }
    
    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('dragover');
    }
    
    handleDragLeave(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
    }
    
    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
        
        const files = Array.from(e.dataTransfer.files).filter(file => 
            file.type.startsWith('image/')
        );
        
        if (files.length > 0) {
            this.uploadFiles(files);
        }
    }
    
    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            this.uploadFiles(files);
        }
    }
    
    async uploadFiles(files) {
        this.uploadProgress.style.display = 'block';
        
        try {
            // Show instructions for manual upload since Google Drive API requires OAuth for uploads
            this.progressText.innerHTML = `
                <strong>Upload Instructions:</strong><br>
                1. Open <a href="https://drive.google.com/drive/folders/${this.FOLDER_ID}" target="_blank" style="color: #4CAF50;">your Google Drive folder</a><br>
                2. Drag these ${files.length} image(s) into the folder<br>
                3. Images will appear in the gallery within 30 seconds
            `;
            
            // For now, we'll show the manual process since Google Drive upload requires OAuth
            // In a production app, you'd implement proper OAuth flow
            
            setTimeout(() => {
                this.hideUploadModal();
                // Refresh the gallery to check for new images
                this.loadPhotosFromGoogleDrive();
            }, 5000);
            
        } catch (error) {
            console.error('Upload error:', error);
            this.progressText.textContent = 'Upload failed. Please try again.';
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
        }
    }
    
    updateSlideCounter() {
        if (this.photos.length > 0) {
            this.currentSlideSpan.textContent = this.currentSlideIndex + 1;
            this.totalSlidesSpan.textContent = this.photos.length;
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
    
    showNoImagesMessage() {
        const slide = document.getElementById('loadingSlide');
        if (slide) {
            slide.innerHTML = `
                <div class="loading-message">
                    <h2>No images found</h2>
                    <p>Add images to your Google Drive folder</p>
                    <p>Make sure the folder is publicly accessible</p>
                </div>
            `;
        }
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
}

document.addEventListener('DOMContentLoaded', () => {
    window.galleryManager = new GoogleDriveGallery();
});