/* ===== Variations App ===== */
const VariationsApp = (() => {
    const ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`;

    const VAR_STATUSES = {
        pending: { label: 'Pending', bg: '#fef3c7', text: '#92400e' },
        approved: { label: 'Approved', bg: '#dcfce7', text: '#166534' },
        rejected: { label: 'Rejected', bg: '#fee2e2', text: '#991b1b' },
    };

    const INTERNAL_STATUSES = {
        draft: { label: 'Draft', bg: '#f3f4f6', text: '#374151' },
        pending_review: { label: 'Pending Review', bg: '#fef3c7', text: '#92400e' },
        approved: { label: 'Approved', bg: '#dcfce7', text: '#166534' },
        rejected: { label: 'Rejected', bg: '#fee2e2', text: '#991b1b' },
    };

    const PAY_STATUSES = {
        unpaid: { label: 'Unpaid', bg: '#fee2e2', text: '#991b1b' },
        invoiced: { label: 'Invoiced', bg: '#dbeafe', text: '#1e40af' },
        paid: { label: 'Paid', bg: '#dcfce7', text: '#166534' },
    };

    const WORK_STATUSES = {
        not_started: { label: 'Not Started', bg: '#f3f4f6', text: '#374151' },
        in_progress: { label: 'In Progress', bg: '#dbeafe', text: '#1e40af' },
        completed: { label: 'Completed', bg: '#dcfce7', text: '#166534' },
    };

    function varBadge(status) {
        const s = VAR_STATUSES[status] || VAR_STATUSES.pending;
        return `<span class="status-badge" style="background:${s.bg};color:${s.text}">${s.label}</span>`;
    }

    function payBadge(status) {
        const s = PAY_STATUSES[status] || PAY_STATUSES.unpaid;
        return `<span class="status-badge" style="background:${s.bg};color:${s.text}">${s.label}</span>`;
    }

    function workBadge(status) {
        const s = WORK_STATUSES[status] || WORK_STATUSES.not_started;
        return `<span class="status-badge" style="background:${s.bg};color:${s.text}">${s.label}</span>`;
    }

    async function launch() {
        const html = `<div class="app-container variations"><div class="app-loading">Loading variations...</div></div>`;
        WindowManager.createWindow('variations', 'Variations', html, {
            width: 920, height: 560,
            onReady: async (win) => { await loadList(win); }
        });
    }

    async function loadList(win) {
        const body = win.querySelector('.app-container');
        try {
            const { data: vars, error } = await SupabaseClient.from('variations')
                .select('*, project:projects(reference, client:clients(name))')
                .order('created_at', { ascending: false });
            if (error) throw error;
            const all = vars || [];

            const pendingCount = all.filter(v => v.status === 'pending').length;
            const approvedVal = all.filter(v => v.status === 'approved').reduce((s, v) => s + (v.price || v.cost || 0), 0);
            const unpaidVal = all.filter(v => v.status === 'approved' && v.payment_status !== 'paid').reduce((s, v) => s + (v.price || v.cost || 0), 0);

            body.innerHTML = `
                <div class="dash-stats compact">
                    <div class="stat-card small"><div class="stat-label">Total</div><div class="stat-value">${all.length}</div></div>
                    <div class="stat-card small"><div class="stat-label">Pending</div><div class="stat-value">${pendingCount}</div></div>
                    <div class="stat-card small"><div class="stat-label">Approved Value</div><div class="stat-value">${Utils.formatCurrencyShort(approvedVal)}</div></div>
                    <div class="stat-card small ${unpaidVal > 0 ? 'warning' : ''}"><div class="stat-label">Unpaid</div><div class="stat-value">${Utils.formatCurrencyShort(unpaidVal)}</div></div>
                </div>
                <div class="app-toolbar">
                    <input type="text" class="app-search" placeholder="Search variations..." id="var-search">
                    <select class="app-filter" id="var-filter">
                        <option value="all">All</option>
                        ${Object.entries(VAR_STATUSES).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}
                    </select>
                    <button class="import-btn" id="var-new-btn">+ New Variation</button>
                </div>
                <div class="app-table-wrap">
                    <table class="app-table">
                        <thead><tr>
                            <th>Reference</th>
                            <th>Project</th>
                            <th>Description</th>
                            <th>Status</th>
                            <th>Cost</th>
                            <th>Price</th>
                            <th>Payment</th>
                            <th>Work</th>
                        </tr></thead>
                        <tbody id="var-tbody"></tbody>
                    </table>
                </div>
            `;

            const tbody = body.querySelector('#var-tbody');
            const search = body.querySelector('#var-search');
            const filter = body.querySelector('#var-filter');
            body.querySelector('#var-new-btn').addEventListener('click', () => showForm(win));

            function render(list) {
                tbody.innerHTML = list.length > 0 ? list.map(v => `
                    <tr class="clickable-row" data-id="${v.id}">
                        <td class="ref-link">${v.reference || '—'}</td>
                        <td>${v.project?.reference || '—'}</td>
                        <td>${(v.description || '—').substring(0, 50)}${(v.description || '').length > 50 ? '...' : ''}</td>
                        <td>${varBadge(v.status)}</td>
                        <td>${Utils.formatCurrency(v.cost)}</td>
                        <td>${Utils.formatCurrency(v.price)}</td>
                        <td>${payBadge(v.payment_status)}</td>
                        <td>${workBadge(v.work_status)}</td>
                    </tr>
                `).join('') : '<tr><td colspan="8" class="empty-row">No variations</td></tr>';

                tbody.querySelectorAll('.clickable-row').forEach(row => {
                    row.addEventListener('click', () => {
                        const v = all.find(x => x.id === row.dataset.id);
                        if (v) showDetail(win, v);
                    });
                });
            }

            function applyFilters() {
                const q = search.value.toLowerCase();
                const f = filter.value;
                let filtered = all;
                if (q) filtered = filtered.filter(v => (v.reference || '').toLowerCase().includes(q) || (v.description || '').toLowerCase().includes(q) || (v.project?.reference || '').toLowerCase().includes(q));
                if (f !== 'all') filtered = filtered.filter(v => v.status === f);
                render(filtered);
            }

            search.addEventListener('input', applyFilters);
            filter.addEventListener('change', applyFilters);
            render(all);
        } catch (err) {
            body.innerHTML = `<div class="app-error">Failed to load variations: ${err.message}</div>`;
        }
    }

    async function showDetail(win, v) {
        const body = win.querySelector('.app-container');

        const statusOpts = Object.entries(VAR_STATUSES).filter(([k]) => k !== v.status).map(([k, s]) => `<option value="${k}">${s.label}</option>`).join('');
        const payOpts = Object.entries(PAY_STATUSES).filter(([k]) => k !== v.payment_status).map(([k, s]) => `<option value="${k}">${s.label}</option>`).join('');
        const workOpts = Object.entries(WORK_STATUSES).filter(([k]) => k !== v.work_status).map(([k, s]) => `<option value="${k}">${s.label}</option>`).join('');

        body.innerHTML = `
            <div class="detail-view">
                <div class="detail-header">
                    <button class="back-btn" id="var-back">← Back</button>
                    <h2>${v.reference || 'Variation'}</h2>
                    <div class="status-advance">
                        ${varBadge(v.status)}
                        <select id="var-status-sel">${statusOpts}</select>
                        <button id="var-status-go">Update</button>
                    </div>
                    <button class="btn-edit" id="var-edit-btn">Edit</button>
                </div>
                <div class="detail-grid">
                    <div class="detail-section">
                        <h4>Details</h4>
                        <div class="detail-fields">
                            <div class="field"><span class="field-label">Project</span><span class="field-value">${v.project?.reference || '—'}</span></div>
                            <div class="field"><span class="field-label">Client</span><span class="field-value">${v.project?.client?.name || '—'}</span></div>
                            <div class="field"><span class="field-label">Cost</span><span class="field-value strong">${Utils.formatCurrency(v.cost)}</span></div>
                            <div class="field"><span class="field-label">Client Price</span><span class="field-value strong">${Utils.formatCurrency(v.price)}</span></div>
                            <div class="field"><span class="field-label">Requested By</span><span class="field-value">${v.requested_by || '—'}</span></div>
                            <div class="field"><span class="field-label">Request Date</span><span class="field-value">${Utils.formatDate(v.request_date)}</span></div>
                            <div class="field full-width"><span class="field-label">Description</span><span class="field-value">${v.description || '—'}</span></div>
                            ${v.request_notes ? `<div class="field full-width"><span class="field-label">Request Notes</span><span class="field-value">${v.request_notes}</span></div>` : ''}
                        </div>
                    </div>
                    <div class="detail-section">
                        <h4>Status & Payment</h4>
                        <div class="detail-fields">
                            <div class="field"><span class="field-label">Payment Status</span><span class="field-value">${payBadge(v.payment_status)}</span></div>
                            <div class="field"><span class="field-label">Work Status</span><span class="field-value">${workBadge(v.work_status)}</span></div>
                            <div class="field"><span class="field-label">Internal Status</span><span class="field-value">${v.internal_status || '—'}</span></div>
                            <div class="field"><span class="field-label">Created</span><span class="field-value">${Utils.formatDate(v.created_at)}</span></div>
                            ${v.internal_approved_at ? `<div class="field"><span class="field-label">Approved</span><span class="field-value">${Utils.formatDate(v.internal_approved_at)}</span></div>` : ''}
                            <div style="padding-top:8px">
                                <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">Update payment status:</div>
                                <div class="status-advance">
                                    <select id="var-pay-sel">${payOpts}</select>
                                    <button id="var-pay-go">Update</button>
                                </div>
                            </div>
                            <div style="padding-top:8px">
                                <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">Update work status:</div>
                                <div class="status-advance">
                                    <select id="var-work-sel">${workOpts}</select>
                                    <button id="var-work-go">Update</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        body.querySelector('#var-back').addEventListener('click', () => loadList(win));
        body.querySelector('#var-edit-btn').addEventListener('click', () => showForm(win, v));

        body.querySelector('#var-status-go').addEventListener('click', async () => {
            const btn = body.querySelector('#var-status-go');
            btn.disabled = true; btn.textContent = '...';
            try {
                const newStatus = body.querySelector('#var-status-sel').value;
                const updates = { status: newStatus };
                if (newStatus === 'approved') {
                    updates.internal_approved_at = new Date().toISOString();
                    updates.internal_status = 'approved';
                }
                const { error } = await SupabaseClient.from('variations').update(updates).eq('id', v.id);
                if (error) throw error;
                await syncVariationTotal(v.project_id);
                await reloadDetail(win, v.id);
            } catch (err) { btn.textContent = 'Error'; btn.disabled = false; }
        });

        body.querySelector('#var-pay-go').addEventListener('click', async () => {
            const btn = body.querySelector('#var-pay-go');
            btn.disabled = true; btn.textContent = '...';
            try {
                const updates = { payment_status: body.querySelector('#var-pay-sel').value };
                if (updates.payment_status === 'paid') updates.payment_date = new Date().toISOString().split('T')[0];
                const { error } = await SupabaseClient.from('variations').update(updates).eq('id', v.id);
                if (error) throw error;
                await reloadDetail(win, v.id);
            } catch (err) { btn.textContent = 'Error'; btn.disabled = false; }
        });

        body.querySelector('#var-work-go').addEventListener('click', async () => {
            const btn = body.querySelector('#var-work-go');
            btn.disabled = true; btn.textContent = '...';
            try {
                const { error } = await SupabaseClient.from('variations')
                    .update({ work_status: body.querySelector('#var-work-sel').value })
                    .eq('id', v.id);
                if (error) throw error;
                await reloadDetail(win, v.id);
            } catch (err) { btn.textContent = 'Error'; btn.disabled = false; }
        });
    }

    async function reloadDetail(win, id) {
        const { data } = await SupabaseClient.from('variations')
            .select('*, project:projects(reference, client:clients(name))')
            .eq('id', id).single();
        if (data) showDetail(win, data);
    }

    async function syncVariationTotal(projectId) {
        if (!projectId) return;
        try {
            const { data } = await SupabaseClient.from('variations')
                .select('price, cost, status')
                .eq('project_id', projectId);
            const total = (data || []).filter(v => v.status === 'approved').reduce((s, v) => s + (v.price || v.cost || 0), 0);
            await SupabaseClient.from('projects').update({ variation_total: total }).eq('id', projectId);
        } catch (e) { console.error('Failed to sync variation total:', e); }
    }

    async function showForm(win, existing) {
        const body = win.querySelector('.app-container');
        const isEdit = !!existing;
        const v = existing || {};

        let projects = [];
        try {
            const { data } = await SupabaseClient.from('projects').select('id, reference, client:clients(name)').order('created_at', { ascending: false });
            projects = data || [];
        } catch (e) {}

        body.innerHTML = `
            <div class="form-view">
                <div class="form-header">
                    <button class="back-btn" id="var-form-back">← Back</button>
                    <h2>${isEdit ? 'Edit Variation' : 'New Variation'}</h2>
                </div>
                <div class="form-body">
                    <div class="form-section">
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Project *</label>
                                <select id="f-project">
                                    <option value="">— Select project —</option>
                                    ${projects.map(p => `<option value="${p.id}" ${p.id === v.project_id ? 'selected' : ''}>${p.reference || 'Untitled'} — ${p.client?.name || ''}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Reference</label>
                                <input type="text" id="f-reference" value="${v.reference || ''}" placeholder="e.g. VO-001">
                            </div>
                            <div class="form-group">
                                <label>Cost (AED) *</label>
                                <input type="number" id="f-cost" step="0.01" value="${v.cost || ''}">
                            </div>
                            <div class="form-group">
                                <label>Client Price (AED) *</label>
                                <input type="number" id="f-price" step="0.01" value="${v.price || ''}">
                            </div>
                            <div class="form-group">
                                <label>Requested By</label>
                                <input type="text" id="f-requested-by" value="${v.requested_by || ''}" placeholder="e.g. Client, Architect">
                            </div>
                            <div class="form-group">
                                <label>Request Date</label>
                                <input type="date" id="f-request-date" value="${v.request_date ? v.request_date.split('T')[0] : ''}">
                            </div>
                            <div class="form-group full">
                                <label>Description *</label>
                                <textarea id="f-desc">${v.description || ''}</textarea>
                            </div>
                            <div class="form-group full">
                                <label>Request Notes</label>
                                <textarea id="f-request-notes">${v.request_notes || ''}</textarea>
                            </div>
                        </div>
                    </div>
                    <div id="var-form-error"></div>
                </div>
                <div class="form-actions">
                    <button class="back-btn" id="var-form-cancel">Cancel</button>
                    <button class="btn-save" id="var-form-save">${isEdit ? 'Save Changes' : 'Create Variation'}</button>
                </div>
            </div>
        `;

        const goBack = () => isEdit ? reloadDetail(win, v.id) : loadList(win);
        body.querySelector('#var-form-back').addEventListener('click', goBack);
        body.querySelector('#var-form-cancel').addEventListener('click', goBack);

        body.querySelector('#var-form-save').addEventListener('click', async () => {
            const btn = body.querySelector('#var-form-save');
            const errEl = body.querySelector('#var-form-error');
            errEl.innerHTML = '';

            const projectId = body.querySelector('#f-project').value;
            const cost = parseFloat(body.querySelector('#f-cost').value);
            const price = parseFloat(body.querySelector('#f-price').value);
            const description = body.querySelector('#f-desc').value.trim();

            if (!projectId) { errEl.innerHTML = '<div class="form-error">Select a project</div>'; return; }
            if (!cost && !price) { errEl.innerHTML = '<div class="form-error">Enter cost or price</div>'; return; }
            if (!description) { errEl.innerHTML = '<div class="form-error">Enter a description</div>'; return; }

            const record = {
                project_id: projectId,
                reference: body.querySelector('#f-reference').value.trim() || null,
                cost: cost || 0,
                price: price || cost || 0,
                description,
                requested_by: body.querySelector('#f-requested-by').value.trim() || null,
                request_date: body.querySelector('#f-request-date').value ? new Date(body.querySelector('#f-request-date').value).toISOString() : null,
                request_notes: body.querySelector('#f-request-notes').value.trim() || null,
            };
            if (!isEdit) {
                record.status = 'pending';
                record.payment_status = 'unpaid';
                record.work_status = 'not_started';
                record.internal_status = 'draft';
            }

            btn.disabled = true; btn.textContent = 'Saving...';
            try {
                let result;
                if (isEdit) { result = await SupabaseClient.from('variations').update(record).eq('id', v.id); }
                else { result = await SupabaseClient.from('variations').insert(record); }
                if (result.error) throw result.error;
                await loadList(win);
            } catch (err) {
                errEl.innerHTML = `<div class="form-error">Error: ${err.message}</div>`;
                btn.disabled = false; btn.textContent = isEdit ? 'Save Changes' : 'Create Variation';
            }
        });
    }

    return { id: 'variations', name: 'Variations', icon: ICON, launch };
})();
