/**
 * Vittalix-HD Admin Upload Engine (REFINED)
 * Persistence & Resume Logic for Nagila Hadad Luxury CMS
 */

const CHUNK_SIZE = 49 * 1024 * 1024; // 49MB strict slices
const MAX_RETRY = 3;

function getSessionKey(file) {
    return `vittalix_v1_${file.name}_${file.size}_${file.lastModified}`;
}

async function vittalixUpload(file) {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const sessionKey = getSessionKey(file);
    
    // 1. Load Persistence (Resume State)
    let savedState = JSON.parse(localStorage.getItem(sessionKey)) || [];
    const isResuming = savedState.length > 0;
    
    // UI: Warning & Progress
    const initialMsg = isResuming ? `RETOMANDO UPLOAD: ${savedState.length}/${totalChunks} partes concluídas.` : `Iniciando upload de ${totalChunks} partes...`;
    showUploadModal(initialMsg);
    window.onbeforeunload = () => "Upload em progresso. Não feche esta aba para evitar perda de dados.";

    const fileIds = [...savedState];

    for (let i = 0; i < totalChunks; i++) {
        // Skip already uploaded chunks
        if (fileIds[i]) {
            console.log(`Vittalix-HD: Pulando parte ${i + 1} (Já existente no cache).`);
            continue;
        }

        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        
        updateUploadProgress(i + 1, totalChunks);
        
        try {
            const fileId = await uploadWithRetry(chunk, i + 1, MAX_RETRY);
            
            // 2. Incremental Save (Persistence)
            fileIds[i] = fileId;
            localStorage.setItem(sessionKey, JSON.stringify(fileIds));
            
        } catch (err) {
            window.onbeforeunload = null;
            alert(`Falha crítica no upload da parte ${i + 1}. O processo foi interrompido.`);
            throw err;
        }
    }

    // 3. Final Verification (Ordering Ensure)
    const finalizedIds = fileIds.filter(id => !!id);
    if (finalizedIds.length !== totalChunks) {
        throw new Error("Integridade de upload violada: partes faltando.");
    }

    window.onbeforeunload = null;
    return { sessionKey, fileIds: finalizedIds };
}

async function uploadWithRetry(blob, partIndex, retriesLeft) {
    const formData = new FormData();

    formData.append('document', blob, `part_${partIndex}.mp4`);
    formData.append('chat_id', '-1003946361387'); // Nagila CDN Channel

    try {
        // Envia via Proxy serverless — BOT_TOKEN fica seguro no servidor
        const response = await fetch('/api/v1/upload-proxy', {
            method: 'POST',
            body: formData
        });

        
        const data = await response.json();
        if (!data.ok) throw new Error(data.description);
        
        return data.result.document.file_id;

    } catch (err) {
        if (retriesLeft > 0) {
            console.warn(`Parte ${partIndex} falhou. Tentando novamente (${MAX_RETRY - retriesLeft + 1}/${MAX_RETRY})...`);
            await new Promise(r => setTimeout(r, 2000));
            return uploadWithRetry(blob, partIndex, retriesLeft - 1);
        }
        throw err;
    }
}

// UI Helpers (Simplified for integration)
function showUploadModal(msg) {
    const modal = document.createElement('div');
    modal.id = 'vittalix-upload-status';
    modal.innerHTML = `
        <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 9999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(20px);">
            <div style="text-align: center; color: var(--color-gold-delicate); font-family: 'Bodoni Moda', serif;">
                <h2 style="font-size: 2rem; margin-bottom: 2rem;">VITTALIX-HD: PROCESSANDO MÍDIA</h2>
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
    if (msg) msg.innerText = `Enviando parte ${current} de ${total}...`;
}
