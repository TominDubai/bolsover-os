/* ===== Clients App ===== */
const ClientsApp = (() => {
    const ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;

    async function launch() {
        const html = `
            <div class="app-container clients">
                <div class="app-loading">Loading clients...</div>
            </div>
        `;

        WindowManager.createWindow('clients', 'Clients', html, {
            width: 800, height: 560,
            onReady: async (win) => {
                await loadClients(win);
            }
        });
    }

    async function loadClients(win) {
        const body = win.querySelector('.app-container');
        try {
            const [clientsRes, projectsRes] = await Promise.all([
                SupabaseClient.from('clients').select('*').order('name', { ascending: true }),
                SupabaseClient.from('projects').select('client_id'),
            ]);

            if (clientsRes.error) throw clientsRes.error;

            const clients = clientsRes.data || [];
            const projectCounts = (projectsRes.data || []).reduce((acc, p) => {
                if (p.client_id) acc[p.client_id] = (acc[p.client_id] || 0) + 1;
                return acc;
            }, {});

            body.innerHTML = `
                <div class="app-toolbar">
                    <input type="text" class="app-search" placeholder="Search clients..." id="client-search">
                    <button class="import-btn" id="client-new-btn">+ New Client</button>
                </div>
                <div class="client-grid" id="client-grid"></div>
            `;

            const grid = body.querySelector('#client-grid');
            const search = body.querySelector('#client-search');

            body.querySelector('#client-new-btn').addEventListener('click', () => showForm(win));

            function render(list) {
                grid.innerHTML = list.length > 0 ? list.map(c => `
                    <div class="client-card" data-id="${c.id}">
                        <div class="client-avatar">${(c.name || '?')[0].toUpperCase()}</div>
                        <div class="client-info">
                            <div class="client-name">${c.name || '—'}</div>
                            <div class="client-meta">${c.community || ''}</div>
                            <div class="client-contact">
                                ${c.phone ? `<span>📞 ${c.phone}</span>` : ''}
                                ${c.email ? `<span>✉️ ${c.email}</span>` : ''}
                            </div>
                            <div class="client-projects">${projectCounts[c.id] || 0} project${(projectCounts[c.id] || 0) !== 1 ? 's' : ''}</div>
                        </div>
                    </div>
                `).join('') : '<div class="empty-state">No clients found</div>';

                grid.querySelectorAll('.client-card').forEach(card => {
                    card.addEventListener('click', () => {
                        const client = clients.find(c => c.id === card.dataset.id);
                        if (client) showClientDetail(win, client, projectCounts);
                    });
                });
            }

            search.addEventListener('input', () => {
                const q = search.value.toLowerCase();
                render(q ? clients.filter(c => (c.name || '').toLowerCase().includes(q)) : clients);
            });

            render(clients);
        } catch (err) {
            body.innerHTML = `<div class="app-error">Failed to load clients: ${err.message}</div>`;
        }
    }

    async function showClientDetail(win, client, projectCounts) {
        const body = win.querySelector('.app-container');

        body.innerHTML = `
            <div class="detail-view">
                <div class="detail-header">
                    <button class="back-btn" id="client-back">← Back</button>
                    <h2>${client.name}</h2>
                    <button class="btn-edit" id="client-edit-btn">Edit</button>
                </div>
                <div class="detail-grid">
                    <div class="detail-section">
                        <h4>Contact Info</h4>
                        <div class="detail-fields">
                            <div class="field"><span class="field-label">Phone</span><span class="field-value">${client.phone || '—'}</span></div>
                            <div class="field"><span class="field-label">Email</span><span class="field-value">${client.email || '—'}</span></div>
                            <div class="field"><span class="field-label">Community</span><span class="field-value">${client.community || '—'}</span></div>
                            <div class="field"><span class="field-label">Address</span><span class="field-value">${client.address || '—'}</span></div>
                            <div class="field"><span class="field-label">Source</span><span class="field-value">${client.source || '—'}</span></div>
                            ${client.referred_by ? `<div class="field"><span class="field-label">Referred By</span><span class="field-value">${client.referred_by}</span></div>` : ''}
                            ${client.notes ? `<div class="field full-width"><span class="field-label">Notes</span><span class="field-value">${client.notes}</span></div>` : ''}
                        </div>
                    </div>
                    <div class="detail-section">
                        <h4>Projects (${projectCounts[client.id] || 0})</h4>
                        <div id="client-projects-list"><div class="app-loading">Loading projects...</div></div>
                    </div>
                </div>
            </div>
        `;

        body.querySelector('#client-back').addEventListener('click', () => loadClients(win));
        body.querySelector('#client-edit-btn').addEventListener('click', () => showForm(win, client));

        // Load client's projects
        try {
            const { data: projects } = await SupabaseClient.from('projects')
                .select('id, reference, status, contract_value')
                .eq('client_id', client.id)
                .order('created_at', { ascending: false });

            const listEl = body.querySelector('#client-projects-list');
            if (projects && projects.length > 0) {
                listEl.innerHTML = `
                    <table class="app-table">
                        <thead><tr><th>Reference</th><th>Status</th><th>Value</th></tr></thead>
                        <tbody>
                            ${projects.map(p => `
                                <tr>
                                    <td>${p.reference || '—'}</td>
                                    <td>${Utils.statusBadge(p.status)}</td>
                                    <td>${Utils.formatCurrencyShort(p.contract_value)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            } else {
                listEl.innerHTML = '<div class="empty-state">No projects yet</div>';
            }
        } catch (err) {
            body.querySelector('#client-projects-list').innerHTML = `<div class="app-error">Failed to load projects</div>`;
        }
    }

    async function showForm(win, existing) {
        const body = win.querySelector('.app-container');
        const isEdit = !!existing;
        const c = existing || {};

        body.innerHTML = `
            <div class="form-view">
                <div class="form-header">
                    <button class="back-btn" id="client-form-back">← Back</button>
                    <h2>${isEdit ? 'Edit Client' : 'New Client'}</h2>
                </div>
                <div class="form-body">
                    <div class="form-section">
                        <h4>Contact Details</h4>
                        <div class="form-grid">
                            <div class="form-group full">
                                <label>Name *</label>
                                <input type="text" id="f-name" value="${c.name || ''}" placeholder="Full name">
                            </div>
                            <div class="form-group">
                                <label>Phone</label>
                                <input type="text" id="f-phone" value="${c.phone || ''}">
                            </div>
                            <div class="form-group">
                                <label>Email</label>
                                <input type="email" id="f-email" value="${c.email || ''}">
                            </div>
                        </div>
                    </div>
                    <div class="form-section">
                        <h4>Location</h4>
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Community</label>
                                <input type="text" id="f-community" value="${c.community || ''}">
                            </div>
                            <div class="form-group">
                                <label>Address</label>
                                <input type="text" id="f-address" value="${c.address || ''}">
                            </div>
                        </div>
                    </div>
                    <div class="form-section">
                        <h4>Other</h4>
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Source</label>
                                <select id="f-source">
                                    <option value="">—</option>
                                    ${['Referral', 'Website', 'Social Media', 'Walk-in', 'Repeat Client', 'Other'].map(s => `<option ${s === c.source ? 'selected' : ''}>${s}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Referred By</label>
                                <input type="text" id="f-referred" value="${c.referred_by || ''}">
                            </div>
                            <div class="form-group full">
                                <label>Notes</label>
                                <textarea id="f-notes">${c.notes || ''}</textarea>
                            </div>
                        </div>
                    </div>
                    <div id="client-form-error"></div>
                </div>
                <div class="form-actions">
                    <button class="back-btn" id="client-form-cancel">Cancel</button>
                    <button class="btn-save" id="client-form-save">${isEdit ? 'Save Changes' : 'Create Client'}</button>
                </div>
            </div>
        `;

        const goBack = () => loadClients(win);
        body.querySelector('#client-form-back').addEventListener('click', goBack);
        body.querySelector('#client-form-cancel').addEventListener('click', goBack);

        body.querySelector('#client-form-save').addEventListener('click', async () => {
            const btn = body.querySelector('#client-form-save');
            const errEl = body.querySelector('#client-form-error');
            errEl.innerHTML = '';

            const name = body.querySelector('#f-name').value.trim();
            if (!name) {
                errEl.innerHTML = '<div class="form-error">Name is required</div>';
                return;
            }

            const record = {
                name,
                phone: body.querySelector('#f-phone').value.trim() || null,
                email: body.querySelector('#f-email').value.trim() || null,
                community: body.querySelector('#f-community').value.trim() || null,
                address: body.querySelector('#f-address').value.trim() || null,
                source: body.querySelector('#f-source').value || null,
                referred_by: body.querySelector('#f-referred').value.trim() || null,
                notes: body.querySelector('#f-notes').value.trim() || null,
            };

            btn.disabled = true;
            btn.textContent = 'Saving...';

            try {
                let result;
                if (isEdit) {
                    result = await SupabaseClient.from('clients').update(record).eq('id', c.id);
                } else {
                    result = await SupabaseClient.from('clients').insert(record);
                }
                if (result.error) throw result.error;
                await loadClients(win);
            } catch (err) {
                errEl.innerHTML = `<div class="form-error">Error: ${err.message}</div>`;
                btn.disabled = false;
                btn.textContent = isEdit ? 'Save Changes' : 'Create Client';
            }
        });
    }

    return { id: 'clients', name: 'Clients', icon: ICON, launch };
})();
