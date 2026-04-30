/**
 * Vittalix-HD: Sovereign Video Engine
 * Overhaul 2026: Cinematic Gallery Navigation & Robust State Management.
 */

window.VittalixPlayer = {
    videoArray: [],
    currentIndex: 0,

    /**
     * Entry point for Gallery Mode (Full Navigation)
     * @param {Array} array - Full list of video objects
     * @param {number} index - Starting index
     */
    openGallery(array, index) {
        this.videoArray = array;
        this.currentIndex = index;
        this.openModal();
    },

    /**
     * Existing play method (Backward compatibility / Single video)
     */
    play(videoId, fileIds, useModal = false) {
        if (useModal) {
            // Transform single work IDs into the new format for the modal
            const singleWork = {
                title: 'OBRA',
                telegram_file_ids: fileIds
            };
            this.videoArray = [singleWork];
            this.currentIndex = 0;
            this.openModal();
            return;
        }

        const video = document.getElementById(videoId);
        if (!video) return;

        if (video.src && video.paused) {
            this.handlePlay(video);
            return;
        } else if (video.src && !video.paused) {
            video.pause();
            return;
        }

        this.showLoader(video);
        const streamUrl = `/api/v1/stream?fileId=${fileIds[0]}`;
        video.src = streamUrl;
        video.load();
        this.setupListeners(video);

        video.oncanplay = () => {
            this.hideLoader(video);
            this.handlePlay(video);
        };
    },

    handlePlay(video) {
        document.querySelectorAll('video').forEach(v => {
            if (v !== video && !v.paused) v.pause();
        });

        video.muted = false;
        video.volume = 0.4;

        video.play().then(() => {
            this.syncIcons(video);
        }).catch(() => {
            video.muted = true;
            video.play();
        });
    },

    setupListeners(video) {
        if (video.dataset.vittalixIcons) return;
        video.addEventListener('play', () => this.syncIcons(video));
        video.addEventListener('pause', () => this.syncIcons(video));
        video.addEventListener('volumechange', () => this.syncIcons(video));
        video.dataset.vittalixIcons = "true";
    },

    syncIcons(video) {
        const container = video.closest('.video-modal-content') || video.parentElement;
        if (!container) return;

        const volBtn = container.querySelector('.vol-btn-mini');
        if (volBtn) {
            const isMuted = video.muted || video.volume === 0;
            const newState = isMuted ? 'volume-x' : 'volume-2';
            volBtn.innerHTML = `<i data-lucide="${newState}"></i>`;
            if (window.lucide) lucide.createIcons();
        }
    },

    toggleMute(videoId) {
        const video = document.getElementById(videoId);
        if (!video) return;
        video.muted = !video.muted;
        if (!video.muted && video.volume === 0) video.volume = 0.4;
        this.syncIcons(video);
    },

    /**
     * Modal Logic (Refactored for Robust Navigation)
     */
    openModal() {
        let overlay = document.querySelector('.video-modal-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'video-modal-overlay';
            overlay.innerHTML = `
                <div class="video-modal-content flex flex-col bg-black/90 rounded-2xl overflow-hidden shadow-2xl border border-white/5" onclick="event.stopPropagation()">
                    <!-- Top Area (Video + Close + Nav) -->
                    <div class="relative flex-grow flex items-center justify-center min-h-[400px]">
                        <button class="close-modal-btn" onclick="VittalixPlayer.closeModal()">
                            <i data-lucide="x"></i> FECHAR ACERVO
                        </button>
                        
                        <!-- Navigation Arrows -->
                        <button id="modal-prev-btn" class="modal-nav-btn prev" onclick="VittalixPlayer.prev()">
                            <i data-lucide="chevron-left"></i>
                        </button>
                        <button id="modal-next-btn" class="modal-nav-btn next" onclick="VittalixPlayer.next()">
                            <i data-lucide="chevron-right"></i>
                        </button>

                        <div id="modal-video-container" class="w-full h-full flex items-center justify-center">
                            <!-- Video element will be injected here -->
                        </div>
                    </div>

                    <!-- Barra de Informações Premium (Footer) -->
                    <div class="flex flex-row items-center justify-between px-8 py-5 border-t border-white/10 bg-black/60 backdrop-blur-xl">
                        <div class="flex flex-col">
                            <h2 id="modal-title" class="font-serif text-[#C5A059] text-base md:text-lg tracking-[0.2em] italic opacity-90"></h2>
                        </div>
                        <div id="modal-counter" class="font-sans text-white/40 text-[10px] uppercase tracking-[0.4em] font-light"></div>
                    </div>
                </div>
            `;
            overlay.onclick = () => this.closeModal();
            document.body.appendChild(overlay);
        }

        overlay.classList.add('active');
        this.loadCurrentVideo();
    },

    loadCurrentVideo() {
        const container = document.getElementById('modal-video-container');
        const counter = document.getElementById('modal-counter');
        const titleElem = document.getElementById('modal-title');
        
        if (!container) return;

        const videoData = this.videoArray[this.currentIndex];
        const fileIds = (videoData.telegram_file_ids && videoData.telegram_file_ids.length > 0) 
            ? videoData.telegram_file_ids 
            : [videoData.telegram_file_id];
        
        const streamUrl = `/api/v1/stream?fileId=${fileIds[0]}`;
        const title = videoData.title && videoData.title !== 'EMPTY' ? videoData.title : 'Obra Cinematográfica';

        // Forcing "Remount" (Essential for clean state)
        container.innerHTML = `
            <video id="modal-video-root" 
                   key="${videoData.id || this.currentIndex}" 
                   src="${streamUrl}" 
                   playsinline 
                   controls 
                   class="w-full h-full object-contain"></video>
        `;

        const video = document.getElementById('modal-video-root');
        video.volume = 0.4;
        video.play();
        this.setupListeners(video);

        // Update UI
        if (counter) counter.innerText = `Vídeo ${this.currentIndex + 1} de ${this.videoArray.length}`;
        if (titleElem) titleElem.innerText = title;
        
        this.updateNavButtons();
        if (window.lucide) lucide.createIcons();
    },

    updateNavButtons() {
        const prev = document.getElementById('modal-prev-btn');
        const next = document.getElementById('modal-next-btn');
        
        if (prev) prev.style.display = (this.currentIndex > 0) ? 'flex' : 'none';
        if (next) next.style.display = (this.currentIndex < this.videoArray.length - 1) ? 'flex' : 'none';
    },

    next() {
        if (this.currentIndex < this.videoArray.length - 1) {
            this.currentIndex++;
            this.loadCurrentVideo();
        }
    },

    prev() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.loadCurrentVideo();
        }
    },

    closeModal() {
        const overlay = document.querySelector('.video-modal-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            const video = document.getElementById('modal-video-root');
            if (video) {
                video.pause();
                video.src = "";
            }
        }
    },

    showLoader(video) {
        const parent = video.parentElement;
        let loader = parent.querySelector('.vittalix-loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.className = 'vittalix-loader';
            loader.style.cssText = "position: absolute; inset: 0; background: rgba(0,0,0,0.8); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 10; backdrop-filter: blur(5px);";
            loader.innerHTML = `
                <div class="luxury-spinner" style="width: 40px; height: 40px; border: 2px solid rgba(197,160,89,0.1); border-top: 2px solid #C5A059; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <p style="margin-top: 15px; color: #C5A059; font-size: 0.65rem; letter-spacing: 2px; text-transform: uppercase;">Acessando Obra...</p>
            `;
            parent.appendChild(loader);
        }
    },

    hideLoader(video) {
        const loader = video.parentElement.querySelector('.vittalix-loader');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.remove(), 500);
        }
    }
};
