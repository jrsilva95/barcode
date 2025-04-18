/**
 * Biblioteca de validação de códigos de barras
 */
class BarcodeValidator {
    /**
     * Verifica se um código EAN-13 é válido
     * @param {string} code - O código EAN-13 a ser validado
     * @returns {boolean} - Verdadeiro se o código for válido
     */
    static isValidEAN13(code) {
        // Verificar se o código tem 13 dígitos
        if (!/^\d{13}$/.test(code)) return false;
        
        let sum = 0;
        for (let i = 0; i < 12; i++) {
            sum += parseInt(code[i]) * (i % 2 === 0 ? 1 : 3);
        }
        
        const checkDigit = (10 - (sum % 10)) % 10;
        return parseInt(code[12]) === checkDigit;
    }
    
    /**
     * Verifica se um código EAN-8 é válido
     * @param {string} code - O código EAN-8 a ser validado
     * @returns {boolean} - Verdadeiro se o código for válido
     */
    static isValidEAN8(code) {
        // Verificar se o código tem 8 dígitos
        if (!/^\d{8}$/.test(code)) return false;
        
        let sum = 0;
        for (let i = 0; i < 7; i++) {
            sum += parseInt(code[i]) * (i % 2 === 0 ? 3 : 1);
        }
        
        const checkDigit = (10 - (sum % 10)) % 10;
        return parseInt(code[7]) === checkDigit;
    }
    
    /**
     * Verifica se um código UPC-A é válido
     * @param {string} code - O código UPC-A a ser validado
     * @returns {boolean} - Verdadeiro se o código for válido
     */
    static isValidUPCA(code) {
        // Verificar se o código tem 12 dígitos
        if (!/^\d{12}$/.test(code)) return false;
        
        let sum = 0;
        for (let i = 0; i < 11; i++) {
            sum += parseInt(code[i]) * (i % 2 === 0 ? 3 : 1);
        }
        
        const checkDigit = (10 - (sum % 10)) % 10;
        return parseInt(code[11]) === checkDigit;
    }
    
    /**
     * Verifica se um código UPC-E é válido
     * @param {string} code - O código UPC-E a ser validado
     * @returns {boolean} - Verdadeiro se o código for válido
     */
    static isValidUPCE(code) {
        // Verificar se o código tem 8 dígitos
        if (!/^\d{8}$/.test(code)) return false;
        
        // Converter UPC-E para UPC-A para validação
        const upcA = BarcodeValidator.expandUPCE(code);
        return BarcodeValidator.isValidUPCA(upcA);
    }
    
    /**
     * Expande um código UPC-E para UPC-A
     * @param {string} upce - O código UPC-E a ser expandido
     * @returns {string} - O código UPC-A expandido
     */
    static expandUPCE(upce) {
        const firstDigit = upce.charAt(0);
        const lastDigit = upce.charAt(7);
        const middleDigits = upce.substring(1, 7);
        
        let upcA = firstDigit;
        
        switch (middleDigits.charAt(5)) {
            case '0':
            case '1':
            case '2':
                upcA += middleDigits.substring(0, 2) + middleDigits.charAt(5) + '0000' + middleDigits.substring(2, 5);
                break;
            case '3':
                upcA += middleDigits.substring(0, 3) + '00000' + middleDigits.substring(3, 5);
                break;
            case '4':
                upcA += middleDigits.substring(0, 4) + '00000' + middleDigits.charAt(4);
                break;
            default:
                upcA += middleDigits.substring(0, 5) + '0000' + middleDigits.charAt(5);
                break;
        }
        
        upcA += lastDigit;
        return upcA;
    }
    
    /**
     * Valida um código de barras com base em seu formato
     * @param {string} code - O código a ser validado
     * @returns {boolean} - Verdadeiro se o código for válido
     */
    static validateBarcode(code) {
        if (code.length === 13) {
            return BarcodeValidator.isValidEAN13(code);
        } else if (code.length === 8) {
            // Pode ser EAN-8 ou UPC-E
            return BarcodeValidator.isValidEAN8(code) || BarcodeValidator.isValidUPCE(code);
        } else if (code.length === 12) {
            return BarcodeValidator.isValidUPCA(code);
        }
        return false;
    }
    
