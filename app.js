document.addEventListener('DOMContentLoaded', () => {
    // Elementos da DOM
    const video = document.getElementById('video');
    const startButton = document.getElementById('start-scanner');
    const stopButton = document.getElementById('stop-scanner');
    const switchCameraButton = document.getElementById('switch-camera');
    const barcodeList = document.getElementById('barcode-list');
    const exportButton = document.getElementById('export-csv');
    const clearAllButton = document.getElementById('clear-all');
    const totalCodesElement = document.getElementById('total-codes');

    // Array para armazenar os códigos lidos
    let barcodes = [];
    let codeReader = null;
    let videoInputDevices = [];
    let currentDeviceIndex = 0;
    let isScanning = false;

    // Inicializar o leitor de código de barras
    async function initBarcodeReader() {
        try {
            codeReader = new ZXing.BrowserMultiFormatReader();
            videoInputDevices = await codeReader.listVideoInputDevices();
            
            if (videoInputDevices.length === 0) {
                alert('Nenhuma câmera encontrada no dispositivo');
                return false;
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
        // Verificar se a API de vibração está disponível
        if ('vibrate' in navigator) {
            // Vibrar por 300ms
            navigator.vibrate(300);
        } else {
            console.log('Vibração não suportada neste dispositivo');
        }
    }

    // Iniciar o scanner
    async function startScanner() {
        if (!codeReader) {
            const initialized = await initBarcodeReader();
            if (!initialized) return;
        }

        try {
            const selectedDeviceId = videoInputDevices[currentDeviceIndex].deviceId;
            
            codeReader.decodeFromVideoDevice(
                selectedDeviceId, 
                video, 
                (result, err) => {
                    if (result) {
                        const barcodeValue = result.getText();
                        // Verificar se o código já foi lido
                        if (!barcodes.some(code => code.value === barcodeValue)) {
                            const timestamp = new Date().toLocaleString();
                            addBarcodeToList(barcodeValue, timestamp);
                            
                            // Adicionar som de beep
                            const beep = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU");
                            beep.play();
                            
                            // Fazer o dispositivo vibrar
                            vibrateDevice();
                        }
                    }
                    if (err && !(err instanceof ZXing.NotFoundException)) {
                        console.error('Erro na decodificação:', err);
                    }
                }
            );
            
            isScanning = true;
            startButton.disabled = true;
            stopButton.disabled = false;
            switchCameraButton.disabled = videoInputDevices.length <= 1;
            
        } catch (err) {
            console.error('Erro ao iniciar o scanner:', err);
            alert('Erro ao iniciar o scanner: ' + err.message);
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
        }
    }

    // Alternar entre câmeras
    async function switchCamera() {
        if (!isScanning || videoInputDevices.length <= 1) return;
        
        // Parar o scanner atual
        codeReader.reset();
        
        // Alternar para a próxima câmera
        currentDeviceIndex = (currentDeviceIndex + 1) % videoInputDevices.length;
        
        // Iniciar o scanner com a nova câmera
        try {
            const selectedDeviceId = videoInputDevices[currentDeviceIndex].deviceId;
            
            codeReader.decodeFromVideoDevice(
                selectedDeviceId, 
                video, 
                (result, err) => {
                    if (result) {
                        const barcodeValue = result.getText();
                        // Verificar se o código já foi lido
                        if (!barcodes.some(code => code.value === barcodeValue)) {
                            const timestamp = new Date().toLocaleString();
                            addBarcodeToList(barcodeValue, timestamp);
                            
                            // Adicionar som de beep
                            const beep = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU");
                            beep.play();
                            
                            // Fazer o dispositivo vibrar
                            vibrateDevice();
                        }
                    }
                    if (err && !(err instanceof ZXing.NotFoundException)) {
                        console.error('Erro na decodificação:', err);
                    }
                }
            );
            
            // Mostrar qual câmera está sendo usada
            const cameraLabel = videoInputDevices[currentDeviceIndex].label || 
                               `Câmera ${currentDeviceIndex + 1}`;
            console.log(`Alternado para: ${cameraLabel}`);
            
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
        listItem.className = 'code-item';
        listItem.innerHTML = `
            <span>${value}</span>
            <span>${timestamp}</span>
            <button class="delete-btn" data-code="${value}">Remover</button>
        `;
        
        barcodeList.appendChild(listItem);
        
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
        link.setAttribute("download", `codigos_barras_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        
        // Trigger download
        link.click();
        document.body.removeChild(link);
    }

    // Event Listeners
    startButton.addEventListener('click', startScanner);
    stopButton.addEventListener('click', stopScanner);
    switchCameraButton.addEventListener('click', switchCamera);
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