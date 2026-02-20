/* ===== Window Manager → Router Shim ===== */
const WindowManager = (() => {
    const contentArea = () => document.getElementById('content-area');
    const windows = new Map(); // kept for API compat (Desktop.logout iterates this)

    function createWindow(appId, title, contentHTML, options = {}) {
        const area = contentArea();
        // Clear previous content
        area.innerHTML = `<div class="window-body">${contentHTML}</div>`;

        // Highlight active sidebar item
        Router.setActive(appId);

        if (options.onReady) {
            options.onReady(area);
        }

        return { win: area, id: appId };
    }

    function closeWindow() {
        // No-op in sidebar mode
    }

    return { createWindow, closeWindow, windows };
})();

/* ===== Router ===== */
const Router = (() => {
    const appRegistry = {};

    function register(id, app) {
        appRegistry[id] = app;
    }

    function navigate(appId) {
        const app = appRegistry[appId];
        if (app) app.launch();
    }

    function setActive(appId) {
        document.querySelectorAll('.sidebar-nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.app === appId);
        });
    }

    return { register, navigate, setActive };
})();
