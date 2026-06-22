// ==============================
// WINONA STOCK — PRODUTOS
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

// --- Estado ---
let produtos = [];
let editandoId = null;

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

// --- Carrega produtos ---
async function carregarProdutos() {
    const tbody = document.getElementById('produtosTableBody');
    tbody.innerHTML = `<tr><td colspan="8" class="table-empty">A carregar...</td></tr>`;

    const ativo    = document.getElementById('filterAtivo').value;
    const search   = document.getElementById('searchInput').value.trim();
    const categoria = document.getElementById('filterCategoria').value;

    let query = '?';
    if (ativo)    query += `ativo=${ativo}&`;
    if (search)   query += `search=${encodeURIComponent(search)}&`;
    if (categoria) query += `categoria=${encodeURIComponent(categoria)}&`;

    produtos = await apiFetch(`/api/v1/produtos${query}`);

    if (!produtos) return;

    // Preenche filtro de categorias
    const categorias = [...new Set(produtos.map(p => p.categoria).filter(Boolean))];
    const select = document.getElementById('filterCategoria');
    const valorActual = select.value;
    select.innerHTML = '<option value="">Todas as categorias</option>';
    categorias.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        if (c === valorActual) opt.selected = true;
        select.appendChild(opt);
    });

    renderTabela(produtos);
}

// --- Renderiza tabela ---
function renderTabela(lista) {
    const tbody = document.getElementById('produtosTableBody');

    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="table-empty">Nenhum produto encontrado.</td></tr>`;
        return;
    }

    const podeEditar = ['admin', 'gestor'].includes(utilizador.perfil);

    tbody.innerHTML = lista.map(p => {
        const statusBadge = !p.ativo
            ? '<span class="badge badge-red">Inactivo</span>'
            : p.quantidade_atual === 0
            ? '<span class="badge badge-red">Sem estoque</span>'
            : p.quantidade_atual < p.estoque_minimo
            ? '<span class="badge badge-orange">Baixo</span>'
            : '<span class="badge badge-green">OK</span>';

        const preco = p.preco_venda
            ? Number(p.preco_venda).toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })
            : '—';

        const acoes = podeEditar ? `
            <div class="table-actions">
                <button class="btn-icon" onclick="abrirEdicao(${p.id})" title="Editar">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="btn-icon danger" onclick="desativarProduto(${p.id}, '${p.nome}')" title="Desactivar">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                </button>
            </div>` : '—';

        return `
            <tr>
                <td>${p.nome}</td>
                <td class="mono">${p.ume}</td>
                <td>${p.categoria || '—'}</td>
                <td class="mono">${p.quantidade_atual}</td>
                <td class="mono">${p.estoque_minimo}</td>
                <td class="mono">${preco}</td>
                <td>${statusBadge}</td>
                <td>${acoes}</td>
            </tr>
        `;
    }).join('');
}

// --- Modal ---
const modalOverlay = document.getElementById('modalOverlay');
const modalTitle   = document.getElementById('modalTitle');
const produtoForm  = document.getElementById('produtoForm');

function abrirModal(titulo) {
    modalTitle.textContent = titulo;
    modalOverlay.classList.remove('hidden');
}

function fecharModal() {
    modalOverlay.classList.add('hidden');
    produtoForm.reset();
    editandoId = null;
    document.getElementById('produtoId').value = '';
    document.getElementById('fieldDiasValidade').style.display = 'none';
    document.getElementById('fUmeError').textContent = '';
    document.getElementById('fNomeError').textContent = '';
}

document.getElementById('btnNovoProduto').addEventListener('click', () => {
    editandoId = null;
    abrirModal('Novo Produto');
});

document.getElementById('modalClose').addEventListener('click', fecharModal);
document.getElementById('btnCancelar').addEventListener('click', fecharModal);

modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) fecharModal();
});

// Toggle validade
document.getElementById('fPossuiValidade').addEventListener('change', (e) => {
    document.getElementById('fieldDiasValidade').style.display = e.target.checked ? 'block' : 'none';
});

// --- Abre edição ---
window.abrirEdicao = function(id) {
    const p = produtos.find(x => x.id === id);
    if (!p) return;

    editandoId = id;
    document.getElementById('produtoId').value = id;
    document.getElementById('fUme').value          = p.ume;
    document.getElementById('fNome').value         = p.nome;
    document.getElementById('fCategoria').value    = p.categoria || '';
    document.getElementById('fFornecedor').value   = p.fornecedor || '';
    document.getElementById('fPrecoCompra').value  = p.preco_compra || '';
    document.getElementById('fPrecoVenda').value   = p.preco_venda || '';
    document.getElementById('fEstoqueMinimo').value = p.estoque_minimo || 0;
    document.getElementById('fEstoqueMaximo').value = p.estoque_maximo || 0;
    document.getElementById('fLeadTime').value     = p.lead_time_dias || 0;
    document.getElementById('fPossuiValidade').checked = p.possui_validade;

    if (p.possui_validade) {
        document.getElementById('fieldDiasValidade').style.display = 'block';
        document.getElementById('fDiasValidade').value = p.dias_validade || '';
    }

    abrirModal('Editar Produto');
};

// --- Desactiva produto ---
window.desativarProduto = async function(id, nome) {
    if (!confirm(`Desactivar "${nome}"?`)) return;

    await apiFetch(`/api/v1/produtos/${id}`, { method: 'DELETE' });
    carregarProdutos();
};

// --- Submit form ---
produtoForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validação básica
    let valido = true;
    document.getElementById('fUmeError').textContent = '';
    document.getElementById('fNomeError').textContent = '';

    if (!document.getElementById('fUme').value.trim()) {
        document.getElementById('fUmeError').textContent = 'UME obrigatória';
        valido = false;
    }
    if (!document.getElementById('fNome').value.trim()) {
        document.getElementById('fNomeError').textContent = 'Nome obrigatório';
        valido = false;
    }
    if (!valido) return;

    const possuiValidade = document.getElementById('fPossuiValidade').checked;

    const body = {
        ume:             document.getElementById('fUme').value.trim(),
        nome:            document.getElementById('fNome').value.trim(),
        categoria:       document.getElementById('fCategoria').value.trim() || null,
        fornecedor:      document.getElementById('fFornecedor').value.trim() || null,
        preco_compra:    parseFloat(document.getElementById('fPrecoCompra').value) || null,
        preco_venda:     parseFloat(document.getElementById('fPrecoVenda').value) || null,
        estoque_minimo:  parseInt(document.getElementById('fEstoqueMinimo').value) || 0,
        estoque_maximo:  parseInt(document.getElementById('fEstoqueMaximo').value) || 0,
        lead_time_dias:  parseInt(document.getElementById('fLeadTime').value) || 0,
        possui_validade: possuiValidade,
        dias_validade:   possuiValidade ? parseInt(document.getElementById('fDiasValidade').value) || null : null,
    };

    const isEdicao = !!editandoId;
    const path     = isEdicao ? `/api/v1/produtos/${editandoId}` : '/api/v1/produtos';
    const method   = isEdicao ? 'PUT' : 'POST';

    const resultado = await apiFetch(path, { method, body: JSON.stringify(body) });

    if (resultado?.error) {
        alert(resultado.error);
        return;
    }

    fecharModal();
    carregarProdutos();
});

// --- Filtros em tempo real ---
let searchTimeout;
document.getElementById('searchInput').addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(carregarProdutos, 400);
});

document.getElementById('filterCategoria').addEventListener('change', carregarProdutos);
document.getElementById('filterAtivo').addEventListener('change', carregarProdutos);

// --- Inicia ---
carregarProdutos();
