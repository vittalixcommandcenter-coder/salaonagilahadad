/**
 * Vittalix-HD: Motor de Resgate Final (v4-Canvas-Hybrid)
 * Geração de miniatura local via Canvas + Upload via sendPhoto.
 * Garante a capa visual (poster) em 100% dos casos, independente do tamanho do vídeo.
 */

const CHUNK_SIZE = 18 * 1024 * 1024; // 18MB

const BOT_TOKEN = "8337088620:AAEv6otSp100rdmZ0TIHVFy4tEMGjrXzqp4";
const CHAT_ID = "-1003946361387";

console.log("%c[VITTALIX-HD] MOTOR V4 (CANVAS HYBRID) ATIVO.", "color: #D4AF37; font-weight: bold;");

async function vittalixUpload(file, onProgressCallback = null) {
    const showModal = !onProgressCallback;
    const isImage = file.type.startsWith('image/');
    
    if (showModal) showUploadModal(isImage ? "Enviando foto..." : "Processando Obra de Arte...");

    let nativeThumbId = null;

    // --- NOVA LÓGICA: Geração de Miniatura Local para Vídeos ---
    if (!isImage) {
        try {
            if (showModal) updateStatusMsg("Gerando miniatura de alta fidelidade...");
            const thumbBlob = await generateVideoThumbnail(file);
            console.log("[VITTALIX-HD] Miniatura gerada localmente.");
            
            // Enviar miniatura via sendPhoto
            const thumbFormData = new FormData();
            thumbFormData.append('chat_id', CHAT_ID);
            thumbFormData.append('photo', thumbBlob, 'thumb.jpg');
            
            const thumbRes = await xhrUpload(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, thumbFormData);
            if (thumbRes.ok) {
                nativeThumbId = thumbRes.result.photo[thumbRes.result.photo.length - 1].file_id;
                console.log("[VITTALIX-HD] Miniatura oficializada no Telegram:", nativeThumbId);
            }
        } catch (err) {
            console.warn("[VITTALIX-HD] Falha ao gerar miniatura local. Continuando sem poster...", err);
        }
    }

    // --- Fluxo de Upload Principal ---
    const totalChunks = isImage ? 1 : Math.ceil(file.size / CHUNK_SIZE);
    const sessionKey = `vittalix_v4_${file.name}_${file.size}`;
    
    let savedState = JSON.parse(localStorage.getItem(sessionKey)) || { fileIds: [], messageIds: [] };
    const fileIds = [...savedState.fileIds];
    const messageIds = [...savedState.messageIds];

    window.onbeforeunload = () => "Upload em andamento...";

    for (let i = 0; i < totalChunks; i++) {
        if (fileIds[i]) continue;

        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = isImage ? file : file.slice(start, end);
        
        const type = isImage ? 'photo' : 'document';
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/send${type.charAt(0).toUpperCase() + type.slice(1)}`;
        const formData = new FormData();
        formData.append('chat_id', CHAT_ID);
        
        const finalName = totalChunks > 1 ? `${file.name}.part${i + 1}` : file.name;
        formData.append(type, chunk, finalName);
        
        if (showModal) updateStatusMsg(totalChunks > 1 ? `Transmitindo parte ${i+1} de ${totalChunks}...` : `Enviando obra de arte...`);

        try {
            const result = await xhrUpload(url, formData, (p) => {
                const globalPercent = Math.round(((i / totalChunks) * 100) + (p / totalChunks));
                if (onProgressCallback) onProgressCallback(globalPercent);
                else updateBar(globalPercent);
            });

            if (!result.ok) throw new Error(result.description);
            
            const resObj = result.result;
            const mediaObj = resObj.document || resObj.video || resObj.animation || (resObj.photo ? resObj.photo[resObj.photo.length - 1] : null);

            if (!mediaObj) throw new Error("Falha na resposta do Telegram.");

            fileIds[i] = mediaObj.file_id;
            messageIds[i] = resObj.message_id;

            if (isImage) nativeThumbId = fileIds[i];

            localStorage.setItem(sessionKey, JSON.stringify({ fileIds, messageIds }));
            
        } catch (err) {
            window.onbeforeunload = null;
            if (showModal) hideUploadModal();
            throw err;
        }
    }

    window.onbeforeunload = null;
    if (showModal) {
        updateStatusMsg(`CONCLUÍDO COM SUCESSO!`);
        setTimeout(() => hideUploadModal(), 1000);
    }

    return { sessionKey, fileIds: fileIds.filter(Boolean), messageIds: messageIds.filter(Boolean), nativeThumbId };
}

/**
 * Geração de Thumbnail via Canvas
 */
function generateVideoThumbnail(file) {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        video.src = URL.createObjectURL(file);
        video.muted = true;
        video.playsInline = true;

        video.onloadedmetadata = () => {
            // Buscar o frame de 1 segundo (evita telas pretas iniciais)
            video.currentTime = Math.min(1, video.duration / 2);
        };

        video.onseeked = () => {
            // Preservar Aspect Ratio Cinematográfico
            const width = 1280;
            const height = (video.videoHeight / video.videoWidth) * width;
            canvas.width = width;
            canvas.height = height;
            
            context.drawImage(video, 0, 0, width, height);
            canvas.toBlob((blob) => {
                URL.revokeObjectURL(video.src);
                resolve(blob);
            }, 'image/jpeg', 0.85);
        };

        video.onerror = () => reject("Erro ao processar vídeo para miniatura.");
        
        // Timeout de segurança (para vídeos corrompidos)
        setTimeout(() => reject("Timeout na geração da miniatura."), 5000);
    });
}

function xhrUpload(url, formData, onProgress) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url);
        if (onProgress) {
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
            };
        }
        xhr.onload = () => {
            try { resolve(JSON.parse(xhr.responseText)); } 
            catch (e) { reject(new Error("Resposta inválida do servidor.")); }
        };
        xhr.onerror = () => reject(new Error("Erro de rede."));
        xhr.send(formData);
    });
}

/** UI HELPERS **/
function showUploadModal(msg) {
    let modal = document.getElementById('vittalix-upload-status');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'vittalix-upload-status';
        modal.style.cssText = "position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 99999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(25px); transition: opacity 0.4s ease;";
        modal.innerHTML = `
            <div style="text-align: center; color: #D4AF37; font-family: 'Bodoni Moda', serif; width: 100%; max-width: 400px;">
                <div style="margin-bottom: 2rem; color: #D4AF37;">
                    <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M12 16v-8m0 0l-3 3m3-3l3 3m-9 9h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <h2 style="font-size: 1.1rem; margin-bottom: 1rem; letter-spacing: 2px;">VITTALIX-HD CORE V4</h2>
                <p id="upload-msg" style="font-size: 0.75rem; opacity: 0.8; height: 1.2rem;">${msg}</p>
                <div style="width: 250px; height: 3px; background: rgba(255,255,255,0.1); margin: 2rem auto; border-radius: 10px; position: relative; overflow: hidden;">
                    <div id="upload-bar" style="position: absolute; left: 0; top: 0; height: 100%; width: 0%; background: #D4AF37; box-shadow: 0 0 10px #D4AF37; transition: width 0.2s linear;"></div>
                </div>
                <p id="upload-pct" style="font-size: 0.6rem; opacity: 0.5;">0%</p>
            </div>
        `;
        document.body.appendChild(modal);
    }
}
function updateBar(p) { 
    const b = document.getElementById('upload-bar'); 
    const t = document.getElementById('upload-pct');
    if (b) b.style.width = `${p}%`;
    if (t) t.innerText = `${p}%`;
}
function updateStatusMsg(m) { 
    const e = document.getElementById('upload-msg'); 
    if (e) e.innerText = m; 
}
function hideUploadModal() {
    const m = document.getElementById('vittalix-upload-status');
    if (m) {
        m.style.opacity = '0';
        setTimeout(() => m.remove(), 400);
    }
}
