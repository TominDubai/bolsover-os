/* ===== Desktop (App Shell Controller) ===== */
const Desktop = (() => {
    const apps = [
        DashboardApp,
        ClientsApp,
        EnquiriesApp,
        ProjectsApp,
        QuotesApp,
        RFQApp,
        InvoicesApp,
        VariationsApp,
        ScheduleApp,
        SiteWorkApp,
        SubcontractorsApp,
        SettingsApp,
    ];

    function init() {
        // Register apps with router
        apps.forEach(app => Router.register(app.id, app));
        renderSidebar();
        SettingsApp.loadSavedSettings();
    }

    function renderSidebar() {
        const nav = document.getElementById('sidebar-nav');
        nav.innerHTML = '';
        apps.forEach(app => {
            const btn = document.createElement('button');
            btn.className = 'sidebar-nav-item';
            btn.dataset.app = app.id;
            btn.innerHTML = `${app.icon}<span>${app.name}</span>`;
            btn.addEventListener('click', () => Router.navigate(app.id));
            nav.appendChild(btn);
        });
    }

    // Auth flow
    async function boot() {
        SupabaseClient.init();

        const session = await SupabaseClient.getSession();
        if (session) {
            showDesktop(session.user);
        } else {
            showLogin();
        }

        SupabaseClient.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                showDesktop(session.user);
            } else if (event === 'SIGNED_OUT') {
                showLogin();
            }
        });
    }

    function showLogin() {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('app-shell').classList.add('hidden');
    }

    function showDesktop(user) {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app-shell').classList.remove('hidden');
        init();

        // Show user email in sidebar
        const nameEl = document.getElementById('sidebar-user-name');
        if (nameEl && user) {
            nameEl.textContent = user.email || '';
        }

        // Logout button
        document.getElementById('sidebar-logout').onclick = logout;

        // Default to Dashboard
        Router.navigate('dashboard');
    }

    async function logout() {
        try {
            await SupabaseClient.signOut();
        } catch (e) {
            console.error('Logout error:', e);
        }
        // Clear content area
        const area = document.getElementById('content-area');
        if (area) area.innerHTML = '';
        showLogin();
    }

    document.addEventListener('DOMContentLoaded', boot);

    return { getApps: () => apps, logout };
})();
