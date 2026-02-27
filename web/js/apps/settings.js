const SettingsApp = (() => {
    const ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;

    const accentColors = [
        { name: 'Red', value: '#e94560' },
        { name: 'Blue', value: '#4a9eff' },
        { name: 'Green', value: '#28c840' },
        { name: 'Purple', value: '#a855f7' },
        { name: 'Orange', value: '#ff8c00' },
        { name: 'Pink', value: '#ec4899' },
        { name: 'Cyan', value: '#06b6d4' },
        { name: 'Yellow', value: '#eab308' },
    ];

    async function launch() {
        const user = await SupabaseClient.getUser();

        let colorHTML = accentColors.map((c, i) => {
            return `<div class="color-option ${i === 0 ? 'active' : ''}" data-color="${c.value}" style="background:${c.value}" title="${c.name}"></div>`;
        }).join('');

        const html = `
            <div class="settings">
                ${user ? `
                    <h3>Account</h3>
                    <div class="settings-user-info">
                        <div class="field"><span class="field-label">Email</span><span class="field-value">${user.email || '—'}</span></div>
                    </div>
                ` : ''}

                <h3>Accent Color</h3>
                <div class="settings-group" id="color-options">${colorHTML}</div>
            </div>
        `;

        WindowManager.createWindow('settings', 'Settings', html, {
            width: 420, height: 420,
            onReady: (win) => {
                win.querySelectorAll('.color-option').forEach(opt => {
                    opt.addEventListener('click', () => {
                        win.querySelectorAll('.color-option').forEach(o => o.classList.remove('active'));
                        opt.classList.add('active');
                        document.documentElement.style.setProperty('--accent', opt.dataset.color);
                        localStorage.setItem('bolsover-accent', opt.dataset.color);
                    });
                });
            }
        });
    }

    function loadSavedSettings() {
        const accent = localStorage.getItem('bolsover-accent');
        if (accent) {
            document.documentElement.style.setProperty('--accent', accent);
        }
    }

    return { id: 'settings', name: 'Settings', icon: ICON, launch, loadSavedSettings };
})();
