// ==============================
// WINONA STOCK — DASHBOARD
// ==============================

const API_URL = 'http://localhost:3000';

// --- Auth guard ---
const token = localStorage.getItem('token');
const utilizador = JSON.parse(localStorage.getItem('utilizador') || '{}');

if (!token) {
    window.location.href = '/index.html';
}

// --- Preenche dados do utilizador na sidebar ---
document.getElementById('userName').textContent = utilizador.nome || 'Utilizador';
document.getElementById('userRole').textContent = utilizador.perfil || '';
document.getElementById('userAvatar').textContent = (utilizador.nome || 'U')[0].toUpperCase();

// --- Logout ---
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('utilizador');
    window.location.href = '/index.html';
});

// --- Helper: fetch autenticado ---
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

// --- Carrega métricas ---
async function carregarMetricas() {
    const [produtos, alertas, resumo] = await Promise.all([
        apiFetch('/api/v1/produtos?ativo=true'),
        apiFetch('/api/v1/produtos/alertas'),
        apiFetch('/api/v1/movimentacoes/resumo')
    ]);

    // Total de produtos
    if (produtos) {
        document.getElementById('totalProdutos').textContent = produtos.length;
    }

    // Alertas activos
    if (alertas) {
        document.getElementById('totalAlertas').textContent = alertas.length;
        renderAlertas(alertas);
    }

    // Entradas e saídas do mês
    if (resumo) {
        const entradas = resumo.find(r => r.tipo === 'entrada');
        const saidas = resumo.find(r => r.tipo === 'saida');

        document.getElementById('totalEntradas').textContent =
            entradas ? Number(entradas.total_quantidade).toLocaleString('pt-AO') : '0';
        document.getElementById('totalSaidas').textContent =
            saidas ? Number(saidas.total_quantidade).toLocaleString('pt-AO') : '0';
    }
}

// --- Renderiza tabela de alertas ---
function renderAlertas(alertas) {
    const tbody = document.getElementById('alertasTableBody');

    if (alertas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Nenhum alerta activo. Estoque em ordem.</td></tr>`;
        return;
    }

    tbody.innerHTML = alertas.slice(0, 8).map(a => {
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

// --- Inicia ---
carregarMetricas();
