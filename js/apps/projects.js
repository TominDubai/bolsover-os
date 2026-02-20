/* ===== Projects App ===== */
const ProjectsApp = (() => {
    const ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`;

    const ALL_STATUSES = Object.keys(Utils.STATUS_LABELS);

    async function launch() {
        const html = `
            <div class="app-container projects">
                <div class="app-loading">Loading projects...</div>
            </div>
        `;

        WindowManager.createWindow('projects', 'Projects', html, {
            width: 920, height: 600,
            onReady: async (win) => {
                await loadList(win);
            }
        });
    }

    async function loadList(win) {
        const body = win.querySelector('.app-container');
        try {
            const { data: projects, error } = await SupabaseClient.from('projects')
                .select('*, client:clients(name)')
                .order('created_at', { ascending: false });

            if (error) throw error;

            body.innerHTML = `
                <div class="app-toolbar">
                    <input type="text" class="app-search" placeholder="Search projects..." id="proj-search">
                    <select class="app-filter" id="proj-filter">
                        <option value="all">All Statuses</option>
                        <option value="pipeline">Pipeline</option>
                        <option value="active">Active</option>
                        <option value="snagging">Snagging</option>
                        <option value="complete">Complete</option>
                        <option value="on_hold">On Hold</option>
                        <option value="lost">Lost</option>
                    </select>
                </div>
                <div class="app-table-wrap">
                    <table class="app-table" id="proj-table">
                        <thead><tr>
                            <th>Reference</th>
                            <th>Client</th>
                            <th>Status</th>
                            <th>Health</th>
                            <th>Value</th>
                            <th>Created</th>
                        </tr></thead>
                        <tbody id="proj-tbody"></tbody>
                    </table>
                </div>
            `;

            const tbody = body.querySelector('#proj-tbody');
            const search = body.querySelector('#proj-search');
            const filter = body.querySelector('#proj-filter');

            function render(list) {
                tbody.innerHTML = list.length > 0 ? list.map(p => `
                    <tr class="clickable-row" data-id="${p.id}">
                        <td class="ref-link">${p.reference || '—'}</td>
                        <td>${p.client?.name || '—'}</td>
                        <td>${Utils.statusBadge(p.status)}</td>
                        <td>${Utils.healthBadge(p.health)}</td>
                        <td>${Utils.formatCurrencyShort(p.contract_value)}</td>
                        <td>${Utils.formatRelativeDate(p.created_at)}</td>
                    </tr>
                `).join('') : '<tr><td colspan="6" class="empty-row">No projects found</td></tr>';

                tbody.querySelectorAll('.clickable-row').forEach(row => {
                    row.addEventListener('click', () => loadDetail(win, row.dataset.id, projects));
                });
            }

            function applyFilters() {
                const q = search.value.toLowerCase();
                const f = filter.value;
                let filtered = projects || [];

                if (q) {
                    filtered = filtered.filter(p =>
                        (p.reference || '').toLowerCase().includes(q) ||
                        (p.client?.name || '').toLowerCase().includes(q)
                    );
                }

                if (f !== 'all') {
                    if (f === 'pipeline') filtered = filtered.filter(p => Utils.PIPELINE_STATUSES.includes(p.status));
                    else if (f === 'active') filtered = filtered.filter(p => Utils.ACTIVE_STATUSES.includes(p.status));
                    else filtered = filtered.filter(p => p.status === f);
                }

                render(filtered);
            }

            search.addEventListener('input', applyFilters);
            filter.addEventListener('change', applyFilters);
            render(projects || []);
        } catch (err) {
            body.innerHTML = `<div class="app-error">Failed to load projects: ${err.message}</div>`;
        }
    }

    async function loadDetail(win, projectId, allProjects) {
        const body = win.querySelector('.app-container');
        const project = allProjects.find(p => p.id === projectId);
        if (!project) return;

        const outstanding = (project.total_invoiced || 0) - (project.total_paid || 0);
        const totalWithVariations = (project.contract_value || 0) + (project.variation_total || 0);

        const statusOptions = ALL_STATUSES
            .filter(s => s !== project.status)
            .map(s => `<option value="${s}">${Utils.STATUS_LABELS[s]}</option>`)
            .join('');

        body.innerHTML = `
            <div class="detail-view">
                <div class="detail-header">
                    <button class="back-btn" id="proj-back">← Back</button>
                    <h2>${project.reference || 'Project'} ${Utils.healthBadge(project.health)}</h2>
                    <div class="status-advance">
                        ${Utils.statusBadge(project.status)}
                        <select id="proj-status-select">${statusOptions}</select>
                        <button id="proj-status-go">Update</button>
                    </div>
                    <button class="btn-edit" id="proj-edit-btn">Edit</button>
                </div>

                <div class="detail-grid">
                    <div class="detail-section">
                        <h4>Financial Summary</h4>
                        <div class="detail-fields">
                            <div class="field"><span class="field-label">Contract Value</span><span class="field-value">${Utils.formatCurrency(project.contract_value)}</span></div>
                            <div class="field"><span class="field-label">Variations</span><span class="field-value">${Utils.formatCurrency(project.variation_total)}</span></div>
                            <div class="field"><span class="field-label">Total (incl. vars)</span><span class="field-value strong">${Utils.formatCurrency(totalWithVariations)}</span></div>
                            <div class="field"><span class="field-label">Total Invoiced</span><span class="field-value">${Utils.formatCurrency(project.total_invoiced)}</span></div>
                            <div class="field"><span class="field-label">Total Paid</span><span class="field-value">${Utils.formatCurrency(project.total_paid)}</span></div>
                            <div class="field"><span class="field-label">Outstanding</span><span class="field-value ${outstanding > 0 ? 'warning-text' : ''}">${Utils.formatCurrency(outstanding)}</span></div>
                        </div>
                    </div>

                    <div class="detail-section">
                        <h4>Client & Location</h4>
                        <div class="detail-fields">
                            <div class="field"><span class="field-label">Client</span><span class="field-value">${project.client?.name || '—'}</span></div>
                            <div class="field"><span class="field-label">Community</span><span class="field-value">${project.community || '—'}</span></div>
                            <div class="field"><span class="field-label">Address</span><span class="field-value">${project.address || '—'}</span></div>
                            <div class="field"><span class="field-label">Property Type</span><span class="field-value">${project.property_type || '—'}</span></div>
                            <div class="field"><span class="field-label">Source</span><span class="field-value">${project.source || '—'}</span></div>
                        </div>
                    </div>

                    <div class="detail-section">
                        <h4>Key Dates</h4>
                        <div class="detail-fields">
                            <div class="field"><span class="field-label">Enquiry Date</span><span class="field-value">${Utils.formatDate(project.enquiry_date)}</span></div>
                            <div class="field"><span class="field-label">Site Visit</span><span class="field-value">${Utils.formatDate(project.site_visit_date)}</span></div>
                            <div class="field"><span class="field-label">Quote Sent</span><span class="field-value">${Utils.formatDate(project.quote_sent_date)}</span></div>
                            <div class="field"><span class="field-label">Accepted</span><span class="field-value">${Utils.formatDate(project.accepted_date)}</span></div>
                            <div class="field"><span class="field-label">Start Date</span><span class="field-value">${Utils.formatDate(project.start_date)}</span></div>
                            <div class="field"><span class="field-label">Due Date</span><span class="field-value">${Utils.formatDate(project.due_date)}</span></div>
                            <div class="field"><span class="field-label">Completed</span><span class="field-value">${Utils.formatDate(project.completed_date)}</span></div>
                        </div>
                    </div>

                    <div class="detail-section">
                        <h4>Project Details</h4>
                        <div class="detail-fields">
                            <div class="field"><span class="field-label">Design</span><span class="field-value">${project.has_design || '—'}</span></div>
                            <div class="field"><span class="field-label">Drawings</span><span class="field-value">${project.has_drawings || '—'}</span></div>
                            <div class="field full-width"><span class="field-label">Scope</span><span class="field-value">${project.scope_summary || '—'}</span></div>
                            ${project.notes ? `<div class="field full-width"><span class="field-label">Notes</span><span class="field-value">${project.notes}</span></div>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        body.querySelector('#proj-back').addEventListener('click', () => loadList(win));
        body.querySelector('#proj-edit-btn').addEventListener('click', () => showEditForm(win, project));

        body.querySelector('#proj-status-go').addEventListener('click', async () => {
            const newStatus = body.querySelector('#proj-status-select').value;
            const btn = body.querySelector('#proj-status-go');
            btn.disabled = true;
            btn.textContent = '...';
            try {
                const { error } = await SupabaseClient.from('projects')
                    .update({ status: newStatus })
                    .eq('id', project.id);
                if (error) throw error;
                // Reload with updated data
                const { data: refreshed } = await SupabaseClient.from('projects')
                    .select('*, client:clients(name)')
                    .eq('id', project.id)
                    .single();
                if (refreshed) loadDetail(win, refreshed.id, [refreshed]);
                else await loadList(win);
            } catch (err) {
                btn.textContent = 'Error';
                btn.disabled = false;
            }
        });
    }

    async function showEditForm(win, project) {
        const body = win.querySelector('.app-container');
        const p = project;

        // Load clients for dropdown
        let clients = [];
        try {
            const { data } = await SupabaseClient.from('clients').select('id, name').order('name');
            clients = data || [];
        } catch (e) {}

        const healthOptions = ['', 'on_track', 'minor_delay', 'behind', 'blocked'];

        body.innerHTML = `
            <div class="form-view">
                <div class="form-header">
                    <button class="back-btn" id="proj-form-back">← Back</button>
                    <h2>Edit Project — ${p.reference || 'Untitled'}</h2>
                </div>
                <div class="form-body">
                    <div class="form-section">
                        <h4>General</h4>
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Reference</label>
                                <input type="text" id="f-reference" value="${p.reference || ''}">
                            </div>
                            <div class="form-group">
                                <label>Client</label>
                                <select id="f-client">
                                    <option value="">—</option>
                                    ${clients.map(c => `<option value="${c.id}" ${c.id === p.client_id ? 'selected' : ''}>${c.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Health</label>
                                <select id="f-health">
                                    ${healthOptions.map(h => `<option value="${h}" ${h === (p.health || '') ? 'selected' : ''}>${h ? Utils.HEALTH_LABELS[h] : '—'}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Property Type</label>
                                <select id="f-property-type">
                                    <option value="">—</option>
                                    ${['Villa', 'Apartment', 'Townhouse', 'Commercial', 'Other'].map(t => `<option ${t === p.property_type ? 'selected' : ''}>${t}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Community</label>
                                <input type="text" id="f-community" value="${p.community || ''}">
                            </div>
                            <div class="form-group">
                                <label>Address</label>
                                <input type="text" id="f-address" value="${p.address || ''}">
                            </div>
                            <div class="form-group">
                                <label>Source</label>
                                <select id="f-source">
                                    <option value="">—</option>
                                    ${['Referral', 'Website', 'Social Media', 'Walk-in', 'Repeat Client', 'Other'].map(s => `<option ${s === p.source ? 'selected' : ''}>${s}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="form-section">
                        <h4>Financials</h4>
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Contract Value (AED)</label>
                                <input type="number" id="f-contract-value" value="${p.contract_value || ''}">
                            </div>
                            <div class="form-group">
                                <label>Variation Total (AED)</label>
                                <input type="number" id="f-variation-total" value="${p.variation_total || ''}">
                            </div>
                            <div class="form-group">
                                <label>Total Invoiced (AED)</label>
                                <input type="number" id="f-invoiced" value="${p.total_invoiced || ''}">
                            </div>
                            <div class="form-group">
                                <label>Total Paid (AED)</label>
                                <input type="number" id="f-paid" value="${p.total_paid || ''}">
                            </div>
                        </div>
                    </div>
                    <div class="form-section">
                        <h4>Key Dates</h4>
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Enquiry Date</label>
                                <input type="date" id="f-enquiry-date" value="${p.enquiry_date || ''}">
                            </div>
                            <div class="form-group">
                                <label>Site Visit</label>
                                <input type="date" id="f-visit-date" value="${p.site_visit_date || ''}">
                            </div>
                            <div class="form-group">
                                <label>Quote Sent</label>
                                <input type="date" id="f-quote-date" value="${p.quote_sent_date || ''}">
                            </div>
                            <div class="form-group">
                                <label>Accepted</label>
                                <input type="date" id="f-accepted-date" value="${p.accepted_date || ''}">
                            </div>
                            <div class="form-group">
                                <label>Start Date</label>
                                <input type="date" id="f-start-date" value="${p.start_date || ''}">
                            </div>
                            <div class="form-group">
                                <label>Due Date</label>
                                <input type="date" id="f-due-date" value="${p.due_date || ''}">
                            </div>
                            <div class="form-group">
                                <label>Completed</label>
                                <input type="date" id="f-completed-date" value="${p.completed_date || ''}">
                            </div>
                        </div>
                    </div>
                    <div class="form-section">
                        <h4>Details</h4>
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Has Design?</label>
                                <select id="f-design">
                                    <option value="">—</option>
                                    ${['Yes', 'No', 'Partial'].map(v => `<option ${v === p.has_design ? 'selected' : ''}>${v}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Has Drawings?</label>
                                <select id="f-drawings">
                                    <option value="">—</option>
                                    ${['Yes', 'No', 'Partial'].map(v => `<option ${v === p.has_drawings ? 'selected' : ''}>${v}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group full">
                                <label>Scope Summary</label>
                                <textarea id="f-scope">${p.scope_summary || ''}</textarea>
                            </div>
                            <div class="form-group full">
                                <label>Notes</label>
                                <textarea id="f-notes">${p.notes || ''}</textarea>
                            </div>
                        </div>
                    </div>
                    <div id="proj-form-error"></div>
                </div>
                <div class="form-actions">
                    <button class="back-btn" id="proj-form-cancel">Cancel</button>
                    <button class="btn-save" id="proj-form-save">Save Changes</button>
                </div>
            </div>
        `;

        const goBack = () => loadList(win);
        body.querySelector('#proj-form-back').addEventListener('click', goBack);
        body.querySelector('#proj-form-cancel').addEventListener('click', goBack);

        body.querySelector('#proj-form-save').addEventListener('click', async () => {
            const btn = body.querySelector('#proj-form-save');
            const errEl = body.querySelector('#proj-form-error');
            errEl.innerHTML = '';

            const numOrNull = (v) => v === '' ? null : parseFloat(v);

            const record = {
                reference: body.querySelector('#f-reference').value.trim() || null,
                client_id: body.querySelector('#f-client').value || null,
                health: body.querySelector('#f-health').value || null,
                property_type: body.querySelector('#f-property-type').value || null,
                community: body.querySelector('#f-community').value.trim() || null,
                address: body.querySelector('#f-address').value.trim() || null,
                source: body.querySelector('#f-source').value || null,
                contract_value: numOrNull(body.querySelector('#f-contract-value').value),
                variation_total: numOrNull(body.querySelector('#f-variation-total').value),
                total_invoiced: numOrNull(body.querySelector('#f-invoiced').value),
                total_paid: numOrNull(body.querySelector('#f-paid').value),
                enquiry_date: body.querySelector('#f-enquiry-date').value || null,
                site_visit_date: body.querySelector('#f-visit-date').value || null,
                quote_sent_date: body.querySelector('#f-quote-date').value || null,
                accepted_date: body.querySelector('#f-accepted-date').value || null,
                start_date: body.querySelector('#f-start-date').value || null,
                due_date: body.querySelector('#f-due-date').value || null,
                completed_date: body.querySelector('#f-completed-date').value || null,
                has_design: body.querySelector('#f-design').value || null,
                has_drawings: body.querySelector('#f-drawings').value || null,
                scope_summary: body.querySelector('#f-scope').value.trim() || null,
                notes: body.querySelector('#f-notes').value.trim() || null,
            };

            btn.disabled = true;
            btn.textContent = 'Saving...';

            try {
                const { error } = await SupabaseClient.from('projects')
                    .update(record)
                    .eq('id', p.id);
                if (error) throw error;
                await loadList(win);
            } catch (err) {
                errEl.innerHTML = `<div class="form-error">Error: ${err.message}</div>`;
                btn.disabled = false;
                btn.textContent = 'Save Changes';
            }
        });
    }

    return { id: 'projects', name: 'Projects', icon: ICON, launch };
})();
