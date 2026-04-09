/**
 * Vittalix-HD: Motor de Resgate Final (v3-core)
 * Fatiamento Matemático Rígido de 18MB para compatibilidade Telegram getFile.
 * Monitoramento Verboso via Console para Auditoria Real.
 */

const CHUNK_SIZE = 18 * 1024 * 1024; // 18.874.368 bytes (Limite de Segurança)

// Configuração Direta (Emergência)
const BOT_TOKEN = "8337088620:AAEv6otSp100rdmZ0TIHVFy4tEMGjrXzqp4";
const CHAT_ID = "-1003946361387";

console.log("%c[VITTALIX-HD] MOTOR CORE V3 CARREGADO. LIMITE: 18MB.", "color: #D4AF37; font-weight: bold;");

async function vittalixUpload(file, onProgressCallback = null) {
    const showModal = !onProgressCallback;
    
    // 1. IMAGE UPLOAD
    if (file.type.startsWith('image/')) {
        console.log(`[VITTALIX-HD] Enviando Foto: ${file.name} (${file.size} bytes)`);
        if (showModal) showUploadModal(`Enviando foto original direta...`);
        try {
            const formData = new FormData();
            formData.append('chat_id', CHAT_ID);
            formData.append('photo', file, file.name);
            
            const result = await xhrUpload(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, formData, (p) => {
                if (onProgressCallback) onProgressCallback(p);
                else updateBar(p);
            });

            if (!result.ok) throw new Error(result.description);
            const fileId = result.result.photo[result.result.photo.length - 1].file_id;
            const messageId = result.result.message_id;

            if (showModal) {
                updateStatusMsg(`UPLOAD CONCLUÍDO!`);
                setTimeout(() => hideUploadModal(), 1000);
            }
            return { sessionKey: 'img_' + Date.now(), fileIds: [fileId], messageIds: [messageId] };
        } catch(err) {
            if (showModal) hideUploadModal();
            throw err;
        }
    }

    // 2. VIDEO LOGIC (FATIAMENTO RÍGIDO)
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const sessionKey = `vittalix_cx_v3_${file.name}_${file.size}`;
    
    console.log(`%c[VITTALIX-HD] INICIANDO FATIAMENTO: ${file.name}`, "color: #D4AF37;");
    console.log(`[VITTALIX-HD] Tamanho Total: ${file.size} bytes | Total de Partes: ${totalChunks}`);
    
    let savedState = JSON.parse(localStorage.getItem(sessionKey)) || { fileIds: [], messageIds: [] };
    const fileIds = [...savedState.fileIds];
    const messageIds = [...savedState.messageIds];

    if (showModal) showUploadModal(`Iniciando fatiamento Vittalix-HD...`);
    window.onbeforeunload = () => "Upload em andamento. Fechar esta aba cancelará o envio.";

    for (let i = 0; i < totalChunks; i++) {
        if (fileIds[i]) {
            console.log(`[VITTALIX-HD] Parte ${i + 1} já enviada. Pulando...`);
            continue;
        }

        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        
        // VALIDAÇÃO CRÍTICA DE TAMANHO
        console.log(`%c[VITTALIX-HD] Preparando Parte ${i + 1}/${totalChunks}`, "color: #D4AF37; font-weight: bold;");
        console.log(`[VITTALIX-HD] Slice: ${start} até ${end} | Tamanho real da fatia: ${chunk.size} bytes`);
        
        if (chunk.size > (CHUNK_SIZE + 1024)) {
            console.error("[VITTALIX-HD] ERRO DE SEGURANÇA: Fatia maior que o limite permitido!");
            throw new Error("Falha no fatiamento matemático.");
        }

        const formData = new FormData();
        formData.append('chat_id', CHAT_ID);
        const finalName = totalChunks > 1 ? `${file.name}.part${i + 1}` : file.name;
        formData.append('document', chunk, finalName);
        
        if (showModal) updateStatusMsg(`Transmitindo Parte ${i + 1} de ${totalChunks}...`);

        try {
            const result = await xhrUpload(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, formData, (p) => {
                const globalPercent = Math.round(((i / totalChunks) * 100) + (p / totalChunks));
                if (onProgressCallback) onProgressCallback(globalPercent);
                else updateBar(globalPercent);
            });

            if (!result.ok) throw new Error(result.description);
            
            fileIds[i] = result.result.document.file_id;
            messageIds[i] = result.result.message_id;
            localStorage.setItem(sessionKey, JSON.stringify({ fileIds, messageIds }));
            console.log(`%c[VITTALIX-HD] Parte ${i + 1} ENTREGUE COM SUCESSO.`, "color: green;");
        } catch (err) {
            window.onbeforeunload = null;
            if (showModal) hideUploadModal();
            throw err;
        }
    }

    window.onbeforeunload = null;
    if (showModal) {
        updateStatusMsg(`OBRA DE ARTE SINCRONIZADA!`);
        setTimeout(() => hideUploadModal(), 1000);
    }

    return { sessionKey, fileIds: fileIds.filter(Boolean), messageIds };
}

/**
 * XMLHttpRequest Wrapper
 */
function xhrUpload(url, formData, onProgress) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url);
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && onProgress) {
                const percent = Math.round((e.loaded / e.total) * 100);
                onProgress(percent);
            }
        };
        xhr.onload = () => {
            try {
                const response = JSON.parse(xhr.responseText);
                resolve(response);
            } catch (e) { reject(new Error("Erro na resposta do Telegram.")); }
        };
        xhr.onerror = () => reject(new Error("Falha na conexão de rede."));
        xhr.send(formData);
    });
}

/**
 * Interface UI
 */
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
                    <h2 style="font-size: 1.5rem; margin-bottom: 1rem; letter-spacing: 2px;">VITTALIX-HD CORE V3</h2>
                    <p id="upload-msg" style="font-size: 0.9rem; opacity: 0.8; height: 1.2rem;">${msg}</p>
                    <div style="width: 250px; height: 4px; background: rgba(255,255,255,0.1); margin: 2rem auto; border-radius: 10px; position: relative; overflow: hidden;">
                        <div id="upload-bar" style="position: absolute; left: 0; top: 0; height: 100%; width: 0%; background: #D4AF37; box-shadow: 0 0 10px #D4AF37; transition: width 0.2s linear;"></div>
                    </div>
                    <p id="upload-pct" style="font-size: 0.7rem; opacity: 0.5;">0%</p>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
}

function updateBar(percent) {
    const bar = document.getElementById('upload-bar');
    const pct = document.getElementById('upload-pct');
    if (bar) bar.style.width = `${percent}%`;
    if (pct) pct.innerText = `${percent}%`;
}

function updateStatusMsg(msg) {
    const el = document.getElementById('upload-msg');
    if (el) el.innerText = msg;
}

function hideUploadModal() {
    const modal = document.getElementById('vittalix-upload-status');
    if (modal) {
        modal.style.opacity = '0';
        modal.style.transition = 'opacity 0.4s ease';
        setTimeout(() => modal.remove(), 400);
    }
}
