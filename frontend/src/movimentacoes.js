// ==============================
// WINONA STOCK — MOVIMENTAÇÕES
// ==============================

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
async function apiFetch(path, options = {}) {
    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers
        }
    });

    if (res.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/index.html';
        return null;
    }

    return res.json();
}

// --- Carrega movimentações ---
async function carregarMovimentacoes() {
    const tbody = document.getElementById('movTableBody');
    tbody.innerHTML = `<tr><td colspan="8" class="table-empty">A carregar...</td></tr>`;

    const tipo       = document.getElementById('filterTipo').value;
    const dataInicio = document.getElementById('filterDataInicio').value;
    const dataFim    = document.getElementById('filterDataFim').value;

    let query = '?';
    if (tipo)       query += `tipo=${tipo}&`;
    if (dataInicio) query += `data_inicio=${dataInicio}&`;
    if (dataFim)    query += `data_fim=${dataFim}&`;

    const movs = await apiFetch(`/api/v1/movimentacoes${query}`);
    if (!movs) return;

    if (movs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="table-empty">Nenhuma movimentação encontrada.</td></tr>`;
        return;
    }

    tbody.innerHTML = movs.map(m => {
        const tipoBadge =
            m.tipo === 'entrada' ? '<span class="badge badge-green">Entrada</span>' :
            m.tipo === 'saida'   ? '<span class="badge badge-red">Saída</span>' :
                                   '<span class="badge badge-blue">Ajuste</span>';

        const custo = m.custo_unitario
            ? Number(m.custo_unitario).toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })
            : '—';

        const data = new Date(m.data).toLocaleString('pt-AO', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        return `
            <tr>
                <td>${m.produto_nome}</td>
                <td class="mono">${m.ume}</td>
                <td>${tipoBadge}</td>
                <td class="mono">${m.quantidade_movimentada}</td>
                <td class="mono">${custo}</td>
                <td>${m.usuario_nome}</td>
                <td class="mono">${data}</td>
                <td>${m.observacao || '—'}</td>
            </tr>
        `;
    }).join('');
}

// --- Carrega produtos para o select ---
async function carregarProdutosSelect() {
    const produtos = await apiFetch('/api/v1/produtos?ativo=true');
    if (!produtos) return;

    const select = document.getElementById('fProduto');
    select.innerHTML = '<option value="">Seleccione um produto...</option>';
    produtos.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.nome} (${p.ume}) — stock: ${p.quantidade_atual}`;
        select.appendChild(opt);
    });
}

// --- Modal ---
const modalOverlay = document.getElementById('modalOverlay');

function abrirModal() {
    carregarProdutosSelect();
    modalOverlay.classList.remove('hidden');
}

function fecharModal() {
    modalOverlay.classList.add('hidden');
    document.getElementById('movForm').reset();
    document.getElementById('fProdutoError').textContent = '';
    document.getElementById('fTipoError').textContent = '';
    document.getElementById('fQuantidadeError').textContent = '';
    document.getElementById('hintAjuste').classList.add('hidden');
}

document.getElementById('btnNovaMovimentacao').addEventListener('click', abrirModal);
document.getElementById('modalClose').addEventListener('click', fecharModal);
document.getElementById('btnCancelar').addEventListener('click', fecharModal);
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) fecharModal();
});

// Hint de ajuste
document.getElementById('fTipo').addEventListener('change', (e) => {
    const hint = document.getElementById('hintAjuste');
    const label = document.getElementById('labelQuantidade');
    if (e.target.value === 'ajuste') {
        hint.classList.remove('hidden');
        label.textContent = 'Quantidade (valor absoluto) *';
    } else {
        hint.classList.add('hidden');
        label.textContent = 'Quantidade *';
    }
});

// --- Submit ---
document.getElementById('movForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Limpa erros
    document.getElementById('fProdutoError').textContent = '';
    document.getElementById('fTipoError').textContent = '';
    document.getElementById('fQuantidadeError').textContent = '';

    const produto_id           = document.getElementById('fProduto').value;
    const tipo                 = document.getElementById('fTipo').value;
    const quantidade_movimentada = parseInt(document.getElementById('fQuantidade').value);
    const custo_unitario       = parseFloat(document.getElementById('fCusto').value) || null;
    const observacao           = document.getElementById('fObservacao').value.trim() || null;

    // Validação
    let valido = true;
    if (!produto_id) {
        document.getElementById('fProdutoError').textContent = 'Seleccione um produto';
        valido = false;
    }
    if (!tipo) {
        document.getElementById('fTipoError').textContent = 'Seleccione o tipo';
        valido = false;
    }
    if (!quantidade_movimentada || quantidade_movimentada <= 0) {
        document.getElementById('fQuantidadeError').textContent = 'Quantidade deve ser maior que zero';
        valido = false;
    }
    if (!valido) return;

    const resultado = await apiFetch('/api/v1/movimentacoes', {
        method: 'POST',
        body: JSON.stringify({ produto_id, tipo, quantidade_movimentada, custo_unitario, observacao })
    });

    if (!resultado) return;

    if (resultado.error) {
        if (resultado.error === 'Stock insuficiente') {
            document.getElementById('fQuantidadeError').textContent =
                `Stock insuficiente — disponível: ${resultado.disponivel}`;
        } else {
            alert(resultado.error);
        }
        return;
    }

    fecharModal();
    carregarMovimentacoes();
});

// --- Filtros ---
document.getElementById('btnFiltrar').addEventListener('click', carregarMovimentacoes);
document.getElementById('btnLimpar').addEventListener('click', () => {
    document.getElementById('filterTipo').value = '';
    document.getElementById('filterDataInicio').value = '';
    document.getElementById('filterDataFim').value = '';
    carregarMovimentacoes();
});

// --- Inicia ---
carregarMovimentacoes();
