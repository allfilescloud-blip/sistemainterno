// scripts/ideris-auth.js
console.log('✅ ideris-auth.js carregado');

class IderisAuth {
    constructor() {
        this.PRIVATE_KEY = "IDERIS_PRIVATE_KEY";
        this.AUTH_URL = "https://apiv3.ideris.com.br/login";
        this.RENEW_MS = 7 * 60 * 60 * 1000; // 7 horas (um pouco menos de 8 para garantir)
        this.jwtToken = null;
        this.renewTimer = null;
        this.authCallbacks = [];
        
        this.init();
    }

    init() {
        console.log('Inicializando autenticação Ideris...');
        this.carregarTokenSalvo();
    }

    async autenticar() {
        console.log('Iniciando autenticação Ideris...');
        
        try {
            const resp = await fetch(this.AUTH_URL, {
                method: "POST",
                headers: {
                    "accept": "*/*",
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.PRIVATE_KEY}`
                },
                body: `"${this.PRIVATE_KEY}"`
            });

            const raw = await resp.text();
            console.log('Resposta da autenticação:', resp.status, raw.substring(0, 100));

            if (!resp.ok) {
                throw new Error(`Falha na autenticação: ${resp.status} - ${raw}`);
            }

            let token = null;
            
            // Tentar extrair o token de diferentes formatos de resposta
            try {
                const parsed = JSON.parse(raw);
                token = typeof parsed === "string" ? parsed : (parsed.token || parsed.jwt);
            } catch {
                // Se não for JSON, tentar como string simples
                const cleaned = raw.trim().replace(/^"|"$/g, "");
                if (/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(cleaned)) {
                    token = cleaned;
                }
            }

            if (!token) {
                throw new Error("Token JWT não encontrado na resposta: " + raw.substring(0, 100));
            }

            this.jwtToken = token;
            this.salvarToken();
            this.scheduleRenew();
            
            console.log('✅ Autenticação Ideris realizada com sucesso');
            this.notificarCallbacks(true, null);
            
            return token;

        } catch (err) {
            console.error('❌ Erro na autenticação Ideris:', err);
            this.notificarCallbacks(false, err.message);
            throw err;
        }
    }

    scheduleRenew() {
        if (this.renewTimer) clearTimeout(this.renewTimer);
        this.renewTimer = setTimeout(() => {
            console.log('Renovando autenticação Ideris...');
            this.autenticar();
        }, this.RENEW_MS);
    }

    salvarToken() {
        if (this.jwtToken) {
            localStorage.setItem('ideris_jwt_token', this.jwtToken);
            localStorage.setItem('ideris_jwt_expiry', Date.now() + this.RENEW_MS);
        }
    }

    carregarTokenSalvo() {
        const savedToken = localStorage.getItem('ideris_jwt_token');
        const expiry = localStorage.getItem('ideris_jwt_expiry');
        
        if (savedToken && expiry && Date.now() < parseInt(expiry)) {
            this.jwtToken = savedToken;
            const timeLeft = (parseInt(expiry) - Date.now()) / 1000 / 60;
            console.log(`Token Ideris carregado do cache. Expira em ${timeLeft.toFixed(0)} minutos`);
            this.scheduleRenew();
            this.notificarCallbacks(true, null);
            return true;
        }
        
        return false;
    }

    getToken() {
        return this.jwtToken;
    }

    isAutenticado() {
        return !!this.jwtToken;
    }

    onAuth(callback) {
        this.authCallbacks.push(callback);
        
        // Se já estiver autenticado, notificar imediatamente
        if (this.isAutenticado()) {
            callback(true, null);
        }
    }

    notificarCallbacks(success, error) {
        this.authCallbacks.forEach(callback => {
            try {
                callback(success, error);
            } catch (err) {
                console.error('Erro no callback de autenticação:', err);
            }
        });
    }

    limparAutenticacao() {
        this.jwtToken = null;
        localStorage.removeItem('ideris_jwt_token');
        localStorage.removeItem('ideris_jwt_expiry');
        if (this.renewTimer) clearTimeout(this.renewTimer);
    }
}

// Singleton global
window.iderisAuth = new IderisAuth();

// Função utilitária para fazer requests autenticados
window.iderisRequest = async function(url, options = {}) {
    if (!window.iderisAuth.isAutenticado()) {
        await window.iderisAuth.autenticar();
    }
    
    const defaultOptions = {
        headers: {
            'accept': 'application/json',
            'Authorization': `Bearer ${window.iderisAuth.getToken()}`
        }
    };
    
    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    const response = await fetch(url, mergedOptions);
    
    if (response.status === 401) {
        // Token expirado, tentar reautenticar
        console.log('Token expirado, reautenticando...');
        window.iderisAuth.limparAutenticacao();
        await window.iderisAuth.autenticar();
        
        // Refazer a request com novo token
        mergedOptions.headers.Authorization = `Bearer ${window.iderisAuth.getToken()}`;
        return await fetch(url, mergedOptions);
    }
    
    return response;
};
