import { loginUser } from '../modules/auth.js';

// New login.html places the form inside `.auth-form` — select it flexibly
const form = document.querySelector('.auth-form form') || document.querySelector('form');

// create or find a message element inside the form
let msgEl = document.getElementById('loginMessage');
if (!msgEl && form) {
    msgEl = document.createElement('div');
    msgEl.id = 'loginMessage';
    msgEl.className = 'auth-message';
    msgEl.style.marginTop = '10px';
    form.appendChild(msgEl);
}

function showMessage(text, isError = true) {
    if (!msgEl) return;
    msgEl.textContent = text;
    msgEl.style.color = isError ? '#b00020' : '#0b5ed7';
}

// password toggle button
function setupPasswordToggle() {
    const toggle = document.querySelector('.toggle-password');
    const passwordInput = document.getElementById('password');
    if (!toggle || !passwordInput) return;

    toggle.addEventListener('click', (e) => {
        e.preventDefault();
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggle.textContent = 'Show';
        } else {
            passwordInput.type = 'password';
            toggle.textContent = 'Hide';
        }
    });
}

setupPasswordToggle();

if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        showMessage('');
        const emailEl = document.getElementById('email');
        const passEl = document.getElementById('password');
        const email = emailEl ? emailEl.value.trim() : '';
        const password = passEl ? passEl.value : '';

        if (!email || !password) {
            showMessage('Please provide both email and password.');
            return;
        }

        try {
            const res = await loginUser(email, password);
            
            if (res && res.reason) {
                showMessage(res.reason || 'Login failed');
                return;
            }
            
            console.log('Login successful:', res);
            showMessage('Login successful — redirecting...', false);
            setTimeout(() => {
                window.location.href = '/html/home/home.html';
            }, 700);
        } catch (error) {
            console.error('Login error:', error);
            showMessage(error.message || 'Login failed');
        }
    });
}
