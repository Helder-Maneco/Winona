// ==============================
// WINONA STOCK — DASHBOARD
// ==============================

import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

const API_URL = 'http://localhost:3000';

// --- Auth guard ---
const token = localStorage.getItem('token');
const utilizador = JSON.parse(localStorage.getItem('utilizador') || '{}');

if (!token) window.location.href = '/index.html';

// --- Sidebar ---
document.getElementById('userName').textContent = utilizador.nome || 'Utilizador';
document.getElementById('userRole').textContent = utilizador.perfil || '';
document.getElementById('userAvatar').textContent = (utilizador.nome || 'U')[0].toUpperCase();

document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('utilizador');
    window.location.href = '/index.html';
});

// --- Helper fetch ---
async function apiFetch(path) {
    const res = await fetch(`${API_URL}${path}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('utilizador');
        window.location.href = '/index.html';
        return null;
    }

    return res.json();
}

// --- Formata moeda ---
function formatKz(valor) {
    return Number(valor).toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' });
}

// --- Carrega tudo ---
async function init() {
    const [produtos, alertas, resumo, armazens, movimentacoes] = await Promise.all([
        apiFetch('/api/v1/produtos?ativo=true'),
        apiFetch('/api/v1/produtos/alertas'),
        apiFetch('/api/v1/movimentacoes/resumo'),
        apiFetch('/api/v1/armazens'),
        apiFetch('/api/v1/movimentacoes?')
    ]);

    if (produtos)      renderMetricas(produtos, alertas, resumo, armazens);
    if (armazens)      renderArmazens(armazens);
    if (alertas)       renderDonut(alertas);
    if (movimentacoes) renderLinha(movimentacoes);
    if (movimentacoes) renderUltimosMovimentos(movimentacoes);
    if (alertas)       renderNotificacoes(alertas);
}

// --- Métricas ---
function renderMetricas(produtos, alertas, resumo, armazens) {
    // Valor total do estoque
    const estoqueTotal = produtos.reduce((acc, p) => {
        return acc + (Number(p.preco_venda || 0) * p.quantidade_atual);
    }, 0);
    document.getElementById('mEstoqueTotal').textContent = formatKz(estoqueTotal);

    // Total de itens
    const totalItens = produtos.reduce((acc, p) => acc + p.quantidade_atual, 0);
    document.getElementById('mItens').textContent = totalItens.toLocaleString('pt-AO');

    // Rupturas
    const rupturas = alertas?.filter(a => a.tipo_alerta === 'ruptura').length || 0;
    document.getElementById('mRupturas').textContent = rupturas;

    // Armazéns activos
    document.getElementById('mArmazens').textContent = armazens?.length || 0;

    // Entradas do mês
    const entradas = resumo?.find(r => r.tipo === 'entrada');
    document.getElementById('mEntradas').textContent = entradas
        ? Number(entradas.total_quantidade).toLocaleString('pt-AO')
        : '0';
}

// --- Tabela armazéns ---
function renderArmazens(armazens) {
    const tbody = document.getElementById('armazensTableBody');

    if (!armazens || armazens.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="table-empty">Nenhum armazém cadastrado.</td></tr>`;
        return;
    }

    tbody.innerHTML = armazens.map(a => {
        const status = a.total_produtos > 0
            ? '<span class="badge badge-green">Saudável</span>'
            : '<span class="badge badge-orange">Vazio</span>';

        return `
            <tr>
                <td>${a.nome}</td>
                <td class="mono">—</td>
                <td class="mono">—</td>
                <td>${status}</td>
            </tr>
        `;
    }).join('');
}

