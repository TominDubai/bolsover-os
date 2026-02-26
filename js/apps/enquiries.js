/* ===== Enquiries App ===== */
const EnquiriesApp = (() => {
    const ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M9 14l2 2 4-4"/></svg>`;

    async function launch() {
        const html = `
            <div class="app-container enquiries">
                <div class="app-loading">Loading enquiries...</div>
            </div>
        `;

        WindowManager.createWindow('enquiries', 'Enquiries', html, {
            width: 880, height: 560,
            onReady: async (win) => {
                await loadEnquiries(win);
            }
        });
    }

    async function loadEnquiries(win) {
        const body = win.querySelector('.app-container');
        try {
            const { data: enquiries, error } = await SupabaseClient.from('projects')
                .select('*, client:clients(name, phone, email)')
                .in('status', Utils.ENQUIRY_STATUSES)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const all = enquiries || [];
            const newCount = all.filter(e => e.status === 'enquiry').length;
            const visitPending = all.filter(e => ['ready_for_visit', 'site_visit_scheduled'].includes(e.status)).length;
            const quoting = all.filter(e => ['boq_in_progress', 'boq_review'].includes(e.status)).length;

            body.innerHTML = `
                <div class="dash-stats compact">
                    <div class="stat-card small">
                        <div class="stat-label">Total</div>
                        <div class="stat-value">${all.length}</div>
                    </div>
                    <div class="stat-card small">
                        <div class="stat-label">New</div>
                        <div class="stat-value">${newCount}</div>
                    </div>
                    <div class="stat-card small">
                        <div class="stat-label">Pending Visit</div>
                        <div class="stat-value">${visitPending}</div>
                    </div>
                    <div class="stat-card small">
                        <div class="stat-label">Quoting</div>
                        <div class="stat-value">${quoting}</div>
                    </div>
                </div>

                <div class="app-toolbar">
                    <input type="text" class="app-search" placeholder="Search enquiries..." id="enq-search">
                    <select class="app-filter" id="enq-filter">
                        <option value="all">All Stages</option>
                        ${Utils.ENQUIRY_STATUSES.map(s => `<option value="${s}">${Utils.STATUS_LABELS[s]}</option>`).join('')}
                    </select>
                    <button class="import-btn" id="enq-new-btn">+ New Enquiry</button>
                </div>
                <div class="app-table-wrap">
                    <table class="app-table">
                        <thead><tr>
                            <th>Reference</th>
                            <th>Client</th>
                            <th>Status</th>
                            <th>Source</th>
                            <th>Community</th>
                            <th>Date</th>
                        </tr></thead>
                        <tbody id="enq-tbody"></tbody>
                    </table>
                </div>
            `;

            const tbody = body.querySelector('#enq-tbody');
            const search = body.querySelector('#enq-search');
            const filter = body.querySelector('#enq-filter');

            body.querySelector('#enq-new-btn').addEventListener('click', () => showForm(win));

            function render(list) {
                tbody.innerHTML = list.length > 0 ? list.map(e => `
                    <tr class="clickable-row" data-id="${e.id}">
                        <td class="ref-link">${e.reference || '—'}</td>
                        <td>
                            <div>${e.client?.name || '—'}</div>
                            ${e.client?.phone ? `<div class="cell-sub">${e.client.phone}</div>` : ''}
                        </td>
                        <td>${Utils.statusBadge(e.status)}</td>
                        <td>${e.source || '—'}</td>
                        <td>${e.community || '—'}</td>
                        <td>${Utils.formatRelativeDate(e.enquiry_date || e.created_at)}</td>
                    </tr>
                `).join('') : '<tr><td colspan="6" class="empty-row">No enquiries found</td></tr>';

                tbody.querySelectorAll('.clickable-row').forEach(row => {
                    row.addEventListener('click', () => {
                        const enq = all.find(e => e.id === row.dataset.id);
                        if (enq) showDetail(win, enq);
                    });
                });
            }

            function applyFilters() {
                const q = search.value.toLowerCase();
                const f = filter.value;
                let filtered = all;

                if (q) {
                    filtered = filtered.filter(e =>
                        (e.reference || '').toLowerCase().includes(q) ||
                        (e.client?.name || '').toLowerCase().includes(q)
                    );
                }

                if (f !== 'all') {
                    filtered = filtered.filter(e => e.status === f);
                }

                render(filtered);
            }

            search.addEventListener('input', applyFilters);
            filter.addEventListener('change', applyFilters);
            render(all);
        } catch (err) {
            body.innerHTML = `<div class="app-error">Failed to load enquiries: ${err.message}</div>`;
        }
    }

    async function showDetail(win, enq) {
        const body = win.querySelector('.app-container');

        // Build status advance options — all statuses relevant to enquiry pipeline
        const allStatuses = [...Utils.ENQUIRY_STATUSES, 'quoted', 'accepted', 'on_hold', 'lost'];
        const statusOptions = allStatuses
            .filter(s => s !== enq.status)
            .map(s => `<option value="${s}">${Utils.STATUS_LABELS[s]}</option>`)
            .join('');

        body.innerHTML = `
            <div class="detail-view">
                <div class="detail-header">
                    <button class="back-btn" id="enq-back">← Back</button>
                    <h2>${enq.reference || 'Enquiry'}</h2>
                    <div class="status-advance">
                        ${Utils.statusBadge(enq.status)}
                        <select id="enq-status-select">${statusOptions}</select>
                        <button id="enq-status-go">Update</button>
                    </div>
                    <button class="btn-edit" id="enq-edit-btn">Edit</button>
                </div>
                <div class="detail-grid">
                    <div class="detail-section">
                        <h4>Client & Location</h4>
                        <div class="detail-fields">
                            <div class="field"><span class="field-label">Client</span><span class="field-value">${enq.client?.name || '—'}</span></div>
                            <div class="field"><span class="field-label">Phone</span><span class="field-value">${enq.client?.phone || '—'}</span></div>
                            <div class="field"><span class="field-label">Email</span><span class="field-value">${enq.client?.email || '—'}</span></div>
                            <div class="field"><span class="field-label">Community</span><span class="field-value">${enq.community || '—'}</span></div>
                            <div class="field"><span class="field-label">Address</span><span class="field-value">${enq.address || '—'}</span></div>
                            <div class="field"><span class="field-label">Property Type</span><span class="field-value">${enq.property_type || '—'}</span></div>
                        </div>
                    </div>
                    <div class="detail-section">
                        <h4>Enquiry Details</h4>
                        <div class="detail-fields">
                            <div class="field"><span class="field-label">Source</span><span class="field-value">${enq.source || '—'}</span></div>
                            <div class="field"><span class="field-label">Enquiry Date</span><span class="field-value">${Utils.formatDate(enq.enquiry_date)}</span></div>
                            <div class="field"><span class="field-label">Site Visit</span><span class="field-value">${Utils.formatDate(enq.site_visit_date)}</span></div>
                            <div class="field"><span class="field-label">Design</span><span class="field-value">${enq.has_design || '—'}</span></div>
                            <div class="field"><span class="field-label">Drawings</span><span class="field-value">${enq.has_drawings || '—'}</span></div>
                            <div class="field full-width"><span class="field-label">Scope</span><span class="field-value">${enq.scope_summary || '—'}</span></div>
                            ${enq.notes ? `<div class="field full-width"><span class="field-label">Notes</span><span class="field-value">${enq.notes}</span></div>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        body.querySelector('#enq-back').addEventListener('click', () => loadEnquiries(win));
        body.querySelector('#enq-edit-btn').addEventListener('click', () => showForm(win, enq));

        body.querySelector('#enq-status-go').addEventListener('click', async () => {
            const newStatus = body.querySelector('#enq-status-select').value;
            const btn = body.querySelector('#enq-status-go');
            btn.disabled = true;
            btn.textContent = '...';
            try {
                const { error } = await SupabaseClient.from('projects')
                    .update({ status: newStatus })
                    .eq('id', enq.id);
                if (error) throw error;
                await loadEnquiries(win);
            } catch (err) {
                btn.textContent = 'Error';
                btn.disabled = false;
            }
        });
    }

    async function showForm(win, existing) {
        const body = win.querySelector('.app-container');
        const isEdit = !!existing;

        // Load clients for dropdown
        let clients = [];
        try {
            const { data } = await SupabaseClient.from('clients').select('id, name').order('name');
            clients = data || [];
        } catch (e) {}

        const e = existing || {};
        const today = new Date().toISOString().split('T')[0];

        // Auto-generate reference for new enquiries
        let autoRef = '';
        if (!isEdit) {
            try {
                const year = new Date().getFullYear();
                const prefix = `BOL-${year}-`;
                const { data: latest } = await SupabaseClient.from('projects')
                    .select('reference')
                    .like('reference', `${prefix}%`)
                    .order('reference', { ascending: false })
                    .limit(1);
                let nextNum = 1;
                if (latest && latest.length > 0) {
                    const lastRef = latest[0].reference;
                    const lastNum = parseInt(lastRef.replace(prefix, ''), 10);
                    if (!isNaN(lastNum)) nextNum = lastNum + 1;
                }
                autoRef = `${prefix}${String(nextNum).padStart(3, '0')}`;
            } catch (e) {}
        }

        body.innerHTML = `
            <div class="form-view">
                <div class="form-header">
                    <button class="back-btn" id="enq-form-back">← Back</button>
                    <h2>${isEdit ? 'Edit Enquiry' : 'New Enquiry'}</h2>
                </div>
                <div class="form-body">
                    <div class="form-section">
                        <h4>Client</h4>
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Client</label>
                                <select id="f-client">
                                    <option value="">— Select client —</option>
                                    ${clients.map(c => `<option value="${c.id}" ${c.id === e.client_id ? 'selected' : ''}>${c.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Reference</label>
                                <input type="text" id="f-reference" value="${e.reference || autoRef}" placeholder="e.g. BOL-2026-001">
                            </div>
                        </div>
                    </div>
                    <div class="form-section">
                        <h4>Location</h4>
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Community</label>
                                <input type="text" id="f-community" value="${e.community || ''}">
                            </div>
                            <div class="form-group">
                                <label>Address</label>
                                <input type="text" id="f-address" value="${e.address || ''}">
                            </div>
                            <div class="form-group">
                                <label>Property Type</label>
                                <select id="f-property-type">
                                    <option value="">—</option>
                                    ${['Villa', 'Apartment', 'Townhouse', 'Commercial', 'Other'].map(t => `<option ${t === e.property_type ? 'selected' : ''}>${t}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Source</label>
                                <select id="f-source">
                                    <option value="">—</option>
                                    ${['Referral', 'Website', 'Social Media', 'Walk-in', 'Repeat Client', 'Other'].map(s => `<option ${s === e.source ? 'selected' : ''}>${s}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="form-section">
                        <h4>Details</h4>
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Enquiry Date</label>
                                <input type="date" id="f-enquiry-date" value="${e.enquiry_date || today}">
                            </div>
                            <div class="form-group">
                                <label>Site Visit Date</label>
                                <input type="date" id="f-visit-date" value="${e.site_visit_date || ''}">
                            </div>
                            <div class="form-group">
                                <label>Has Design?</label>
                                <select id="f-design">
                                    <option value="">—</option>
                                    ${['Yes', 'No', 'Partial'].map(v => `<option ${v === e.has_design ? 'selected' : ''}>${v}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Has Drawings?</label>
                                <select id="f-drawings">
                                    <option value="">—</option>
                                    ${['Yes', 'No', 'Partial'].map(v => `<option ${v === e.has_drawings ? 'selected' : ''}>${v}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group full">
                                <label>Scope Summary</label>
                                <textarea id="f-scope">${e.scope_summary || ''}</textarea>
                            </div>
                            <div class="form-group full">
                                <label>Notes</label>
                                <textarea id="f-notes">${e.notes || ''}</textarea>
                            </div>
                        </div>
                    </div>
                    <div id="enq-form-error"></div>
                </div>
                <div class="form-actions">
                    <button class="back-btn" id="enq-form-cancel">Cancel</button>
                    <button class="btn-save" id="enq-form-save">${isEdit ? 'Save Changes' : 'Create Enquiry'}</button>
                </div>
            </div>
        `;

        const goBack = () => isEdit ? loadEnquiries(win) : loadEnquiries(win);
        body.querySelector('#enq-form-back').addEventListener('click', goBack);
        body.querySelector('#enq-form-cancel').addEventListener('click', goBack);

        body.querySelector('#enq-form-save').addEventListener('click', async () => {
            const btn = body.querySelector('#enq-form-save');
            const errEl = body.querySelector('#enq-form-error');
            errEl.innerHTML = '';

            const clientId = body.querySelector('#f-client').value;
            if (!clientId) {
                errEl.innerHTML = '<div class="form-error">Please select a client</div>';
                return;
            }

            const record = {
                client_id: clientId,
                reference: body.querySelector('#f-reference').value.trim() || null,
                community: body.querySelector('#f-community').value.trim() || null,
                address: body.querySelector('#f-address').value.trim() || null,
                property_type: body.querySelector('#f-property-type').value || null,
                source: body.querySelector('#f-source').value || null,
                enquiry_date: body.querySelector('#f-enquiry-date').value || null,
                site_visit_date: body.querySelector('#f-visit-date').value || null,
                has_design: body.querySelector('#f-design').value || null,
                has_drawings: body.querySelector('#f-drawings').value || null,
                scope_summary: body.querySelector('#f-scope').value.trim() || null,
                notes: body.querySelector('#f-notes').value.trim() || null,
            };

            if (!isEdit) {
                record.status = 'enquiry';
            }

            btn.disabled = true;
            btn.textContent = 'Saving...';

            try {
                let result;
                if (isEdit) {
                    result = await SupabaseClient.from('projects').update(record).eq('id', e.id);
                } else {
                    result = await SupabaseClient.from('projects').insert(record);
                }
                if (result.error) throw result.error;
                await loadEnquiries(win);
            } catch (err) {
                errEl.innerHTML = `<div class="form-error">Error: ${err.message}</div>`;
                btn.disabled = false;
                btn.textContent = isEdit ? 'Save Changes' : 'Create Enquiry';
            }
        });
    }

    return { id: 'enquiries', name: 'Enquiries', icon: ICON, launch };
})();
