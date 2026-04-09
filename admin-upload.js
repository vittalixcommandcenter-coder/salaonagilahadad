/**
 * Vittalix-HD Admin Upload Engine (DIRECT BOT API)
 * Persistence, Splitting & Direct Upload Logic for Nagila Hadad Luxury CMS
 */

const BOT_TOKEN = '7744876644:AAEP_X78u7iA8W1tXwM_VvF5hXp0Y4A8V5o';
const CDN_CHAT_ID = '-1003946361387';

const CHUNK_SIZE = 49 * 1024 * 1024; // 49MB strict slices
const MAX_RETRY = 3;

function getSessionKey(file) {
    return `vittalix_v1_${file.name}_${file.size}_${file.lastModified}`;
}

async function vittalixUpload(file) {
    // 1. BYPASS TOTAL PARA IMAGENS (Não fatia, envia inteiro preservando o nome original, usando sendPhoto)
    if (file.type.startsWith('image/')) {
        showUploadModal(`Enviando a imagem original para a vitrine...`);
        try {
            const formData = new FormData();
            formData.append('photo', file, file.name);
            formData.append('chat_id', CDN_CHAT_ID);
            
            const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, { method: 'POST', body: formData });
            const data = await response.json();
            if (!data.ok) throw new Error(data.description);
            
            const fileId = data.result.photo[data.result.photo.length - 1].file_id;

            const msg = document.getElementById('upload-msg');
            if (msg) msg.innerText = `UPLOAD CONCLUÍDO!`;
            setTimeout(() => hideUploadModal(), 1000);

            return { sessionKey: 'img_' + Date.now(), fileIds: [fileId] };
        } catch(err) {
            hideUploadModal();
            throw err;
        }
    }

    // 2. LÓGICA PARA VÍDEOS / DOCUMENTOS PESADOS (Direct Bot API)
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const sessionKey = getSessionKey(file);
    
    let savedState = JSON.parse(localStorage.getItem(sessionKey)) || [];
    const isResuming = savedState.length > 0;
    
    const initialMsg = isResuming ? `RETOMANDO UPLOAD: ${savedState.length}/${totalChunks} concluídas.` : `Acelerando upload de ${file.name} em ${totalChunks} pacotes...`;
    showUploadModal(initialMsg);
    window.onbeforeunload = () => "Upload em progresso. Não feche esta aba.";

    const fileIds = [...savedState];

    for (let i = 0; i < totalChunks; i++) {
        if (fileIds[i]) continue;

        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        
        updateUploadProgress(i + 1, totalChunks);
        
        try {
            const fileId = await uploadWithRetry(chunk, i + 1, MAX_RETRY, file.name, totalChunks);
            fileIds[i] = fileId;
            localStorage.setItem(sessionKey, JSON.stringify(fileIds));
        } catch (err) {
            window.onbeforeunload = null;
            alert(`Falha no upload da parte ${i + 1}. O processo foi travado e poderá ser retomado depois.`);
            throw err;
        }
    }

    const finalizedIds = fileIds.filter(id => !!id);
    if (finalizedIds.length !== totalChunks) throw new Error("Integridade violada: partes faltando.");

    window.onbeforeunload = null;
    
    const msg = document.getElementById('upload-msg');
    if (msg) msg.innerText = `UPLOAD CONCLUÍDO!`;
    setTimeout(() => hideUploadModal(), 1000);

    return { sessionKey, fileIds: finalizedIds };
}

function hideUploadModal() {
    const modal = document.getElementById('vittalix-upload-status');
    if (modal) {
        modal.style.opacity = '0';
        modal.style.transition = 'opacity 0.5s ease';
        setTimeout(() => modal.remove(), 500);
    }
}

async function uploadWithRetry(blob, partIndex, retriesLeft, originalName, totalChunks) {
    const formData = new FormData();

    // Nomeização dinâmica sem hardcode de part_1.mp4. Se for só um arquivo (<49MB), envia normal.
    const finalName = totalChunks > 1 ? `part_${partIndex}_${originalName}` : originalName;
    formData.append('document', blob, finalName);
    formData.append('chat_id', CDN_CHAT_ID); 

    try {
        // Direct API Bypass ao invés da proxy local (evita límite 4.5MB Serverless)
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        if (!data.ok) throw new Error(data.description);
        
        return data.result.document.file_id;

    } catch (err) {
        if (retriesLeft > 0) {
            console.warn(`Parte ${partIndex} falhando. Tentando auto-resume...`);
            await new Promise(r => setTimeout(r, 2000));
            return uploadWithRetry(blob, partIndex, retriesLeft - 1, originalName, totalChunks);
        }
        throw err;
    }
}

// UI Helpers
function showUploadModal(msg) {
    const modal = document.createElement('div');
    modal.id = 'vittalix-upload-status';
    modal.innerHTML = `
        <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 9999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(20px);">
            <div style="text-align: center; color: var(--color-gold-delicate); font-family: 'Bodoni Moda', serif;">
                <h2 style="font-size: 2rem; margin-bottom: 2rem;">VITTALIX-HD: ROTA EXPRESSA</h2>
                <p id="upload-msg">${msg}</p>
                <div style="width: 300px; height: 2px; background: rgba(255,255,255,0.1); margin: 2rem auto; position: relative; overflow: hidden;">
                    <div id="upload-bar" style="position: absolute; left: 0; top: 0; height: 100%; width: 0%; background: var(--color-gold-polished); transition: width 0.3s;"></div>
                </div>
                <p style="font-size: 0.7rem; opacity: 0.6; text-transform: uppercase; letter-spacing: 2px;">NÃO FECHE ESTA ABA</p>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function updateUploadProgress(current, total) {
    const percent = (current / total) * 100;
    const bar = document.getElementById('upload-bar');
    const msg = document.getElementById('upload-msg');
    if (bar) bar.style.width = `${percent}%`;
    if (msg) msg.innerText = total > 1 ? `Enviando pacote pesado ${current} de ${total}...` : `Transferindo para a borda...`;
}
