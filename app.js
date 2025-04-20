document.addEventListener('DOMContentLoaded', function() {
    // Elementos do DOM
    const startButton = document.getElementById('start-button');
    const stopButton = document.getElementById('stop-button');
    const exportButton = document.getElementById('export-button');
    const resultsBody = document.getElementById('results-body');
    
    // Array para armazenar os códigos escaneados
    let scannedCodes = [];
    
    // Configuração do Quagga
    function initQuagga() {
        Quagga.init({
            inputStream: {
                name: "Live",
                type: "LiveStream",
                target: document.querySelector('#interactive'),
                constraints: {
                    width: 640,
                    height: 480,
                    facingMode: "environment" // Usar câmera traseira em dispositivos móveis
                },
            },
            locator: {
                patchSize: "medium",
                halfSample: true
            },
            numOfWorkers: navigator.hardwareConcurrency || 4,
            decoder: {
                readers: [
                    "code_128_reader",
                    "ean_reader",
                    "ean_8_reader",
                    "code_39_reader",
                    "code_39_vin_reader",
                    "codabar_reader",
                    "upc_reader",
                    "upc_e_reader",
                    "i2of5_reader"
                ],
                debug: {
                    showCanvas: true,
                    showPatches: true,
                    showFoundPatches: true,
                    showSkeleton: true,
                    showLabels: true,
                    showPatchLabels: true,
                    showRemainingPatchLabels: true,
                    boxFromPatches: {
                        showTransformed: true,
                        showTransformedBox: true,
                        showBB: true
                    }
                }
            },
        }, function(err) {
            if (err) {
                console.error(err);
                alert("Erro ao inicializar o scanner: " + err);
                return;
            }
            
            console.log("QuaggaJS inicializado com sucesso");
            
            // Iniciar o scanner
            Quagga.start();
            
            // Atualizar estado dos botões
            startButton.disabled = true;
            stopButton.disabled = false;
            
            // Verificar se há códigos para habilitar o botão de exportação
            if (scannedCodes.length > 0) {
                exportButton.disabled = false;
            }
        });
        
        // Evento para detecção de código de barras
        Quagga.onDetected(handleBarcodeDetected);
    }
    
    // Função para lidar com a detecção de código de barras
    function handleBarcodeDetected(result) {
        const code = result.codeResult.code;
        const codeType = result.codeResult.format;
        
        // Verificar se o código já foi escaneado
        if (!isDuplicate(code)) {
            const timestamp = new Date().toLocaleString();
            
            // Adicionar ao array de códigos
            scannedCodes.push({
                code: code,
                type: codeType,
                timestamp: timestamp
            });
            
            // Adicionar à tabela
            addToTable(code, codeType, timestamp);
            
            // Habilitar botão de exportação
            exportButton.disabled = false;
            
            // Feedback sonoro (opcional)
            beep();
        }
    }
    
    // Verificar se o código já foi escaneado
    function isDuplicate(code) {
        return scannedCodes.some(item => item.code === code);
    }
    
    // Adicionar código à tabela
    function addToTable(code, type, timestamp) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${code}</td>
            <td>${type}</td>
            <td>${timestamp}</td>
            <td><button class="delete-btn" data-code="${code}">Remover</button></td>
        `;
        
        // Adicionar evento ao botão de remover
        tr.querySelector('.delete-btn').addEventListener('click', function() {
            const codeToRemove = this.getAttribute('data-code');
            removeCode(codeToRemove, tr);
        });
        
        resultsBody.appendChild(tr);
    }
    
    // Remover código da tabela e do array
    function removeCode(code, tableRow) {
        // Remover do array
        scannedCodes = scannedCodes.filter(item => item.code !== code);
        
        // Remover da tabela
        tableRow.remove();
        
        // Desabilitar botão de exportação se não houver códigos
        if (scannedCodes.length === 0) {
            exportButton.disabled = true;
        }
    }
    
    // Função para som de beep
    function beep() {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 1800;
        gainNode.gain.value = 0.5;
        
        oscillator.start();
        setTimeout(() => oscillator.stop(), 100);
    }
    
    // Exportar para CSV
    function exportToCSV() {
        if (scannedCodes.length === 0) {
            alert("Não há códigos para exportar.");
            return;
        }
        
        // Cabeçalho do CSV
        let csvContent = "Código,Tipo,Data/Hora\n";
        
        // Adicionar cada código ao CSV
        scannedCodes.forEach(item => {
            csvContent += `"${item.code}","${item.type}","${item.timestamp}"\n`;
        });
        
        // Criar blob e link para download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.setAttribute('href', url);
        link.setAttribute('download', `codigos_barras_${new Date().toISOString().slice(0,10)}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    // Eventos dos botões
    startButton.addEventListener('click', initQuagga);
    
    stopButton.addEventListener('click', function() {
        Quagga.stop();
        startButton.disabled = false;
        stopButton.disabled = true;
    });
    
    exportButton.addEventListener('click', exportToCSV);
});