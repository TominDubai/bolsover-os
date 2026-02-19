const BrowserApp = (() => {
    const ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><ellipse cx="12" cy="12" rx="4" ry="10"/><line x1="2" y1="12" x2="22" y2="12"/></svg>`;

    function launch() {
        const html = `
            <div class="browser">
                <div class="browser-toolbar">
                    <button data-action="back" title="Back">&#8592;</button>
                    <button data-action="forward" title="Forward">&#8594;</button>
                    <button data-action="reload" title="Reload">&#8635;</button>
                    <input class="browser-url" type="text" value="https://wikipedia.org" placeholder="Enter URL..." spellcheck="false">
                    <button data-action="go" title="Go">&#8594;</button>
                </div>
                <iframe class="browser-iframe" src="https://wikipedia.org" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>
            </div>
        `;

        WindowManager.createWindow('browser', 'Browser', html, {
            width: 900, height: 600,
            onReady: (win) => {
                const iframe = win.querySelector('.browser-iframe');
                const urlBar = win.querySelector('.browser-url');

                function navigate(url) {
                    if (url && !url.match(/^https?:\/\//)) url = 'https://' + url;
                    urlBar.value = url;
                    iframe.src = url;
                }

                urlBar.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') navigate(urlBar.value.trim());
                });

                win.querySelector('[data-action="go"]').addEventListener('click', () => navigate(urlBar.value.trim()));
                win.querySelector('[data-action="back"]').addEventListener('click', () => { try { iframe.contentWindow.history.back(); } catch(e) {} });
                win.querySelector('[data-action="forward"]').addEventListener('click', () => { try { iframe.contentWindow.history.forward(); } catch(e) {} });
                win.querySelector('[data-action="reload"]').addEventListener('click', () => { iframe.src = iframe.src; });
            }
        });
    }

    return { id: 'browser', name: 'Browser', icon: ICON, launch };
})();
