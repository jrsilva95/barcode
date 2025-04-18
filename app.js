document.addEventListener('DOMContentLoaded', () => {
    // Elementos da DOM
    const video = document.getElementById('video');
    const startButton = document.getElementById('start-scanner');
    const stopButton = document.getElementById('stop-scanner');
    const barcodeList = document.getElementById('barcode-list');
    const exportButton = document.getElementById('export-csv');
    const clearAllButton = document.getElementById('clear-all');
    const totalCodesElement = document.getElementById('total-codes');

    // Array para armazenar os códigos lidos
    let barcodes = [];
    let codeReader = null;
    let selectedDeviceId = null;

    // Inicializar o leitor de código de barras
    async function initBarcodeReader() {
        try {
            codeReader = new ZXing.BrowserMultiFormatReader();
            const videoInputDevices = await codeReader.listVideoInputDevices();
            
            if (videoInputDevices.length === 0) {
                alert('Nenhuma câmera encontrada no dispositivo');
                return false;
            }
            
            // Use a primeira câmera disponível
            selectedDeviceId = videoInputDevices[0].deviceId;
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
            
            startButton.disabled = true;
            stopButton.disabled = false;
            
        } catch (err) {
            console.error('Erro ao iniciar o scanner:', err);
            alert('Erro ao iniciar o scanner: ' + err.message);
        }
    }

    // Parar o scanner
    function stopScanner() {
        if (codeReader) {
            codeReader.reset();
            startButton.disabled = false;
            stopButton.disabled = true;
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