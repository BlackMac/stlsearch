/**
 * Web Application JavaScript
 * Handles authentication flow and main app functionality
 */

// View elements
const views = {
    loading: document.getElementById('auth-loading'),
    login: document.getElementById('login-view'),
    register: document.getElementById('register-view'),
    main: document.getElementById('main-view')
};

// Form elements
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginError = document.getElementById('login-error');
const registerError = document.getElementById('register-error');
const logoutBtn = document.getElementById('logout-btn');
const userEmailEl = document.getElementById('user-email');

// View toggle links
const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');

/**
 * Show a specific view and hide others
 */
function showView(viewName) {
    Object.entries(views).forEach(([name, el]) => {
        if (el) {
            el.style.display = name === viewName ? '' : 'none';
        }
    });
}

/**
 * Show error message in a form
 */
function showError(errorEl, message) {
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }
}

/**
 * Hide error message
 */
function hideError(errorEl) {
    if (errorEl) {
        errorEl.style.display = 'none';
    }
}

/**
 * Update UI based on auth state
 */
function updateAuthUI() {
    if (api.isAuthenticated()) {
        const user = api.currentUser();
        if (userEmailEl && user) {
            userEmailEl.textContent = user.email;
        }
        showView('main');
    } else {
        showView('login');
    }
}

/**
 * Handle login form submission
 */
async function handleLogin(e) {
    e.preventDefault();
    hideError(loginError);

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        await api.login(email, password);
        loginForm.reset();
        updateAuthUI();
    } catch (error) {
        console.error('Login failed:', error);
        showError(loginError, error.message || 'Invalid email or password');
    }
}

/**
 * Handle register form submission
 */
async function handleRegister(e) {
    e.preventDefault();
    hideError(registerError);

    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const passwordConfirm = document.getElementById('reg-password-confirm').value;

    if (password !== passwordConfirm) {
        showError(registerError, 'Passwords do not match');
        return;
    }

    try {
        await api.register(email, password, passwordConfirm);
        // Auto-login after registration
        await api.login(email, password);
        registerForm.reset();
        updateAuthUI();
    } catch (error) {
        console.error('Registration failed:', error);
        let message = 'Registration failed';
        if (error.data?.data?.email?.message) {
            message = error.data.data.email.message;
        } else if (error.data?.data?.password?.message) {
            message = error.data.data.password.message;
        } else if (error.message) {
            message = error.message;
        }
        showError(registerError, message);
    }
}

/**
 * Handle logout
 */
function handleLogout() {
    api.logout();
    updateAuthUI();
}

/**
 * Initialize the application
 */
function init() {
    // Set up event listeners
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    if (showRegisterLink) {
        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            hideError(loginError);
            showView('register');
        });
    }

    if (showLoginLink) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            hideError(registerError);
            showView('login');
        });
    }

    // Subscribe to auth state changes
    api.onAuthChange(() => {
        updateAuthUI();
    });

    // Initial auth check
    updateAuthUI();
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', init);


// =============================================================================
// EXAMPLE: CRUD with Realtime - Delete this section when building your own app
// =============================================================================
// This example works with the "todos" collection from the example migration.
// It demonstrates: list, create, update, delete, and realtime subscriptions.

/**
 * Example: Load and display todos for the current user
 */
async function loadTodos() {
    const container = document.getElementById('app-content');
    if (!container || !api.isAuthenticated()) return;

    try {
        const result = await api.list('todos', 1, 50, {
            sort: '-created',
            filter: api.filter('user = {:userId}', { userId: api.currentUser().id })
        });

        container.innerHTML = `
            <div class="todos-example">
                <h2>My Todos</h2>
                <form id="todo-form" class="todo-form">
                    <input type="text" id="todo-input" placeholder="Add a todo..." required>
                    <button type="submit">Add</button>
                </form>
                <ul id="todo-list" class="todo-list">
                    ${result.items.map(todo => todoItemHTML(todo)).join('')}
                </ul>
                ${result.items.length === 0 ? '<p class="empty-state">No todos yet. Add one above!</p>' : ''}
            </div>
        `;

        // Attach event listeners
        document.getElementById('todo-form').addEventListener('submit', handleAddTodo);
        document.querySelectorAll('.todo-toggle').forEach(el => {
            el.addEventListener('change', handleToggleTodo);
        });
        document.querySelectorAll('.todo-delete').forEach(el => {
            el.addEventListener('click', handleDeleteTodo);
        });
    } catch (error) {
        console.error('Failed to load todos:', error);
        container.innerHTML = `
            <div class="todos-example">
                <h2>Getting Started</h2>
                <p>The "todos" collection doesn't exist yet. Create it with Claude:</p>
                <pre style="background: var(--color-bg); padding: var(--spacing-md); border-radius: var(--radius); margin-top: var(--spacing-md); overflow-x: auto;">claude "Create a todos collection with title, completed, and user fields"</pre>
                <p style="margin-top: var(--spacing-md); color: var(--color-text-light);">Or check <code>CLAUDE.md</code> for a migration example.</p>
            </div>
        `;
    }
}

/**
 * Example: Generate HTML for a single todo item
 */
function todoItemHTML(todo) {
    return `
        <li class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
            <input type="checkbox" class="todo-toggle" ${todo.completed ? 'checked' : ''} data-id="${todo.id}">
            <span class="todo-title">${escapeHtml(todo.title)}</span>
            <button class="todo-delete" data-id="${todo.id}">&times;</button>
        </li>
    `;
}

/**
 * Example: Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Example: Add a new todo
 */
async function handleAddTodo(e) {
    e.preventDefault();
    const input = document.getElementById('todo-input');
    const title = input.value.trim();
    if (!title) return;

    try {
        await api.create('todos', {
            title,
            completed: false,
            user: api.currentUser().id
        });
        input.value = '';
        loadTodos(); // Reload list
    } catch (error) {
        console.error('Failed to add todo:', error);
    }
}

/**
 * Example: Toggle todo completion
 */
async function handleToggleTodo(e) {
    const id = e.target.dataset.id;
    const completed = e.target.checked;

    try {
        await api.update('todos', id, { completed });
    } catch (error) {
        console.error('Failed to update todo:', error);
        e.target.checked = !completed; // Revert on error
    }
}

/**
 * Example: Delete a todo
 */
async function handleDeleteTodo(e) {
    const id = e.target.dataset.id;

    try {
        await api.delete('todos', id);
        loadTodos(); // Reload list
    } catch (error) {
        console.error('Failed to delete todo:', error);
    }
}

/**
 * Example: Subscribe to realtime updates
 * Call this after authentication to get live updates
 */
function subscribeToTodos() {
    if (!api.isAuthenticated()) return;

    api.subscribe('todos', (data) => {
        console.log('Realtime update:', data.action, data.record);
        // Reload the list on any change (simple approach)
        // For better UX, handle each action type separately
        loadTodos();
    });
}

/**
 * Example: Unsubscribe when logging out
 */
function unsubscribeFromTodos() {
    api.unsubscribe('todos');
}

// Hook into auth state changes to load todos when logged in
const originalUpdateAuthUI = updateAuthUI;
updateAuthUI = function() {
    originalUpdateAuthUI();
    if (api.isAuthenticated()) {
        loadTodos();
        subscribeToTodos();
    } else {
        unsubscribeFromTodos();
    }
};
// =============================================================================
// END EXAMPLE
// =============================================================================
