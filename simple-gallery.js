// Super Simple Google Drive Gallery - Works with existing gallery.html structure

class SimpleGallery {
    constructor() {
        this.API_KEY = 'AIzaSyBKRnyiRv9uENh38fwuixbL7lRaOhFb-nE';
        this.FOLDER_ID = '1KV4NETKYwFJYbPzCdZNC1WDkCH5Q5OVq3w_JIWqhDXOln2bVUJLVn3uGZxjpDCKrCVXqZbmf';
        this.photos = [];
        this.currentIndex = 0;
        
        this.init();
    }

    async init() {
        console.log('Loading photos from Google Drive...');
        
        // Show loading in the existing container
        const container = document.getElementById('slidesContainer');
        if (container) {
            container.innerHTML = '<div class="slide active"><div class="loading-message"><h2>Loading photos...</h2></div></div>';
        }
        
        try {
            // Use a simpler API call that should work better
            const url = `https://www.googleapis.com/drive/v3/files?q='${this.FOLDER_ID}' in parents and mimeType contains 'image'&key=${this.API_KEY}&fields=files(id,name,mimeType)`;
            console.log('API URL:', url);
            
            const response = await fetch(url);
            const data = await response.json();
            
            console.log('API Response:', data);
            
            if (data.error) {
                console.error('API Error:', data.error);
                this.showError(`Error: ${data.error.message}`);
                return;
            }

            this.photos = data.files || [];
            console.log(`Found ${this.photos.length} photos`);
            
            if (this.photos.length === 0) {
                this.showError('No images found in the folder.');
                return;
            }

            this.createSlides();
            this.setupControls();
        } catch (error) {
            console.error('Error:', error);
            this.showError('Failed to load photos. Check console for details.');
        }
    }

    createSlides() {
        const container = document.getElementById('slidesContainer');
        if (!container) {
            console.error('Slides container not found');
            return;
        }
        
        container.innerHTML = '';
        
        this.photos.forEach((photo, index) => {
            const slide = document.createElement('div');
            slide.className = 'slide';
            slide.style.display = index === 0 ? 'block' : 'none';
            
            // Try different Google Drive URL formats
            const imageUrl = `https://lh3.googleusercontent.com/d/${photo.id}=w2000-h2000`;
            
            slide.innerHTML = `
                <img src="${imageUrl}" 
                     alt="${photo.name}" 
                     style="width: 100%; height: 100vh; object-fit: contain; background: black;"
                     onerror="this.src='https://drive.google.com/uc?export=view&id=${photo.id}'"
                     onload="console.log('Image loaded: ${photo.name}')"
                />
            `;
            
            container.appendChild(slide);
        });
        
        this.updateCounters();
        console.log(`Created ${this.photos.length} slides`);
    }

    setupControls() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const playPauseBtn = document.getElementById('playPauseBtn');
        
        if (prevBtn) {
            prevBtn.onclick = () => this.prev();
        }
        
        if (nextBtn) {
            nextBtn.onclick = () => this.next();
        }
        
        if (playPauseBtn) {
            playPauseBtn.onclick = () => this.toggleSlideshow();
            playPauseBtn.textContent = 'Pause';
        }
        
        // Start auto slideshow
        this.startSlideshow();
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') this.prev();
            if (e.key === 'ArrowRight') this.next();
            if (e.key === ' ') {
                e.preventDefault();
                this.toggleSlideshow();
            }
        });
    }

    showSlide(index) {
        const slides = document.querySelectorAll('.slide');
        slides.forEach((slide, i) => {
            slide.style.display = i === index ? 'block' : 'none';
        });
        this.currentIndex = index;
        this.updateCounters();
    }

    next() {
        this.showSlide((this.currentIndex + 1) % this.photos.length);
    }

    prev() {
        this.showSlide(this.currentIndex === 0 ? this.photos.length - 1 : this.currentIndex - 1);
    }

    startSlideshow() {
        this.stopSlideshow();
        this.isPlaying = true;
        this.slideInterval = setInterval(() => {
            this.next();
        }, 4000);
    }

    stopSlideshow() {
        if (this.slideInterval) {
            clearInterval(this.slideInterval);
            this.slideInterval = null;
        }
        this.isPlaying = false;
    }

    toggleSlideshow() {
        const btn = document.getElementById('playPauseBtn');
        if (this.isPlaying) {
            this.stopSlideshow();
            if (btn) btn.textContent = 'Play';
        } else {
            this.startSlideshow();
            if (btn) btn.textContent = 'Pause';
        }
    }

    updateCounters() {
        const currentSlide = document.getElementById('currentSlide');
        const totalSlides = document.getElementById('totalSlides');
        const lastUpdate = document.getElementById('lastUpdate');
        
        if (currentSlide) currentSlide.textContent = this.currentIndex + 1;
        if (totalSlides) totalSlides.textContent = this.photos.length;
        if (lastUpdate) lastUpdate.textContent = new Date().toLocaleString();
    }

    showError(message) {
        const container = document.getElementById('slidesContainer');
        if (container) {
            container.innerHTML = `
                <div class="slide active">
                    <div class="loading-message" style="color: #ff6b6b; text-align: center; padding: 2rem;">
                        <h2>⚠️ Gallery Error</h2>
                        <p>${message}</p>
                        <button onclick="location.reload()" style="
                            background: #007bff; color: white; border: none; 
                            padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-top: 1rem;
                        ">Retry</button>
                    </div>
                </div>
            `;
        }
    }
}

// Auto-start when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, starting gallery...');
    window.gallery = new SimpleGallery();
});