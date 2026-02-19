/* ===== Virtual Filesystem ===== */
const VirtualFS = (() => {
    const STORAGE_KEY = 'bolsover-fs';

    const defaultFS = {
        type: 'dir',
        children: {
            home: {
                type: 'dir',
                children: {
                    user: {
                        type: 'dir',
                        children: {
                            Documents: { type: 'dir', children: {
                                'readme.txt': { type: 'file', content: 'Welcome to Bolsover OS!\n\nThis is your Documents folder.' },
                                'notes.txt': { type: 'file', content: 'My notes go here.' },
                            }},
                            Desktop: { type: 'dir', children: {} },
                            Downloads: { type: 'dir', children: {} },
                            Pictures: { type: 'dir', children: {} },
                        }
                    }
                }
            },
            etc: { type: 'dir', children: {
                'hostname': { type: 'file', content: 'bolsover' },
                'os-release': { type: 'file', content: 'NAME="Bolsover OS"\nVERSION="2.0"' },
            }},
            tmp: { type: 'dir', children: {} },
        }
    };

    function load() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try { return JSON.parse(saved); } catch(e) {}
        }
        return JSON.parse(JSON.stringify(defaultFS));
    }

    let root = load();

    function save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(root));
    }

    function getNode(path) {
        if (path === '/') return root;
        const parts = path.split('/').filter(Boolean);
        let node = root;
        for (const part of parts) {
            if (!node || node.type !== 'dir' || !node.children[part]) return null;
            node = node.children[part];
        }
        return node;
    }

    function getParentAndName(path) {
        const parts = path.split('/').filter(Boolean);
        const name = parts.pop();
        const parentPath = '/' + parts.join('/');
        const parent = getNode(parentPath || '/');
        return { parent, name };
    }

    function mkdir(path) {
        const { parent, name } = getParentAndName(path);
        if (!parent || parent.type !== 'dir' || !name) return false;
        if (parent.children[name]) return false;
        parent.children[name] = { type: 'dir', children: {} };
        save();
        return true;
    }

    function writeFile(path, content) {
        const { parent, name } = getParentAndName(path);
        if (!parent || parent.type !== 'dir' || !name) return false;
        parent.children[name] = { type: 'file', content };
        save();
        return true;
    }

    function readFile(path) {
        const node = getNode(path);
        if (!node || node.type !== 'file') return null;
        return node.content;
    }

    function remove(path) {
        const { parent, name } = getParentAndName(path);
        if (!parent || parent.type !== 'dir' || !parent.children[name]) return false;
        delete parent.children[name];
        save();
        return true;
    }

    return { getNode, mkdir, writeFile, readFile, remove };
})();

/* ===== Desktop ===== */
const Desktop = (() => {
    const apps = [
        DashboardApp,
        ProjectsApp,
        ClientsApp,
        SubcontractorsApp,
        EnquiriesApp,
        TerminalApp,
        NotepadApp,
        SettingsApp,
    ];

    function init() {
        renderIcons();
        setupContextMenu();
        SettingsApp.loadSavedSettings();
        Taskbar.init();
    }

    function getApps() {
        return apps;
    }

    function renderIcons() {
        const container = document.getElementById('desktop-icons');
        container.innerHTML = '';
        apps.forEach(app => {
            const icon = document.createElement('div');
            icon.className = 'desktop-icon';
            icon.innerHTML = `${app.icon}<span>${app.name}</span>`;
            icon.addEventListener('dblclick', () => app.launch());
            icon.addEventListener('click', (e) => {
                document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
                icon.classList.add('selected');
            });
            container.appendChild(icon);
        });
    }

    function setupContextMenu() {
        const menu = document.getElementById('context-menu');

        document.getElementById('desktop').addEventListener('contextmenu', (e) => {
            if (e.target.closest('.window') || e.target.closest('#taskbar')) return;
            e.preventDefault();
            menu.style.left = e.clientX + 'px';
            menu.style.top = e.clientY + 'px';
            menu.classList.remove('hidden');
        });

        document.addEventListener('click', () => menu.classList.add('hidden'));

        menu.querySelectorAll('.context-item').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.dataset.action;
                if (action === 'change-wallpaper') SettingsApp.launch();
                if (action === 'refresh') location.reload();
                if (action === 'new-folder') {
                    const name = prompt('Folder name:');
                    if (name) VirtualFS.mkdir(`/home/user/Desktop/${name}`);
                }
            });
        });

        // Click desktop to deselect icons
        document.getElementById('desktop').addEventListener('click', (e) => {
            if (e.target === e.currentTarget || e.target.id === 'desktop-icons') {
                document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
            }
        });
    }

    // Auth-aware init
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
        document.getElementById('desktop').classList.add('hidden');
        document.getElementById('taskbar').classList.add('hidden');
        document.getElementById('start-menu').classList.add('hidden');
    }

    function showDesktop(user) {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('desktop').classList.remove('hidden');
        document.getElementById('taskbar').classList.remove('hidden');
        init();
        Taskbar.setUser(user);
    }

    async function logout() {
        try {
            await SupabaseClient.signOut();
        } catch (e) {
            console.error('Logout error:', e);
        }
        // Close all windows
        WindowManager.windows.forEach((state, id) => {
            WindowManager.closeWindow(id);
        });
        showLogin();
    }

    document.addEventListener('DOMContentLoaded', boot);

    return { getApps, logout };
})();
