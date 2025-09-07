// scripts/verificacao.js
class VerificacaoPedidos {
    constructor() {
        this.jwtTokenIderis = null;
        this.renewTimerIderis = null;
        this.pedidosVerificados = [];
        this.PRIVATE_KEY_IDERIS = "IDERIS_PRIVATE_KEY";
        this.AUTH_URL_IDERIS = "https://apiv3.ideris.com.br/login";
        this.RENEW_MS = (7 * 60 + 48) * 60 * 1000;
        
        this.init();
    }

    init() {
        this.inicializarElementos();
        this.inicializarMenuFerramentas();
        this.inicializarVerificacao();
    }

    inicializarElementos() {
        // Usaremos querySelector para maior flexibilidade
        this.paginaVerificacao = document.getElementById('paginaVerificacao');
        this.btnVoltarVerificacao = document.getElementById('btnVoltarVerificacao');
        this.pedidoVerificacao = document.getElementById('pedidoVerificacao');
        this.btnBuscarVerificacao = document.getElementById('btnBuscarVerificacao');
        this.statusVerificacao = document.getElementById('statusVerificacao');
        this.resultadoVerificacao = document.getElementById('resultadoVerificacao');
        this.listaLidosVerificacao = document.getElementById('listaLidosVerificacao');
        this.btnNavFerramentas = document.getElementById('btnNavFerramentas');
        this.submenuFerramentas = document.getElementById('submenuFerramentas');

        console.log('Elementos de verificação inicializados:', {
            paginaVerificacao: !!this.paginaVerificacao,
            btnVoltarVerificacao: !!this.btnVoltarVerificacao,
            pedidoVerificacao: !!this.pedidoVerificacao,
            btnBuscarVerificacao: !!this.btnBuscarVerificacao,
            statusVerificacao: !!this.statusVerificacao,
            resultadoVerificacao: !!this.resultadoVerificacao,
            listaLidosVerificacao: !!this.listaLidosVerificacao
        });
    }

    inicializarMenuFerramentas() {
        if (!this.btnNavFerramentas) {
            console.log('Botão Ferramentas não encontrado, tentando novamente...');
            setTimeout(() => this.inicializarMenuFerramentas(), 100);
            return;
        }

        this.btnNavFerramentas.addEventListener('click', (e) => {
            e.stopPropagation();
            this.submenuFerramentas.classList.toggle('show');
        });

        document.addEventListener('click', () => {
            if (this.submenuFerramentas) {
                this.submenuFerramentas.classList.remove('show');
            }
        });

        if (this.submenuFerramentas) {
            this.submenuFerramentas.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        // Navegação para verificação
        document.querySelectorAll('.submenu-item[data-page="verificacao"]').forEach(item => {
            item.addEventListener('click', () => {
                this.mostrarPaginaVerificacao();
                if (!this.jwtTokenIderis) {
                    this.loginIderisVerificacao();
                }
            });
        });

        // Opção estoque
        document.querySelectorAll('.submenu-item[data-page="estoque"]').forEach(item => {
            item.addEventListener('click', () => {
                this.mostrarToast('Módulo de Estoque em desenvolvimento', 'info');
            });
        });
    }

    mostrarPaginaVerificacao() {
        console.log('Mostrando página de verificação...');
        
        // Esconder todas as páginas principais
        const paginas = [
            'paginaLogin', 'paginaDashboard', 'paginaListagem', 
            'paginaFormulario', 'paginaDetalhes', 'paginaVerificacao'
        ];
        
        paginas.forEach(id => {
            const pagina = document.getElementById(id);
            if (pagina) pagina.classList.add('hidden');
        });

        // Mostrar página de verificação
        if (this.paginaVerificacao) {
            this.paginaVerificacao.classList.remove('hidden');
            console.log('Página de verificação mostrada');
        } else {
            console.error('Página de verificação não encontrada');
        }

        // Atualizar navegação
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => btn.classList.remove('active'));
        
        if (this.btnNavFerramentas) {
            this.btnNavFerramentas.classList.add('active');
        }

        // Focar no campo de entrada
        setTimeout(() => {
            if (this.pedidoVerificacao) {
                this.pedidoVerificacao.focus();
            }
        }, 100);
    }