    /**
     * Identifica o tipo de código de barras
     * @param {string} code - O código a ser identificado
     * @returns {string} - O tipo do código (EAN-13, EAN-8, UPC-A, UPC-E, ou "Desconhecido")
     */
    static identifyBarcodeType(code) {
        if (code.length === 13 && BarcodeValidator.isValidEAN13(code)) {
            // Verificar se é um ISBN (começa com 978 ou 979)
            if (code.startsWith('978') || code.startsWith('979')) {
                return 'ISBN-13';
            }
            // Verificar se é um ISSN (começa com 977)
            if (code.startsWith('977')) {
                return 'ISSN';
            }
            return 'EAN-13';
        } else if (code.length === 8) {
            if (BarcodeValidator.isValidEAN8(code)) {
                return 'EAN-8';
            }
            if (BarcodeValidator.isValidUPCE(code)) {
                return 'UPC-E';
            }
        } else if (code.length === 12 && BarcodeValidator.isValidUPCA(code)) {
            return 'UPC-A';
        }
        return 'Desconhecido';
    }
    
    /**
     * Obtém informações sobre o país de origem com base no prefixo do código EAN
     * @param {string} code - O código EAN-13
     * @returns {string} - O país/região de origem ou "Desconhecido"
     */
    static getEANCountry(code) {
        if (code.length !== 13) return 'Formato inválido';
        
        const prefix = code.substring(0, 3);
        
        // Mapa de prefixos de países
        const prefixMap = {
            '000': 'EUA/Canadá (UPC)',
            '001': 'EUA/Canadá (UPC)',
            '002': 'EUA/Canadá (UPC)',
            '003': 'EUA/Canadá (UPC)',
            '004': 'EUA/Canadá (UPC)',
            '005': 'EUA/Canadá (UPC)',
            '006': 'EUA/Canadá (UPC)',
            '007': 'EUA/Canadá (UPC)',
            '008': 'EUA/Canadá (UPC)',
            '009': 'EUA/Canadá (UPC)',
            '030': 'França',
            '031': 'França',
            '032': 'França',
            '033': 'França',
            '034': 'França',
            '035': 'França',
            '036': 'França',
            '037': 'França',
            '038': 'França',
            '039': 'França',
            '040': 'Alemanha',
            '041': 'Alemanha',
            '042': 'Alemanha',
            '043': 'Alemanha',
            '044': 'Alemanha',
            '045': 'Japão',
            '046': 'Rússia',
            '047': 'Rússia',
            '048': 'Rússia',
            '049': 'Japão',
            '050': 'Reino Unido',
            '054': 'Bélgica/Luxemburgo',
            '057': 'Dinamarca',
            '059': 'Islândia',
            '060': 'Grécia',
            '064': 'Finlândia',
            '070': 'Noruega',
            '073': 'Suécia',
            '076': 'Suíça',
            '077': 'Suíça',
            '078': 'Suíça',
            '079': 'Itália',
            '080': 'Itália',
            '081': 'Itália',
            '082': 'Itália',
            '083': 'Itália',
            '084': 'Espanha',
            '085': 'Espanha',
            '086': 'Espanha',
            '087': 'Holanda',
            '088': 'Holanda',
            '089': 'Holanda',
            '090': 'Áustria',
            '091': 'Áustria',
            '092': 'Áustria',
            '093': 'Austrália',
            '094': 'Nova Zelândia',
            '095': 'Malásia',
            '096': 'Indonésia',
            '097': 'Indonésia',
            '098': 'Singapura',
            '099': 'Singapura',
            '100': 'Rússia',
            '101': 'Rússia',
            '102': 'Rússia',
            '103': 'Rússia',
            '104': 'Rússia',
            '105': 'Rússia',
            '106': 'Rússia',
            '107': 'Rússia',
            '108': 'Rússia',
            '109': 'Rússia',
            '200': 'Uso interno',
            '201': 'Uso interno',
            '202': 'Uso interno',
            '203': 'Uso interno',
            '204': 'Uso interno',
            '205': 'Uso interno',
            '206': 'Uso interno',
            '207': 'Uso interno',
            '208': 'Uso interno',
            '209': 'Uso interno',
            '300': 'França',
            '301': 'França',
            '302': 'França',
            '303': 'França',
            '304': 'França',
            '305': 'França',
            '306': 'França',
            '307': 'França',
            '308': 'França',
            '309': 'França',
            '380': 'Bulgária',
            '383': 'Eslovênia',
            '385': 'Croácia',
            '387': 'Bósnia-Herzegovina',
            '400': 'Alemanha',
            '401': 'Alemanha',
            '402': 'Alemanha',
            '403': 'Alemanha',
            '404': 'Alemanha',
            '405': 'Alemanha',
            '406': 'Alemanha',
            '407': 'Alemanha',
            '408': 'Alemanha',
            '409': 'Alemanha',
            '410': 'Alemanha',
            '411': 'Alemanha',
            '412': 'Alemanha',
            '413': 'Alemanha',
            '414': 'Alemanha',
            '415': 'Alemanha',
            '416': 'Alemanha',
            '417': 'Alemanha',
            '418': 'Alemanha',
            '419': 'Alemanha',
            '420': 'Alemanha',
            '421': 'Alemanha',
            '422': 'Alemanha',
            '423': 'Alemanha',
            '424': 'Alemanha',
            '425': 'Alemanha',
            '426': 'Alemanha',
            '427': 'Alemanha',
            '428': 'Alemanha',
            '429': 'Alemanha',
            '430': 'Alemanha',
            '431': 'Alemanha',
            '432': 'Alemanha',
            '433': 'Alemanha',
            '434': 'Alemanha',
            '435': 'Alemanha',
            '436': 'Alemanha',
            '437': 'Alemanha',
            '438': 'Alemanha',
            '439': 'Alemanha',
            '440': 'Alemanha',
            '450': 'Japão',
            '451': 'Japão',
            '452': 'Japão',
            '453': 'Japão',
            '454': 'Japão',
            '455': 'Japão',
            '456': 'Japão',
            '457': 'Japão',
            '458': 'Japão',
            '459': 'Japão',
            '460': 'Rússia',
            '461': 'Rússia',
            '462': 'Rússia',
            '463': 'Rússia',
            '464': 'Rússia',
            '465': 'Rússia',
            '466': 'Rússia',
            '467': 'Rússia',
            '468': 'Rússia',
            '469': 'Rússia',
            '470': 'Quirguistão',
            '471': 'Taiwan',
            '474': 'Estônia',
            '475': 'Letônia',
            '476': 'Azerbaijão',
            '477': 'Lituânia',
            '478': 'Uzbequistão',
            '479': 'Sri Lanka',
            '480': 'Filipinas',
            '481': 'Belarus',
            '482': 'Ucrânia',
            '484': 'Moldávia',
            '485': 'Armênia',
            '486': 'Geórgia',
            '487': 'Cazaquistão',
            '489': 'Hong Kong',
            '490': 'Japão',
            '491': 'Japão',
            '492': 'Japão',
            '493': 'Japão',
            '494': 'Japão',
            '495': 'Japão',
            '496': 'Japão',
            '497': 'Japão',
            '498': 'Japão',
            '499': 'Japão',
            '500': 'Reino Unido',
            '501': 'Reino Unido',
            '502': 'Reino Unido',
            '503': 'Reino Unido',
            '504': 'Reino Unido',
            '505': 'Reino Unido',
            '506': 'Reino Unido',
            '507': 'Reino Unido',
            '508': 'Reino Unido',
            '509': 'Reino Unido',
            '520': 'Grécia',
            '528': 'Líbano',
            '529': 'Chipre',
            '530': 'Albânia',
            '531': 'Macedônia',
            '535': 'Malta',
            '539': 'Irlanda',
            '540': 'Bélgica/Luxemburgo',
            '541': 'Bélgica/Luxemburgo',
            '542': 'Bélgica/Luxemburgo',
            '543': 'Bélgica/Luxemburgo',
            '544': 'Bélgica/Luxemburgo',
            '545': 'Bélgica/Luxemburgo',
            '546': 'Bélgica/Luxemburgo',
            '547': 'Bélgica/Luxemburgo',
            '548': 'Bélgica/Luxemburgo',
            '549': 'Bélgica/Luxemburgo',
            '560': 'Portugal',
            '569': 'Islândia',
            '570': 'Dinamarca',
            '571': 'Dinamarca',
            '572': 'Dinamarca',
            '573': 'Dinamarca',
            '574': 'Dinamarca',
            '575': 'Dinamarca',
            '576': 'Dinamarca',
            '577': 'Dinamarca',
            '578': 'Dinamarca',
            '579': 'Dinamarca',
            '590': 'Polônia',
            '594': 'Romênia',
            '599': 'Hungria',
            '600': 'África do Sul',
            '601': 'África do Sul',
            '603': 'Gana',
            '604': 'Senegal',
            '608': 'Bahrein',
            '609': 'Mauritius',
            '611': 'Marrocos',
            '613': 'Argélia',
            '616': 'Quênia',
            '619': 'Tunísia',
            '621': 'Síria',
            '622': 'Egito',
            '624': 'Líbia',
            '625': 'Jordânia',
            '626': 'Irã',
            '627': 'Kuwait',
            '628': 'Arábia Saudita',
            '629': 'Emirados Árabes Unidos',
            '640': 'Finlândia',
            '641': 'Finlândia',
            '642': 'Finlândia',
            '643': 'Finlândia',
            '644': 'Finlândia',
            '645': 'Finlândia',
            '646': 'Finlândia',
            '647': 'Finlândia',
            '648': 'Finlândia',
            '649': 'Finlândia',
            '690': 'China',
            '691': 'China',
            '692': 'China',
            '693': 'China',
            '694': 'China',
            '695': 'China',
            '696': 'China',
            '697': 'China',
            '698': 'China',
            '699': 'China',
            '700': 'Noruega',
            '701': 'Noruega',
            '702': 'Noruega',
            '703': 'Noruega',
            '704': 'Noruega',
            '705': 'Noruega',
            '706': 'Noruega',
            '707': 'Noruega',
            '708': 'Noruega',
            '709': 'Noruega',
            '729': 'Israel',
            '730': 'Suécia',
            '731': 'Suécia',
            '732': 'Suécia',
            '733': 'Suécia',
            '734': 'Suécia',
            '735': 'Suécia',
            '736': 'Suécia',
            '737': 'Suécia',
            '738': 'Suécia',
            '739': 'Suécia',
            '740': 'Guatemala',
            '741': 'El Salvador',
            '742': 'Honduras',
            '743': 'Nicarágua',
            '744': 'Costa Rica',
            '745': 'Panamá',
            '746': 'República Dominicana',
            '750': 'México',
            '754': 'Canadá',
            '755': 'Canadá',
            '759': 'Venezuela',
            '760': 'Suíça',
            '761': 'Suíça',
            '762': 'Suíça',
            '763': 'Suíça',
            '764': 'Suíça',
            '765': 'Suíça',
            '766': 'Suíça',
            '767': 'Suíça',
            '768': 'Suíça',
            '769': 'Suíça',
            '770': 'Colômbia',
            '773': 'Uruguai',
            '775': 'Peru',
            '777': 'Bolívia',
            '778': 'Argentina',
            '779': 'Argentina',
            '780': 'Chile',
            '784': 'Paraguai',
            '786': 'Equador',
            '789': 'Brasil',
            '790': 'Brasil',
            '800': 'Itália',
            '801': 'Itália',
            '802': 'Itália',
            '803': 'Itália',
            '804': 'Itália',
            '805': 'Itália',
            '806': 'Itália',
            '807': 'Itália',
            '808': 'Itália',
            '809': 'Itália',
            '810': 'Itália',
            '811': 'Itália',
            '812': 'Itália',
            '813': 'Itália',
            '814': 'Itália',
            '815': 'Itália',
            '816': 'Itália',
            '817': 'Itália',
            '818': 'Itália',
            '819': 'Itália',
            '820': 'Itália',
            '821': 'Itália',
            '822': 'Itália',
            '823': 'Itália',
            '824': 'Itália',
            '825': 'Itália',
            '826': 'Itália',
            '827': 'Itália',
            '828': 'Itália',
            '829': 'Itália',
            '830': 'Itália',
            '831': 'Itália',
            '832': 'Itália',
            '833': 'Itália',
            '834': 'Itália',
            '835': 'Itália',
            '836': 'Itália',
            '837': 'Itália',
            '838': 'Itália',
            '839': 'Itália',
            '840': 'Espanha',
            '841': 'Espanha',
            '842': 'Espanha',
            '843': 'Espanha',
            '844': 'Espanha',
            '845': 'Espanha',
            '846': 'Espanha',
            '847': 'Espanha',
            '848': 'Espanha',
            '849': 'Espanha',
            '850': 'Cuba',
            '858': 'Eslováquia',
            '859': 'República Tcheca',
            '860': 'Sérvia',
            '865': 'Mongólia',
            '867': 'Coreia do Norte',
            '868': 'Turquia',
            '869': 'Turquia',
            '870': 'Holanda',
            '871': 'Holanda',
            '872': 'Holanda',
            '873': 'Holanda',
            '874': 'Holanda',
            '875': 'Holanda',
            '876': 'Holanda',
            '877': 'Holanda',
            '878': 'Holanda',
            '879': 'Holanda',
            '880': 'Coreia do Sul',
            '884': 'Camboja',
            '885': 'Tailândia',
            '888': 'Singapura',
            '890': 'Índia',
            '893': 'Vietnã',
            '896': 'Paquistão',
            '899': 'Indonésia',
            '900': 'Áustria',
            '901': 'Áustria',
            '902': 'Áustria',
            '903': 'Áustria',
            '904': 'Áustria',
            '905': 'Áustria',
            '906': 'Áustria',
            '907': 'Áustria',
            '908': 'Áustria',
            '909': 'Áustria',
            '910': 'Áustria',
            '911': 'Áustria',
            '912': 'Áustria',
            '913': 'Áustria',
            '914': 'Áustria',
            '915': 'Áustria',
            '916': 'Áustria',
            '917': 'Áustria',
            '918': 'Áustria',
            '919': 'Áustria',
            '930': 'Austrália',
            '931': 'Austrália',
            '932': 'Austrália',
            '933': 'Austrália',
            '934': 'Austrália',
            '935': 'Austrália',
            '936': 'Austrália',
            '937': 'Austrália',
            '938': 'Austrália',
            '939': 'Austrália',
            '940': 'Nova Zelândia',
            '941': 'Nova Zelândia',
            '942': 'Nova Zelândia',
            '943': 'Nova Zelândia',
            '944': 'Nova Zelândia',
            '945': 'Nova Zelândia',
            '946': 'Nova Zelândia',
            '947': 'Nova Zelândia',
            '948': 'Nova Zelândia',
            '949': 'Nova Zelândia',
            '950': 'GS1 Global Office',
            '955': 'Malásia',
            '958': 'Macau',
            '977': 'Publicações periódicas (ISSN)',
            '978': 'Livros (ISBN)',
            '979': 'Livros (ISBN)',
            '980': 'Recibos de reembolso',
            '981': 'Cupons de desconto',
            '982': 'Cupons de desconto',
            '990': 'Cupons',
            '991': 'Cupons',
            '992': 'Cupons',
            '993': 'Cupons',
            '994': 'Cupons',
            '995': 'Cupons',
            '996': 'Cupons',
            '997': 'Cupons',
            '998': 'Cupons',
            '999': 'Cupons'
        };
        
        // Verificar prefixos de 3 dígitos
        if (prefixMap[prefix]) {
            return prefixMap[prefix];
        }
        
        // Verificar prefixos de 2 dígitos
        const prefix2 = code.substring(0, 2);
        const prefix2Map = {
            '00': 'EUA/Canadá (UPC)',
            '01': 'EUA/Canadá (UPC)',
            '02': 'Uso restrito',
            '03': 'França',
            '04': 'Alemanha',
            '05': 'Reino Unido',
            '06': 'China',
            '07': 'Noruega',
            '08': 'Itália',
            '09': 'Áustria',
            '10': 'Rússia',
            '20': 'Uso interno',
            '30': 'França',
            '31': 'França',
            '32': 'França',
            '33': 'França',
            '34': 'França',
            '35': 'França',
            '36': 'França',
            '37': 'França',
            '38': 'França',
            '39': 'França',
            '40': 'Alemanha',
            '41': 'Alemanha',
            '42': 'Alemanha',
            '43': 'Alemanha',
            '44': 'Alemanha',
            '45': 'Japão',
            '46': 'Rússia',
            '47': 'Rússia',
            '48': 'Rússia',
            '49': 'Japão',
            '50': 'Reino Unido',
            '52': 'Grécia',
            '53': 'Diversos',
            '54': 'Bélgica/Luxemburgo',
            '56': 'Portugal',
            '57': 'Dinamarca',
            '59': 'Polônia',
            '60': 'África do Sul',
            '64': 'Finlândia',
            '69': 'China',
            '70': 'Noruega',
            '72': 'Israel',
            '73': 'Suécia',
            '74': 'América Central',
            '75': 'México/Canadá',
            '76': 'Suíça',
            '77': 'América do Sul',
            '78': 'América do Sul',
            '79': 'Brasil',
            '80': 'Itália',
            '84': 'Espanha',
            '85': 'Diversos',
            '86': 'Diversos',
            '87': 'Holanda',
            '88': 'Ásia',
            '89': 'Ásia',
            '90': 'Áustria',
            '93': 'Austrália',
            '94': 'Nova Zelândia',
            '95': 'Diversos',
            '97': 'Publicações (ISSN)',
            '98': 'Livros (ISBN)'
        };
        
        if (prefix2Map[prefix2]) {
            return prefix2Map[prefix2];
        }
        
        return 'Desconhecido';
    }
}