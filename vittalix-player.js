/**
 * Vittalix-HD Seamless Player (MSE)
 * Ofuscando a complexidade técnica para uma experiência de luxo.
 */

window.VittalixPlayer = {
    /**
     * Inicializa a reprodução de uma Obra de Arte via MSE
     * @param {string} videoId - O ID do elemento <video>
     * @param {string[]} fileIds - Array de IDs de fragmentos do Telegram
     */
    async play(videoId, fileIds) {
        const video = document.getElementById(videoId);
        if (!video || !fileIds || !fileIds.length) return;

        // 1. Mostrar Spinner de Luxo
        this.showLoader(video);

        // Fallback: Se o navegador não suportar MSE, usar Blob Assembly
        if (!window.MediaSource || !MediaSource.isTypeSupported('video/mp4; codecs="avc1.42E01E, mp4a.40.2"')) {
            console.warn("MSE não suportado. Usando Fallback: Blob Assembly.");
            return this.playViaBlob(video, fileIds);
        }

        const mediaSource = new MediaSource();
        video.src = URL.createObjectURL(mediaSource);

        mediaSource.addEventListener('sourceopen', async () => {
            try {
                const sourceBuffer = mediaSource.addSourceBuffer('video/mp4; codecs="avc1.42E01E, mp4a.40.2"');
                sourceBuffer.mode = 'sequence';

                for (let i = 0; i < fileIds.length; i++) {
                    const chunk = await this.fetchChunk(fileIds[i]);
                    
                    // Injetar no Buffer
                    await this.appendBuffer(sourceBuffer, chunk);
                    
                    // No primeiro fragmento, disparar o play e esconder o loader
                    if (i === 0) {
                        this.hideLoader(video);
                        video.play().catch(e => console.warn("Auto-play bloqueado", e));
                    }
                }
                
                mediaSource.endOfStream();
            } catch (err) {
                console.error("Erro no motor MSE. Tentando Fallback...", err);
                this.playViaBlob(video, fileIds);
            }
        });
    },

    async fetchChunk(fileId) {
        const res = await fetch(`/api/v1/stream?fileId=${fileId}`);
        if (!res.ok) throw new Error("Falha ao baixar fragmento da obra.");
        return await res.arrayBuffer();
    },

    appendBuffer(buffer, data) {
        return new Promise((resolve, reject) => {
            const updateEnd = () => {
                buffer.removeEventListener('updateend', updateEnd);
                buffer.removeEventListener('error', reject);
                resolve();
            };
            buffer.addEventListener('updateend', updateEnd);
            buffer.addEventListener('error', reject);
            buffer.appendBuffer(data);
        });
    },

    /**
     * Fallback Robusto: Baixa tudo e monta um Blob único
     */
    async playViaBlob(video, fileIds) {
        try {
            const chunks = [];
            for (const id of fileIds) {
                chunks.push(await this.fetchChunk(id));
            }
            const blob = new Blob(chunks, { type: 'video/mp4' });
            video.src = URL.createObjectURL(blob);
            this.hideLoader(video);
            video.play();
        } catch (err) {
            console.error("Falha total na renderização da obra.", err);
            this.hideLoader(video, "SISTEMA INDISPONÍVEL");
        }
    },

    showLoader(video) {
        const parent = video.parentElement;
        parent.style.position = 'relative';
        
        let loader = parent.querySelector('.vittalix-loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.className = 'vittalix-loader';
            loader.innerHTML = `
                <div style="position: absolute; inset: 0; background: rgba(0,0,0,0.8); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 10; border-radius: inherit; backdrop-filter: blur(5px);">
                    <div class="luxury-spinner" style="width: 40px; height: 40px; border: 2px solid rgba(212,175,55,0.1); border-top: 2px solid var(--color-gold-polished); border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <p style="margin-top: 15px; color: var(--color-gold-delicate); font-size: 0.65rem; letter-spacing: 2px; text-transform: uppercase; font-family: 'Bodoni Moda', serif;">Polindo Obra de Arte...</p>
                </div>
                <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
            `;
            parent.appendChild(loader);
        }
    },

    hideLoader(video, textOverride) {
        const parent = video.parentElement;
        const loader = parent.querySelector('.vittalix-loader');
        if (loader) {
            if (textOverride) {
                loader.querySelector('p').innerText = textOverride;
                loader.querySelector('.luxury-spinner').style.display = 'none';
            } else {
                loader.style.opacity = '0';
                loader.style.transition = 'opacity 0.5s ease';
                setTimeout(() => loader.remove(), 500);
            }
        }
    }
};
