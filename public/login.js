// Login functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    const currentUser = sessionStorage.getItem('currentUser');
    if (currentUser) {
        const user = JSON.parse(currentUser);
        redirectToDashboard(user.role);
    }
    
    // Handle login form submission
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
});

async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;
    
    const errorDiv = document.getElementById('loginError');
    errorDiv.style.display = 'none';
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password, role })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Store user session
            sessionStorage.setItem('currentUser', JSON.stringify(result.user));
            
            // Redirect to appropriate dashboard
            redirectToDashboard(result.user.role);
        } else {
            showError(result.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Network error. Please try again.');
    }
}

function showError(message) {
    const errorDiv = document.getElementById('loginError');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function redirectToDashboard(role) {
    window.location.href = `/dashboard.html?role=${role}`;
}