    inicializarVerificacao() {
        if (this.btnVoltarVerificacao) {
            this.btnVoltarVerificacao.addEventListener('click', () => {
                this.voltarParaDashboard();
            });
        }

        if (this.btnBuscarVerificacao) {
            this.btnBuscarVerificacao.addEventListener('click', () => {
                this.buscarPedidoVerificacao();
            });
        }

        if (this.pedidoVerificacao) {
            this.pedidoVerificacao.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.buscarPedidoVerificacao();
                }
            });
        }
    }

    voltarParaDashboard() {
        const paginaDashboard = document.getElementById('paginaDashboard');
        if (paginaDashboard) {
            // Esconder todas as páginas
            document.querySelectorAll('[id^="pagina"]').forEach(pagina => {
                pagina.classList.add('hidden');
            });
            // Mostrar dashboard
            paginaDashboard.classList.remove('hidden');
            
            // Atualizar navegação
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            document.getElementById('btnNavDashboard').classList.add('active');
        }
    }

    async loginIderisVerificacao() {
        if (!this.statusVerificacao) return;
        
        this.setStatusVerificacao("Autenticando no Hub Ideris...", 'carregando');
        try {
            const resp = await fetch(this.AUTH_URL_IDERIS, {
                method: "POST",
                headers: {
                    "accept": "*/*",
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.PRIVATE_KEY_IDERIS}`
                },
                body: `"${this.PRIVATE_KEY_IDERIS}"`
            });

            const raw = await resp.text();
            if (!resp.ok) throw new Error(`Falha na autenticação: ${resp.status} - ${raw}`);

            let token = null;
            try {
                const parsed = JSON.parse(raw);
                token = typeof parsed === "string" ? parsed : (parsed.token || parsed.jwt);
            } catch {
                const cleaned = raw.trim().replace(/^"|"$/g, "");
                if (/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(cleaned)) {
                    token = cleaned;
                }
            }

            if (!token) throw new Error("Token JWT não encontrado na resposta.");

            this.jwtTokenIderis = token;
            this.scheduleRenewIderis();
            this.setStatusVerificacao("Autenticado com sucesso! Pronto para consultas.", 'sucesso');
            
            if (this.btnBuscarVerificacao) this.btnBuscarVerificacao.disabled = false;
            if (this.pedidoVerificacao) this.pedidoVerificacao.focus();

        } catch (err) {
            this.setStatusVerificacao("Erro: " + err.message, 'erro');
            console.error(err);
        }
    }

    scheduleRenewIderis() {
        if (this.renewTimerIderis) clearTimeout(this.renewTimerIderis);
        this.renewTimerIderis = setTimeout(() => this.loginIderisVerificacao(), this.RENEW_MS);
    }

    setStatusVerificacao(mensagem, tipo = '') {
        if (!this.statusVerificacao) return;
        
        this.statusVerificacao.textContent = mensagem;
        this.statusVerificacao.className = 'status-verificacao-container';
        
        if (tipo) {
            this.statusVerificacao.classList.add(tipo);
        }
    }

    async buscarPedidoVerificacao() {
        if (!this.pedidoVerificacao || !this.statusVerificacao) return;
        
        const codigo = this.pedidoVerificacao.value.trim();
        if (!codigo) {
            this.setStatusVerificacao("Informe o código do pedido.", 'erro');
            this.pedidoVerificacao.focus();
            return;
        }

        if (!this.jwtTokenIderis) {
            this.setStatusVerificacao("Token JWT inválido. Tentando autenticar novamente...", 'carregando');
            await this.loginIderisVerificacao();
            if (!this.jwtTokenIderis) return;
        }

        this.setStatusVerificacao(`Consultando pedido ${codigo}...`, 'carregando');
        try {
            const url = `https://apiv3.ideris.com.br/order/${encodeURIComponent(codigo)}`;
            const resp = await fetch(url, {
                method: "GET",
                headers: {
                    "accept": "application/json",
                    "Authorization": `Bearer ${this.jwtTokenIderis}`
                }
            });

            const raw = await resp.text();
            let statusDescription = "—";
            let deliveryCode = "—";
            
            try {
                const parsed = JSON.parse(raw);
                if (parsed && parsed.obj) {
                    statusDescription = parsed.obj.statusDescription || "—";
                    deliveryCode = parsed.obj.deliveryCode || "—";
                }
            } catch {
                statusDescription = "Resposta inválida";
            }

            if (this.resultadoVerificacao) {
                const codigoEl = this.resultadoVerificacao.querySelector(".codigo-verificacao");
                const statusEl = this.resultadoVerificacao.querySelector(".statusDesc-verificacao");
                
                if (codigoEl) codigoEl.textContent = codigo;
                if (statusEl) {
                    statusEl.textContent = statusDescription;
                    statusEl.className = "statusDesc-verificacao" + 
                        (statusDescription === "Pagamento cancelado" ? " cancelado" : "");
                }
            }

            this.atualizarListaVerificacao(codigo, statusDescription, deliveryCode);
            this.setStatusVerificacao(resp.ok ? "Consulta realizada com sucesso." : `Falha na consulta (${resp.status}).`, resp.ok ? 'sucesso' : 'erro');
            
            this.pedidoVerificacao.value = "";
            this.pedidoVerificacao.focus();

        } catch (err) {
            this.setStatusVerificacao("Erro: " + err.message, 'erro');
            this.pedidoVerificacao.focus();
        }
    }

    atualizarListaVerificacao(codigo, status, deliveryCode) {
        if (!this.listaLidosVerificacao) return;
        
        const duplicadoCodigo = this.pedidosVerificados.some(p => p.codigo === codigo);
        const duplicadoDelivery = deliveryCode && this.pedidosVerificados.some(p => p.deliveryCode === deliveryCode);

        this.pedidosVerificados.push({ codigo, status, deliveryCode });

        const li = document.createElement("li");
        if (duplicadoDelivery) {
            li.className = "duplicado-delivery";
        } else if (duplicadoCodigo) {
            li.className = "duplicado";
        }

        li.innerHTML = `
            <span>
                <strong>${codigo}</strong>
                <span class="delivery-verificacao">${deliveryCode ? `(${deliveryCode})` : ''}</span>
            </span>
            <span class="status-verificacao${status === "Pagamento cancelado" ? " cancelado" : ""}">${status}</span>
        `;
        this.listaLidosVerificacao.insertBefore(li, this.listaLidosVerificacao.firstChild);
    }

    mostrarToast(mensagem, tipo = 'info') {
        if (typeof showToast === 'function') {
            showToast(mensagem, tipo);
        } else {
            console.log(`${tipo.toUpperCase()}: ${mensagem}`);
        }
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    window.verificacaoApp = new VerificacaoPedidos();
    console.log('Sistema de verificação inicializado');
});
