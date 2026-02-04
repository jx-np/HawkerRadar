import { loginUser } from '/js/modules/auth.js';

const form = document.getElementById('loginForm');
const msgEl = document.getElementById('loginMessage');

function showMessage(text, isError = true) {
    msgEl.textContent = text;
    msgEl.style.color = isError ? '#b00020' : '#0b5ed7';
}

if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        showMessage('');
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        if (!email || !password) {
            showMessage('Please provide both email and password.');
            return;
        }

        const res = await loginUser(email, password);
        console.log('loginUser result', res);

        // `internalError` returns an object like { error, reason, timestamp }
        // check for `reason` to detect failures (error may be null)
        if (res && res.reason) {
            showMessage(res.reason || 'Login failed');
            return;
        }

        showMessage('Login successful — redirecting...', false);

        setTimeout(() => {
        window.location.href = '/html/home/home.html';
        }, 700);
    });
}
