const FileManagerApp = (() => {
    const ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`;

    function launch() {
        const html = `
            <div class="file-manager">
                <div class="fm-toolbar">
                    <button data-action="up" title="Up">&#8593;</button>
                    <input class="fm-path" type="text" value="/home/user" spellcheck="false" readonly>
                    <button data-action="new-folder" title="New Folder">+&#128193;</button>
                    <button data-action="new-file" title="New File">+&#128196;</button>
                </div>
                <div class="fm-body"></div>
            </div>
        `;

        WindowManager.createWindow('filemanager', 'File Manager', html, {
            width: 600, height: 420,
            onReady: (win) => {
                let currentPath = '/home/user';
                const pathInput = win.querySelector('.fm-path');
                const body = win.querySelector('.fm-body');

                function render() {
                    pathInput.value = currentPath;
                    body.innerHTML = '';
                    const node = VirtualFS.getNode(currentPath);
                    if (!node || node.type !== 'dir') {
                        body.innerHTML = '<div style="padding:20px;color:var(--text-muted)">Directory not found</div>';
                        return;
                    }

                    const entries = Object.entries(node.children).sort(([,a], [,b]) => {
                        if (a.type === 'dir' && b.type !== 'dir') return -1;
                        if (a.type !== 'dir' && b.type === 'dir') return 1;
                        return 0;
                    });

                    for (const [name, child] of entries) {
                        const item = document.createElement('div');
                        item.className = `fm-item ${child.type === 'dir' ? 'folder' : ''}`;
                        const icon = child.type === 'dir'
                            ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`
                            : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
                        item.innerHTML = `${icon}<span>${name}</span>`;

                        item.addEventListener('dblclick', () => {
                            const fullPath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
                            if (child.type === 'dir') {
                                currentPath = fullPath;
                                render();
                            } else {
                                // Open in notepad
                                NotepadApp.launch();
                            }
                        });

                        body.appendChild(item);
                    }

                    if (entries.length === 0) {
                        body.innerHTML = '<div style="padding:20px;color:var(--text-muted)">Empty folder</div>';
                    }
                }

                win.querySelector('[data-action="up"]').addEventListener('click', () => {
                    if (currentPath !== '/') {
                        const parts = currentPath.split('/').filter(Boolean);
                        parts.pop();
                        currentPath = '/' + parts.join('/') || '/';
                        render();
                    }
                });

                win.querySelector('[data-action="new-folder"]').addEventListener('click', () => {
                    const name = prompt('Folder name:');
                    if (name) {
                        VirtualFS.mkdir(currentPath === '/' ? `/${name}` : `${currentPath}/${name}`);
                        render();
                    }
                });

                win.querySelector('[data-action="new-file"]').addEventListener('click', () => {
                    const name = prompt('File name:', 'untitled.txt');
                    if (name) {
                        VirtualFS.writeFile(currentPath === '/' ? `/${name}` : `${currentPath}/${name}`, '');
                        render();
                    }
                });

                render();
            }
        });
    }

    return { id: 'filemanager', name: 'Files', icon: ICON, launch };
})();
