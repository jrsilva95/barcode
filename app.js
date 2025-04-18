document.addEventListener('DOMContentLoaded', () => {
    // Elementos da DOM
    const video = document.getElementById('video');
    const startButton = document.getElementById('start-scanner');
    const stopButton = document.getElementById('stop-scanner');
    const switchCameraButton = document.getElementById('switch-camera');
    const toggleFlashButton = document.getElementById('toggle-flash');
    const toggleModeButton = document.getElementById('toggle-mode');
    const barcodeList = document.getElementById('barcode-list');
    const exportButton = document.getElementById('export-csv');
    const clearAllButton = document.getElementById('clear-all');
    const totalCodesElement = document.getElementById('total-codes');
    const scanRegionHighlight = document.getElementById('scan-region-highlight');
    const scanStatus = document.getElementById('scan-status');
    const contrastSlider = document.getElementById('contrast-slider');
    const brightnessSlider = document.getElementById('brightness-slider');
    const contrastValue = document.getElementById('contrast-value');
    const brightnessValue = document.getElementById('brightness-value');

    // Variáveis de estado
    let barcodes = [];
    let videoInputDevices = [];
    let currentDeviceIndex = 0;
    let isScanning = false;
    let flashOn = false;
    let lastDetectionTime = 0;
    let videoTrack = null;
    let continuousScanMode = true;
    let barcodeWorker = null;
    let isProcessingFrame = false;
    let animationFrameId = null;
    const decodingCache = new Map();
    const CACHE_LIMIT = 100;
    
    // Configurações de processamento de imagem
    let imageProcessingSettings = {
        contrast: parseFloat(contrastSlider.value),
        brightness: parseInt(brightnessSlider.value),
        threshold: 0,
        tryHarder: true
    };
    
    // Inicializar o worker de processamento de códigos de barras
    function initBarcodeWorker() {
        if (window.Worker) {
            barcodeWorker = new Worker('barcode-worker.js');
            
            barcodeWorker.onmessage = function(e) {
                if (e.data.type === 'initialized') {
                    console.log('Barcode worker initialized');
                } 
                else if (e.data.type === 'result') {
                    if (e.data.success) {
                        // Processar código de barras detectado
                        processBarcodeResult(e.data);
                    }
                }
                else if (e.data.type === 'settingsUpdated') {
                    console.log('Settings updated:', e.data.settings);
                }
            };
            
            // Inicializar o worker
            barcodeWorker.postMessage({ type: 'init' });
            return true;
        } else {
            console.error('Web Workers não são suportados neste navegador');
            return false;
        }
    }
    
    // Função para fazer o dispositivo vibrar
    function vibrateDevice() {
        if ('vibrate' in navigator) {
            navigator.vibrate(300);
        }
    }

    // Atualizar status do scanner
    function updateScanStatus(message) {
        scanStatus.textContent = message;
    }

    // Controlar o flash da câmera
    async function toggleFlash() {
        if (!videoTrack) return;
        
        try {
            if (flashOn) {
                await videoTrack.applyConstraints({
                    advanced: [{ torch: false }]
                });
                flashOn = false;
                toggleFlashButton.textContent = 'Ligar Flash';
            } else {
                await videoTrack.applyConstraints({
                    advanced: [{ torch: true }]
                });
                flashOn = true;
                toggleFlashButton.textContent = 'Desligar Flash';
            }
        } catch (err) {
            console.error('Erro ao controlar o flash:', err);
            alert('Este dispositivo não suporta controle de flash');
        }
    }
    
    // Alternar modo de escaneamento
    function toggleScanMode() {
        continuousScanMode = !continuousScanMode;
        
        if (continuousScanMode) {
            // Configurar para escaneamento contínuo
            updateScanStatus('Modo contínuo: procurando códigos...');
        } else {
            // Configurar para escaneamento único
            updateScanStatus('Modo único: aguardando código...');
        }
    }
    
    // Inicializar a câmera e o scanner
    async function initCamera() {
        try {
            // Enumerar dispositivos de vídeo
            const devices = await navigator.mediaDevices.enumerateDevices();
            videoInputDevices = devices.filter(device => device.kind === 'videoinput');
            
            if (videoInputDevices.length === 0) {
                alert('Nenhuma câmera encontrada no dispositivo');
                return false;
            }
            
            // Preferir câmera traseira para leitura de códigos de barras
            for (let i = 0; i < videoInputDevices.length; i++) {
                const label = videoInputDevices[i].label.toLowerCase();
                if (label.includes('back') || label.includes('traseira') || label.includes('rear')) {
                    currentDeviceIndex = i;
                    break;
                }
            }
            
            // Habilitar o botão de alternar câmera se houver mais de uma câmera
            if (videoInputDevices.length > 1) {
                switchCameraButton.disabled = false;
            }
            
            return true;
        } catch (err) {
            console.error('Erro ao inicializar a câmera:', err);
            alert('Erro ao inicializar a câmera: ' + err.message);
            return false;
        }
    }

    // Iniciar o scanner
    async function startScanner() {
        // Inicializar o worker se ainda não foi feito
        if (!barcodeWorker) {
            const initialized = initBarcodeWorker();
            if (!initialized) {
                alert('Seu navegador não suporta Web Workers, o que é necessário para o scanner.');
                return;
            }
        }
        
        // Inicializar a câmera se ainda não foi feito
        if (videoInputDevices.length === 0) {
            const initialized = await initCamera();
            if (!initialized) return;
        }

        try {
            updateScanStatus('Iniciando câmera...');
            scanRegionHighlight.classList.add('active');
            
            const selectedDeviceId = videoInputDevices[currentDeviceIndex].deviceId;
            
            // Configurações avançadas para a câmera
            const constraints = {
                video: {
                    deviceId: selectedDeviceId,
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: "environment",
                    // Configurações avançadas para melhorar a leitura
                    advanced: [
                        { zoom: 1.5 }, // Zoom leve para aproximar o código
                        { focusMode: "continuous" }, // Foco contínuo
                        { focusDistance: 0.3 }, // Distância de foco próxima
                        { exposureMode: "continuous" }, // Exposição automática contínua
                        { whiteBalanceMode: "continuous" }, // Balanço de branco automático
                        { exposureCompensation: 1 }, // Ligeiramente mais claro
                        { frameRate: { ideal: 30, min: 15 } } // Taxa de quadros ideal
                    ]
                }
            };
            
            // Iniciar o stream de vídeo
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
            
            // Esperar o vídeo carregar
            await new Promise(resolve => {
                video.onloadedmetadata = () => {
                    video.play();
                    resolve();
                };
            });
            
            // Obter a track de vídeo para controle do flash
            videoTrack = stream.getVideoTracks()[0];
            
            // Verificar se o flash é suportado
            if (videoTrack.getCapabilities && videoTrack.getCapabilities().torch) {
                toggleFlashButton.disabled = false;
            }
            
            // Iniciar o processamento de frames
            startFrameProcessing();
            
            isScanning = true;
            startButton.disabled = true;
            stopButton.disabled = false;
            switchCameraButton.disabled = videoInputDevices.length <= 1;
            
            updateScanStatus(continuousScanMode ? 'Modo contínuo: procurando códigos...' : 'Modo único: aguardando código...');
            
        } catch (err) {
            console.error('Erro ao iniciar o scanner:', err);
            alert('Erro ao iniciar o scanner: ' + err.message);
            updateScanStatus('Erro ao iniciar câmera');
            scanRegionHighlight.classList.remove('active');
        }
    }
    
    // Iniciar o processamento de frames
    function startFrameProcessing() {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        
        processVideoFrames();
    }
    
    // Processar frames de vídeo
    function processVideoFrames() {
        if (!isScanning) return;
        
        if (!isProcessingFrame && video.readyState === video.HAVE_ENOUGH_DATA) {
            isProcessingFrame = true;
            
            // Capturar frame atual
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            // Desenhar o frame atual no canvas
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Definir uma região de interesse (centro da imagem)
            const roiSize = {
                width: Math.floor(canvas.width * 0.6),  // 60% da largura
                height: Math.floor(canvas.height * 0.3)  // 30% da altura
            };
            
            const roiOrigin = {
                x: Math.floor((canvas.width - roiSize.width) / 2),
                y: Math.floor((canvas.height - roiSize.height) / 2)
            };
            
            // Criar um canvas para a região de interesse
            const roiCanvas = document.createElement('canvas');
            roiCanvas.width = roiSize.width;
            roiCanvas.height = roiSize.height;
            const roiCtx = roiCanvas.getContext('2d');
            
            // Copiar apenas a região de interesse
            roiCtx.drawImage(
                canvas,
                roiOrigin.x, roiOrigin.y, roiSize.width, roiSize.height,
                0, 0, roiSize.width, roiSize.height
            );
            
            // Obter os dados da imagem da região de interesse
            const roiImageData = roiCtx.getImageData(0, 0, roiSize.width, roiSize.height);
            
            // Calcular hash da imagem para cache
            const imageHash = hashImage(roiImageData);
            
            // Verificar se já temos um resultado em cache
            const cachedResult = getCachedResult(imageHash);
            if (cachedResult) {
                processBarcodeResult(cachedResult);
                isProcessingFrame = false;
            } else {
                // Enviar apenas a região de interesse para processamento
                if (barcodeWorker) {
                    barcodeWorker.postMessage({
                        type: 'decode',
                        imageData: roiImageData,
                        width: roiSize.width,
                        height: roiSize.height
                    });
                    
                    // Definir um timeout para resetar o flag de processamento
                    setTimeout(() => {
                        isProcessingFrame = false;
                    }, 100);
                } else {
                    isProcessingFrame = false;
                }
            }
            
            // Atualizar a visualização da região de interesse na interface
            scanRegionHighlight.style.width = `${roiSize.width / (canvas.width / video.offsetWidth)}px`;
            scanRegionHighlight.style.height = `${roiSize.height / (canvas.height / video.offsetHeight)}px`;
        }
        
        // Agendar o próximo frame
        animationFrameId = requestAnimationFrame(processVideoFrames);
    }
    
    // Função simples de hash para imagens
    function hashImage(imageData) {
        let hash = 0;
        const data = imageData.data;
        
        // Amostrar pixels para criar um hash rápido
        for (let i = 0; i < data.length; i += 1000) {
            hash = ((hash << 5) - hash) + data[i];
            hash = hash & hash; // Converter para inteiro de 32 bits
        }
        
        return hash;
    }
    
    // Obter resultado do cache
    function getCachedResult(imageHash) {
        return decodingCache.get(imageHash);
    }
    
    // Armazenar resultado no cache
    function cacheResult(imageHash, result) {
        // Limpar o cache se estiver muito grande
        if (decodingCache.size > CACHE_LIMIT) {
            const oldestKey = decodingCache.keys().next().value;
            decodingCache.delete(oldestKey);
        }
        
        decodingCache.set(imageHash, result);
    }

    // Parar o scanner
    function stopScanner() {
        if (isScanning) {
            // Parar o processamento de frames
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
            
            // Parar o stream de vídeo
            if (video.srcObject) {
                const tracks = video.srcObject.getTracks();
                tracks.forEach(track => track.stop());
                video.srcObject = null;
            }
            
            isScanning = false;
            startButton.disabled = false;
            stopButton.disabled = true;
            switchCameraButton.disabled = true;
            toggleFlashButton.disabled = true;
            scanRegionHighlight.classList.remove('active');
            updateScanStatus('Aguardando...');
            
            // Desligar o flash se estiver ligado
            if (flashOn && videoTrack) {
                videoTrack.applyConstraints({
                    advanced: [{ torch: false }]
                }).catch(() => {});
                flashOn = false;
                toggleFlashButton.textContent = 'Ligar Flash';
            }
            
            videoTrack = null;
        }
    }

    // Alternar entre câmeras
    async function switchCamera() {
        if (!isScanning || videoInputDevices.length <= 1) return;
        
        // Parar o scanner atual
        if (video.srcObject) {
            const tracks = video.srcObject.getTracks();
            tracks.forEach(track => track.stop());
        }
        
        // Desligar o flash se estiver ligado
        if (flashOn && videoTrack) {
            videoTrack.applyConstraints({
                advanced: [{ torch: false }]
            }).catch(() => {});
            flashOn = false;
            toggleFlashButton.textContent = 'Ligar Flash';
        }
        
        // Alternar para a próxima câmera
        currentDeviceIndex = (currentDeviceIndex + 1) % videoInputDevices.length;
        
        updateScanStatus('Alternando câmera...');
        
        // Reiniciar o scanner com a nova câmera
        try {
            const selectedDeviceId = videoInputDevices[currentDeviceIndex].deviceId;
            
            // Configurações avançadas para a câmera
            const constraints = {
                video: {
                    deviceId: selectedDeviceId,
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: "environment",
                    // Configurações avançadas para melhorar a leitura
                    advanced: [
                        { zoom: 1.5 }, // Zoom leve para aproximar o código
                        { focusMode: "continuous" }, // Foco contínuo
                        { focusDistance: 0.3 }, // Distância de foco próxima
                        { exposureMode: "continuous" }, // Exposição automática contínua
                        { whiteBalanceMode: "continuous" }, // Balanço de branco automático
                        { exposureCompensation: 1 }, // Ligeiramente mais claro
                        { frameRate: { ideal: 30, min: 15 } } // Taxa de quadros ideal
                    ]
                }
            };
            
            // Iniciar o stream de vídeo
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
            
            // Esperar o vídeo carregar
            await new Promise(resolve => {
                video.onloadedmetadata = () => {
                    video.play();
                    resolve();
                };
            });
            
            // Obter a track de vídeo para controle do flash
            videoTrack = stream.getVideoTracks()[0];
            
            // Verificar se o flash é suportado
            if (videoTrack.getCapabilities && videoTrack.getCapabilities().torch) {
                toggleFlashButton.disabled = false;
            } else {
                toggleFlashButton.disabled = true;
            }
            
            // Reiniciar o processamento de frames
            startFrameProcessing();
            
            // Mostrar qual câmera está sendo usada
            const cameraLabel = videoInputDevices[currentDeviceIndex].label || 
                               `Câmera ${currentDeviceIndex + 1}`;
            console.log(`Alternado para: ${cameraLabel}`);
            updateScanStatus(continuousScanMode ? 'Modo contínuo: procurando códigos...' : 'Modo único: aguardando código...');
            
        } catch (err) {
            console.error('Erro ao alternar câmera:', err);
            alert('Erro ao alternar câmera: ' + err.message);
            
            // Tentar voltar para a câmera anterior
            currentDeviceIndex = (currentDeviceIndex - 1 + videoInputDevices.length) % videoInputDevices.length;
            startScanner();
        }
    }

    // Processar resultado do código de barras
    function processBarcodeResult(result) {
        if (!result.success) return;
        
        const barcodeValue = result.text;
        const currentTime = new Date().getTime();
        
        // Verificar se o código já foi lido e se passou tempo suficiente desde a última leitura
        if (!barcodes.some(code => code.value === barcodeValue) && 
            (currentTime - lastDetectionTime > 1000)) {
            
            // Validar o código de barras
            const isValid = BarcodeValidator.validateBarcode(barcodeValue);
            const barcodeType = BarcodeValidator.identifyBarcodeType(barcodeValue);
            let countryInfo = '';
            
            if (barcodeType === 'EAN-13') {
                countryInfo = BarcodeValidator.getEANCountry(barcodeValue);
            }
            
            lastDetectionTime = currentTime;
            const timestamp = new Date().toLocaleString();
            
            updateScanStatus(`Código ${isValid ? 'válido' : 'inválido'} detectado!`);
            
            // Feedback visual de sucesso
            scanRegionHighlight.style.borderColor = isValid ? '#00ff00' : '#ff0000';
            setTimeout(() => {
                scanRegionHighlight.style.borderColor = '#ff0000';
            }, 500);
            
            // Adicionar à lista
            addBarcodeToList(barcodeValue, timestamp, isValid, barcodeType, countryInfo);
            
            // Adicionar som de beep
            const beep = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU");
            beep.play();
            
            // Fazer o dispositivo vibrar
            vibrateDevice();
            
            // Se estiver no modo único, parar o scanner após uma leitura bem-sucedida
            if (!continuousScanMode) {
                stopScanner();
                updateScanStatus('Código lido! Clique em Iniciar Scanner para ler outro código.');
            } else {
                // Voltar ao estado de busca após um breve intervalo
                setTimeout(() => {
                    updateScanStatus('Procurando código...');
                }, 1000);
            }
        }
    }

    // Adicionar código de barras à lista
    function addBarcodeToList(value, timestamp, isValid, barcodeType, countryInfo) {
        // Adicionar ao array
        const barcodeData = { 
            value, 
            timestamp, 
            isValid, 
            barcodeType, 
            countryInfo 
        };
        barcodes.push(barcodeData);
        
        // Adicionar à lista visual
        const listItem = document.createElement('div');
        listItem.className = `code-item new ${isValid ? 'valid-code' : 'invalid-code'}`;
        
        let additionalInfo = '';
        if (barcodeType !== 'Desconhecido') {
            additionalInfo += `<br><small>Tipo: ${barcodeType}`;
            if (countryInfo) {
                additionalInfo += ` | Origem: ${countryInfo}`;
            }
            additionalInfo += '</small>';
        }
        
        listItem.innerHTML = `
            <span>${value}${additionalInfo}</span>
            <span>${timestamp}</span>
            <button class="delete-btn" data-code="${value}">Remover</button>
        `;
        
        barcodeList.prepend(listItem); // Adicionar no topo da lista
        
        // Remover classe 'new' após a animação
        setTimeout(() => {
            listItem.classList.remove('new');
        }, 1500);
        
        // Atualizar contagem
        updateTotalCount();
        
        // Habilitar botões de exportação e limpar
        exportButton.disabled = false;
        clearAllButton.disabled = false;
    }

    // Remover código de barras da lista
    function removeBarcodeFromList(value) {
        // Remover do array
        barcodes = barcodes.filter(code => code.value !== value);
        
        // Remover da lista visual
        const items = barcodeList.querySelectorAll('.code-item');
        items.forEach(item => {
            const deleteBtn = item.querySelector('.delete-btn');
            if (deleteBtn.getAttribute('data-code') === value) {
                item.remove();
            }
        });
        
        // Atualizar contagem
        updateTotalCount();
        
        // Desabilitar botões se a lista estiver vazia
        if (barcodes.length === 0) {
            exportButton.disabled = true;
            clearAllButton.disabled = true;
        }
    }

    // Limpar todos os códigos
    function clearAllBarcodes() {
        if (confirm('Tem certeza que deseja remover todos os códigos?')) {
            barcodes = [];
            barcodeList.innerHTML = '';
            updateTotalCount();
            exportButton.disabled = true;
            clearAllButton.disabled = true;
        }
    }

    // Atualizar contagem total
    function updateTotalCount() {
        totalCodesElement.textContent = `Total: ${barcodes.length} código${barcodes.length !== 1 ? 's' : ''}`;
    }

    // Exportar para CSV
    function exportToCSV() {
        if (barcodes.length === 0) {
            alert('Não há códigos para exportar');
            return;
        }
        
        // Criar conteúdo CSV
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Código,Data/Hora,Válido,Tipo,Origem\n";
        
        barcodes.forEach(code => {
            csvContent += `"${code.value}","${code.timestamp}","${code.isValid ? 'Sim' : 'Não'}","${code.barcodeType || ''}","${code.countryInfo || ''}"\n`;
        });
        
        // Criar link de download
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `codigos_produtos_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        
        // Trigger download
        link.click();
        document.body.removeChild(link);
    }
    
    // Atualizar configurações de processamento de imagem
    function updateImageProcessingSettings() {
        imageProcessingSettings = {
            contrast: parseFloat(contrastSlider.value),
            brightness: parseInt(brightnessSlider.value),
            threshold: 0, // Desativado por padrão
            tryHarder: true
        };
        
        // Atualizar valores exibidos
        contrastValue.textContent = imageProcessingSettings.contrast.toFixed(1);
        brightnessValue.textContent = imageProcessingSettings.brightness;
        
        // Enviar novas configurações para o worker
        if (barcodeWorker) {
            barcodeWorker.postMessage({
                type: 'updateSettings',
                settings: imageProcessingSettings
            });
        }
    }

    // Event Listeners
    startButton.addEventListener('click', startScanner);
    stopButton.addEventListener('click', stopScanner);
    switchCameraButton.addEventListener('click', switchCamera);
    toggleFlashButton.addEventListener('click', toggleFlash);
    toggleModeButton.addEventListener('click', () => {
        toggleScanMode();
        toggleModeButton.textContent = continuousScanMode ? 'Modo Contínuo: ON' : 'Modo Contínuo: OFF';
    });
    exportButton.addEventListener('click', exportToCSV);
    clearAllButton.addEventListener('click', clearAllBarcodes);
    
    // Event listeners para controles de processamento de imagem
    contrastSlider.addEventListener('input', () => {
        contrastValue.textContent = parseFloat(contrastSlider.value).toFixed(1);
    });
    
    brightnessSlider.addEventListener('input', () => {
        brightnessValue.textContent = brightnessSlider.value;
    });
    
    contrastSlider.addEventListener('change', updateImageProcessingSettings);
    brightnessSlider.addEventListener('change', updateImageProcessingSettings);
    
    // Event delegation para botões de remoção
    barcodeList.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const code = e.target.getAttribute('data-code');
            removeBarcodeFromList(code);
        }
    });

    // Inicializar configurações
    updateImageProcessingSettings();
    
    // Verificar permissões da câmera ao carregar
    initCamera();
});