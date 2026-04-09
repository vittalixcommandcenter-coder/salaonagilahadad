/**
 * Vittalix-HD Admin Upload Engine
 * Persistence & Splitting Logic (Vercel Proxy 3MB)
 */

const CHUNK_SIZE = 3 * 1024 * 1024; // 3MB strict slices for Vercel 4.5MB Payload Limit
const MAX_RETRY = 3;

function getSessionKey(file) {
    return `vittalix_v1_${file.name}_${file.size}_${file.lastModified}`;
}

async function vittalixUpload(file) {
    // 1. IMAGES BYPASS CHUNKING (Uploads fully)
    if (file.type.startsWith('image/')) {
        showUploadModal(`Enviando a imagem original para a vitrine...`);
        try {
            const formData = new FormData();
            formData.append('photo', file, file.name);
            
            const response = await fetch('/api/v1/upload-proxy?type=photo', { method: 'POST', body: formData });
            const data = await response.json();
            if (!data.ok) throw new Error(data.description);
            
            const fileId = data.result.document 
                ? data.result.document.file_id 
                : data.result.photo[data.result.photo.length - 1].file_id;
            
            const messageId = data.result.message_id;

            const msg = document.getElementById('upload-msg');
            if (msg) msg.innerText = `UPLOAD CONCLUÍDO!`;
            setTimeout(() => hideUploadModal(), 1000);

            return { sessionKey: 'img_' + Date.now(), fileIds: [fileId], messageIds: [messageId] };
        } catch(err) {
            hideUploadModal();
            throw err;
        }
    }

    // 2. VIDEO LOGIC
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const sessionKey = getSessionKey(file);
    
    let savedState = JSON.parse(localStorage.getItem(sessionKey)) || { fileIds: [], messageIds: [] };
    if (Array.isArray(savedState)) {
        savedState = { fileIds: savedState, messageIds: [] }; // Bridge compatibility
    }
    
    const isResuming = savedState.fileIds.filter(Boolean).length > 0;
    const initialMsg = isResuming ? `RETOMANDO UPLOAD: ${savedState.fileIds.filter(Boolean).length}/${totalChunks} concluídas.` : `Acelerando upload de ${file.name} em ${totalChunks} pacotes...`;
    
    showUploadModal(initialMsg);
    window.onbeforeunload = () => "Upload em progresso. Não feche esta aba.";

    const fileIds = [...savedState.fileIds];
    const messageIds = [...savedState.messageIds];

    for (let i = 0; i < totalChunks; i++) {
        if (fileIds[i]) continue;

        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        
        updateUploadProgress(i + 1, totalChunks);
        
        try {
            const result = await uploadWithRetry(chunk, i + 1, MAX_RETRY, file.name, totalChunks);
            fileIds[i] = result.fileId;
            messageIds[i] = result.messageId;
            localStorage.setItem(sessionKey, JSON.stringify({ fileIds, messageIds }));
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

    return { sessionKey, fileIds: finalizedIds, messageIds };
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
    const finalName = totalChunks > 1 ? `part_${partIndex}_${originalName}` : originalName;
    formData.append('document', blob, finalName);

    try {
        const response = await fetch('/api/v1/upload-proxy', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        if (!data.ok) throw new Error(data.description);
        
        return {
            fileId: data.result.document.file_id,
            messageId: data.result.message_id
        };

    } catch (err) {
        if (retriesLeft > 0) {
            console.warn(`Parte ${partIndex} falhando. Tentando auto-resume...`);
            await new Promise(r => setTimeout(r, 2000));
            return uploadWithRetry(blob, partIndex, retriesLeft - 1, originalName, totalChunks);
        }
        throw err;
    }
}

function showUploadModal(msg) {
    const modal = document.createElement('div');
    modal.id = 'vittalix-upload-status';
    modal.innerHTML = `
        <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 9999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(20px);">
            <div style="text-align: center; color: var(--color-gold-delicate); font-family: 'Bodoni Moda', serif;">
                <h2 style="font-size: 2rem; margin-bottom: 2rem;">VITTALIX-HD: ROTA PARALELA</h2>
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
    if (msg) msg.innerText = total > 1 ? `Enviando pacote seguro ${current} de ${total}...` : `Transferindo para a borda...`;
}
