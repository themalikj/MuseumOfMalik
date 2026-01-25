class GoogleDriveGallery {
    constructor() {
        // Google Drive API Configuration
        // IMPORTANT: For production deployment to http://themuseumofmalik.com
        // Go to: https://console.cloud.google.com/apis/credentials
        // Edit OAuth client ID: 96355657028-fbtqno6ir4h1ca6ufbqbrr4heiqn00gk.apps.googleusercontent.com
        // Add BOTH to "Authorized JavaScript origins":
        //   - http://themuseumofmalik.com
        //   - http://www.themuseumofmalik.com
        this.API_KEY = 'AIzaSyBqWZ78EOSh1knZ5yP3hzALGG00APOQJCQ';
        this.CLIENT_ID = '96355657028-fbtqno6ir4h1ca6ufbqbrr4heiqn00gk.apps.googleusercontent.com';
        this.FOLDER_ID = '103ev806ae7UjAaQ650QhnIsVIauFT4Fz';
        this.FORM_FOLDER_ID = '1KV4NETKYwFJYbPzCdZNC1WDkCH5Q5OVq3w_JIWqhDXOln2bVUJLVn3uGZxjpDCKrCVXqZbmf';
        this.SCOPES = 'https://www.googleapis.com/auth/drive.file';
        this.photos = [];
        this.currentSlideIndex = 0;
        this.isPlaying = true;
        this.slideDuration = 4000;
        this.slideInterval = null;
        this.isSignedIn = false;
        this.authInstance = null;
        this.authRetryCount = 0;
        this.maxAuthRetries = 3;
        this.modalSelectedFiles = [];
        
        this.initializeElements();
        this.setupEventListeners();
        
        // Initialize auth silently and load photos
        this.initializeAuthSilently();
        this.loadPhotosFromGoogleDrive();
        
        // Add network status monitoring
        this.setupNetworkMonitoring();
    }
    
    setupNetworkMonitoring() {
        if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
            window.addEventListener('online', () => {
                console.log('🌐 Back online - reloading photos');
                this.loadPhotosFromGoogleDrive();
            });
            
            window.addEventListener('offline', () => {
                console.log('📴 Gone offline');
                this.showErrorMessage('You are currently offline. Some features may not work until you reconnect.');
            });
        }
    }
    
    initializeElements() {
        try {
            this.galleryWrapper = document.getElementById('galleryWrapper');
            this.slidesContainer = document.getElementById('slidesContainer');
            this.playPauseBtn = document.getElementById('playPauseBtn');
            this.fullscreenBtn = document.getElementById('fullscreenBtn');
            this.addPhotosBtn = document.getElementById('addPhotosBtn');
            this.prevBtn = document.getElementById('prevBtn');
            this.nextBtn = document.getElementById('nextBtn');
            this.currentSlideSpan = document.getElementById('currentSlide');
            this.totalSlidesSpan = document.getElementById('totalSlides');
            this.lastUpdateSpan = document.getElementById('lastUpdate');
            
            // Verify critical elements exist
            if (!this.galleryWrapper || !this.slidesContainer) {
                throw new Error('Critical gallery elements not found');
            }
            
            console.log('✅ All DOM elements initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize DOM elements:', error);
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
            if (this.addPhotosBtn) {
                this.addPhotosBtn.addEventListener('click', () => this.showUploadForm());
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
            
            console.log('✅ Event listeners setup complete');
        } catch (error) {
            console.error('❌ Failed to setup event listeners:', error);
        }
    }
    
    async loadPhotosFromGoogleDrive() {
        const maxRetries = 3;
        let retryCount = 0;
        
        while (retryCount < maxRetries) {
            try {
                console.log(`🔄 Loading photos... (attempt ${retryCount + 1}/${maxRetries})`);
                
                // Load from both folders with timeout
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Request timeout')), 15000)
                );
                
                const [galleryPhotos, formPhotos] = await Promise.race([
                    Promise.all([
                        this.loadPhotosFromFolder(this.FOLDER_ID, 'gallery'),
                        this.loadPhotosFromFolder(this.FORM_FOLDER_ID, 'form')
                    ]),
                    timeoutPromise
                ]);
                
                // Combine and sort by creation time
                this.photos = [...galleryPhotos, ...formPhotos].sort((a, b) => 
                    new Date(b.createdTime) - new Date(a.createdTime)
                );
                
                console.log(`✅ Successfully loaded ${this.photos.length} photos (${galleryPhotos.length} from gallery, ${formPhotos.length} from form)`);
                
                if (this.photos.length === 0) {
                    this.showNoImagesMessage();
                    return;
                }
                
                this.createSlideElements();
                this.updateSlideCounter();
                this.startSlideshow();
                this.updateLastUpdateTime();
                return; // Success, exit retry loop
                
            } catch (error) {
                console.error(`❌ Attempt ${retryCount + 1} failed:`, error);
                retryCount++;
                
                if (retryCount < maxRetries) {
                    const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
                    console.log(`⏳ Retrying in ${delay/1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    this.showErrorMessage(`Failed to load photos after ${maxRetries} attempts. Please check your internet connection and refresh the page.`);
                }
            }
        }
    }
    
    async loadPhotosFromFolder(folderId, source) {
        try {
            console.log(`Loading from ${source} folder:`, folderId);
            
            const apiUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false+and+(mimeType='image/jpeg'+or+mimeType='image/jpg'+or+mimeType='image/png'+or+mimeType='image/webp'+or+mimeType='image/gif')&fields=files(id,name,mimeType,createdTime)&orderBy=createdTime+desc&key=${this.API_KEY}`;
            
            const response = await fetch(apiUrl);
            const data = await response.json();
            
            if (data.error) {
                console.error(`Error loading from ${source} folder:`, data.error);
                return [];
            }
            
            if (!data.files || data.files.length === 0) {
                console.log(`No files found in ${source} folder`);
                return [];
            }
            
            return data.files.map(file => ({
                id: file.id,
                name: file.name,
                url: `https://lh3.googleusercontent.com/d/${file.id}=w2000-h2000`,
                altUrl: `https://drive.google.com/uc?export=view&id=${file.id}`,
                thirdUrl: `https://drive.usercontent.google.com/download?id=${file.id}&export=view`,
                fourthUrl: `https://drive.google.com/thumbnail?id=${file.id}&sz=w2000-h2000`,
                createdTime: file.createdTime,
                source: source
            }));
            
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
                photo.thirdUrl,
                photo.fourthUrl,
                `https://drive.google.com/uc?export=download&id=${photo.id}`,
                `https://drive.google.com/file/d/${photo.id}/view`
            ];
            
            img.onerror = () => {
                urlAttempts++;
                console.log(`Image load failed for ${photo.name}, attempt ${urlAttempts}`);
                
                if (urlAttempts < urls.length) {
                    console.log(`Trying alternate URL: ${urls[urlAttempts]}`);
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
    

    showUploadForm() {
        // Create a modal with native file upload interface
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
            padding: 2rem;
        `;
        
        modal.innerHTML = `
            <div style="
                background: rgba(20,20,20,0.95);
                border-radius: 15px;
                padding: 2rem;
                max-width: 500px;
                width: 90%;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255,255,255,0.1);
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <h3 style="color: white; margin: 0; font-family: 'TanMonCheri', cursive, sans-serif; font-size: 1.3rem;">Add Photos to Gallery</h3>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                            style="background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer; opacity: 0.7;">×</button>
                </div>
                
                <div id="uploadArea" style="
                    border: 2px dashed rgba(255, 255, 255, 0.3);
                    border-radius: 12px;
                    padding: 3rem 2rem;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    margin-bottom: 1rem;
                ">
                    <input type="file" id="fileInputModal" accept="image/*" multiple style="display: none;">
                    <div style="color: white;">
                        <p style="font-size: 1.2rem; margin: 0.5rem 0;">Tap to select photos</p>
                        <p style="opacity: 0.7; margin: 0.5rem 0;">or drag and drop images here</p>
                        <small style="opacity: 0.6;">Supports: JPG, PNG, WebP, GIF</small>
                    </div>
                </div>
                
                <div id="selectedFiles" style="display: none; margin-bottom: 1rem;">
                    <p style="color: white; margin: 0 0 0.5rem 0; font-weight: bold;">Selected Files:</p>
                    <div id="fileList" style="max-height: 150px; overflow-y: auto;"></div>
                </div>
                
                <div id="uploadProgress" style="display: none; margin-bottom: 1rem;">
                    <div style="background: rgba(255,255,255,0.1); border-radius: 10px; overflow: hidden; margin-bottom: 0.5rem;">
                        <div id="progressBar" style="background: #4CAF50; height: 8px; width: 0%; transition: width 0.3s ease;"></div>
                    </div>
                    <p id="uploadStatus" style="color: white; font-size: 0.9rem; margin: 0; text-align: center;">Uploading...</p>
                </div>
                
                <div style="display: flex; gap: 1rem;">
                    <button id="uploadButton" onclick="galleryManager.handleDirectUpload()" 
                            style="
                                flex: 1;
                                background: #4CAF50;
                                color: white;
                                border: none;
                                padding: 0.75rem 1.5rem;
                                border-radius: 8px;
                                cursor: pointer;
                                font-size: 1rem;
                                opacity: 0.5;
                            " disabled>
                        Upload Photos
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Set up upload area functionality
        const uploadArea = modal.querySelector('#uploadArea');
        const fileInput = modal.querySelector('#fileInputModal');
        const selectedFiles = modal.querySelector('#selectedFiles');
        const fileList = modal.querySelector('#fileList');
        const uploadButton = modal.querySelector('#uploadButton');
        
        // Store selected files globally for access
        this.modalSelectedFiles = [];
        
        // Click to select files
        uploadArea.addEventListener('click', () => fileInput.click());
        
        // File input change
        fileInput.addEventListener('change', (e) => {
            this.handleModalFileSelect(e.target.files, selectedFiles, fileList, uploadButton);
        });
        
        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#4CAF50';
            uploadArea.style.background = 'rgba(76, 175, 80, 0.1)';
        });
        
        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            uploadArea.style.background = 'transparent';
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            uploadArea.style.background = 'transparent';
            this.handleModalFileSelect(e.dataTransfer.files, selectedFiles, fileList, uploadButton);
        });
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        // Close on Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }
    
    handleModalFileSelect(files, selectedFilesDiv, fileListDiv, uploadButton) {
        try {
            const maxFileSize = 50 * 1024 * 1024; // 50MB limit
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];
            
            this.modalSelectedFiles = [];
            const validFiles = [];
            const invalidFiles = [];
            
            Array.from(files).forEach(file => {
                // Check file type
                const isValidType = allowedTypes.includes(file.type.toLowerCase()) || file.type.startsWith('image/');
                
                // Check file size
                const isValidSize = file.size <= maxFileSize && file.size > 0;
                
                if (isValidType && isValidSize) {
                    validFiles.push(file);
                } else {
                    invalidFiles.push({
                        file: file,
                        reason: !isValidType ? 'Invalid file type' : 'File too large'
                    });
                }
            });
            
            this.modalSelectedFiles = validFiles;
            
            if (validFiles.length > 0) {
                selectedFilesDiv.style.display = 'block';
                let html = validFiles.map((file, index) => `
                    <div style="color: rgba(255,255,255,0.9); font-size: 0.9rem; padding: 0.25rem 0; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center;">
                        <span>📸 ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)</span>
                        <button onclick="window.galleryManager.removeModalFile(${index})" 
                                style="background: #ff4444; color: white; border: none; padding: 0.2rem 0.5rem; border-radius: 3px; cursor: pointer; font-size: 0.8rem;">✕</button>
                    </div>
                `).join('');
                
                // Show invalid files warning if any
                if (invalidFiles.length > 0) {
                    html += `<div style="color: #ffaa44; font-size: 0.8rem; padding: 0.5rem 0; border-top: 1px solid rgba(255,170,68,0.3);">
                        ⚠️ ${invalidFiles.length} file(s) skipped: ${invalidFiles.map(f => `${f.file.name} (${f.reason})`).join(', ')}
                    </div>`;
                }
                
                fileListDiv.innerHTML = html;
                uploadButton.disabled = false;
                uploadButton.style.opacity = '1';
                
                console.log(`✅ Selected ${validFiles.length} valid files${invalidFiles.length > 0 ? `, skipped ${invalidFiles.length} invalid files` : ''}`);
            } else {
                selectedFilesDiv.style.display = 'block';
                fileListDiv.innerHTML = `
                    <div style="color: #ff6b6b; font-size: 0.9rem; text-align: center; padding: 1rem 0;">
                        ❌ No valid files selected<br>
                        <small>Please select image files under 50MB (JPEG, PNG, WebP, GIF, BMP)</small>
                    </div>
                `;
                uploadButton.disabled = true;
                uploadButton.style.opacity = '0.5';
                
                console.warn('❌ No valid files selected');
            }
        } catch (error) {
            console.error('Error in file selection:', error);
            selectedFilesDiv.style.display = 'block';
            fileListDiv.innerHTML = `<div style="color: #ff6b6b; text-align: center; padding: 1rem;">❌ Error processing files</div>`;
            uploadButton.disabled = true;
            uploadButton.style.opacity = '0.5';
        }
    }
    
    removeModalFile(index) {
        try {
            if (!this.modalSelectedFiles || index < 0 || index >= this.modalSelectedFiles.length) {
                return;
            }
            
            // Remove file from array
            const removedFile = this.modalSelectedFiles.splice(index, 1)[0];
            console.log(`Removed file: ${removedFile.name}`);
            
            // Refresh the display
            const modal = document.querySelector('div[style*="z-index: 2000"]');
            if (modal) {
                const selectedFilesDiv = modal.querySelector('#selectedFiles');
                const fileListDiv = modal.querySelector('#fileList');
                const uploadButton = modal.querySelector('#uploadButton');
                
                this.handleModalFileSelect(this.modalSelectedFiles, selectedFilesDiv, fileListDiv, uploadButton);
            }
        } catch (error) {
            console.error('Error removing file:', error);
        }
    }
    
    async handleDirectUpload() {
        const modal = document.querySelector('div[style*="z-index: 2000"]');
        if (!modal) {
            console.error('Upload modal not found');
            return;
        }
        
        const progressDiv = modal.querySelector('#uploadProgress');
        const progressBar = modal.querySelector('#progressBar');
        const uploadStatus = modal.querySelector('#uploadStatus');
        const uploadButton = modal.querySelector('#uploadButton');
        
        if (this.modalSelectedFiles.length === 0) {
            uploadStatus.innerHTML = '⚠️ No files selected';
            return;
        }
        
        try {
            progressDiv.style.display = 'block';
            uploadButton.disabled = true;
            uploadButton.style.opacity = '0.5';
            
            uploadStatus.innerHTML = 'Authenticating with Google...';
            
            // Ensure user is authenticated with retry logic
            if (!this.isSignedIn) {
                uploadStatus.innerHTML = 'Signing in to Google Drive...';
                await this.ensureAuthenticated();
            }
            
            uploadStatus.innerHTML = 'Starting upload to Google Drive...';
            
            let uploadedCount = 0;
            const totalFiles = this.modalSelectedFiles.length;
            
            for (let i = 0; i < totalFiles; i++) {
                const file = this.modalSelectedFiles[i];
                uploadStatus.innerHTML = `Uploading ${file.name} (${i + 1}/${totalFiles})...`;
                
                try {
                    await this.uploadFileToGoogleDrive(file);
                    uploadedCount++;
                    console.log(`✅ Uploaded: ${file.name}`);
                } catch (error) {
                    console.error(`❌ Failed to upload ${file.name}:`, error);
                    // Continue with other files even if one fails
                }
                
                const progress = ((i + 1) / totalFiles) * 100;
                progressBar.style.width = `${progress}%`;
            }
            
            if (uploadedCount > 0) {
                uploadStatus.innerHTML = `✅ Successfully uploaded ${uploadedCount}/${totalFiles} photos!<br><small>Refreshing gallery...</small>`;
                setTimeout(async () => {
                    modal.remove();
                    await this.loadPhotosFromGoogleDrive();
                }, 2000);
            } else {
                throw new Error('No files were uploaded successfully');
            }
            
        } catch (error) {
            console.error('Upload failed:', error);
            console.error('Error details:', {
                message: error?.message,
                error: error?.error,
                toString: error?.toString(),
                type: typeof error,
                fullError: error
            });
            
            // Extract all error information for display
            const errorText = error?.message || error?.error || (typeof error === 'string' ? error : '');
            const currentOrigin = window.location.origin;
            
            // Special handling for idpiframe_initialization_failed
            if (errorText.includes('idpiframe_initialization_failed')) {
                uploadStatus.innerHTML = `
                    <div style="text-align: left; font-size: 0.85rem; line-height: 1.5;">
                        <div style="color: #ff6b6b; font-weight: bold; margin-bottom: 0.75rem;">❌ Browser Security Blocking Upload</div>
                        
                        <div style="background: rgba(76,175,80,0.2); padding: 0.75rem; border-radius: 4px; margin-bottom: 0.75rem; border-left: 3px solid #4CAF50;">
                            <div style="font-weight: bold; margin-bottom: 0.5rem;">✅ EASIEST FIX - Use Incognito/Private Mode:</div>
                            <div style="color: white; font-size: 0.9rem;">
                                1. Open this page in <strong>Incognito/Private window</strong><br>
                                2. Try upload again - it will likely work there<br>
                                3. This bypasses browser security restrictions
                            </div>
                        </div>
                        
                        <div style="background: rgba(255,170,68,0.2); padding: 0.75rem; border-radius: 4px; margin-bottom: 0.75rem; border-left: 3px solid #ffaa44;">
                            <div style="font-weight: bold; margin-bottom: 0.5rem;">🔧 Alternative - Enable Third-Party Cookies:</div>
                            <div style="color: white; font-size: 0.8rem;">
                                <strong>Chrome/Edge:</strong> Settings → Privacy → Cookies → "Allow all cookies"<br>
                                <strong>Safari:</strong> Settings → Privacy → Uncheck "Prevent cross-site tracking"<br>
                                <strong>Firefox:</strong> Settings → Privacy → "Standard" protection<br>
                                Then <strong>hard refresh</strong> (Ctrl+Shift+R / Cmd+Shift+R)
                            </div>
                        </div>
                        
                        <div style="background: rgba(136,204,255,0.2); padding: 0.75rem; border-radius: 4px; border-left: 3px solid #88ccff;">
                            <div style="font-weight: bold; margin-bottom: 0.5rem;">📁 Direct Upload Option:</div>
                            <div style="color: white; font-size: 0.85rem; margin-bottom: 0.5rem;">
                                If neither above works, upload directly to Google Drive:
                            </div>
                            <a href="https://drive.google.com/drive/folders/${this.FORM_FOLDER_ID}" 
                               target="_blank"
                               style="display: inline-block; background: #4285F4; color: white; padding: 0.5rem 1rem; border-radius: 6px; text-decoration: none; font-weight: bold;">
                                📤 Open Google Drive Folder
                            </a>
                        </div>
                        
                        <div style="margin-top: 0.75rem; padding: 0.5rem; background: rgba(0,0,0,0.3); border-radius: 4px; font-size: 0.75rem; opacity: 0.7;">
                            Domain: <code style="color: #88ccff;">${currentOrigin}</code> • Error: idpiframe_initialization_failed
                        </div>
                    </div>
                `;
            } else {
                // Show detailed error information on screen for debugging
                uploadStatus.innerHTML = `
                    <div style="text-align: left; font-size: 0.85rem; line-height: 1.4;">
                        <div style="color: #ff6b6b; font-weight: bold; margin-bottom: 0.5rem;">❌ Upload Failed</div>
                        <div style="background: rgba(0,0,0,0.3); padding: 0.75rem; border-radius: 4px; margin-bottom: 0.5rem;">
                            <div style="font-weight: bold; margin-bottom: 0.25rem;">Error Message:</div>
                            <div style="color: #ffaa44; word-break: break-word;">${errorText || 'No error message available'}</div>
                        </div>
                        <div style="background: rgba(0,0,0,0.3); padding: 0.75rem; border-radius: 4px; margin-bottom: 0.5rem;">
                            <div style="font-weight: bold; margin-bottom: 0.25rem;">Current Origin:</div>
                            <div style="color: #88ccff;">${currentOrigin}</div>
                        </div>
                        <div style="background: rgba(0,0,0,0.3); padding: 0.75rem; border-radius: 4px; margin-bottom: 0.5rem;">
                            <div style="font-weight: bold; margin-bottom: 0.25rem;">Error Type:</div>
                            <div style="color: #cccccc;">${typeof error}</div>
                        </div>
                        ${error?.error ? `
                            <div style="background: rgba(0,0,0,0.3); padding: 0.75rem; border-radius: 4px; margin-bottom: 0.5rem;">
                                <div style="font-weight: bold; margin-bottom: 0.25rem;">Error Code:</div>
                                <div style="color: #ff9999;">${error.error}</div>
                            </div>
                        ` : ''}
                        <div style="font-size: 0.8rem; opacity: 0.8; margin-top: 0.75rem;">
                            Copy this error info and share it to get help fixing the issue.
                        </div>
                    </div>
                `;
            }
            uploadButton.disabled = false;
            uploadButton.style.opacity = '1';
        }
    }
    

    

    



    async uploadFileWithAuth(file) {
        if (!this.authInstance || !this.isSignedIn) {
            throw new Error('User not signed in');
        }
        
        try {
            // Get current user and access token
            const currentUser = this.authInstance.currentUser.get();
            if (!currentUser.isSignedIn()) {
                throw new Error('User is not signed in');
            }
            
            const authResponse = currentUser.getAuthResponse();
            if (!authResponse || !authResponse.access_token) {
                throw new Error('No access token available');
            }
            
            const accessToken = authResponse.access_token;
            
            const metadata = {
                name: file.name,
                parents: [this.FORM_FOLDER_ID]
            };
            
            const formData = new FormData();
            formData.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
            formData.append('file', file);
            
            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                },
                body: formData
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = `Upload failed: ${response.status} ${response.statusText}`;
                
                try {
                    const errorJson = JSON.parse(errorText);
                    if (errorJson.error && errorJson.error.message) {
                        errorMessage += ` - ${errorJson.error.message}`;
                    }
                } catch (e) {
                    // If not JSON, use the text as is
                    if (errorText) {
                        errorMessage += ` - ${errorText}`;
                    }
                }
                
                throw new Error(errorMessage);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error('Upload error:', error);
            throw error;
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
    
    async initializeAuthSilently() {
        try {
            console.log('🔐 Initializing authentication silently...');
            
            if (typeof gapi === 'undefined') {
                console.log('⏳ Google API not yet loaded, will retry during upload');
                return;
            }
            
            await new Promise((resolve, reject) => {
                gapi.load('auth2:client', {
                    callback: resolve,
                    onerror: () => reject(new Error('Failed to load Google Auth'))
                });
            });
            
            await gapi.client.init({
                apiKey: this.API_KEY,
                clientId: this.CLIENT_ID,
                discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
                scope: this.SCOPES
            });
            
            this.authInstance = gapi.auth2.getAuthInstance();
            this.isSignedIn = this.authInstance.isSignedIn.get();
            
            console.log(`✅ Auth initialized silently - Signed in: ${this.isSignedIn}`);
            
        } catch (error) {
            console.log('ℹ️ Auth initialization deferred (will attempt during upload):', error.message);
            // Don't show error to user - this is normal for localhost
        }
    }
    
    async signInUser() {
        try {
            console.log('Attempting to sign in user...');
            
            // Initialize auth if not already done
            if (!this.authInstance) {
                await this.initializeAuthSilently();
            }
            
            // Check if already signed in
            if (this.authInstance.isSignedIn.get()) {
                this.isSignedIn = true;
                console.log('User already signed in');
                return true;
            }
            
            // Attempt sign in
            console.log('Prompting user to sign in...');
            const user = await this.authInstance.signIn({
                scope: this.SCOPES
            });
            
            if (user) {
                this.isSignedIn = true;
                console.log('User signed in successfully');
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('Sign-in failed:', error);
            
            // Provide specific error messages
            if (error.error === 'popup_closed_by_user') {
                console.log('User closed the sign-in popup');
            } else if (error.error === 'access_denied') {
                console.log('User denied access');
            }
            
            return false;
        }
    }
    
    async retrySignIn() {
        console.log('Retrying Google sign-in...');
        
        // Reset auth state
        this.isSignedIn = false;
        this.authInstance = null;
        
        // Find the upload status element and update it
        const uploadStatus = document.querySelector('#uploadStatus');
        if (uploadStatus) {
            uploadStatus.innerHTML = 'Retrying sign-in...';
        }
        
        try {
            const signedIn = await this.signInUser();
            
            if (signedIn && uploadStatus) {
                uploadStatus.innerHTML = '✅ Signed in successfully! You can now upload photos.';
                
                // Enable the upload button if it exists
                const uploadButton = document.querySelector('#uploadButton');
                if (uploadButton) {
                    uploadButton.disabled = false;
                    uploadButton.style.opacity = '1';
                }
            } else if (uploadStatus) {
                uploadStatus.innerHTML = '❌ Sign-in failed again. <a href="" onclick="window.galleryManager.retrySignIn(); return false;" style="color: #4CAF50;">Try again</a>';
            }
            
            return signedIn;
            
        } catch (error) {
            console.error('Retry sign-in failed:', error);
            
            if (uploadStatus) {
                let errorMessage = 'Sign-in failed. ';
                
                if (error.message.includes('Google API not loaded')) {
                    errorMessage += 'Please check your internet connection and try again.';
                } else if (this.CLIENT_ID.includes('mock') || this.CLIENT_ID.includes('YOUR_')) {
                    errorMessage += 'OAuth is not configured. Please set up Google Cloud Console credentials.';
                } else {
                    errorMessage += 'Please try again or use the form upload instead.';
                }
                
                uploadStatus.innerHTML = `❌ ${errorMessage} <a href="" onclick="window.galleryManager.retrySignIn(); return false;" style="color: #4CAF50;">Try again</a>`;
            }
            
            return false;
        }
    }
    

    async refreshGallery() {
        console.log('🔄 Refreshing gallery...');
        await this.loadPhotosFromGoogleDrive();
        console.log('✅ Gallery refreshed');
    }
    
    async ensureAuthenticated() {
        try {
            console.log(`🔐 Ensuring authentication (attempt ${this.authRetryCount + 1}/${this.maxAuthRetries})...`);
            
            // Log current domain for debugging
            const currentOrigin = window.location.origin;
            console.log(`🌐 Current origin: ${currentOrigin}`);
            
            // Warn if domain might not be authorized
            const authorizedDomains = [
                'http://themuseumofmalik.com',
                'http://www.themuseumofmalik.com',
                'http://localhost:8000',
                'http://127.0.0.1:8000'
            ];
            
            if (!authorizedDomains.some(domain => currentOrigin.startsWith(domain.split(':')[0] + ':' + currentOrigin.split(':')[1] + ':' + currentOrigin.split(':')[2]))) {
                console.warn(`⚠️ Current domain ${currentOrigin} may not be authorized in Google Cloud Console`);
                console.warn('Add this domain to OAuth 2.0 Client ID authorized origins:');
                console.warn(`https://console.cloud.google.com/apis/credentials/oauthclient/${this.CLIENT_ID.split('-')[0]}`);
            }
            
            if (typeof gapi === 'undefined') {
                throw new Error('Google API not loaded. Please refresh the page.');
            }
            
            // Reinitialize if needed
            if (!this.authInstance) {
                console.log('🔄 Initializing Google Auth...');
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('Google Auth load timeout')), 10000);
                    gapi.load('auth2:client', {
                        callback: () => {
                            clearTimeout(timeout);
                            resolve();
                        },
                        onerror: () => {
                            clearTimeout(timeout);
                            reject(new Error('Failed to load Google Auth library'));
                        }
                    });
                });
                
                console.log('⚙️ Initializing Google Client...');
                await gapi.client.init({
                    apiKey: this.API_KEY,
                    clientId: this.CLIENT_ID,
                    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
                    scope: this.SCOPES
                });
                
                this.authInstance = gapi.auth2.getAuthInstance();
                
                if (!this.authInstance) {
                    throw new Error('Failed to initialize Google Auth. Check OAuth configuration.');
                }
                
                console.log('✅ Google Auth instance created');
            }
            
            // Check and sign in if needed
            if (!this.authInstance.isSignedIn.get()) {
                console.log('📝 Prompting user to sign in...');
                try {
                    await this.authInstance.signIn({
                        prompt: 'select_account'
                    });
                    console.log('✅ User signed in successfully');
                } catch (signInError) {
                    console.error('❌ Sign-in error:', signInError);
                    
                    // Handle specific Google OAuth errors
                    if (signInError.error === 'popup_closed_by_user') {
                        throw new Error('Sign-in cancelled. Please try again.');
                    } else if (signInError.error === 'access_denied') {
                        throw new Error('Access denied. Please grant permissions.');
                    } else if (signInError.error === 'popup_blocked_by_browser') {
                        throw new Error('Popup blocked. Please allow popups for this site.');
                    } else if (signInError.error === 'idpiframe_initialization_failed') {
                        throw new Error(`OAuth configuration error. The domain ${currentOrigin} must be added to Google Cloud Console authorized JavaScript origins.`);
                    } else {
                        const errorMsg = signInError.error || signInError.message || JSON.stringify(signInError);
                        throw new Error(`Sign-in failed: ${errorMsg}`);
                    }
                }
            }
            
            this.isSignedIn = true;
            this.authRetryCount = 0; // Reset retry count on success
            return true;
            
        } catch (error) {
            console.error('❌ Authentication failed:', error);
            console.error('Error type:', typeof error, 'Error details:', error);
            
            // Extract error message safely
            let errorMessage = 'Authentication failed';
            if (error?.message) {
                errorMessage = error.message;
            } else if (error?.error) {
                errorMessage = error.error;
            } else if (typeof error === 'string') {
                errorMessage = error;
            } else if (error?.toString && typeof error.toString === 'function') {
                errorMessage = error.toString();
            }
            
            this.authRetryCount++;
            
            // Don't retry on user cancellation or configuration errors
            const noRetryErrors = ['cancelled', 'closed', 'denied', 'blocked', 'idpiframe', 'origin'];
            const shouldNotRetry = noRetryErrors.some(keyword => errorMessage.toLowerCase().includes(keyword));
            
            if (shouldNotRetry || this.authRetryCount >= this.maxAuthRetries) {
                this.authRetryCount = 0;
                throw new Error(errorMessage);
            }
            
            console.log(`🔄 Retrying authentication in 2 seconds... (${this.authRetryCount}/${this.maxAuthRetries})`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            return this.ensureAuthenticated();
        }
    }
    
    async uploadFileToGoogleDrive(file) {
        try {
            // Create file metadata
            const metadata = {
                name: file.name,
                parents: [this.FORM_FOLDER_ID]
            };
            
            // Convert file to base64
            const fileData = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const arrayBuffer = reader.result;
                    const bytes = new Uint8Array(arrayBuffer);
                    let binary = '';
                    for (let i = 0; i < bytes.byteLength; i++) {
                        binary += String.fromCharCode(bytes[i]);
                    }
                    resolve(btoa(binary));
                };
                reader.onerror = reject;
                reader.readAsArrayBuffer(file);
            });
            
            // Prepare multipart body
            const delimiter = '-------314159265358979323846';
            const close_delim = `\r\n--${delimiter}--`;
            
            const body = 
                `--${delimiter}\r\n` +
                'Content-Type: application/json\r\n\r\n' +
                JSON.stringify(metadata) + '\r\n' +
                `--${delimiter}\r\n` +
                `Content-Type: ${file.type}\r\n` +
                'Content-Transfer-Encoding: base64\r\n\r\n' +
                fileData +
                close_delim;
            
            // Upload to Google Drive
            const response = await gapi.client.request({
                path: 'https://www.googleapis.com/upload/drive/v3/files',
                method: 'POST',
                params: {
                    uploadType: 'multipart'
                },
                headers: {
                    'Content-Type': `multipart/related; boundary="${delimiter}"`
                },
                body: body
            });
            
            console.log('Upload response:', response);
            return response.result;
            
        } catch (error) {
            console.error('File upload error:', error);
            throw error;
        }
    }
    
    retryImage(photoId, slideElement) {
        console.log(`Retrying image load for ID: ${photoId}`);
        
        // Find the photo data
        const photo = this.photos.find(p => p.id === photoId);
        if (!photo) {
            console.error('Photo not found for retry');
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
        
        // Try different URL approach for retry
        const retryUrls = [
            `https://lh3.googleusercontent.com/d/${photo.id}=s2000`,
            `https://drive.google.com/uc?export=view&id=${photo.id}&authuser=0`,
            `https://drive.usercontent.google.com/u/0/uc?id=${photo.id}&export=download`
        ];
        
        let attemptIndex = 0;
        
        const tryNextUrl = () => {
            if (attemptIndex < retryUrls.length) {
                console.log(`Retry attempt ${attemptIndex + 1} for ${photo.name}: ${retryUrls[attemptIndex]}`);
                img.src = retryUrls[attemptIndex];
                attemptIndex++;
            } else {
                console.error(`Retry failed for ${photo.name}`);
                // Show retry failed message
                const failDiv = document.createElement('div');
                failDiv.innerHTML = `
                    <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                    <p>Retry failed - Image may be private</p>
                    <small style="opacity: 0.6; margin-top: 0.5rem; display: block;">
                        Check if the Google Drive folder is shared publicly
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