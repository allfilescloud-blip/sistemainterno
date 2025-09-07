// scripts/verificacao.js
// Variáveis globais para verificação
let jwtTokenIderis = null;
let renewTimerIderis = null;
let pedidosVerificados = [];
const PRIVATE_KEY_IDERIS = "IDERIS_PRIVATE_KEY";
const AUTH_URL_IDERIS = "https://apiv3.ideris.com.br/login";
const RENEW_MS = (7 * 60 + 48) * 60 * 1000;

// Elementos da verificação
let paginaVerificacao, btnVoltarVerificacao, pedidoVerificacao, btnBuscarVerificacao, statusVerificacao, resultadoVerificacao, listaLidosVerificacao;

// Menu Ferramentas
let btnNavFerramentas, submenuFerramentas;

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    inicializarElementos();
    inicializarMenuFerramentas();
    inicializarVerificacao();
});

// Obter elementos do DOM
function inicializarElementos() {
    paginaVerificacao = document.getElementById('paginaVerificacao');
    btnVoltarVerificacao = document.getElementById('btnVoltarVerificacao');
    pedidoVerificacao = document.getElementById('pedidoVerificacao');
    btnBuscarVerificacao = document.getElementById('btnBuscarVerificacao');
    statusVerificacao = document.getElementById('statusVerificacao');
    resultadoVerificacao = document.getElementById('resultadoVerificacao');
    listaLidosVerificacao = document.getElementById('listaLidosVerificacao');
    btnNavFerramentas = document.getElementById('btnNavFerramentas');
    submenuFerramentas = document.getElementById('submenuFerramentas');
}

// Comportamento do menu Ferramentas
function inicializarMenuFerramentas() {
    if (!btnNavFerramentas) {
        console.error('Botão Ferramentas não encontrado');
        return;
    }
    
    btnNavFerramentas.addEventListener('click', function(e) {
        e.stopPropagation();
        submenuFerramentas.classList.toggle('show');
    });

    // Fechar submenu ao clicar fora
    document.addEventListener('click', function() {
        if (submenuFerramentas) {
            submenuFerramentas.classList.remove('show');
        }
    });

    // Prevenir que clicks dentro do submenu fechem ele
    if (submenuFerramentas) {
        submenuFerramentas.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }

    // Navegação para a página de verificação
    document.querySelectorAll('.submenu-item[data-page="verificacao"]').forEach(item => {
        item.addEventListener('click', function() {
            mostrarPaginaVerificacao();
            // Iniciar autenticação quando abrir a página
            if (!jwtTokenIderis) {
                loginIderisVerificacao();
            }
        });
    });

    // Para a opção Estoque (placeholder)
    document.querySelectorAll('.submenu-item[data-page="estoque"]').forEach(item => {
        item.addEventListener('click', function() {
            if (typeof showToast === 'function') {
                showToast('Módulo de Estoque em desenvolvimento', 'info');
            } else {
                alert('Módulo de Estoque em desenvolvimento');
            }
        });
    });
}

// Função para mostrar página de verificação (alternativa à mostrarPagina)
function mostrarPaginaVerificacao() {
    // Esconder todas as páginas
    const paginas = document.querySelectorAll('#paginaDashboard, #paginaListagem, #paginaFormulario, #paginaDetalhes, #paginaVerificacao');
    paginas.forEach(pagina => {
        if (pagina) pagina.classList.add('hidden');
    });
    
    // Mostrar apenas a página de verificação
    if (paginaVerificacao) {
        paginaVerificacao.classList.remove('hidden');
    }
    
    // Atualizar navegação
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => btn.classList.remove('active'));
    
    if (btnNavFerramentas) {
        btnNavFerramentas.classList.add('active');
    }
}

// Inicialização da verificação
function inicializarVerificacao() {
    if (!btnVoltarVerificacao) {
        console.error('Botão voltar verificação não encontrado');
        return;
    }
    
    // Voltar da página de verificação
    btnVoltarVerificacao.addEventListener('click', function() {
        if (typeof mostrarPagina === 'function') {
            mostrarPagina(document.getElementById('paginaDashboard'));
        } else {
            mostrarPaginaVerificacao();
            // Alternativa: recarregar a página principal
            window.location.href = window.location.href.split('#')[0];
        }
    });

    // Event Listeners para verificação
    if (btnBuscarVerificacao) {
        btnBuscarVerificacao.addEventListener('click', buscarPedidoVerificacao);
    }

    if (pedidoVerificacao) {
        pedidoVerificacao.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                buscarPedidoVerificacao();
            }
        });

        // Foco automático ao entrar na página
        if (paginaVerificacao) {
            paginaVerificacao.addEventListener('DOMNodeInserted', function() {
                setTimeout(() => {
                    if (pedidoVerificacao) pedidoVerificacao.focus();
                }, 100);
            });
        }
    }
}

