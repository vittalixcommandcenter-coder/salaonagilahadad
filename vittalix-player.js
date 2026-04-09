/**
 * Vittalix-HD: Zero-Bandwidth Bridge (Legacy Mode)
 * Otimizado para custo zero de banda e bypass total de CORS via Redirect 302.
 */

window.VittalixPlayer = {
    /**
     * Inicia a reprodução via Tag Nativa (Zero Bandwidth)
     * @param {string} videoId - O ID do elemento <video>
     * @param {string[]} fileIds - Array de IDs (usa-se o [0] para banda zero puro)
     */
    play(videoId, fileIds) {
        const video = document.getElementById(videoId);
        if (!video || !fileIds || !fileIds.length) return;

        // 1. Mostrar Spinner de Luxo
        this.showLoader(video);

        // 2. Configurar Source Direto (Bypass CORS + Zero Bandwidth)
        // O navegador seguirá o 302 da Vercel para o Telegram nativamente.
        const streamUrl = `/api/v1/stream?fileId=${fileIds[0]}`;
        
        video.src = streamUrl;
        video.load();

        // 3. Gestão de Eventos para Spinner
        video.oncanplay = () => {
            this.hideLoader(video);
            video.play().catch(e => console.warn("Auto-play bloqueado pelo navegador. Clique manualmente."));
        };

        video.onerror = () => {
            console.error("Erro no redirecionamento da obra.");
            this.hideLoader(video, "MÍDIA INDISPONÍVEL");
        };
    },

    showLoader(video) {
        const parent = video.parentElement;
        parent.style.position = 'relative';
        
        let loader = parent.querySelector('.vittalix-loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.className = 'vittalix-loader';
            loader.style.cssText = "position: absolute; inset: 0; background: rgba(0,0,0,0.8); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 10; border-radius: inherit; backdrop-filter: blur(5px); pointer-events: none;";
            loader.innerHTML = `
                <div class="luxury-spinner" style="width: 40px; height: 40px; border: 2px solid rgba(212,175,55,0.1); border-top: 2px solid #D4AF37; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <p style="margin-top: 15px; color: #D4AF37; font-size: 0.65rem; letter-spacing: 2px; text-transform: uppercase;">Acessando Obra de Arte...</p>
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
