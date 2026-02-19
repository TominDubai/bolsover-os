const WindowManager = (() => {
    const windows = new Map();
    let topZ = 100;
    let idCounter = 0;
    const container = () => document.getElementById('windows-container');

    function createWindow(appId, title, contentHTML, options = {}) {
        const id = `win-${++idCounter}`;
        const width = options.width || 700;
        const height = options.height || 480;
        const x = 60 + (idCounter % 8) * 30;
        const y = 40 + (idCounter % 8) * 30;

        const win = document.createElement('div');
        win.className = 'window';
        win.id = id;
        win.style.cssText = `left:${x}px;top:${y}px;width:${width}px;height:${height}px;z-index:${++topZ}`;

        win.innerHTML = `
            <div class="window-header">
                <span class="window-title">${title}</span>
                <div class="window-controls">
                    <button class="btn-minimize" title="Minimize"></button>
                    <button class="btn-maximize" title="Maximize"></button>
                    <button class="btn-close" title="Close"></button>
                </div>
            </div>
            <div class="window-body">${contentHTML}</div>
            <div class="resize-handle n"></div>
            <div class="resize-handle s"></div>
            <div class="resize-handle e"></div>
            <div class="resize-handle w"></div>
            <div class="resize-handle ne"></div>
            <div class="resize-handle nw"></div>
            <div class="resize-handle se"></div>
            <div class="resize-handle sw"></div>
        `;

        container().appendChild(win);

        const state = {
            id, appId, title,
            minimized: false,
            maximized: false,
            prevBounds: null,
        };
        windows.set(id, state);

        // Focus on click
        win.addEventListener('mousedown', () => focusWindow(id));

        // Header drag
        const header = win.querySelector('.window-header');
        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('.window-controls')) return;
            startDrag(e, win, state);
        });

        // Double-click header to maximize
        header.addEventListener('dblclick', () => toggleMaximize(id));

        // Controls
        win.querySelector('.btn-close').addEventListener('click', () => closeWindow(id));
        win.querySelector('.btn-minimize').addEventListener('click', () => minimizeWindow(id));
        win.querySelector('.btn-maximize').addEventListener('click', () => toggleMaximize(id));

        // Resize handles
        win.querySelectorAll('.resize-handle').forEach(handle => {
            handle.addEventListener('mousedown', (e) => startResize(e, win, handle, state));
        });

        focusWindow(id);
        Taskbar.addWindowItem(id, appId, title);

        if (options.onReady) {
            options.onReady(win, id);
        }

        return { win, id };
    }

    function focusWindow(id) {
        const win = document.getElementById(id);
        if (!win) return;
        win.style.zIndex = ++topZ;
        Taskbar.setActiveWindow(id);
    }

    function minimizeWindow(id) {
        const win = document.getElementById(id);
        const state = windows.get(id);
        if (!win || !state) return;
        state.minimized = true;
        win.classList.add('minimized');
        Taskbar.setActiveWindow(null);
    }

    function restoreWindow(id) {
        const win = document.getElementById(id);
        const state = windows.get(id);
        if (!win || !state) return;
        state.minimized = false;
        win.classList.remove('minimized');
        focusWindow(id);
    }

    function toggleMaximize(id) {
        const win = document.getElementById(id);
        const state = windows.get(id);
        if (!win || !state) return;

        if (state.maximized) {
            win.classList.remove('maximized');
            if (state.prevBounds) {
                win.style.left = state.prevBounds.left;
                win.style.top = state.prevBounds.top;
                win.style.width = state.prevBounds.width;
                win.style.height = state.prevBounds.height;
            }
            state.maximized = false;
        } else {
            state.prevBounds = {
                left: win.style.left,
                top: win.style.top,
                width: win.style.width,
                height: win.style.height,
            };
            win.classList.add('maximized');
            state.maximized = true;
        }
    }

    function closeWindow(id) {
        const win = document.getElementById(id);
        if (win) win.remove();
        windows.delete(id);
        Taskbar.removeWindowItem(id);
    }

    function startDrag(e, win, state) {
        if (state.maximized) return;
        e.preventDefault();
        const startX = e.clientX;
        const startY = e.clientY;
        const origLeft = win.offsetLeft;
        const origTop = win.offsetTop;

        function onMove(ev) {
            win.style.left = origLeft + (ev.clientX - startX) + 'px';
            win.style.top = origTop + (ev.clientY - startY) + 'px';
        }
        function onUp() {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }

    function startResize(e, win, handle, state) {
        if (state.maximized) return;
        e.preventDefault();
        e.stopPropagation();
        const dir = [...handle.classList].find(c => c !== 'resize-handle');
        const startX = e.clientX;
        const startY = e.clientY;
        const origW = win.offsetWidth;
        const origH = win.offsetHeight;
        const origL = win.offsetLeft;
        const origT = win.offsetTop;
        const minW = 320;
        const minH = 200;

        function onMove(ev) {
            const dx = ev.clientX - startX;
            const dy = ev.clientY - startY;

            if (dir.includes('e')) win.style.width = Math.max(minW, origW + dx) + 'px';
            if (dir.includes('s')) win.style.height = Math.max(minH, origH + dy) + 'px';
            if (dir.includes('w')) {
                const newW = Math.max(minW, origW - dx);
                win.style.width = newW + 'px';
                win.style.left = origL + (origW - newW) + 'px';
            }
            if (dir.includes('n')) {
                const newH = Math.max(minH, origH - dy);
                win.style.height = newH + 'px';
                win.style.top = origT + (origH - newH) + 'px';
            }
        }
        function onUp() {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }

    function toggleWindow(id) {
        const state = windows.get(id);
        if (!state) return;
        if (state.minimized) {
            restoreWindow(id);
        } else {
            const win = document.getElementById(id);
            if (win && parseInt(win.style.zIndex) === topZ) {
                minimizeWindow(id);
            } else {
                focusWindow(id);
            }
        }
    }

    return { createWindow, closeWindow, focusWindow, minimizeWindow, restoreWindow, toggleMaximize, toggleWindow, windows };
})();
