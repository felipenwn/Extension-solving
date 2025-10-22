// Configuração centralizada
const CONFIG = {
    API_BASE_URL: 'https://localhost:5500',
    CLIENT_BASE_URL: window.location.origin,
    SUAP_AUTH_HOST: 'https://suap.ifsul.edu.br',
    SUAP_CLIENT_ID: 'aq0Ftd6lhzIulKumRH14a2MrmLBC2hAEFB9GaGPM',
    SUAP_SCOPE: 'identificacao email'
};

// Manter compatibilidade com código existente
const API_BASE_URL = CONFIG.API_BASE_URL;

// Função para obter a URL de redirect correta
function getRedirectUri() {
    const currentPath = window.location.pathname;
    const basePath = currentPath.substring(0, currentPath.indexOf('/client/'));
    return `${CONFIG.CLIENT_BASE_URL}${basePath}/client/src/extensao/index.html`;
}

// Exportar configurações
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}