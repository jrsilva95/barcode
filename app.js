document.addEventListener('DOMContentLoaded', function() {
    // Elementos do DOM
    const startButton = document.getElementById('start-button');
    const stopButton = document.getElementById('stop-button');
    const exportButton = document.getElementById('export-button');
    const resultsBody = document.getElementById('results-body');
    const confidenceThreshold = document.getElementById('confidence-threshold');
    const confidenceValue = document.getElementById('confidence-value');
    
    // Array para armazenar os códigos escaneados
    let scannedCodes = [];
    
    // Configurações
    let currentConfidenceThreshold = 70; // Valor padrão
    
    // Atualizar o valor do limiar de confiança
    confidenceThreshold.addEventListener('input', function() {
        currentConfidenceThreshold = parseInt(this.value);
        confidenceValue.textContent = currentConfidenceThreshold;
    });
    
    // Buffer para verificação de códigos consecutivos
    let lastResults = [];
    const REQUIRED_CONSECUTIVE_READS = 3; // Número de leituras consecutivas iguais necessárias
    
    // Configuração do Quagga
    function initQuagga() {
        Quagga.init({
            inputStream: {
                name: "Live",
                type: "LiveStream",
                target: document.querySelector('#interactive'),
                constraints: {
                    width: { min: 640 },
                    height: { min: 480 },
                    aspectRatio: { min: 1, max: 2 },
                    facingMode: "environment" // Usar câmera traseira em dispositivos móveis
                },
                area: { // Definir uma área de digitalização menor para melhorar a precisão
                    top: "40%",
                    right: "20%",
                    left: "20%",
                    bottom: "40%"
                }
            },
            locator: {
                patchSize: "medium",
                halfSample: true
            },
            numOfWorkers: navigator.hardwareConcurrency || 4,
            frequency: 10, // Aumentar a frequência de digitalização
            decoder: {
                readers: [
                    "code_128_reader",
                ],
                multiple: false, // Desativar detecção múltipla
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
            locate: true
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
        
        // Evento para processar resultado da detecção
        Quagga.onProcessed(function(result) {
            const drawingCtx = Quagga.canvas.ctx.overlay;
            const drawingCanvas = Quagga.canvas.dom.overlay;

            if (result) {

                //console.log(result);

                if (result.boxes) {
                    drawingCtx.clearRect(0, 0, parseInt(drawingCanvas.getAttribute("width")), parseInt(drawingCanvas.getAttribute("height")));
                    result.boxes.filter(function(box) {
                        return box !== result.box;
                    }).forEach(function(box) {
                        Quagga.ImageDebug.drawPath(box, { x: 0, y: 1 }, drawingCtx, { color: "green", lineWidth: 2 });
                    });
                }

                if (result.box) {
                    Quagga.ImageDebug.drawPath(result.box, { x: 0, y: 1 }, drawingCtx, { color: "#00F", lineWidth: 2 });
                }

                if (result.codeResult && result.codeResult.code) {
                    Quagga.ImageDebug.drawPath(result.line, { x: 'x', y: 'y' }, drawingCtx, { color: 'red', lineWidth: 3 });
                }
            }
        });
        
        // Evento para detecção de código de barras
        Quagga.onDetected(handleBarcodeDetected);
    }
    
    // Função para lidar com a detecção de código de barras
    function handleBarcodeDetected(result) {
        const code = result.codeResult.code;
        const codeType = result.codeResult.format;
        const confidence = Math.round(result.codeResult.confidence * 100);
        
        console.log(result);

        // Verificar se a confiança está acima do limiar
        if (confidence < currentConfidenceThreshold) {
            console.log(`Código ${code} rejeitado: confiança ${confidence}% abaixo do limiar ${currentConfidenceThreshold}%`);
            return;
        }
        
        // Adicionar ao buffer para verificação de leituras consecutivas
        lastResults.push(code);
        
        // Manter apenas as últimas N leituras
        if (lastResults.length > REQUIRED_CONSECUTIVE_READS) {
            lastResults.shift();
        }
        
        // Verificar se temos leituras consecutivas iguais
        if (lastResults.length === REQUIRED_CONSECUTIVE_READS && areAllSame(lastResults)) {
            // Verificar se o código já foi escaneado
            if (!isDuplicate(code)) {
                const timestamp = new Date().toLocaleString();
                
                // Verificar se o código EAN é válido
                if (isValidEAN(code)) {
                    // Adicionar ao array de códigos
                    scannedCodes.push({
                        code: code,
                        type: codeType,
                        confidence: confidence,
                        timestamp: timestamp
                    });
                    
                    // Adicionar à tabela
                    addToTable(code, codeType, confidence, timestamp);
                    
                    // Habilitar botão de exportação
                    exportButton.disabled = false;
                    
                    // Feedback sonoro
                    beep();
                    
                    // Limpar o buffer após um código válido
                    lastResults = [];
                } else {
                    console.log(`Código ${code} rejeitado: não é um EAN válido`);
                }
            }
        }
    }
    
    // Verificar se todos os elementos do array são iguais
    function areAllSame(array) {
        return array.every(item => item === array[0]);
    }
    
    // Verificar se o código EAN é válido usando o algoritmo de verificação
    function isValidEAN(code) {
        // Verificar se é um número e tem o comprimento correto (EAN-13, EAN-8, UPC-A, UPC-E)
        if (!/^\d+$/.test(code)) return false;
        
        const length = code.length;
        if (![8, 12, 13, 14].includes(length)) return false;
        
        // Implementar verificação de dígito de controle para EAN/UPC
        let sum = 0;
        const digits = code.split('').map(Number);
        const checkDigit = digits.pop(); // Remover o último dígito (dígito de verificação)
        
        // Algoritmo para calcular o dígito de verificação
        for (let i = 0; i < digits.length; i++) {
            sum += digits[i] * (i % 2 === 0 ? 1 : 3);
        }
        
        const calculatedCheckDigit = (10 - (sum % 10)) % 10;
        
        return calculatedCheckDigit === checkDigit;
    }
    
    // Verificar se o código já foi escaneado
    function isDuplicate(code) {
        return scannedCodes.some(item => item.code === code);
    }
    
    // Adicionar código à tabela
    function addToTable(code, type, confidence, timestamp) {

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${code}</td>
            <td>${type}</td>
            <td>${confidence}%</td>
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
        let csvContent = "Código,Tipo,Confiança,Data/Hora\n";
        
        // Adicionar cada código ao CSV
        scannedCodes.forEach(item => {
            csvContent += `"${item.code}","${item.type}","${item.confidence}%","${item.timestamp}"\n`;
        });
        
        // Criar blob e link para download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.setAttribute('href', url);
        link.setAttribute('download', `codigos_ean_${new Date().toISOString().slice(0,10)}.csv`);
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