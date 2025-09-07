// scripts/estoque.js
console.log('✅ estoque.js carregado');

class EstoqueManager {
    constructor() {
        this.jwtTokenIderis = null;
        this.renewTimerIderis = null;
        this.PRIVATE_KEY_IDERIS = "IDERIS_PRIVATE_KEY";
        this.AUTH_URL_IDERIS = "https://apiv3.ideris.com.br/login";
        this.BASE_SKU_URL = "https://apiv3.ideris.com.br/sku/search";
        this.UPDATE_URL = "https://apiv3.ideris.com.br/sku/stock";
        this.RENEW_MS = (7 * 60 + 48) * 60 * 1000;
        
        this.init();
    }

    init() {
        console.log('Inicializando EstoqueManager...');
        this.inicializarElementos();
        this.inicializarEventos();
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

    async loginIderis() {
        if (!this.statusEstoque) return;
        
        this.setStatusEstoque('Autenticando no Hub Ideris...', 'carregando');
        try {
            const resp = await fetch(this.AUTH_URL_IDERIS, {
                method: 'POST',
                headers: {
                    'accept': '*/*',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.PRIVATE_KEY_IDERIS}`
                },
                body: `"${this.PRIVATE_KEY_IDERIS}"`
            });

            const raw = await resp.text();
            if (!resp.ok) throw new Error(`Falha na autenticação: ${resp.status} - ${raw}`);

            let token = null;
            try {
                const parsed = JSON.parse(raw);
                token = typeof parsed === 'string' ? parsed : (parsed.token || parsed.jwt);
            } catch {
                const cleaned = raw.trim().replace(/^"|"$/g, '');
                if (/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(cleaned)) {
                    token = cleaned;
                }
            }

            if (!token) throw new Error('Token JWT não encontrado na resposta.');

            this.jwtTokenIderis = token;
            this.scheduleRenewIderis();
            this.setStatusEstoque('Autenticado com sucesso! Pronto para consultar SKUs.', 'sucesso');
            
            if (this.btnBuscar) this.btnBuscar.disabled = false;

        } catch (err) {
            this.setStatusEstoque('Erro: ' + err.message, 'erro');
            console.error(err);
        }
    }

    scheduleRenewIderis() {
        if (this.renewTimerIderis) clearTimeout(this.renewTimerIderis);
        this.renewTimerIderis = setTimeout(() => this.loginIderis(), this.RENEW_MS);
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
        this.setStatusEstoque('Lista limpa.');
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
        const url = `${this.BASE_SKU_URL}?${params}`;

        this.setStatusEstoque('Consultando SKUs...', 'carregando');
        try {
            const resp = await fetch(url, {
                method: 'GET',
                headers: {
                    'accept': 'application/json',
                    'Authorization': `Bearer ${this.jwtTokenIderis}`
                }
            });

            const raw = await resp.text();
            let list = [];

            try {
                const parsed = JSON.parse(raw);
                if (parsed && Array.isArray(parsed.obj)) list = parsed.obj;
                else this.setStatusEstoque('Resposta inválida ou sem dados.', 'erro');
            } catch {
                this.setStatusEstoque('Resposta inválida.', 'erro');
            }

            this.renderRows(list);

            // Salvar última pesquisa
            localStorage.setItem('ideris:lastSearchEstoque', rawInput);
            if (this.lastSearch) {
                this.lastSearch.textContent = `Última pesquisa: ${rawInput}`;
            }

            this.setStatusEstoque(resp.ok ? 'Consulta concluída.' : `Falha na consulta (${resp.status}).`, resp.ok ? 'sucesso' : 'erro');

        } catch (err) {
            this.setStatusEstoque('Erro: ' + err.message, 'erro');
        }
    }

    async atualizarEstoques() {
        if (!this.jwtTokenIderis) {
            this.setStatusEstoque('Token inválido. Reautenticando...', 'carregando');
            await this.loginIderis();
            if (!this.jwtTokenIderis) return;
        }

        const rows = this.skuTable ? this.skuTable.querySelectorAll('tbody tr') : [];
        if (!rows.length) {
            this.setStatusEstoque('Não há itens na lista para atualizar.', 'erro');
            return;
        }

        this.setStatusEstoque('Atualizando estoques...', 'carregando');
        let okCount = 0;

        for (const row of rows) {
            const sku = row.cells[0].textContent.trim();
            const input = row.querySelector('.qty-input-estoque');
            const val = input ? input.value.trim() : '';

            if (val === '' || isNaN(val)) continue;

            const payload = { sku, currentStock: parseInt(val, 10) };
            try {
                const resp = await fetch(this.UPDATE_URL, {
                    method: 'PUT',
                    headers: {
                        'accept': '*/*',
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.jwtTokenIderis}`
                    },
                    body: JSON.stringify(payload)
                });

                if (resp.ok) {
                    okCount++;
                    // Atualizar exibição
                    const stockCell = row.querySelector('.stock-total');
                    if (stockCell) {
                        stockCell.textContent = payload.currentStock;
                        stockCell.className = `stock-total ${payload.currentStock <= 0 ? 'baixo' : ''}`;
                    }
                    if (input) input.value = '';
                } else {
                    console.error(`Falha ao atualizar ${sku}: ${resp.status}`);
                }
            } catch (err) {
                console.error(`Erro ao atualizar ${sku}:`, err);
            }
        }

        this.setStatusEstoque(`${okCount} SKU(s) atualizados com sucesso.`, 'sucesso');
    }

    voltarDashboard() {
        const dashboard = document.getElementById('paginaDashboard');
        if (dashboard) {
            // Esconder todas as páginas
            document.querySelectorAll('[id^="pagina"]').forEach(pagina => {
                pagina.classList.add('hidden');
            });
            // Mostrar dashboard
            dashboard.classList.remove('hidden');
        }
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM carregado, inicializando estoque...');
    window.estoqueApp = new EstoqueManager();
});