// Função para autenticar na API Ideris
async function loginIderisVerificacao() {
    if (!statusVerificacao) {
        console.error('Elemento statusVerificacao não encontrado');
        return;
    }
    
    setStatusVerificacao("Autenticando no Hub Ideris...", 'carregando');
    try {
        const resp = await fetch(AUTH_URL_IDERIS, {
            method: "POST",
            headers: {
                "accept": "*/*",
                "Content-Type": "application/json",
                "Authorization": `Bearer ${PRIVATE_KEY_IDERIS}`
            },
            body: `"${PRIVATE_KEY_IDERIS}"`
        });

        const raw = await resp.text();
        if (!resp.ok) throw new Error(`Falha na autenticação: ${resp.status} - ${raw}`);

        let token = null;
        try {
            const parsed = JSON.parse(raw);
            if (typeof parsed === "string") token = parsed;
            else if (parsed && typeof parsed === "object") token = parsed.token || parsed.jwt;
        } catch {
            const cleaned = raw.trim().replace(/^"|"$/g, "");
            if (/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(cleaned)) token = cleaned;
        }

        if (!token) throw new Error("Token JWT não encontrado na resposta.");

        jwtTokenIderis = token;
        scheduleRenewIderis();
        setStatusVerificacao("Autenticado com sucesso! Pronto para consultas.", 'sucesso');
        
        if (btnBuscarVerificacao) btnBuscarVerificacao.disabled = false;
        if (pedidoVerificacao) pedidoVerificacao.focus();

    } catch (err) {
        setStatusVerificacao("Erro: " + err.message, 'erro');
        console.error(err);
    }
}

function scheduleRenewIderis() {
    if (renewTimerIderis) clearTimeout(renewTimerIderis);
    renewTimerIderis = setTimeout(loginIderisVerificacao, RENEW_MS);
}

function setStatusVerificacao(mensagem, tipo = '') {
    if (!statusVerificacao) return;
    
    statusVerificacao.textContent = mensagem;
    statusVerificacao.className = 'status-verificacao-container';
    
    if (tipo) {
        statusVerificacao.classList.add(tipo);
    }
}

// Função para atualizar lista de pedidos verificados
function atualizarListaVerificacao(codigo, status, deliveryCode) {
    if (!listaLidosVerificacao) return;
    
    const duplicadoCodigo = pedidosVerificados.some(p => p.codigo === codigo);
    const duplicadoDelivery = deliveryCode && pedidosVerificados.some(p => p.deliveryCode === deliveryCode);

    pedidosVerificados.push({ codigo, status, deliveryCode });

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
    listaLidosVerificacao.insertBefore(li, listaLidosVerificacao.firstChild);
}

// Função para buscar pedido
async function buscarPedidoVerificacao() {
    if (!pedidoVerificacao || !statusVerificacao) return;
    
    const codigo = pedidoVerificacao.value.trim();
    if (!codigo) {
        setStatusVerificacao("Informe o código do pedido.", 'erro');
        pedidoVerificacao.focus();
        return;
    }
    if (!jwtTokenIderis) {
        setStatusVerificacao("Token JWT inválido. Tentando autenticar novamente...", 'carregando');
        await loginIderisVerificacao();
        if (!jwtTokenIderis) return;
    }

    setStatusVerificacao(`Consultando pedido ${codigo}...`, 'carregando');
    try {
        const url = `https://apiv3.ideris.com.br/order/${encodeURIComponent(codigo)}`;
        const resp = await fetch(url, {
            method: "GET",
            headers: {
                "accept": "application/json",
                "Authorization": `Bearer ${jwtTokenIderis}`
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

        if (resultadoVerificacao) {
            const codigoEl = resultadoVerificacao.querySelector(".codigo-verificacao");
            const statusEl = resultadoVerificacao.querySelector(".statusDesc-verificacao");
            
            if (codigoEl) codigoEl.textContent = codigo;
            if (statusEl) {
                statusEl.textContent = statusDescription;
                statusEl.className = "statusDesc-verificacao" + (statusDescription === "Pagamento cancelado" ? " cancelado" : "");
            }
        }

        atualizarListaVerificacao(codigo, statusDescription, deliveryCode);

        setStatusVerificacao(resp.ok ? "Consulta realizada com sucesso." : `Falha na consulta (${resp.status}).`, resp.ok ? 'sucesso' : 'erro');
        pedidoVerificacao.value = "";
        pedidoVerificacao.focus();

    } catch (err) {
        setStatusVerificacao("Erro: " + err.message, 'erro');
        pedidoVerificacao.focus();
    }
}

// Exportar funções para uso global
window.mostrarPagina = mostrarPagina;
window.showToast = showToast;
