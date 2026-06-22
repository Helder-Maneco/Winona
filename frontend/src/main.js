// ==============================
// WINONA STOCK — LOGIN
// ==============================

const API_URL = 'http://localhost:3000';

// --- Elementos ---
const form       = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const senhaInput = document.getElementById('senha');
const emailError = document.getElementById('emailError');
const senhaError = document.getElementById('senhaError');
const formError  = document.getElementById('formError');
const submitBtn  = document.getElementById('submitBtn');
const btnText    = document.getElementById('btnText');
const btnLoader  = document.getElementById('btnLoader');
const toggleBtn  = document.getElementById('toggleSenha');

// --- Redireciona se já tem sessão ---
if (localStorage.getItem('token')) {
    window.location.href = '/dashboard.html';
}

// --- Toggle mostrar/ocultar senha ---
toggleBtn.addEventListener('click', () => {
    const visivel = senhaInput.type === 'text';
    senhaInput.type = visivel ? 'password' : 'text';
    toggleBtn.innerHTML = visivel
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
             <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
             <circle cx="12" cy="12" r="3"/>
           </svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
             <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
             <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
             <line x1="1" y1="1" x2="23" y2="23"/>
           </svg>`;
});

// --- Validação ---
function validar() {
    let valido = true;

    emailError.textContent = '';
    senhaError.textContent = '';

    if (!emailInput.value.trim()) {
        emailError.textContent = 'Email obrigatório';
        valido = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value)) {
        emailError.textContent = 'Email inválido';
        valido = false;
    }

    if (!senhaInput.value) {
        senhaError.textContent = 'Senha obrigatória';
        valido = false;
    } else if (senhaInput.value.length < 6) {
        senhaError.textContent = 'Mínimo 6 caracteres';
        valido = false;
    }

    return valido;
}

// --- Estado do botão ---
function setLoading(loading) {
    submitBtn.disabled = loading;
    btnText.classList.toggle('hidden', loading);
    btnLoader.classList.toggle('hidden', !loading);
}

function mostrarErro(msg) {
    formError.textContent = msg;
    formError.classList.remove('hidden');
}

function ocultarErro() {
    formError.classList.add('hidden');
}

// --- Submit ---
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    ocultarErro();

    if (!validar()) return;

    setLoading(true);

    try {
        const res = await fetch(`${API_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: emailInput.value.trim(),
                senha: senhaInput.value
            })
        });

        const data = await res.json();

        if (!res.ok) {
            mostrarErro(data.error || 'Erro ao entrar. Tente novamente.');
            return;
        }

        // Guarda token e dados do utilizador
        localStorage.setItem('token', data.token);
        localStorage.setItem('utilizador', JSON.stringify(data.utilizador));

        // Redireciona para o dashboard
        window.location.href = '/dashboard.html';

    } catch {
        mostrarErro('Sem ligação ao servidor. Verifique a sua conexão.');
    } finally {
        setLoading(false);
    }
});
