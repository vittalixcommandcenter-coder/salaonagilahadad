/**
 * Vittalix-HD: Motor de Resgate Final (v3-core)
 * Unificação de fluxo para arquivos pequenos (<18MB) e fatiados (>18MB).
 * Garantia de Array de IDs em todos os cenários.
 */

const CHUNK_SIZE = 18 * 1024 * 1024; // 18MB

const BOT_TOKEN = "8337088620:AAEv6otSp100rdmZ0TIHVFy4tEMGjrXzqp4";
const CHAT_ID = "-1003946361387";

console.log("%c[VITTALIX-HD] MOTOR CORE V3 UNIFICADO.", "color: #D4AF37; font-weight: bold;");

async function vittalixUpload(file, onProgressCallback = null) {
    const showModal = !onProgressCallback;
    const isImage = file.type.startsWith('image/');
    
    if (showModal) showUploadModal(isImage ? "Enviando foto..." : "Preparando transmissão HD...");

    // 1. Definição de Partes
    const totalChunks = isImage ? 1 : Math.ceil(file.size / CHUNK_SIZE);
    const sessionKey = `vittalix_v3_${file.name}_${file.size}`;
    
    // Recuperar estado (Resiliência)
    let savedState = JSON.parse(localStorage.getItem(sessionKey)) || { fileIds: [], messageIds: [], nativeThumbId: null };
    const fileIds = [...savedState.fileIds];
    const messageIds = [...savedState.messageIds];
    let nativeThumbId = savedState.nativeThumbId;

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
            
            // Capturar IDs
            const resObj = result.result;
            if (isImage) {
                fileIds[i] = resObj.photo[resObj.photo.length - 1].file_id;
                nativeThumbId = fileIds[i]; // Foto é sua própria thumb
            } else {
                fileIds[i] = resObj.document.file_id;
                // Capturar miniatura nativa do vídeo se existir (sempre na parte 1 ou parte única)
                if (i === 0 && resObj.document.thumb) {
                    nativeThumbId = resObj.document.thumb.file_id;
                }
            }
            messageIds[i] = resObj.message_id;
            
            // Salvar Progresso
            localStorage.setItem(sessionKey, JSON.stringify({ fileIds, messageIds, nativeThumbId }));
        } catch (err) {
            window.onbeforeunload = null;
            if (showModal) hideUploadModal();
            throw err;
        }
    }

    window.onbeforeunload = null;
    if (showModal) {
        updateStatusMsg(`OBRA SINCRONIZADA!`);
        setTimeout(() => hideUploadModal(), 1000);
    }

    return { 
        sessionKey, 
        fileIds: fileIds.filter(Boolean), 
        messageIds: messageIds.filter(Boolean), 
        nativeThumbId 
    };
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
        modal.innerHTML = `
            <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 99999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(25px);">
                <div style="text-align: center; color: #D4AF37; font-family: 'Bodoni Moda', serif; width: 100%; max-width: 400px;">
                    <div style="margin-bottom: 2rem; color: #D4AF37;">
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M12 16v-8m0 0l-3 3m3-3l3 3m-9 9h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <h2 style="font-size: 1.2rem; margin-bottom: 1rem; letter-spacing: 2px;">VITTALIX-HD CORE V3</h2>
                    <p id="upload-msg" style="font-size: 0.8rem; opacity: 0.8; height: 1.2rem;">${msg}</p>
                    <div style="width: 250px; height: 3px; background: rgba(255,255,255,0.1); margin: 2rem auto; border-radius: 10px; position: relative; overflow: hidden;">
                        <div id="upload-bar" style="position: absolute; left: 0; top: 0; height: 100%; width: 0%; background: #D4AF37; box-shadow: 0 0 10px #D4AF37; transition: width 0.2s linear;"></div>
                    </div>
                    <p id="upload-pct" style="font-size: 0.6rem; opacity: 0.5;">0%</p>
                </div>
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
        m.style.transition = 'opacity 0.4s ease';
        setTimeout(() => m.remove(), 400);
    }
}
