import { registerUser } from '/js/modules/auth.js';

const form = document.getElementById('registerForm');
const msgEl = document.getElementById('registerMessage');

function showMessage(text, isError = true) {
    msgEl.textContent = text;
    msgEl.style.color = isError ? '#b00020' : '#0b5ed7';
}

if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        showMessage('');

        const fullName = document.getElementById('fullName').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const role = document.getElementById('role').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (!fullName || !email || !role || !password) {
            showMessage('Please fill all required fields.');
            return;
        }

        if (password !== confirmPassword) {
            showMessage('Passwords do not match.');
            return;
        }

        try {
            // Call auth module register
            const payload = { email, password, name: fullName, contactNo: phone, role };
            const res = await registerUser(payload);
            
            if (res && res.reason) {
                showMessage(res.reason || 'Registration failed');
                return;
            }
            
            console.log('Registration successful:', res);
            showMessage('Registration successful — redirecting to login...', false);
            // added delay for feel
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 900);
        } catch (error) {
            console.error('Registration error:', error);
            showMessage(error.message || 'Registration failed');
        }
    });
}
