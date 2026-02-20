/* ===== Site Work App ===== */
const SiteWorkApp = (() => {
    const ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 20h20"/><path d="M5 20V8l7-5 7 5v12"/><path d="M9 20v-5h6v5"/><path d="M9 12h.01"/><path d="M15 12h.01"/></svg>`;

    const SNAG_STATUSES = {
        open: { label: 'Open', bg: '#fee2e2', text: '#991b1b' },
        in_progress: { label: 'In Progress', bg: '#fef3c7', text: '#92400e' },
        resolved: { label: 'Resolved', bg: '#dcfce7', text: '#166534' },
    };

    const SNAG_PRIORITIES = {
        high: { label: 'High', bg: '#fee2e2', text: '#991b1b' },
        medium: { label: 'Medium', bg: '#fef3c7', text: '#92400e' },
        low: { label: 'Low', bg: '#f3f4f6', text: '#374151' },
    };

    const PROGRESS_STATUSES = {
        on_track: { label: 'On Track', bg: '#dcfce7', text: '#166534' },
        behind: { label: 'Behind', bg: '#fee2e2', text: '#991b1b' },
        ahead: { label: 'Ahead', bg: '#dbeafe', text: '#1e40af' },
    };

    function snagBadge(status) {
        const s = SNAG_STATUSES[status] || SNAG_STATUSES.open;
        return `<span class="status-badge" style="background:${s.bg};color:${s.text}">${s.label}</span>`;
    }

    function priorityBadge(p) {
        const s = SNAG_PRIORITIES[p] || SNAG_PRIORITIES.medium;
        return `<span class="status-badge" style="background:${s.bg};color:${s.text}">${s.label}</span>`;
    }

    function progressBadge(status) {
        const s = PROGRESS_STATUSES[status] || { label: status || '—', bg: '#f3f4f6', text: '#374151' };
        return `<span class="status-badge" style="background:${s.bg};color:${s.text}">${s.label}</span>`;
    }

    let currentTab = 'logs';

    async function launch() {
        const html = `<div class="app-container sitework"><div class="app-loading">Loading...</div></div>`;
        WindowManager.createWindow('sitework', 'Site Work', html, {
            width: 940, height: 600,
            onReady: async (win) => { await loadView(win); }
        });
    }

    async function loadView(win) {
        const body = win.querySelector('.app-container');

        let projects = [];
        try {
            const { data } = await SupabaseClient.from('projects').select('id, reference').order('reference');
            projects = data || [];
        } catch (e) {}

        body.innerHTML = `
            <div class="app-toolbar">
                <div class="sitework-tabs">
                    <button class="trade-filter-btn ${currentTab === 'logs' ? 'active' : ''}" data-tab="logs">Daily Reports</button>
                    <button class="trade-filter-btn ${currentTab === 'snags' ? 'active' : ''}" data-tab="snags">Snag List</button>
                </div>
                <select class="app-filter" id="sw-proj-filter">
                    <option value="all">All Projects</option>
                    ${projects.map(p => `<option value="${p.id}">${p.reference || 'Untitled'}</option>`).join('')}
                </select>
                <button class="import-btn" id="sw-new-btn">+ ${currentTab === 'logs' ? 'New Report' : 'New Snag'}</button>
            </div>
            <div id="sw-content"><div class="app-loading">Loading...</div></div>
        `;

        const tabBtns = body.querySelectorAll('.sitework-tabs .trade-filter-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                currentTab = btn.dataset.tab;
                loadView(win);
            });
        });

        const projFilter = body.querySelector('#sw-proj-filter');
        projFilter.addEventListener('change', () => {
            if (currentTab === 'logs') loadLogs(win, projFilter.value, projects);
            else loadSnags(win, projFilter.value, projects);
        });

        body.querySelector('#sw-new-btn').addEventListener('click', () => {
            if (currentTab === 'logs') showLogForm(win, null, projects);
            else showSnagForm(win, null, projects);
        });

        if (currentTab === 'logs') await loadLogs(win, 'all', projects);
        else await loadSnags(win, 'all', projects);
    }

    /* ===== Daily Reports ===== */
    async function loadLogs(win, projectFilter, projects) {
        const content = win.querySelector('#sw-content');
        try {
            let query = SupabaseClient.from('daily_reports')
                .select('*, project:projects(reference)')
                .order('report_date', { ascending: false });
            if (projectFilter !== 'all') query = query.eq('project_id', projectFilter);

            const { data: reports, error } = await query;
            if (error) throw error;
            const all = reports || [];

            content.innerHTML = `
                <div class="app-table-wrap">
                    <table class="app-table">
                        <thead><tr>
                            <th>Date</th>
                            <th>Project</th>
                            <th>Progress</th>
                            <th>Staff</th>
                            <th>Subs</th>
                            <th>Notes</th>
                        </tr></thead>
                        <tbody>
                            ${all.length > 0 ? all.map(r => `
                                <tr class="clickable-row" data-id="${r.id}">
                                    <td class="strong">${Utils.formatDate(r.report_date)}</td>
                                    <td>${r.project?.reference || '—'}</td>
                                    <td>${progressBadge(r.progress_status)}</td>
                                    <td>${r.staff_count || '—'}</td>
                                    <td>${r.subcontractor_count || '—'}</td>
                                    <td>${(r.notes || '—').substring(0, 60)}${(r.notes || '').length > 60 ? '...' : ''}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="6" class="empty-row">No daily reports yet</td></tr>'}
                        </tbody>
                    </table>
                </div>
            `;

            content.querySelectorAll('.clickable-row').forEach(row => {
                row.addEventListener('click', () => {
                    const report = all.find(r => r.id === row.dataset.id);
                    if (report) showLogDetail(win, report, projects);
                });
            });
        } catch (err) {
            content.innerHTML = `<div class="app-error">Failed to load reports: ${err.message}</div>`;
        }
    }

    async function showLogDetail(win, report, projects) {
        const body = win.querySelector('.app-container');

        // Load related data
        let staff = [], subcontractors = [], photos = [];
        try {
            const [staffRes, subsRes, photosRes] = await Promise.all([
                SupabaseClient.from('daily_report_staff').select('*').eq('daily_report_id', report.id),
                SupabaseClient.from('daily_report_subcontractors').select('*').eq('daily_report_id', report.id),
                SupabaseClient.from('daily_report_photos').select('*').eq('daily_report_id', report.id),
            ]);
            staff = staffRes.data || [];
            subcontractors = subsRes.data || [];
            photos = photosRes.data || [];
        } catch (e) {}

        body.innerHTML = `
            <div class="detail-view">
                <div class="detail-header">
                    <button class="back-btn" id="log-back">← Back</button>
                    <h2>Daily Report — ${Utils.formatDate(report.report_date)}</h2>
                    <button class="btn-edit" id="log-edit-btn">Edit</button>
                </div>
                <div class="detail-grid">
                    <div class="detail-section">
                        <h4>Report Details</h4>
                        <div class="detail-fields">
                            <div class="field"><span class="field-label">Project</span><span class="field-value">${report.project?.reference || '—'}</span></div>
                            <div class="field"><span class="field-label">Date</span><span class="field-value">${Utils.formatDate(report.report_date)}</span></div>
                            <div class="field"><span class="field-label">Progress</span><span class="field-value">${progressBadge(report.progress_status)}</span></div>
                            <div class="field"><span class="field-label">Staff Count</span><span class="field-value">${report.staff_count || '—'}</span></div>
                            <div class="field"><span class="field-label">Sub Count</span><span class="field-value">${report.subcontractor_count || '—'}</span></div>
                            <div class="field"><span class="field-label">Sub Workers</span><span class="field-value">${report.subcontractor_workers || '—'}</span></div>
                            ${report.notes ? `<div class="field full-width"><span class="field-label">Notes</span><span class="field-value">${report.notes}</span></div>` : ''}
                        </div>
                    </div>
                    ${subcontractors.length > 0 ? `
                        <div class="detail-section">
                            <h4>Subcontractors on Site</h4>
                            <div class="app-table-wrap">
                                <table class="app-table">
                                    <thead><tr><th>Company</th><th>Trade</th><th>Workers</th><th>Notes</th></tr></thead>
                                    <tbody>
                                        ${subcontractors.map(s => `
                                            <tr>
                                                <td>${s.company_name || '—'}</td>
                                                <td>${s.trade || '—'}</td>
                                                <td>${s.workers_count || '—'}</td>
                                                <td>${s.notes || '—'}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ` : ''}
                    ${staff.length > 0 ? `
                        <div class="detail-section">
                            <h4>Staff</h4>
                            <div class="app-table-wrap">
                                <table class="app-table">
                                    <thead><tr><th>Name</th><th>Present</th><th>Notes</th></tr></thead>
                                    <tbody>
                                        ${staff.map(s => `
                                            <tr>
                                                <td>${s.name || '—'}</td>
                                                <td>${s.present ? 'Yes' : 'No'}</td>
                                                <td>${s.notes || '—'}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        body.querySelector('#log-back').addEventListener('click', () => loadView(win));
        body.querySelector('#log-edit-btn').addEventListener('click', () => showLogForm(win, report, projects));
    }

    async function showLogForm(win, existing, projects) {
        const body = win.querySelector('.app-container');
        const isEdit = !!existing;
        const r = existing || {};
        const today = new Date().toISOString().split('T')[0];

        body.innerHTML = `
            <div class="form-view">
                <div class="form-header">
                    <button class="back-btn" id="log-form-back">← Back</button>
                    <h2>${isEdit ? 'Edit Daily Report' : 'New Daily Report'}</h2>
                </div>
                <div class="form-body">
                    <div class="form-section">
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Project *</label>
                                <select id="f-project">
                                    <option value="">— Select —</option>
                                    ${projects.map(p => `<option value="${p.id}" ${p.id === r.project_id ? 'selected' : ''}>${p.reference || 'Untitled'}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Date *</label>
                                <input type="date" id="f-date" value="${r.report_date || today}">
                            </div>
                            <div class="form-group">
                                <label>Progress Status</label>
                                <select id="f-progress">
                                    <option value="">—</option>
                                    ${Object.entries(PROGRESS_STATUSES).map(([k, v]) => `<option value="${k}" ${k === r.progress_status ? 'selected' : ''}>${v.label}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Staff Count</label>
                                <input type="number" id="f-staff" min="0" value="${r.staff_count || ''}">
                            </div>
                            <div class="form-group">
                                <label>Subcontractor Count</label>
                                <input type="number" id="f-sub-count" min="0" value="${r.subcontractor_count || ''}">
                            </div>
                            <div class="form-group">
                                <label>Sub Workers</label>
                                <input type="number" id="f-sub-workers" min="0" value="${r.subcontractor_workers || ''}">
                            </div>
                            <div class="form-group full">
                                <label>Notes *</label>
                                <textarea id="f-notes">${r.notes || ''}</textarea>
                            </div>
                        </div>
                    </div>
                    <div id="log-form-error"></div>
                </div>
                <div class="form-actions">
                    <button class="back-btn" id="log-form-cancel">Cancel</button>
                    <button class="btn-save" id="log-form-save">${isEdit ? 'Save Changes' : 'Create Report'}</button>
                </div>
            </div>
        `;

        const goBack = () => loadView(win);
        body.querySelector('#log-form-back').addEventListener('click', goBack);
        body.querySelector('#log-form-cancel').addEventListener('click', goBack);

        body.querySelector('#log-form-save').addEventListener('click', async () => {
            const btn = body.querySelector('#log-form-save');
            const errEl = body.querySelector('#log-form-error');
            errEl.innerHTML = '';

            const projectId = body.querySelector('#f-project').value;
            const reportDate = body.querySelector('#f-date').value;
            const notes = body.querySelector('#f-notes').value.trim();
            if (!projectId) { errEl.innerHTML = '<div class="form-error">Select a project</div>'; return; }
            if (!reportDate) { errEl.innerHTML = '<div class="form-error">Enter a date</div>'; return; }
            if (!notes) { errEl.innerHTML = '<div class="form-error">Enter notes</div>'; return; }

            const record = {
                project_id: projectId,
                report_date: reportDate,
                progress_status: body.querySelector('#f-progress').value || null,
                staff_count: parseInt(body.querySelector('#f-staff').value) || null,
                subcontractor_count: parseInt(body.querySelector('#f-sub-count').value) || null,
                subcontractor_workers: parseInt(body.querySelector('#f-sub-workers').value) || null,
                notes,
            };

            btn.disabled = true; btn.textContent = 'Saving...';
            try {
                let result;
                if (isEdit) { result = await SupabaseClient.from('daily_reports').update(record).eq('id', r.id); }
                else { result = await SupabaseClient.from('daily_reports').insert(record); }
                if (result.error) throw result.error;
                await loadView(win);
            } catch (err) {
                errEl.innerHTML = `<div class="form-error">Error: ${err.message}</div>`;
                btn.disabled = false; btn.textContent = isEdit ? 'Save Changes' : 'Create Report';
            }
        });
    }

    /* ===== Snag List ===== */
    async function loadSnags(win, projectFilter, projects) {
        const content = win.querySelector('#sw-content');
        try {
            let query = SupabaseClient.from('snagging_items')
                .select('*, project:projects(reference)')
                .order('created_at', { ascending: false });
            if (projectFilter !== 'all') query = query.eq('project_id', projectFilter);

            const { data: snags, error } = await query;
            if (error) throw error;
            const all = snags || [];

            const openCount = all.filter(s => s.status === 'open').length;
            const inProgressCount = all.filter(s => s.status === 'in_progress').length;

            content.innerHTML = `
                <div class="dash-stats compact" style="padding:8px 12px">
                    <div class="stat-card small ${openCount > 0 ? 'accent' : ''}"><div class="stat-label">Open</div><div class="stat-value">${openCount}</div></div>
                    <div class="stat-card small"><div class="stat-label">In Progress</div><div class="stat-value">${inProgressCount}</div></div>
                    <div class="stat-card small"><div class="stat-label">Total</div><div class="stat-value">${all.length}</div></div>
                </div>
                <div class="app-table-wrap">
                    <table class="app-table">
                        <thead><tr>
                            <th>Description</th>
                            <th>Project</th>
                            <th>Location</th>
                            <th>Priority</th>
                            <th>Status</th>
                        </tr></thead>
                        <tbody>
                            ${all.length > 0 ? all.map(s => `
                                <tr class="clickable-row" data-id="${s.id}">
                                    <td class="strong">${(s.description || '—').substring(0, 60)}${(s.description || '').length > 60 ? '...' : ''}</td>
                                    <td>${s.project?.reference || '—'}</td>
                                    <td>${s.location || '—'}</td>
                                    <td>${priorityBadge(s.priority)}</td>
                                    <td>${snagBadge(s.status)}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="5" class="empty-row">No snag items</td></tr>'}
                        </tbody>
                    </table>
                </div>
            `;

            content.querySelectorAll('.clickable-row').forEach(row => {
                row.addEventListener('click', () => {
                    const snag = all.find(s => s.id === row.dataset.id);
                    if (snag) showSnagDetail(win, snag, projects);
                });
            });
        } catch (err) {
            content.innerHTML = `<div class="app-error">Failed to load snags: ${err.message}</div>`;
        }
    }

    async function showSnagDetail(win, snag, projects) {
        const body = win.querySelector('.app-container');
        const statusOpts = Object.entries(SNAG_STATUSES).filter(([k]) => k !== snag.status).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');

        body.innerHTML = `
            <div class="detail-view">
                <div class="detail-header">
                    <button class="back-btn" id="snag-back">← Back</button>
                    <h2>Snag Item</h2>
                    <div class="status-advance">
                        ${snagBadge(snag.status)}
                        <select id="snag-status-sel">${statusOpts}</select>
                        <button id="snag-status-go">Update</button>
                    </div>
                    <button class="btn-edit" id="snag-edit-btn">Edit</button>
                </div>
                <div class="detail-grid">
                    <div class="detail-section">
                        <h4>Snag Details</h4>
                        <div class="detail-fields">
                            <div class="field"><span class="field-label">Project</span><span class="field-value">${snag.project?.reference || '—'}</span></div>
                            <div class="field"><span class="field-label">Location</span><span class="field-value">${snag.location || '—'}</span></div>
                            <div class="field"><span class="field-label">Priority</span><span class="field-value">${priorityBadge(snag.priority)}</span></div>
                            <div class="field full-width"><span class="field-label">Description</span><span class="field-value">${snag.description || '—'}</span></div>
                            ${snag.photo_url ? `<div class="field full-width"><span class="field-label">Photo</span><span class="field-value"><a href="${snag.photo_url}" target="_blank">View Photo</a></span></div>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        body.querySelector('#snag-back').addEventListener('click', () => loadView(win));
        body.querySelector('#snag-edit-btn').addEventListener('click', () => showSnagForm(win, snag, projects));

        body.querySelector('#snag-status-go').addEventListener('click', async () => {
            const btn = body.querySelector('#snag-status-go');
            btn.disabled = true; btn.textContent = '...';
            try {
                const newStatus = body.querySelector('#snag-status-sel').value;
                const updates = { status: newStatus };
                if (newStatus === 'resolved') updates.resolved_at = new Date().toISOString();
                const { error } = await SupabaseClient.from('snagging_items')
                    .update(updates)
                    .eq('id', snag.id);
                if (error) throw error;
                await loadView(win);
            } catch (err) { btn.textContent = 'Error'; btn.disabled = false; }
        });
    }

    async function showSnagForm(win, existing, projects) {
        const body = win.querySelector('.app-container');
        const isEdit = !!existing;
        const s = existing || {};

        body.innerHTML = `
            <div class="form-view">
                <div class="form-header">
                    <button class="back-btn" id="snag-form-back">← Back</button>
                    <h2>${isEdit ? 'Edit Snag' : 'New Snag'}</h2>
                </div>
                <div class="form-body">
                    <div class="form-section">
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Project *</label>
                                <select id="f-project">
                                    <option value="">— Select —</option>
                                    ${projects.map(p => `<option value="${p.id}" ${p.id === s.project_id ? 'selected' : ''}>${p.reference || 'Untitled'}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Location</label>
                                <input type="text" id="f-location" value="${s.location || ''}" placeholder="e.g. Master bedroom, Kitchen">
                            </div>
                            <div class="form-group">
                                <label>Priority</label>
                                <select id="f-priority">
                                    ${Object.entries(SNAG_PRIORITIES).map(([k, v]) => `<option value="${k}" ${k === (s.priority || 'medium') ? 'selected' : ''}>${v.label}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group full">
                                <label>Description *</label>
                                <textarea id="f-desc">${s.description || ''}</textarea>
                            </div>
                        </div>
                    </div>
                    <div id="snag-form-error"></div>
                </div>
                <div class="form-actions">
                    <button class="back-btn" id="snag-form-cancel">Cancel</button>
                    <button class="btn-save" id="snag-form-save">${isEdit ? 'Save Changes' : 'Create Snag'}</button>
                </div>
            </div>
        `;

        const goBack = () => loadView(win);
        body.querySelector('#snag-form-back').addEventListener('click', goBack);
        body.querySelector('#snag-form-cancel').addEventListener('click', goBack);

        body.querySelector('#snag-form-save').addEventListener('click', async () => {
            const btn = body.querySelector('#snag-form-save');
            const errEl = body.querySelector('#snag-form-error');
            errEl.innerHTML = '';

            const projectId = body.querySelector('#f-project').value;
            const description = body.querySelector('#f-desc').value.trim();
            if (!projectId) { errEl.innerHTML = '<div class="form-error">Select a project</div>'; return; }
            if (!description) { errEl.innerHTML = '<div class="form-error">Enter a description</div>'; return; }

            const record = {
                project_id: projectId,
                description,
                location: body.querySelector('#f-location').value.trim() || null,
                priority: body.querySelector('#f-priority').value,
            };
            if (!isEdit) record.status = 'open';

            btn.disabled = true; btn.textContent = 'Saving...';
            try {
                let result;
                if (isEdit) { result = await SupabaseClient.from('snagging_items').update(record).eq('id', s.id); }
                else { result = await SupabaseClient.from('snagging_items').insert(record); }
                if (result.error) throw result.error;
                await loadView(win);
            } catch (err) {
                errEl.innerHTML = `<div class="form-error">Error: ${err.message}</div>`;
                btn.disabled = false; btn.textContent = isEdit ? 'Save Changes' : 'Create Snag';
            }
        });
    }

    return { id: 'sitework', name: 'Site Work', icon: ICON, launch };
})();
