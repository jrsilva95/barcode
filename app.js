document.addEventListener('DOMContentLoaded', () => {
    // Elementos da DOM
    const video = document.getElementById('video');
    const startButton = document.getElementById('start-scanner');
    const stopButton = document.getElementById('stop-scanner');
    const switchCameraButton = document.getElementById('switch-camera');
    const toggleFlashButton = document.getElementById('toggle-flash');
    const barcodeList = document.getElementById('barcode-list');
    const exportButton = document.getElementById('export-csv');
    const clearAllButton = document.getElementById('clear-all');
    const totalCodesElement = document.getElementById('total-codes');
    const scanRegionHighlight = document.getElementById('scan-region-highlight');
    const scanStatus = document.getElementById('scan-status');

    // Array para armazenar os códigos lidos
    let barcodes = [];
    let codeReader = null;
    let videoInputDevices = [];
    let currentDeviceIndex = 0;
    let isScanning = false;
    let flashOn = false;
    let lastDetectionTime = 0;
    let videoTrack = null;
    let scannerHints = new Map();

    // Configurar dicas para otimizar a leitura de códigos de barras de produtos
    function setupScannerHints() {
        // Formatos de códigos de barras comuns para produtos
        scannerHints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
            ZXing.BarcodeFormat.EAN_13,
            ZXing.BarcodeFormat.EAN_8,
            ZXing.BarcodeFormat.UPC_A,
            ZXing.BarcodeFormat.UPC_E,
            ZXing.BarcodeFormat.CODE_39,
            ZXing.BarcodeFormat.CODE_128
        ]);
        
        // Tentar mais agressivamente encontrar códigos
        scannerHints.set(ZXing.DecodeHintType.TRY_HARDER, true);
        
        // Otimizar para velocidade em vez de precisão
        scannerHints.set(ZXing.DecodeHintType.PURE_BARCODE, true);
        
        // Otimizar para códigos de barras 1D (maioria dos produtos)
        scannerHints.set(ZXing.DecodeHintType.ASSUME_CODE_39_CHECK_DIGIT, true);
    }

    // Inicializar o leitor de código de barras
    async function initBarcodeReader() {
        try {
            setupScannerHints();
            codeReader = new ZXing.BrowserMultiFormatReader(scannerHints);
            
            // Configurar para processar mais rápido
            codeReader.timeBetweenDecodingAttempts = 100; // Reduzir tempo entre tentativas
            
            videoInputDevices = await codeReader.listVideoInputDevices();
            
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
            console.error('Erro ao inicializar o leitor:', err);
            alert('Erro ao inicializar o leitor de códigos de barras: ' + err.message);
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

    // Iniciar o scanner
    async function startScanner() {
        if (!codeReader) {
            const initialized = await initBarcodeReader();
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
                    focusMode: "continuous"
                }
            };
            
            // Iniciar o scanner com configurações otimizadas
            codeReader.decodeFromConstraints(
                constraints,
                video, 
                (result, err) => {
                    if (result) {
                        const barcodeValue = result.getText();
                        const currentTime = new Date().getTime();
                        
                        // Verificar se o código já foi lido e se passou tempo suficiente desde a última leitura
                        if (!barcodes.some(code => code.value === barcodeValue) && 
                            (currentTime - lastDetectionTime > 1000)) {
                            
                            lastDetectionTime = currentTime;
                            const timestamp = new Date().toLocaleString();
                            
                            updateScanStatus('Código detectado!');
                            
                            // Destacar a região onde o código foi encontrado
                            const points = result.getResultPoints();
                            if (points && points.length > 0) {
                                // Feedback visual de sucesso
                                scanRegionHighlight.style.borderColor = '#00ff00';
                                setTimeout(() => {
                                    scanRegionHighlight.style.borderColor = '#ff0000';
                                }, 500);
                            }
                            
                            addBarcodeToList(barcodeValue, timestamp);
                            
                            // Adicionar som de beep
                            const beep = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU");
                            beep.play();
                            
                            // Fazer o dispositivo vibrar
                            vibrateDevice();
                            
                            // Voltar ao estado de busca após um breve intervalo
                            setTimeout(() => {
                                updateScanStatus('Procurando código...');
                            }, 1000);
                        }
                    } else {
                        // Atualizar status apenas ocasionalmente para não sobrecarregar a UI
                        if (Math.random() < 0.1) {
                            updateScanStatus('Procurando código...');
                        }
                    }
                    
                    if (err && !(err instanceof ZXing.NotFoundException)) {
                        console.error('Erro na decodificação:', err);
                    }
                }
            );
            
            // Obter a track de vídeo para controle do flash
            const stream = video.srcObject;
            if (stream) {
                videoTrack = stream.getVideoTracks()[0];
                
                // Verificar se o flash é suportado
                if (videoTrack.getCapabilities && videoTrack.getCapabilities().torch) {
                    toggleFlashButton.disabled = false;
                }
            }
            
            isScanning = true;
            startButton.disabled = true;
            stopButton.disabled = false;
            switchCameraButton.disabled = videoInputDevices.length <= 1;
            
            updateScanStatus('Procurando código...');
            
        } catch (err) {
            console.error('Erro ao iniciar o scanner:', err);
            alert('Erro ao iniciar o scanner: ' + err.message);
            updateScanStatus('Erro ao iniciar câmera');
            scanRegionHighlight.classList.remove('active');
        }
    }

    // Parar o scanner
    function stopScanner() {
        if (codeReader) {
            codeReader.reset();
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
        codeReader.reset();
        
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
        
        // Iniciar o scanner com a nova câmera
        try {
            const selectedDeviceId = videoInputDevices[currentDeviceIndex].deviceId;
            
            // Configurações avançadas para a câmera
            const constraints = {
                video: {
                    deviceId: selectedDeviceId,
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: "environment",
                    focusMode: "continuous"
                }
            };
            
            codeReader.decodeFromConstraints(
                constraints,
                video, 
                (result, err) => {
                    if (result) {
                        const barcodeValue = result.getText();
                        const currentTime = new Date().getTime();
                        
                        // Verificar se o código já foi lido e se passou tempo suficiente desde a última leitura
                        if (!barcodes.some(code => code.value === barcodeValue) && 
                            (currentTime - lastDetectionTime > 1000)) {
                            
                            lastDetectionTime = currentTime;
                            const timestamp = new Date().toLocaleString();
                            
                            updateScanStatus('Código detectado!');
                            
                            // Destacar a região onde o código foi encontrado
                            const points = result.getResultPoints();
                            if (points && points.length > 0) {
                                // Feedback visual de sucesso
                                scanRegionHighlight.style.borderColor = '#00ff00';
                                setTimeout(() => {
                                    scanRegionHighlight.style.borderColor = '#ff0000';
                                }, 500);
                            }
                            
                            addBarcodeToList(barcodeValue, timestamp);
                            
                            // Adicionar som de beep
                            const beep = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU");
                            beep.play();
                            
                            // Fazer o dispositivo vibrar
                            vibrateDevice();
                            
                            // Voltar ao estado de busca após um breve intervalo
                            setTimeout(() => {
                                updateScanStatus('Procurando código...');
                            }, 1000);
                        }
                    } else {
                        // Atualizar status apenas ocasionalmente para não sobrecarregar a UI
                        if (Math.random() < 0.1) {
                            updateScanStatus('Procurando código...');
                        }
                    }
                    
                    if (err && !(err instanceof ZXing.NotFoundException)) {
                        console.error('Erro na decodificação:', err);
                    }
                }
            );
            
            // Obter a track de vídeo para controle do flash
            const stream = video.srcObject;
            if (stream) {
                videoTrack = stream.getVideoTracks()[0];
                
                // Verificar se o flash é suportado
                if (videoTrack.getCapabilities && videoTrack.getCapabilities().torch) {
                    toggleFlashButton.disabled = false;
                } else {
                    toggleFlashButton.disabled = true;
                }
            }
            
            // Mostrar qual câmera está sendo usada
            const cameraLabel = videoInputDevices[currentDeviceIndex].label || 
                               `Câmera ${currentDeviceIndex + 1}`;
            console.log(`Alternado para: ${cameraLabel}`);
            updateScanStatus('Procurando código...');
            
        } catch (err) {
            console.error('Erro ao alternar câmera:', err);
            alert('Erro ao alternar câmera: ' + err.message);
            
            // Tentar voltar para a câmera anterior
            currentDeviceIndex = (currentDeviceIndex - 1 + videoInputDevices.length) % videoInputDevices.length;
            startScanner();
        }
    }

    // Adicionar código de barras à lista
    function addBarcodeToList(value, timestamp) {
        // Adicionar ao array
        const barcodeData = { value, timestamp };
        barcodes.push(barcodeData);
        
        // Adicionar à lista visual
        const listItem = document.createElement('div');
        listItem.className = 'code-item new';
        listItem.innerHTML = `
            <span>${value}</span>
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
        csvContent += "Código,Data/Hora\n";
        
        barcodes.forEach(code => {
            csvContent += `"${code.value}","${code.timestamp}"\n`;
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

    // Event Listeners
    startButton.addEventListener('click', startScanner);
    stopButton.addEventListener('click', stopScanner);
    switchCameraButton.addEventListener('click', switchCamera);
    toggleFlashButton.addEventListener('click', toggleFlash);
    exportButton.addEventListener('click', exportToCSV);
    clearAllButton.addEventListener('click', clearAllBarcodes);
    
    // Event delegation para botões de remoção
    barcodeList.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const code = e.target.getAttribute('data-code');
            removeBarcodeFromList(code);
        }
    });

    // Verificar permissões da câmera ao carregar
    initBarcodeReader();
});