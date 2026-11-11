/* ============================================
   PAQUERA — Autenticação (login/cadastro)
   ============================================ */

// Toggle password visibility
function togglePassword(id) {
    const input = document.getElementById(id);
    input.type = input.type === 'password' ? 'text' : 'password';
}

// Social login simulation
function socialLogin(provider) {
    alert(`Login com ${provider} será conectado em breve! 🚀`);
}

// Login form
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorEl = document.getElementById('loginError');

        if (!email || !password) {
            errorEl.textContent = 'Por favor, preencha todos os campos.';
            return;
        }

        // Simulação de login — em produção, conectar a API
        errorEl.textContent = '';
        loginForm.querySelector('button[type="submit"]').textContent = 'Entrando...';

        setTimeout(() => {
            window.location.href = 'app/dashboard.html';
        }, 800);
    });
}

// Register form
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const birthdate = document.getElementById('birthdate').value;
        const terms = document.getElementById('terms').checked;
        const errorEl = document.getElementById('registerError');

        if (!name || !email || !password || !birthdate) {
            errorEl.textContent = 'Por favor, preencha todos os campos.';
            return;
        }
        if (password.length < 8) {
            errorEl.textContent = 'A senha deve ter no mínimo 8 caracteres.';
            return;
        }
        if (!terms) {
            errorEl.textContent = 'Você precisa aceitar os termos de uso.';
            return;
        }

        // Verificar idade mínima
        const birth = new Date(birthdate);
        const age = (new Date() - birth) / (365.25 * 24 * 3600 * 1000);
        if (age < 18) {
            errorEl.textContent = 'Você precisa ter pelo menos 18 anos para se cadastrar.';
            return;
        }

        // Simulação de cadastro — em produção, conectar a API
        errorEl.textContent = '';
        registerForm.querySelector('button[type="submit"]').textContent = 'Criando conta...';

        setTimeout(() => {
            window.location.href = 'app/dashboard.html';
        }, 800);
    });
}