// --- Tabela alertas ---
function renderAlertas(alertas) {
    const tbody = document.getElementById('alertasTableBody');

    if (!alertas || alertas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Nenhum alerta activo.</td></tr>`;
        return;
    }

    tbody.innerHTML = alertas.slice(0, 6).map(a => {
        const badge = a.tipo_alerta === 'ruptura'
            ? '<span class="badge badge-red">Sem estoque</span>'
            : a.tipo_alerta === 'estoque_baixo'
            ? '<span class="badge badge-orange">Baixo</span>'
            : '<span class="badge badge-green">Excesso</span>';

        return `
            <tr>
                <td>${a.nome}</td>
                <td class="mono">${a.ume}</td>
                <td class="mono">${a.quantidade_atual}</td>
                <td class="mono">${a.estoque_minimo}</td>
                <td>${badge}</td>
            </tr>
        `;
    }).join('');
}

// --- Gráfico donut ---
function renderDonut(alertas) {
    const ctx = document.getElementById('chartDonut');
    if (!ctx) return;

    // Agrupa rupturas por tipo de alerta
    const ruptura     = alertas.filter(a => a.tipo_alerta === 'ruptura').length;
    const baixo       = alertas.filter(a => a.tipo_alerta === 'estoque_baixo').length;
    const excesso     = alertas.filter(a => a.tipo_alerta === 'excesso').length;

    if (ruptura + baixo + excesso === 0) {
        ctx.parentElement.innerHTML = '<p class="table-empty">Sem alertas activos.</p>';
        return;
    }

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Ruptura', 'Stock Baixo', 'Excesso'],
            datasets: [{
                data: [ruptura, baixo, excesso],
                backgroundColor: ['#EF4444', '#F97316', '#22C55E'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { family: 'Geist', size: 11 },
                        padding: 12,
                        usePointStyle: true
                    }
                }
            }
        }
    });
}

// --- Gráfico de linha ---
function renderLinha(movimentacoes) {
    const ctx = document.getElementById('chartLinha');
    if (!ctx) return;

    // Últimos 7 dias
    const dias = [];
    const entradas = [];
    const saidas = [];

    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const label = d.toLocaleDateString('pt-AO', { day: '2-digit', month: '2-digit' });
        dias.push(label);

        const dStr = d.toISOString().split('T')[0];

        const e = movimentacoes
            .filter(m => m.tipo === 'entrada' && m.data.startsWith(dStr))
            .reduce((acc, m) => acc + m.quantidade_movimentada, 0);

        const s = movimentacoes
            .filter(m => m.tipo === 'saida' && m.data.startsWith(dStr))
            .reduce((acc, m) => acc + m.quantidade_movimentada, 0);

        entradas.push(e);
        saidas.push(s);
    }

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: dias,
            datasets: [
                {
                    label: 'Entradas',
                    data: entradas,
                    borderColor: '#2563EB',
                    backgroundColor: 'rgba(37,99,235,.08)',
                    borderWidth: 2,
                    pointRadius: 3,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Saídas',
                    data: saidas,
                    borderColor: '#22C55E',
                    backgroundColor: 'rgba(34,197,94,.08)',
                    borderWidth: 2,
                    pointRadius: 3,
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: { family: 'Geist', size: 11 },
                        usePointStyle: true,
                        padding: 12
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { font: { family: 'JetBrains Mono', size: 11 } }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: '#F3F4F6' },
                    ticks: { font: { family: 'JetBrains Mono', size: 11 } }
                }
            }
        }
    });
}

// --- Últimos movimentos ---
function renderUltimosMovimentos(movimentacoes) {
    const tbody = document.getElementById('ultimosMovTableBody');

    if (!movimentacoes || movimentacoes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="table-empty">Sem movimentos.</td></tr>`;
        return;
    }

    tbody.innerHTML = movimentacoes.slice(0, 6).map(m => {
        const badge = m.tipo === 'entrada'
            ? '<span class="badge badge-green">Entrada</span>'
            : m.tipo === 'saida'
            ? '<span class="badge badge-red">Saída</span>'
            : '<span class="badge badge-blue">Ajuste</span>';

        const data = new Date(m.data).toLocaleDateString('pt-AO', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
        });

        return `
            <tr>
                <td>${badge}</td>
                <td>${m.produto_nome}</td>
                <td class="mono">${m.quantidade_movimentada}</td>
                <td class="mono">${data}</td>
            </tr>
        `;
    }).join('');
}

// --- Notificações ---
function renderNotificacoes(alertas) {
    const list = document.getElementById('alertasList');

    if (!alertas || alertas.length === 0) {
        list.innerHTML = '<p class="table-empty">Nenhum alerta activo.</p>';
        return;
    }

    const rupturas   = alertas.filter(a => a.tipo_alerta === 'ruptura');
    const baixo      = alertas.filter(a => a.tipo_alerta === 'estoque_baixo');

    const items = [];

    if (rupturas.length > 0) items.push({
        cor: 'red',
        titulo: 'Ruptura crítica',
        desc: `${rupturas.length} produto(s) sem estoque`
    });

    if (baixo.length > 0) items.push({
        cor: 'orange',
        titulo: 'Estoque baixo',
        desc: `${baixo.length} produto(s) abaixo do mínimo`
    });

    if (items.length === 0) {
        list.innerHTML = '<p class="table-empty">Estoque em ordem.</p>';
        return;
    }

    list.innerHTML = items.map(i => `
        <div class="alerta-item">
            <div class="alerta-dot ${i.cor}"></div>
            <div class="alerta-texto">
                <div class="alerta-titulo">${i.titulo}</div>
                <div class="alerta-desc">${i.desc}</div>
            </div>
        </div>
    `).join('');
}

// --- Inicia ---
init();
