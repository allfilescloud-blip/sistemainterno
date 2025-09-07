// scripts/estoque.js
console.log('✅ estoque.js carregado');

class EstoqueManager {
    constructor() {
        this.pedidosEstoque = [];
        this.init();
    }

    init() {
        console.log('Inicializando EstoqueManager...');
        this.inicializarElementos();
        this.inicializarEventos();
        this.inicializarAutenticacao();
        this.carregarUltimaPesquisa();
    }

    inicializarElementos() {
        console.log('Buscando elementos de estoque...');
        
        // Elementos da página de estoque
        this.paginaEstoque = document.getElementById('paginaEstoque');
        this.btnVoltarEstoque = document.getElementById('btnVoltarEstoque');
        this.skuInput = document.getElementById('skuInputEstoque');
        this.btnBuscar = document.getElementById('btnBuscarEstoque');
        this.btnLimpar = document.getElementById('btnLimparEstoque');
        this.btnAtualizar = document.getElementById('btnAtualizarEstoque');
        this.statusEstoque = document.getElementById('statusEstoque');
        this.lastSearch = document.getElementById('lastSearchEstoque');
        this.skuTable = document.getElementById('skuTableEstoque');

        console.log('Elementos de estoque encontrados:', {
            paginaEstoque: !!this.paginaEstoque,
            skuInput: !!this.skuInput,
            btnBuscar: !!this.btnBuscar,
            btnLimpar: !!this.btnLimpar,
            btnAtualizar: !!this.btnAtualizar,
            statusEstoque: !!this.statusEstoque,
            lastSearch: !!this.lastSearch,
            skuTable: !!this.skuTable
        });
    }

