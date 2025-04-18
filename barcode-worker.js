// Importar a biblioteca ZXing
importScripts('https://unpkg.com/@zxing/library@0.19.1/umd/index.min.js');

// Configurações do scanner
let scannerHints = new Map();
let reader = null;
let imageProcessingSettings = {
    contrast: 1.5,
    brightness: 0,
    threshold: 128,
    tryHarder: true
};

// Inicializar o worker
self.onmessage = function(e) {
    if (e.data.type === 'init') {
        // Inicializar o leitor com as configurações
        setupScannerHints();
        reader = new ZXing.MultiFormatReader(scannerHints);
        self.postMessage({ type: 'initialized' });
    } 
    else if (e.data.type === 'decode') {
        try {
            // Receber os dados da imagem
            const imageData = e.data.imageData;
            const width = e.data.width;
            const height = e.data.height;
            
            // Processar a imagem antes da decodificação
            const processedImageData = processImage(imageData);
            
            // Criar um objeto BinaryBitmap para decodificação
            const luminanceSource = new ZXing.HTMLCanvasElementLuminanceSource(processedImageData);
            const binaryBitmap = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(luminanceSource));
            
            // Tentar decodificar
            const result = reader.decode(binaryBitmap);
            
            // Enviar o resultado de volta
            self.postMessage({
                type: 'result',
                success: true,
                text: result.getText(),
                format: result.getBarcodeFormat(),
                resultPoints: result.getResultPoints()
            });
        } catch (error) {
            self.postMessage({
                type: 'result',
                success: false,
                error: error.message
            });
        }
    }
    else if (e.data.type === 'updateSettings') {
        // Atualizar configurações de processamento de imagem
        imageProcessingSettings = e.data.settings;
        
        // Atualizar configurações do scanner
        if (imageProcessingSettings.tryHarder) {
            scannerHints.set(ZXing.DecodeHintType.TRY_HARDER, true);
        } else {
            scannerHints.delete(ZXing.DecodeHintType.TRY_HARDER);
        }
        
        // Recriar o leitor com as novas configurações
        reader = new ZXing.MultiFormatReader(scannerHints);
        
        self.postMessage({ 
            type: 'settingsUpdated',
            settings: imageProcessingSettings
        });
    }
};

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
    
    // Permitir rotação do código de barras
    scannerHints.set(ZXing.DecodeHintType.TRY_ROTATE, true);
    
    // Configurar para verificar o dígito de verificação
    scannerHints.set(ZXing.DecodeHintType.ENABLE_CHECK_DIGIT, true);
    
    // Otimizar para códigos de barras 1D (maioria dos produtos)
    scannerHints.set(ZXing.DecodeHintType.ASSUME_CODE_39_CHECK_DIGIT, true);
    
    // Configurar para usar o formato GS1 (comum em produtos)
    scannerHints.set(ZXing.DecodeHintType.ASSUME_GS1, true);
}

// Processar a imagem para melhorar a detecção
function processImage(imageData) {
    // Criar um canvas para processamento
    const canvas = new OffscreenCanvas(imageData.width, imageData.height);
    const ctx = canvas.getContext('2d');
    
    // Desenhar a imagem original no canvas
    ctx.putImageData(imageData, 0, 0);
    
    // Obter os dados da imagem
    const processedData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = processedData.data;
    
    // Aplicar ajustes de contraste e brilho
    for (let i = 0; i < data.length; i += 4) {
        // Calcular o valor de luminosidade (escala de cinza)
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        
        // Aplicar contraste e brilho
        let newValue = (avg - 128) * imageProcessingSettings.contrast + 128 + imageProcessingSettings.brightness;
        
        // Aplicar limiarização (threshold) se necessário
        if (imageProcessingSettings.threshold > 0) {
            newValue = newValue < imageProcessingSettings.threshold ? 0 : 255;
        }
        
        // Limitar valores entre 0 e 255
        newValue = Math.max(0, Math.min(255, newValue));
        
        // Aplicar o novo valor aos canais RGB
        data[i] = newValue;     // R
        data[i + 1] = newValue; // G
        data[i + 2] = newValue; // B
        // Não alterar o canal Alpha (i + 3)
    }
    
    // Colocar os dados processados de volta no canvas
    ctx.putImageData(processedData, 0, 0);
    
    return canvas;
}