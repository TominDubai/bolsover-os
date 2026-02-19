const NotepadApp = (() => {
    const ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;

    function launch() {
        const html = `
            <div class="notepad">
                <div class="notepad-toolbar">
                    <button data-action="new">New</button>
                    <button data-action="open">Open</button>
                    <button data-action="save">Save</button>
                    <button data-action="save-as">Save As</button>
                </div>
                <textarea class="notepad-textarea" placeholder="Start typing..." spellcheck="false"></textarea>
                <div class="notepad-status">Untitled — 0 characters</div>
            </div>
        `;

        WindowManager.createWindow('notepad', 'Notepad', html, {
            width: 600, height: 450,
            onReady: (win, winId) => {
                const textarea = win.querySelector('.notepad-textarea');
                const status = win.querySelector('.notepad-status');
                let currentPath = null;

                textarea.addEventListener('input', () => {
                    const name = currentPath ? currentPath.split('/').pop() : 'Untitled';
                    status.textContent = `${name} — ${textarea.value.length} characters`;
                });

                win.querySelector('[data-action="new"]').addEventListener('click', () => {
                    textarea.value = '';
                    currentPath = null;
                    status.textContent = 'Untitled — 0 characters';
                    updateTitle(winId, 'Notepad');
                });

                win.querySelector('[data-action="open"]').addEventListener('click', () => {
                    const path = prompt('Enter file path to open:', '/home/user/Documents/');
                    if (!path) return;
                    const content = VirtualFS.readFile(path);
                    if (content !== null) {
                        textarea.value = content;
                        currentPath = path;
                        const name = path.split('/').pop();
                        status.textContent = `${name} — ${content.length} characters`;
                        updateTitle(winId, `Notepad — ${name}`);
                    } else {
                        alert('File not found: ' + path);
                    }
                });

                win.querySelector('[data-action="save"]').addEventListener('click', () => {
                    if (currentPath) {
                        VirtualFS.writeFile(currentPath, textarea.value);
                        status.textContent = `${currentPath.split('/').pop()} — saved`;
                    } else {
                        saveAs();
                    }
                });

                win.querySelector('[data-action="save-as"]').addEventListener('click', saveAs);

                function saveAs() {
                    const path = prompt('Save as:', currentPath || '/home/user/Documents/untitled.txt');
                    if (!path) return;
                    VirtualFS.writeFile(path, textarea.value);
                    currentPath = path;
                    const name = path.split('/').pop();
                    status.textContent = `${name} — saved`;
                    updateTitle(winId, `Notepad — ${name}`);
                }

                textarea.focus();
            }
        });
    }

    function updateTitle(winId, title) {
        const win = document.getElementById(winId);
        if (win) win.querySelector('.window-title').textContent = title;
    }

    return { id: 'notepad', name: 'Notepad', icon: ICON, launch };
})();
