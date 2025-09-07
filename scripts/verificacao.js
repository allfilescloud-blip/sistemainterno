// scripts/verificacao.js
console.log('✅ verificacao.js carregado');

class VerificacaoPedidos {
    constructor() {
        this.pedidosVerificados = [];
        this.init();
    }

    init() {
        console.log('Inicializando VerificacaoPedidos...');
        this.inicializarElementos();
        this.inicializarEventos();
        this.inicializarAutenticacao();
    }

    inicializarElementos() {
        console.log('Buscando elementos de verificação...');
        
        this.paginaVerificacao = document.getElementById('paginaVerificacao');
        this.btnVoltarVerificacao = document.getElementById('btnVoltarVerificacao');
        this.pedidoVerificacao = document.getElementById('pedidoVerificacao');
        this.btnBuscarVerificacao = document.getElementById('btnBuscarVerificacao');
        this.statusVerificacao = document.getElementById('statusVerificacao');
        this.resultadoVerificacao = document.getElementById('resultadoVerificacao');
        this.listaLidosVerificacao = document.getElementById('listaLidosVerificacao');
    }

    inicializarEventos() {
        console.log('Inicializando eventos de verificação...');
        
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

        if (this.btnVoltarVerificacao) {
            this.btnVoltarVerificacao.addEventListener('click', () => {
                this.voltarDashboard();
            });
        }
    }

    inicializarAutenticacao() {
        if (!this.statusVerificacao) return;
        
        // Usar o sistema centralizado de autenticação
        window.iderisAuth.onAuth((success, error) => {
            if (success) {
                this.setStatusVerificacao('Autenticado com sucesso! Pronto para consultas.', 'sucesso');
                if (this.btnBuscarVerificacao) {
                    this.btnBuscarVerificacao.disabled = false;
                }
            } else if (error) {
                this.setStatusVerificacao('Erro: ' + error, 'erro');
            }
        });

        // Se não estiver autenticado, iniciar autenticação
        if (!window.iderisAuth.isAutenticado()) {
            this.setStatusVerificacao('Autenticando no Hub Ideris...', 'carregando');
            window.iderisAuth.autenticar().catch(err => {
                this.setStatusVerificacao('Erro na autenticação: ' + err.message, 'erro');
            });
        }
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
            this.setStatusVerificacao('Informe o código do pedido.', 'erro');
            this.pedidoVerificacao.focus();
            return;
        }

        this.setStatusVerificacao(`Consultando pedido ${codigo}...`, 'carregando');
        
        try {
            const url = `https://apiv3.ideris.com.br/order/${encodeURIComponent(codigo)}`;
            const response = await window.iderisRequest(url, { method: 'GET' });
            
            const raw = await response.text();
            let statusDescription = '—';
            let deliveryCode = '—';
            
            try {
                const parsed = JSON.parse(raw);
                if (parsed && parsed.obj) {
                    statusDescription = parsed.obj.statusDescription || '—';
                    deliveryCode = parsed.obj.deliveryCode || '—';
                }
            } catch {
                statusDescription = 'Resposta inválida';
            }

            if (this.resultadoVerificacao) {
                const codigoEl = this.resultadoVerificacao.querySelector('.codigo-verificacao');
                const statusEl = this.resultadoVerificacao.querySelector('.statusDesc-verificacao');
                
                if (codigoEl) codigoEl.textContent = codigo;
                if (statusEl) {
                    statusEl.textContent = statusDescription;
                    statusEl.className = 'statusDesc-verificacao' + 
                        (statusDescription === 'Pagamento cancelado' ? ' cancelado' : '');
                }
            }

            this.atualizarListaVerificacao(codigo, statusDescription, deliveryCode);
            this.setStatusVerificacao(response.ok ? 'Consulta realizada com sucesso.' : `Falha na consulta (${response.status}).`, response.ok ? 'sucesso' : 'erro');
            
            this.pedidoVerificacao.value = '';
            this.pedidoVerificacao.focus();

        } catch (err) {
            this.setStatusVerificacao('Erro: ' + err.message, 'erro');
            this.pedidoVerificacao.focus();
        }
    }

    atualizarListaVerificacao(codigo, status, deliveryCode) {
        if (!this.listaLidosVerificacao) return;
        
        const duplicadoCodigo = this.pedidosVerificados.some(p => p.codigo === codigo);
        const duplicadoDelivery = deliveryCode && this.pedidosVerificados.some(p => p.deliveryCode === deliveryCode);

        this.pedidosVerificados.push({ codigo, status, deliveryCode });

        const li = document.createElement('li');
        if (duplicadoDelivery) {
            li.className = 'duplicado-delivery';
        } else if (duplicadoCodigo) {
            li.className = 'duplicado';
        }

        li.innerHTML = `
            <span>
                <strong>${codigo}</strong>
                <span class="delivery-verificacao">${deliveryCode ? `(${deliveryCode})` : ''}</span>
            </span>
            <span class="status-verificacao${status === 'Pagamento cancelado' ? ' cancelado' : ''}">${status}</span>
        `;
        this.listaLidosVerificacao.insertBefore(li, this.listaLidosVerificacao.firstChild);
    }

    voltarDashboard() {
        this.esconderTodasPaginas();
        const dashboard = document.getElementById('paginaDashboard');
        if (dashboard) dashboard.classList.remove('hidden');
    }

    esconderTodasPaginas() {
        const paginas = document.querySelectorAll('[id^="pagina"]');
        paginas.forEach(pagina => pagina.classList.add('hidden'));
    }
}

// Sistema de navegação global
window.navegacao = {
    mostrarPagina(id) {
        // Esconder todas as páginas
        const paginas = document.querySelectorAll('[id^="pagina"]');
        paginas.forEach(pagina => pagina.classList.add('hidden'));
        
        // Mostrar página solicitada
        const pagina = document.getElementById(id);
        if (pagina) pagina.classList.remove('hidden');
        
        console.log('Navegado para:', id);
    }
};

// Inicializar quando a página de verificação for carregada
function inicializarVerificacao() {
    console.log('Inicializando módulo de verificação...');
    window.verificacaoApp = new VerificacaoPedidos();
}

document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('paginaVerificacao')) {
        inicializarVerificacao();
    }
});

window.inicializarVerificacao = inicializarVerificacao;