    inicializarEventos() {
        console.log('Inicializando eventos de estoque...');
        
        // Botão buscar
        if (this.btnBuscar) {
            this.btnBuscar.addEventListener('click', () => {
                this.buscarSKUs();
            });
        }

        // Botão limpar
        if (this.btnLimpar) {
            this.btnLimpar.addEventListener('click', () => {
                this.limparLista();
            });
        }

        // Botão atualizar
        if (this.btnAtualizar) {
            this.btnAtualizar.addEventListener('click', () => {
                this.atualizarEstoques();
            });
        }

        // Enter no campo de input
        if (this.skuInput) {
            this.skuInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.buscarSKUs();
                }
            });
        }

        // Botão voltar
        if (this.btnVoltarEstoque) {
            this.btnVoltarEstoque.addEventListener('click', () => {
                this.voltarDashboard();
            });
        }
    }

    inicializarAutenticacao() {
        if (!this.statusEstoque) {
            console.error('Elemento statusEstoque não encontrado');
            return;
        }
        
        // Usar o sistema centralizado de autenticação
        window.iderisAuth.onAuth((success, error) => {
            if (success) {
                this.setStatusEstoque('Autenticado com sucesso! Pronto para consultar SKUs.', 'sucesso');
                if (this.btnBuscar) {
                    this.btnBuscar.disabled = false;
                }
            } else if (error) {
                this.setStatusEstoque('Erro: ' + error, 'erro');
            }
        });

        // Se não estiver autenticado, iniciar autenticação
        if (!window.iderisAuth.isAutenticado()) {
            this.setStatusEstoque('Autenticando no Hub Ideris...', 'carregando');
            window.iderisAuth.autenticar().catch(err => {
                this.setStatusEstoque('Erro na autenticação: ' + err.message, 'erro');
            });
        }
    }

    carregarUltimaPesquisa() {
        if (!this.skuInput || !this.lastSearch) return;
        
        const ultimaPesquisa = localStorage.getItem('ideris:lastSearchEstoque');
        if (ultimaPesquisa) {
            this.skuInput.value = ultimaPesquisa;
            this.lastSearch.textContent = `Última pesquisa: ${ultimaPesquisa}`;
        } else {
            this.lastSearch.textContent = 'Última pesquisa: —';
        }
    }

    setStatusEstoque(mensagem, tipo = '') {
        if (!this.statusEstoque) return;
        
        this.statusEstoque.textContent = mensagem;
        this.statusEstoque.className = 'status-estoque-container';
        
        if (tipo) {
            this.statusEstoque.classList.add(tipo);
        }
    }

    renderRows(items) {
        if (!this.skuTable) return;
        
        const tbody = this.skuTable.querySelector('tbody');
        tbody.innerHTML = '';

        if (items.length === 0) {
            this.setStatusEstoque('Nenhum SKU encontrado.', 'erro');
            return;
        }

        // Ordenar por SKU
        items.sort((a, b) => String(a.sku).localeCompare(String(b.sku), undefined, { numeric: true, sensitivity: 'base' }));

        items.forEach(item => {
            const sku = item.sku ?? '—';
            const stockTotal = Array.isArray(item.stocks)
                ? item.stocks.reduce((sum, s) => sum + (Number(s?.currentStock) || 0), 0)
                : 0;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td data-label="SKU">${sku}</td>
                <td data-label="Estoque Atual" class="stock-total ${stockTotal <= 0 ? 'baixo' : ''}">${stockTotal}</td>
                <td data-label="Atualizar">
                    <input class="qty-input-estoque" type="number" min="0" inputmode="numeric" placeholder="Novo estoque" />
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    limparLista() {
        if (!this.skuTable) return;
        
        this.skuTable.querySelector('tbody').innerHTML = '';
        this.setStatusEstoque('Lista limpa.', 'sucesso');
    }

    async buscarSKUs() {
        if (!this.jwtTokenIderis) {
            this.setStatusEstoque('Token inválido. Reautenticando...', 'carregando');
            await this.loginIderis();
            if (!this.jwtTokenIderis) return;
        }

        const rawInput = this.skuInput ? this.skuInput.value.trim() : '';
        if (!rawInput) {
            this.setStatusEstoque('Informe pelo menos um SKU (separados por vírgula).', 'erro');
            return;
        }

        const skuList = Array.from(new Set(
            rawInput.split(',').map(s => s.trim()).filter(Boolean)
        ));

        const params = skuList.map(s => `sku=${encodeURIComponent(s)}`).join('&');
        const url = `https://apiv3.ideris.com.br/sku/search?${params}`;

        this.setStatusEstoque('Consultando SKUs...', 'carregando');
        try {
            const response = await window.iderisRequest(url, {
                method: 'GET'
            });

            console.log('Resposta da consulta SKUs:', response.status);

            const raw = await response.text();
            let list = [];

            try {
                const parsed = JSON.parse(raw);
                if (parsed && Array.isArray(parsed.obj)) {
                    list = parsed.obj;
                    console.log(`${list.length} SKUs encontrados`);
                } else {
                    this.setStatusEstoque('Resposta inválida ou sem dados.', 'erro');
                    console.log('Resposta inválida:', raw);
                }
            } catch (parseError) {
                this.setStatusEstoque('Resposta inválida do servidor.', 'erro');
                console.error('Erro no parse:', parseError, 'Resposta:', raw);
            }

            this.renderRows(list);

            // Salvar última pesquisa
            localStorage.setItem('ideris:lastSearchEstoque', rawInput);
            if (this.lastSearch) {
                this.lastSearch.textContent = `Última pesquisa: ${rawInput}`;
            }

            this.setStatusEstoque(response.ok ? `Consulta concluída. ${list.length} SKU(s) encontrados.` : `Falha na consulta (${response.status}).`, response.ok ? 'sucesso' : 'erro');

        } catch (err) {
            console.error('Erro na consulta SKUs:', err);
            this.setStatusEstoque('Erro: ' + err.message, 'erro');
        }
    }

    async atualizarEstoques() {
        if (!window.iderisAuth.isAutenticado()) {
            this.setStatusEstoque('Token inválido. Reautenticando...', 'carregando');
            try {
                await window.iderisAuth.autenticar();
            } catch (err) {
                this.setStatusEstoque('Erro na autenticação: ' + err.message, 'erro');
                return;
            }
        }

        const rows = this.skuTable ? this.skuTable.querySelectorAll('tbody tr') : [];
        if (!rows.length) {
            this.setStatusEstoque('Não há itens na lista para atualizar.', 'erro');
            return;
        }

        this.setStatusEstoque('Atualizando estoques...', 'carregando');
        let okCount = 0;
        let errorCount = 0;

        for (const row of rows) {
            const sku = row.cells[0].textContent.trim();
            const input = row.querySelector('.qty-input-estoque');
            const val = input ? input.value.trim() : '';

            if (val === '' || isNaN(val)) continue;

            const payload = { sku, currentStock: parseInt(val, 10) };
            
            // Validar estoque negativo
            if (payload.currentStock < 0) {
                this.setStatusEstoque('Erro: Estoque não pode ser negativo.', 'erro');
                continue;
            }

            try {
                const response = await window.iderisRequest('https://apiv3.ideris.com.br/sku/stock', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    okCount++;
                    // Atualizar exibição
                    const stockCell = row.querySelector('.stock-total');
                    if (stockCell) {
                        stockCell.textContent = payload.currentStock;
                        stockCell.className = `stock-total ${payload.currentStock <= 0 ? 'baixo' : ''}`;
                    }
                    if (input) input.value = '';
                } else {
                    errorCount++;
                    const errorText = await response.text();
                    console.error(`Falha ao atualizar ${sku}: ${response.status} - ${errorText}`);
                }
            } catch (err) {
                errorCount++;
                console.error(`Erro ao atualizar ${sku}:`, err);
            }
        }

        if (okCount > 0) {
            this.setStatusEstoque(`${okCount} SKU(s) atualizados com sucesso.${errorCount > 0 ? ` ${errorCount} erro(s).` : ''}`, 'sucesso');
        } else {
            this.setStatusEstoque('Nenhum SKU atualizado. Verifique os dados.', 'erro');
        }
    }

    voltarDashboard() {
        // Usar o sistema de navegação global
        if (typeof window.mostrarPagina === 'function') {
            window.mostrarPagina(document.getElementById('paginaDashboard'));
        } else {
            // Fallback: esconder todas as páginas e mostrar dashboard
            const paginas = document.querySelectorAll('[id^="pagina"]');
            paginas.forEach(pagina => pagina.classList.add('hidden'));
            
            const dashboard = document.getElementById('paginaDashboard');
            if (dashboard) dashboard.classList.remove('hidden');
        }
    }

    // Método para forçar autenticação (pode ser chamado externamente)
    forcarAutenticacao() {
        this.setStatusEstoque('Autenticando no Hub Ideris...', 'carregando');
        window.iderisAuth.autenticar().then(() => {
            this.setStatusEstoque('Autenticado com sucesso!', 'sucesso');
        }).catch(err => {
            this.setStatusEstoque('Erro: ' + err.message, 'erro');
        });
    }
}

// Função de inicialização para estoque
function inicializarEstoque() {
    console.log('Inicializando módulo de estoque...');
    
    // Verificar se a autenticação global está disponível
    if (typeof window.iderisAuth === 'undefined') {
        console.error('Sistema de autenticação Ideris não encontrado');
        
        // Tentar carregar o script de autenticação
        const script = document.createElement('script');
        script.src = './scripts/ideris-auth.js';
        script.onload = () => {
            window.estoqueApp = new EstoqueManager();
        };
        document.head.appendChild(script);
        return;
    }
    
    window.estoqueApp = new EstoqueManager();
}

// Inicializar automaticamente se a página de estoque estiver visível
document.addEventListener('DOMContentLoaded', function() {
    const paginaEstoque = document.getElementById('paginaEstoque');
    if (paginaEstoque && !paginaEstoque.classList.contains('hidden')) {
        inicializarEstoque();
    }
});

// Inicializar quando a página for aberta via menu
function mostrarPaginaEstoque() {
    console.log('Mostrando página de estoque...');
    
    // Usar navegação global se disponível
    if (typeof window.mostrarPagina === 'function') {
        window.mostrarPagina(document.getElementById('paginaEstoque'));
    } else {
        // Fallback: esconder todas as páginas e mostrar estoque
        const paginas = document.querySelectorAll('[id^="pagina"]');
        paginas.forEach(pagina => pagina.classList.add('hidden'));
        
        const paginaEstoque = document.getElementById('paginaEstoque');
        if (paginaEstoque) paginaEstoque.classList.remove('hidden');
    }
    
    // Inicializar se ainda não foi
    if (typeof window.estoqueApp === 'undefined') {
        setTimeout(inicializarEstoque, 100);
    } else if (window.estoqueApp && !window.iderisAuth.isAutenticado()) {
        // Forçar reautenticação se necessário
        window.estoqueApp.forcarAutenticacao();
    }
}

// Exportar funções para uso global
window.inicializarEstoque = inicializarEstoque;
window.mostrarPaginaEstoque = mostrarPaginaEstoque;

// Interface para outros scripts acessarem o estoque
window.estoqueManager = {
    inicializar: inicializarEstoque,
    mostrar: mostrarPaginaEstoque,
    buscarSKUs: function() {
        if (window.estoqueApp) {
            window.estoqueApp.buscarSKUs();
        }
    },
    atualizarEstoques: function() {
        if (window.estoqueApp) {
            window.estoqueApp.atualizarEstoques();
        }
    }
};
