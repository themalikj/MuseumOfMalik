class SimpleGallery {
    constructor() {
        this.API_KEY = 'AIzaSyBKRnyiRv9uENh38fwuixbL7lRaOhFb-nE';
        this.FOLDER_ID = '1KV4NETKYwFJYbPzCdZNC1WDkCH5Q5OVq3w_JIWqhDXOln2bVUJLVn3uGZxjpDCKrCVXqZbmf';
        this.photos = [];
        this.currentIndex = 0;
        
        this.init();
    }

    async init() {
        const container = document.getElementById('slidesContainer');
        if (container) {
            container.innerHTML = '<div style="color: white; text-align: center; padding: 2rem; background: black; height: 100vh; display: flex; align-items: center; justify-content: center;"><h2>Loading photos...</h2></div>';
        }
        
        try {
            const url = `https://www.googleapis.com/drive/v3/files?q='${this.FOLDER_ID}' in parents and mimeType contains 'image'&key=${this.API_KEY}&fields=files(id,name,mimeType)`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.error) {
                this.showError(`Error: ${data.error.message}`);
                return;
            }

            this.photos = data.files || [];
            
            if (this.photos.length === 0) {
                this.showError('No images found in the folder.');
                return;
            }

            await this.createSlides();
            this.setupControls();
        } catch (error) {
            this.showError('Failed to load photos.');
        }
    }

    async createSlides() {
        const container = document.getElementById('slidesContainer');
        if (!container) return;
        
        container.innerHTML = '';
        container.style.cssText = 'width: 100%; height: 100vh; background: black; position: relative;';
        
        for (let i = 0; i < this.photos.length; i++) {
            const photo = this.photos[i];
            
            try {
                const response = await fetch(`https://www.googleapis.com/drive/v3/files/${photo.id}?alt=media&key=${this.API_KEY}`);
                
                if (response.ok) {
                    const blob = await response.blob();
                    const imageUrl = URL.createObjectURL(blob);
                    
                    const img = document.createElement('img');
                    img.src = imageUrl;
                    img.alt = photo.name;
                    img.style.cssText = `
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100vw;
                        height: 100vh;
                        object-fit: contain;
                        background: black;
                        display: ${i === 0 ? 'block' : 'none'};
                        z-index: ${i + 1};
                    `;
                    
                    container.appendChild(img);
                }
            } catch (error) {
                // Skip failed images
            }
        }
        
        this.updateCounters();
    }

    setupControls() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const playPauseBtn = document.getElementById('playPauseBtn');
        
        if (prevBtn) prevBtn.onclick = () => this.prev();
        if (nextBtn) nextBtn.onclick = () => this.next();
        if (playPauseBtn) {
            playPauseBtn.onclick = () => this.toggleSlideshow();
            playPauseBtn.textContent = 'Pause';
        }
        
        this.startSlideshow();
        
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
        const container = document.getElementById('slidesContainer');
        const images = container.querySelectorAll('img');
        
        images.forEach((img, i) => {
            img.style.display = i === index ? 'block' : 'none';
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
                <div style="color: #ff6b6b; text-align: center; padding: 2rem; background: black; height: 100vh; display: flex; align-items: center; justify-content: center;">
                    <div>
                        <h2>⚠️ Gallery Error</h2>
                        <p>${message}</p>
                        <button onclick="location.reload()" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-top: 1rem;">Retry</button>
                    </div>
                </div>
            `;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.gallery = new SimpleGallery();
});