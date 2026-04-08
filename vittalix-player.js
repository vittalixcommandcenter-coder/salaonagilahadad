/**
 * Vittalix-HD Secure Player
 * High-Performance MSE Streaming for Nagila Hadad
 */

class VittalixPlayer {
    constructor(videoElement, chunkIds) {
        this.video = videoElement;
        this.chunkIds = chunkIds; // Array of Telegram file_ids
        this.mediaSource = new MediaSource();
        this.sourceBuffer = null;
        this.queue = [];
        this.currentIndex = 0;
        this.isAppending = false;

        this.init();
        this.setupSecurity();
    }

    init() {
        this.video.src = URL.createObjectURL(this.mediaSource);
        this.mediaSource.addEventListener('sourceopen', () => {
            this.sourceBuffer = this.mediaSource.addSourceBuffer('video/mp4; codecs="avc1.42E01E, mp4a.40.2"');
            this.sourceBuffer.addEventListener('updateend', () => {
                this.isAppending = false;
                this.checkQueue();
            });
            this.loadNextChunk();
        });
    }

    async loadNextChunk() {
        if (this.currentIndex >= this.chunkIds.length) {
            // All chunks loaded, end of stream
            if (this.mediaSource.readyState === 'open') {
                this.mediaSource.endOfStream();
            }
            return;
        }

        const fileId = this.chunkIds[this.currentIndex];
        console.log(`Vittalix-HD: Pre-fetching chunk ${this.currentIndex + 1}/${this.chunkIds.length}...`);

        try {
            // Fetch as blob through proxy to hide Telegram URL
            const response = await fetch(`/api/v1/stream?fileId=${fileId}`);
            if (!response.ok) throw new Error('Proxy failed');
            
            const data = await response.arrayBuffer();
            this.queue.push(data);
            this.currentIndex++;
            
            this.checkQueue();
            
            // Pre-fetch next chunk if we have room
            if (this.currentIndex < this.chunkIds.length && this.queue.length < 2) {
                this.loadNextChunk();
            }

        } catch (err) {
            console.error('Vittalix HD Streaming Error:', err);
        }
    }

    checkQueue() {
        if (this.queue.length > 0 && !this.isAppending && this.sourceBuffer) {
            this.isAppending = true;
            this.sourceBuffer.appendBuffer(this.queue.shift());
            
            // If we just appended, try to pre-fetch more
            if (this.currentIndex < this.chunkIds.length && this.queue.length < 1) {
                this.loadNextChunk();
            }
        }
    }

    setupSecurity() {
        // 1. Disable Right Click
        this.video.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // 2. Disable Controls manipulation (Hide specific options)
        this.video.setAttribute('controlsList', 'nodownload noplaybackrate');
        this.video.disablePictureInPicture = true;

        // 3. Log Protection
        console.log('%cNagila Hadad Sovereign Security Active', 'color: #D4AF37; font-weight: bold; background: #000; padding: 5px;');
    }
}

// Global integration
window.initVittalixSecurePlayer = (id, chunks) => {
    const el = document.getElementById(id);
    if (el && chunks && chunks.length) {
        new VittalixPlayer(el, chunks);
    }
};
