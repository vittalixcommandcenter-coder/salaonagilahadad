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
            overlay.style.zIndex = "10000"; // Garante que fica acima do menu
            overlay.innerHTML = `
                <div class="video-modal-content" onclick="event.stopPropagation()">
                    <!-- Palco do Vídeo -->
                    <div class="modal-main-stage">
                        <button class="close-modal-btn-top" onclick="VittalixPlayer.closeModal()">
                            <i data-lucide="x"></i>
                        </button>
                        
                        <button id="modal-prev-btn" class="modal-nav-arrow left" onclick="VittalixPlayer.prev()">
                            <i data-lucide="chevron-left"></i>
                        </button>
                        <button id="modal-next-btn" class="modal-nav-arrow right" onclick="VittalixPlayer.next()">
                            <i data-lucide="chevron-right"></i>
                        </button>

                        <!-- Fundo Ambient (Aura de Cor) -->
                        <div id="modal-ambient-bg" class="ambient-backdrop"></div>

                        <div id="modal-video-container"></div>

                        <!-- Barra de Controles Customizada (Estilo Sovereign) -->
                        <div class="video-controls-bar">
                            <div class="flex items-center gap-4">
                                <button onclick="VittalixPlayer.togglePlayPause()" class="control-trigger">
                                    <i id="play-pause-icon" data-lucide="pause"></i>
                                </button>
                                <div class="time-display" id="modal-time-display">0:00 / 0:00</div>
                            </div>
                            
                            <div class="progress-container" onclick="VittalixPlayer.seek(event)">
                                <div class="progress-bar-bg">
                                    <div id="progress-fill" class="progress-bar-fill"></div>
                                </div>
                            </div>

                            <button onclick="VittalixPlayer.toggleMuteModal()" class="control-trigger">
                                <i id="mute-icon" data-lucide="volume-2"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Barra de Informações Premium (Footer) -->
                    <div class="modal-footer-info">
                        <div class="flex flex-col">
                            <span class="category">Obra Cinematográfica</span>
                            <h2 id="modal-title" class="font-serif"></h2>
                        </div>
                        <div id="modal-counter"></div>
                    </div>
                </div>
            `;
            overlay.onclick = () => this.closeModal();
            document.body.appendChild(overlay);
        }

        overlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Trava o scroll do site
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
        const ambient = document.getElementById('modal-ambient-bg');
        
        container.innerHTML = `
            <video id="modal-video-root" 
                   key="${videoData.id || this.currentIndex}" 
                   src="${streamUrl}" 
                   playsinline 
                   class="video-main-focus"></video>
        `;

        if (ambient) {
            ambient.innerHTML = `
                <div class="ambient-mirror left">
                    <video src="${streamUrl}" muted playsinline loop autoplay></video>
                </div>
                <div class="ambient-mirror right">
                    <video src="${streamUrl}" muted playsinline loop autoplay></video>
                </div>
            `;
        }

        const video = document.getElementById('modal-video-root');
        video.volume = 0.4;
        video.play();

        // Listeners para a Barra de Progresso
        video.ontimeupdate = () => this.updateProgressBar();
        video.onloadedmetadata = () => this.updateProgressBar();
        
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
                document.body.style.overflow = 'auto'; // Libera o scroll do site
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
    },

    /**
     * Custom Control Logic
     */
    togglePlayPause() {
        const video = document.getElementById('modal-video-root');
        const icon = document.getElementById('play-pause-icon');
        if (!video || !icon) return;

        if (video.paused) {
            video.play();
            icon.innerHTML = `<i data-lucide="pause"></i>`;
        } else {
            video.pause();
            icon.innerHTML = `<i data-lucide="play"></i>`;
        }
        if (window.lucide) lucide.createIcons();
    },

    updateProgressBar() {
        const video = document.getElementById('modal-video-root');
        const fill = document.getElementById('progress-fill');
        const timeDisplay = document.getElementById('modal-time-display');
        if (!video || !fill || !timeDisplay) return;

        const percent = (video.currentTime / video.duration) * 100;
        fill.style.width = `${percent}%`;

        const current = this.formatTime(video.currentTime);
        const total = this.formatTime(video.duration || 0);
        timeDisplay.innerText = `${current} / ${total}`;
    },

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    },

    seek(e) {
        const video = document.getElementById('modal-video-root');
        if (!video) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        video.currentTime = pos * video.duration;
    },

    toggleMuteModal() {
        const video = document.getElementById('modal-video-root');
        const icon = document.getElementById('mute-icon');
        if (!video || !icon) return;

        video.muted = !video.muted;
        icon.innerHTML = `<i data-lucide="${video.muted ? 'volume-x' : 'volume-2'}"></i>`;
        if (window.lucide) lucide.createIcons();
    }
};
