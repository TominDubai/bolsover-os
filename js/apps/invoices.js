/* ===== Invoices App ===== */
const InvoicesApp = (() => {
    const ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="2" y1="9" x2="22" y2="9"/><line x1="9" y1="3" x2="9" y2="9"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/></svg>`;

    const INV_STATUSES = {
        draft: { label: 'Draft', bg: '#f3f4f6', text: '#374151' },
        sent: { label: 'Sent', bg: '#dbeafe', text: '#1e40af' },
        overdue: { label: 'Overdue', bg: '#fee2e2', text: '#991b1b' },
        partially_paid: { label: 'Partial', bg: '#fef3c7', text: '#92400e' },
        paid: { label: 'Paid', bg: '#dcfce7', text: '#166534' },
        cancelled: { label: 'Cancelled', bg: '#f3f4f6', text: '#6b7280' },
    };

    const INV_TYPES = {
        progress_claim: 'Progress Claim',
        milestone: 'Milestone',
        variation: 'Variation',
        final: 'Final Invoice',
        deposit: 'Deposit',
        retention: 'Retention Release',
    };

    function invBadge(status) {
        const s = INV_STATUSES[status] || INV_STATUSES.draft;
        return `<span class="status-badge" style="background:${s.bg};color:${s.text}">${s.label}</span>`;
    }

    function typeBadge(type) {
        const label = INV_TYPES[type] || type || '—';
        return `<span class="status-badge" style="background:rgba(255,255,255,0.06);color:var(--text-secondary)">${label}</span>`;
    }

    async function launch() {
        const html = `
            <div class="app-container invoices">
                <div class="app-loading">Loading invoices...</div>
            </div>
        `;
        WindowManager.createWindow('invoices', 'Invoices', html, {
            width: 940, height: 600,
            onReady: async (win) => {
                await loadList(win);
            }
        });
    }

    async function loadList(win) {
        const body = win.querySelector('.app-container');
        try {
            const { data: invoices, error } = await SupabaseClient.from('invoices')
                .select('*, project:projects(reference, client:clients(name))')
                .order('created_at', { ascending: false });

            if (error) throw error;
            const all = invoices || [];

            // Fetch payment totals for all invoices
            let paymentsByInvoice = {};
            try {
                const { data: payments } = await SupabaseClient.from('payments')
                    .select('invoice_id, amount');
                (payments || []).forEach(p => {
                    paymentsByInvoice[p.invoice_id] = (paymentsByInvoice[p.invoice_id] || 0) + (p.amount || 0);
                });
            } catch (e) { /* payments table may not exist */ }

            const totalInvoiced = all.filter(i => i.status !== 'cancelled').reduce((s, i) => s + (i.amount || 0), 0);
            const totalPaid = Object.values(paymentsByInvoice).reduce((s, v) => s + v, 0);
            const totalOutstanding = totalInvoiced - totalPaid;
            const overdueCount = all.filter(i => i.status === 'overdue' || (i.status === 'sent' && i.due_date && new Date(i.due_date) < new Date())).length;

            body.innerHTML = `
                <div class="dash-stats compact">
                    <div class="stat-card small">
                        <div class="stat-label">Invoiced</div>
                        <div class="stat-value">${Utils.formatCurrencyShort(totalInvoiced)}</div>
                    </div>
                    <div class="stat-card small">
                        <div class="stat-label">Received</div>
                        <div class="stat-value">${Utils.formatCurrencyShort(totalPaid)}</div>
                    </div>
                    <div class="stat-card small ${totalOutstanding > 0 ? 'warning' : ''}">
                        <div class="stat-label">Outstanding</div>
                        <div class="stat-value">${Utils.formatCurrencyShort(totalOutstanding)}</div>
                    </div>
                    <div class="stat-card small ${overdueCount > 0 ? 'accent' : ''}">
                        <div class="stat-label">Overdue</div>
                        <div class="stat-value">${overdueCount}</div>
                    </div>
                </div>
                <div class="app-toolbar">
                    <input type="text" class="app-search" placeholder="Search invoices..." id="inv-search">
                    <select class="app-filter" id="inv-filter">
                        <option value="all">All Statuses</option>
                        ${Object.entries(INV_STATUSES).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}
                    </select>
                    <select class="app-filter" id="inv-type-filter">
                        <option value="all">All Types</option>
                        ${Object.entries(INV_TYPES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
                    </select>
                    <button class="import-btn" id="inv-new-btn">+ New Invoice</button>
                </div>
                <div class="app-table-wrap">
                    <table class="app-table">
                        <thead><tr>
                            <th>Reference</th>
                            <th>Project</th>
                            <th>Client</th>
                            <th>Type</th>
                            <th>Status</th>
                            <th>Amount</th>
                            <th>Paid</th>
                            <th>Due</th>
                        </tr></thead>
                        <tbody id="inv-tbody"></tbody>
                    </table>
                </div>
            `;

            const tbody = body.querySelector('#inv-tbody');
            const search = body.querySelector('#inv-search');
            const statusFilter = body.querySelector('#inv-filter');
            const typeFilter = body.querySelector('#inv-type-filter');

            body.querySelector('#inv-new-btn').addEventListener('click', () => showNewForm(win));

            function render(list) {
                tbody.innerHTML = list.length > 0 ? list.map(inv => {
                    const isOverdue = inv.status === 'sent' && inv.due_date && new Date(inv.due_date) < new Date();
                    const displayStatus = isOverdue ? 'overdue' : inv.status;
                    const paidAmt = paymentsByInvoice[inv.id] || 0;
                    return `
                        <tr class="clickable-row" data-id="${inv.id}">
                            <td class="ref-link">${inv.reference || '—'}</td>
                            <td>${inv.project?.reference || '—'}</td>
                            <td>${inv.project?.client?.name || '—'}</td>
                            <td>${typeBadge(inv.invoice_type)}</td>
                            <td>${invBadge(displayStatus)}</td>
                            <td>${Utils.formatCurrency(inv.amount)}</td>
                            <td>${Utils.formatCurrency(paidAmt)}</td>
                            <td class="${isOverdue ? 'warning-text' : ''}">${Utils.formatDate(inv.due_date)}</td>
                        </tr>
                    `;
                }).join('') : '<tr><td colspan="8" class="empty-row">No invoices yet</td></tr>';

                tbody.querySelectorAll('.clickable-row').forEach(row => {
                    row.addEventListener('click', () => {
                        const inv = all.find(i => i.id === row.dataset.id);
                        if (inv) showDetail(win, inv);
                    });
                });
            }

            function applyFilters() {
                const q = search.value.toLowerCase();
                const sf = statusFilter.value;
                const tf = typeFilter.value;
                let filtered = all;
                if (q) {
                    filtered = filtered.filter(i =>
                        (i.reference || '').toLowerCase().includes(q) ||
                        (i.project?.reference || '').toLowerCase().includes(q) ||
                        (i.project?.client?.name || '').toLowerCase().includes(q)
                    );
                }
                if (sf !== 'all') {
                    if (sf === 'overdue') {
                        filtered = filtered.filter(i => i.status === 'overdue' || (i.status === 'sent' && i.due_date && new Date(i.due_date) < new Date()));
                    } else {
                        filtered = filtered.filter(i => i.status === sf);
                    }
                }
                if (tf !== 'all') filtered = filtered.filter(i => i.invoice_type === tf);
                render(filtered);
            }

            search.addEventListener('input', applyFilters);
            statusFilter.addEventListener('change', applyFilters);
            typeFilter.addEventListener('change', applyFilters);
            render(all);
        } catch (err) {
            body.innerHTML = `<div class="app-error">Failed to load invoices: ${err.message}</div>`;
        }
    }

    async function showNewForm(win) {
        const body = win.querySelector('.app-container');

        let projects = [];
        try {
            const { data } = await SupabaseClient.from('projects')
                .select('id, reference, contract_value, total_invoiced, client:clients(name)')
                .order('created_at', { ascending: false });
            projects = data || [];
        } catch (e) {}

        body.innerHTML = `
            <div class="form-view">
                <div class="form-header">
                    <button class="back-btn" id="inv-form-back">← Back</button>
                    <h2>New Invoice</h2>
                </div>
                <div class="form-body">
                    <div class="form-section">
                        <h4>Invoice Details</h4>
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Project *</label>
                                <select id="f-project">
                                    <option value="">— Select project —</option>
                                    ${projects.map(p => `<option value="${p.id}" data-cv="${p.contract_value || 0}" data-inv="${p.total_invoiced || 0}">${p.reference || 'Untitled'} — ${p.client?.name || ''}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Invoice Reference</label>
                                <input type="text" id="f-reference" placeholder="e.g. INV-2026-001">
                            </div>
                            <div class="form-group">
                                <label>Type</label>
                                <select id="f-type">
                                    ${Object.entries(INV_TYPES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Due Date</label>
                                <input type="date" id="f-due-date">
                            </div>
                        </div>
                    </div>
                    <div class="form-section">
                        <h4>Amount</h4>
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Invoice Amount (AED) *</label>
                                <input type="number" id="f-amount" step="0.01" placeholder="0">
                            </div>
                            <div class="form-group">
                                <div id="inv-project-info" class="inv-project-info"></div>
                            </div>
                            <div class="form-group full">
                                <label>Description / Notes</label>
                                <textarea id="f-desc" placeholder="Payment terms, scope covered, etc."></textarea>
                            </div>
                        </div>
                    </div>
                    <div id="inv-form-error"></div>
                </div>
                <div class="form-actions">
                    <button class="back-btn" id="inv-form-cancel">Cancel</button>
                    <button class="btn-save" id="inv-form-save">Create Invoice</button>
                </div>
            </div>
        `;

        const projectSelect = body.querySelector('#f-project');
        const infoEl = body.querySelector('#inv-project-info');
        projectSelect.addEventListener('change', () => {
            const opt = projectSelect.selectedOptions[0];
            if (opt && opt.value) {
                const cv = parseFloat(opt.dataset.cv) || 0;
                const inv = parseFloat(opt.dataset.inv) || 0;
                const remaining = cv - inv;
                infoEl.innerHTML = `
                    <div style="font-size:12px;color:var(--text-muted);display:flex;flex-direction:column;gap:4px;padding-top:18px;">
                        <span>Contract: ${Utils.formatCurrency(cv)}</span>
                        <span>Already invoiced: ${Utils.formatCurrency(inv)}</span>
                        <span style="color:var(--text-primary);font-weight:600">Remaining: ${Utils.formatCurrency(remaining)}</span>
                    </div>
                `;
            } else {
                infoEl.innerHTML = '';
            }
        });

        const goBack = () => loadList(win);
        body.querySelector('#inv-form-back').addEventListener('click', goBack);
        body.querySelector('#inv-form-cancel').addEventListener('click', goBack);

        body.querySelector('#inv-form-save').addEventListener('click', async () => {
            const btn = body.querySelector('#inv-form-save');
            const errEl = body.querySelector('#inv-form-error');
            errEl.innerHTML = '';

            const projectId = projectSelect.value;
            const amount = parseFloat(body.querySelector('#f-amount').value);
            if (!projectId) {
                errEl.innerHTML = '<div class="form-error">Please select a project</div>';
                return;
            }
            if (!amount || amount <= 0) {
                errEl.innerHTML = '<div class="form-error">Please enter a valid amount</div>';
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Creating...';

            try {
                const { data, error } = await SupabaseClient.from('invoices').insert({
                    project_id: projectId,
                    reference: body.querySelector('#f-reference').value.trim() || null,
                    invoice_type: body.querySelector('#f-type').value,
                    status: 'draft',
                    amount,
                    due_date: body.querySelector('#f-due-date').value || null,
                    description: body.querySelector('#f-desc').value.trim() || null,
                }).select().single();
                if (error) throw error;

                await syncProjectFinancials(projectId);

                const { data: inv } = await SupabaseClient.from('invoices')
                    .select('*, project:projects(reference, contract_value, total_invoiced, total_paid, client:clients(name))')
                    .eq('id', data.id).single();
                showDetail(win, inv || data);
            } catch (err) {
                errEl.innerHTML = `<div class="form-error">Error: ${err.message}</div>`;
                btn.disabled = false;
                btn.textContent = 'Create Invoice';
            }
        });
    }

    async function showDetail(win, inv) {
        const body = win.querySelector('.app-container');

        // Fetch payments for this invoice
        let payments = [];
        let paidAmount = 0;
        try {
            const { data } = await SupabaseClient.from('payments')
                .select('*')
                .eq('invoice_id', inv.id)
                .order('payment_date', { ascending: false });
            payments = data || [];
            paidAmount = payments.reduce((s, p) => s + (p.amount || 0), 0);
        } catch (e) { /* payments table may not exist yet */ }

        const outstanding = (inv.amount || 0) - paidAmount;
        const isOverdue = inv.status === 'sent' && inv.due_date && new Date(inv.due_date) < new Date();

        const statusOptions = Object.entries(INV_STATUSES)
            .filter(([k]) => k !== inv.status)
            .map(([k, v]) => `<option value="${k}">${v.label}</option>`)
            .join('');

        body.innerHTML = `
            <div class="detail-view">
                <div class="detail-header">
                    <button class="back-btn" id="inv-back">← Back</button>
                    <h2>${inv.reference || 'Invoice'}</h2>
                    <div class="status-advance">
                        ${invBadge(isOverdue ? 'overdue' : inv.status)}
                        <select id="inv-status-select">${statusOptions}</select>
                        <button id="inv-status-go">Update</button>
                    </div>
                    <button class="btn-edit" id="inv-edit-btn">Edit</button>
                </div>
                <div class="detail-grid">
                    <div class="detail-section">
                        <h4>Invoice Details</h4>
                        <div class="detail-fields">
                            <div class="field"><span class="field-label">Project</span><span class="field-value">${inv.project?.reference || '—'}</span></div>
                            <div class="field"><span class="field-label">Client</span><span class="field-value">${inv.project?.client?.name || '—'}</span></div>
                            <div class="field"><span class="field-label">Type</span><span class="field-value">${INV_TYPES[inv.invoice_type] || inv.invoice_type || '—'}</span></div>
                            <div class="field"><span class="field-label">Due Date</span><span class="field-value ${isOverdue ? 'warning-text' : ''}">${Utils.formatDate(inv.due_date)}</span></div>
                            <div class="field"><span class="field-label">Issued Date</span><span class="field-value">${Utils.formatDate(inv.issued_date)}</span></div>
                            <div class="field"><span class="field-label">Created</span><span class="field-value">${Utils.formatDate(inv.created_at)}</span></div>
                            ${inv.description ? `<div class="field full-width"><span class="field-label">Description</span><span class="field-value">${inv.description}</span></div>` : ''}
                        </div>
                    </div>
                    <div class="detail-section">
                        <h4>Financials</h4>
                        <div class="detail-fields">
                            <div class="field"><span class="field-label">Invoice Amount</span><span class="field-value strong">${Utils.formatCurrency(inv.amount)}</span></div>
                            <div class="field"><span class="field-label">Paid Amount</span><span class="field-value">${Utils.formatCurrency(paidAmount)}</span></div>
                            <div class="field"><span class="field-label">Outstanding</span><span class="field-value ${outstanding > 0 ? 'warning-text' : ''} strong">${Utils.formatCurrency(outstanding)}</span></div>
                            ${inv.project ? `
                                <div style="border-top:1px solid var(--window-border);margin:8px 0;"></div>
                                <div class="field"><span class="field-label">Contract Value</span><span class="field-value">${Utils.formatCurrency(inv.project.contract_value)}</span></div>
                                <div class="field"><span class="field-label">Total Invoiced (Project)</span><span class="field-value">${Utils.formatCurrency(inv.project.total_invoiced)}</span></div>
                                <div class="field"><span class="field-label">Total Paid (Project)</span><span class="field-value">${Utils.formatCurrency(inv.project.total_paid)}</span></div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="detail-section" style="grid-column:1/-1">
                        <h4>Payments</h4>
                        <div class="inv-payments-area">
                            ${payments.length > 0 ? `
                                <table class="app-table">
                                    <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Reference</th><th>Notes</th></tr></thead>
                                    <tbody>
                                        ${payments.map(p => `
                                            <tr>
                                                <td>${Utils.formatDate(p.payment_date)}</td>
                                                <td class="strong">${Utils.formatCurrency(p.amount)}</td>
                                                <td>${p.method || '—'}</td>
                                                <td>${p.reference || '—'}</td>
                                                <td>${p.notes || '—'}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            ` : '<div class="empty-state" style="padding:16px">No payments recorded</div>'}
                            ${outstanding > 0 ? `<div style="padding:8px 12px"><button class="import-btn" id="inv-add-payment">+ Record Payment</button></div>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        body.querySelector('#inv-back').addEventListener('click', () => loadList(win));
        body.querySelector('#inv-edit-btn').addEventListener('click', () => showEditForm(win, inv));

        // Status update
        body.querySelector('#inv-status-go').addEventListener('click', async () => {
            const newStatus = body.querySelector('#inv-status-select').value;
            const btn = body.querySelector('#inv-status-go');
            btn.disabled = true;
            btn.textContent = '...';
            try {
                const updates = { status: newStatus };
                if (newStatus === 'sent' && !inv.issued_date) updates.issued_date = new Date().toISOString().split('T')[0];
                if (newStatus === 'paid') {
                    updates.paid_date = new Date().toISOString().split('T')[0];
                }
                const { error } = await SupabaseClient.from('invoices').update(updates).eq('id', inv.id);
                if (error) throw error;
                if (newStatus === 'paid') await syncProjectFinancials(inv.project_id);
                await reloadDetail(win, inv.id);
            } catch (err) {
                btn.textContent = 'Error';
                btn.disabled = false;
            }
        });

        // Record payment
        const payBtn = body.querySelector('#inv-add-payment');
        if (payBtn) {
            payBtn.addEventListener('click', () => showPaymentForm(win, inv, paidAmount));
        }
    }

    async function reloadDetail(win, invId) {
        const { data: inv } = await SupabaseClient.from('invoices')
            .select('*, project:projects(reference, contract_value, total_invoiced, total_paid, client:clients(name))')
            .eq('id', invId).single();
        if (inv) showDetail(win, inv);
    }

    async function showEditForm(win, inv) {
        const body = win.querySelector('.app-container');

        body.innerHTML = `
            <div class="form-view">
                <div class="form-header">
                    <button class="back-btn" id="inv-edit-back">← Back</button>
                    <h2>Edit Invoice</h2>
                </div>
                <div class="form-body">
                    <div class="form-section">
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Invoice Reference</label>
                                <input type="text" id="f-reference" value="${inv.reference || ''}">
                            </div>
                            <div class="form-group">
                                <label>Type</label>
                                <select id="f-type">
                                    ${Object.entries(INV_TYPES).map(([k, v]) => `<option value="${k}" ${k === inv.invoice_type ? 'selected' : ''}>${v}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Amount (AED)</label>
                                <input type="number" id="f-amount" step="0.01" value="${inv.amount || ''}">
                            </div>
                            <div class="form-group">
                                <label>Due Date</label>
                                <input type="date" id="f-due-date" value="${inv.due_date || ''}">
                            </div>
                            <div class="form-group">
                                <label>Issued Date</label>
                                <input type="date" id="f-issued-date" value="${inv.issued_date || ''}">
                            </div>
                            <div class="form-group">
                                <label>Paid Date</label>
                                <input type="date" id="f-paid-date" value="${inv.paid_date || ''}">
                            </div>
                            <div class="form-group full">
                                <label>Description</label>
                                <textarea id="f-desc">${inv.description || ''}</textarea>
                            </div>
                        </div>
                    </div>
                    <div id="inv-edit-error"></div>
                </div>
                <div class="form-actions">
                    <button class="back-btn" id="inv-edit-cancel">Cancel</button>
                    <button class="btn-save" id="inv-edit-save">Save Changes</button>
                </div>
            </div>
        `;

        const goBack = () => reloadDetail(win, inv.id);
        body.querySelector('#inv-edit-back').addEventListener('click', goBack);
        body.querySelector('#inv-edit-cancel').addEventListener('click', goBack);

        body.querySelector('#inv-edit-save').addEventListener('click', async () => {
            const btn = body.querySelector('#inv-edit-save');
            const errEl = body.querySelector('#inv-edit-error');
            errEl.innerHTML = '';
            btn.disabled = true;
            btn.textContent = 'Saving...';

            try {
                const { error } = await SupabaseClient.from('invoices').update({
                    reference: body.querySelector('#f-reference').value.trim() || null,
                    invoice_type: body.querySelector('#f-type').value,
                    amount: parseFloat(body.querySelector('#f-amount').value) || 0,
                    due_date: body.querySelector('#f-due-date').value || null,
                    issued_date: body.querySelector('#f-issued-date').value || null,
                    paid_date: body.querySelector('#f-paid-date').value || null,
                    description: body.querySelector('#f-desc').value.trim() || null,
                }).eq('id', inv.id);
                if (error) throw error;
                await syncProjectFinancials(inv.project_id);
                await reloadDetail(win, inv.id);
            } catch (err) {
                errEl.innerHTML = `<div class="form-error">Error: ${err.message}</div>`;
                btn.disabled = false;
                btn.textContent = 'Save Changes';
            }
        });
    }

    async function showPaymentForm(win, inv, currentPaid) {
        const body = win.querySelector('.app-container');
        const outstanding = (inv.amount || 0) - (currentPaid || 0);
        const today = new Date().toISOString().split('T')[0];

        body.innerHTML = `
            <div class="form-view">
                <div class="form-header">
                    <button class="back-btn" id="pay-back">← Back to Invoice</button>
                    <h2>Record Payment — ${inv.reference || 'Invoice'}</h2>
                </div>
                <div class="form-body">
                    <div class="form-section">
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Payment Amount (AED) *</label>
                                <input type="number" id="f-pay-amount" step="0.01" value="${outstanding}" placeholder="0">
                            </div>
                            <div class="form-group">
                                <label>Payment Date</label>
                                <input type="date" id="f-pay-date" value="${today}">
                            </div>
                            <div class="form-group">
                                <label>Payment Method</label>
                                <select id="f-pay-method">
                                    <option value="">—</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="cheque">Cheque</option>
                                    <option value="cash">Cash</option>
                                    <option value="card">Card</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Payment Reference</label>
                                <input type="text" id="f-pay-ref" placeholder="e.g. cheque number, transfer ref">
                            </div>
                            <div class="form-group full">
                                <label>Notes</label>
                                <textarea id="f-pay-notes"></textarea>
                            </div>
                        </div>
                    </div>
                    <div style="padding:0 16px;font-size:12px;color:var(--text-muted)">
                        Outstanding on this invoice: <strong style="color:var(--text-primary)">${Utils.formatCurrency(outstanding)}</strong>
                    </div>
                    <div id="pay-form-error"></div>
                </div>
                <div class="form-actions">
                    <button class="back-btn" id="pay-cancel">Cancel</button>
                    <button class="btn-save" id="pay-save">Record Payment</button>
                </div>
            </div>
        `;

        const goBack = () => reloadDetail(win, inv.id);
        body.querySelector('#pay-back').addEventListener('click', goBack);
        body.querySelector('#pay-cancel').addEventListener('click', goBack);

        body.querySelector('#pay-save').addEventListener('click', async () => {
            const btn = body.querySelector('#pay-save');
            const errEl = body.querySelector('#pay-form-error');
            errEl.innerHTML = '';

            const payAmount = parseFloat(body.querySelector('#f-pay-amount').value);
            if (!payAmount || payAmount <= 0) {
                errEl.innerHTML = '<div class="form-error">Please enter a valid amount</div>';
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Recording...';

            try {
                const { error: payErr } = await SupabaseClient.from('payments').insert({
                    invoice_id: inv.id,
                    project_id: inv.project_id,
                    amount: payAmount,
                    payment_date: body.querySelector('#f-pay-date').value || today,
                    method: body.querySelector('#f-pay-method').value || null,
                    reference: body.querySelector('#f-pay-ref').value.trim() || null,
                    notes: body.querySelector('#f-pay-notes').value.trim() || null,
                });
                if (payErr) throw payErr;

                // Update invoice status based on total paid
                const newPaid = (currentPaid || 0) + payAmount;
                const newStatus = newPaid >= (inv.amount || 0) ? 'paid' : 'partially_paid';
                const invUpdates = { status: newStatus };
                if (newStatus === 'paid') invUpdates.paid_date = body.querySelector('#f-pay-date').value || today;

                const { error: invErr } = await SupabaseClient.from('invoices')
                    .update(invUpdates).eq('id', inv.id);
                if (invErr) throw invErr;

                await syncProjectFinancials(inv.project_id);
                await reloadDetail(win, inv.id);
            } catch (err) {
                errEl.innerHTML = `<div class="form-error">Error: ${err.message}</div>`;
                btn.disabled = false;
                btn.textContent = 'Record Payment';
            }
        });
    }

    async function syncProjectFinancials(projectId) {
        if (!projectId) return;
        try {
            const { data: invs } = await SupabaseClient.from('invoices')
                .select('amount, status')
                .eq('project_id', projectId);

            const activeInvs = (invs || []).filter(i => i.status !== 'cancelled');
            const totalInvoiced = activeInvs.reduce((s, i) => s + (i.amount || 0), 0);

            // Get total paid from payments table
            let totalPaid = 0;
            try {
                const { data: payments } = await SupabaseClient.from('payments')
                    .select('amount')
                    .eq('project_id', projectId);
                totalPaid = (payments || []).reduce((s, p) => s + (p.amount || 0), 0);
            } catch (e) {}

            await SupabaseClient.from('projects').update({
                total_invoiced: totalInvoiced,
                total_paid: totalPaid,
            }).eq('id', projectId);
        } catch (e) {
            console.error('Failed to sync project financials:', e);
        }
    }

    return { id: 'invoices', name: 'Invoices', icon: ICON, launch };
})();
