const Taskbar = (() => {
    const windowItems = new Map();
    let currentUser = null;

    function init() {
        updateClock();
        setInterval(updateClock, 1000);

        document.getElementById('start-button').addEventListener('click', toggleStartMenu);

        // Close start menu on outside click
        document.addEventListener('mousedown', (e) => {
            const menu = document.getElementById('start-menu');
            const btn = document.getElementById('start-button');
            if (!menu.classList.contains('hidden') && !menu.contains(e.target) && !btn.contains(e.target)) {
                closeStartMenu();
            }
        });

        document.getElementById('start-power').addEventListener('click', () => {
            Desktop.logout();
        });

        populateStartMenu();
    }

    function updateClock() {
        const now = new Date();
        const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const date = now.toLocaleDateString([], { month: 'short', day: 'numeric' });
        document.getElementById('clock').textContent = `${time}  ${date}`;
    }

    function toggleStartMenu() {
        const menu = document.getElementById('start-menu');
        const btn = document.getElementById('start-button');
        menu.classList.toggle('hidden');
        btn.classList.toggle('active');
    }

    function closeStartMenu() {
        document.getElementById('start-menu').classList.add('hidden');
        document.getElementById('start-button').classList.remove('active');
    }

    function populateStartMenu() {
        const container = document.getElementById('start-menu-apps');
        container.innerHTML = '';
        Desktop.getApps().forEach(app => {
            const el = document.createElement('div');
            el.className = 'start-menu-app';
            el.innerHTML = `${app.icon}<span>${app.name}</span>`;
            el.addEventListener('click', () => {
                app.launch();
                closeStartMenu();
            });
            container.appendChild(el);
        });
    }

    function addWindowItem(winId, appId, title) {
        const bar = document.getElementById('taskbar-windows');
        const app = Desktop.getApps().find(a => a.id === appId);
        const btn = document.createElement('button');
        btn.className = 'taskbar-item active';
        btn.dataset.winId = winId;
        btn.innerHTML = `${app ? app.icon : ''}<span>${title}</span>`;
        btn.addEventListener('click', () => WindowManager.toggleWindow(winId));
        bar.appendChild(btn);
        windowItems.set(winId, btn);
    }

    function removeWindowItem(winId) {
        const btn = windowItems.get(winId);
        if (btn) btn.remove();
        windowItems.delete(winId);
    }

    function setActiveWindow(winId) {
        windowItems.forEach((btn, id) => {
            btn.classList.toggle('active', id === winId);
        });
    }

    function setUser(user) {
        currentUser = user;
        const tray = document.getElementById('system-tray');
        let userEl = tray.querySelector('#tray-user');
        if (!userEl) {
            userEl = document.createElement('div');
            userEl.id = 'tray-user';
            userEl.className = 'tray-user';
            tray.insertBefore(userEl, tray.firstChild);
        }
        const name = user?.email ? user.email.split('@')[0] : 'User';
        userEl.innerHTML = `
            <span class="tray-user-name">${name}</span>
            <button class="tray-logout" title="Sign out">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
            </button>
        `;
        userEl.querySelector('.tray-logout').addEventListener('click', () => Desktop.logout());
    }

    return { init, addWindowItem, removeWindowItem, setActiveWindow, closeStartMenu, setUser };
})();
