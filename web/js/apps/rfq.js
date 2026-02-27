/* ===== RFQ (Request for Quotation) App ===== */
const RFQApp = (() => {
    const ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="13" y2="13"/></svg>`;

    const RFQ_STATUSES = {
        draft:    { label: 'Draft',    bg: '#f3f4f6', text: '#374151' },
        sent:     { label: 'Sent',     bg: '#dbeafe', text: '#1e40af' },
        received: { label: 'Received', bg: '#fef3c7', text: '#92400e' },
        accepted: { label: 'Accepted', bg: '#dcfce7', text: '#166534' },
        rejected: { label: 'Rejected', bg: '#fee2e2', text: '#991b1b' },
        expired:  { label: 'Expired',  bg: '#f3f4f6', text: '#6b7280' },
    };

    const PROCUREMENT_TYPES = {
        unclassified:  { label: 'Unclassified',  bg: '#f3f4f6', text: '#374151' },
        in_house:      { label: 'In-House',      bg: '#dcfce7', text: '#166534' },
        subcontracted: { label: 'Subcontracted', bg: '#dbeafe', text: '#1e40af' },
    };

    function rfqBadge(status) {
        const s = RFQ_STATUSES[status] || RFQ_STATUSES.draft;
        return `<span class="status-badge" style="background:${s.bg};color:${s.text}">${s.label}</span>`;
    }

    function procBadge(type) {
        const p = PROCUREMENT_TYPES[type] || PROCUREMENT_TYPES.unclassified;
        return `<span class="status-badge" style="background:${p.bg};color:${p.text}">${p.label}</span>`;
    }

    /* ===== Launch ===== */
    async function launch() {
        const html = `
            <div class="app-container rfq">
                <div class="app-loading">Loading RFQs...</div>
            </div>
        `;
        WindowManager.createWindow('rfq', 'RFQs', html, {
            width: 960, height: 640,
            onReady: async (win) => {
                // Check if navigated from quotes with a specific BOQ
                const boqId = sessionStorage.getItem('rfq_boq_id');
                if (boqId) {
                    sessionStorage.removeItem('rfq_boq_id');
                    try {
                        const { data: boq } = await SupabaseClient.from('boq')
                            .select('*, project:projects(reference, client:clients(name))')
                            .eq('id', boqId)
                            .single();
                        if (boq) {
                            await loadClassification(win, boq);
                            return;
                        }
                    } catch (e) { /* fall through to list */ }
                }
                await loadList(win);
            }
        });
    }

    /* ===== View 1: RFQ List ===== */
    async function loadList(win) {
        const body = win.querySelector('.app-container');
        try {
            // Fetch all BOQs with their items and RFQs
            const { data: boqs, error } = await SupabaseClient.from('boq')
                .select('*, project:projects(reference, client:clients(name))')
                .order('created_at', { ascending: false });
            if (error) throw error;
            const all = boqs || [];

            // Fetch RFQ counts per BOQ
            const { data: rfqs } = await SupabaseClient.from('rfqs')
                .select('id, boq_id, status');
            const rfqMap = {};
            (rfqs || []).forEach(r => {
                if (!rfqMap[r.boq_id]) rfqMap[r.boq_id] = [];
                rfqMap[r.boq_id].push(r);
            });

            // Fetch classification counts per BOQ
            const { data: items } = await SupabaseClient.from('boq_items')
                .select('boq_id, procurement_type');
            const classMap = {};
            (items || []).forEach(i => {
                if (!classMap[i.boq_id]) classMap[i.boq_id] = { total: 0, classified: 0, subcontracted: 0 };
                classMap[i.boq_id].total++;
                if (i.procurement_type && i.procurement_type !== 'unclassified') classMap[i.boq_id].classified++;
                if (i.procurement_type === 'subcontracted') classMap[i.boq_id].subcontracted++;
            });

            const totalRfqs = (rfqs || []).length;
            const draftRfqs = (rfqs || []).filter(r => r.status === 'draft').length;
            const sentRfqs = (rfqs || []).filter(r => r.status === 'sent').length;
            const receivedRfqs = (rfqs || []).filter(r => r.status === 'received').length;

            body.innerHTML = `
                <div class="dash-stats compact">
                    <div class="stat-card small">
                        <div class="stat-label">Total RFQs</div>
                        <div class="stat-value">${totalRfqs}</div>
                    </div>
                    <div class="stat-card small">
                        <div class="stat-label">Drafts</div>
                        <div class="stat-value">${draftRfqs}</div>
                    </div>
                    <div class="stat-card small">
                        <div class="stat-label">Sent</div>
                        <div class="stat-value">${sentRfqs}</div>
                    </div>
                    <div class="stat-card small">
                        <div class="stat-label">Received</div>
                        <div class="stat-value">${receivedRfqs}</div>
                    </div>
                </div>
                <div class="app-toolbar">
                    <input type="text" class="app-search" placeholder="Search BOQs..." id="rfq-search">
                    <button class="import-btn" id="rfq-start-btn">+ Start RFQ Process</button>
                </div>
                <div class="app-table-wrap">
                    <table class="app-table">
                        <thead><tr>
                            <th>BOQ Reference</th>
                            <th>Project</th>
                            <th>Client</th>
                            <th>Items</th>
                            <th>Classified</th>
                            <th>Subcontracted</th>
                            <th>RFQs</th>
                            <th>Status</th>
                        </tr></thead>
                        <tbody id="rfq-list-tbody"></tbody>
                    </table>
                </div>
            `;

            const tbody = body.querySelector('#rfq-list-tbody');
            const search = body.querySelector('#rfq-search');

            body.querySelector('#rfq-start-btn').addEventListener('click', () => showBoqPicker(win, all));

            function render(list) {
                tbody.innerHTML = list.length > 0 ? list.map(q => {
                    const cls = classMap[q.id] || { total: 0, classified: 0, subcontracted: 0 };
                    const boqRfqs = rfqMap[q.id] || [];
                    const hasActivity = cls.classified > 0 || boqRfqs.length > 0;
                    const statusSummary = boqRfqs.length > 0
                        ? boqRfqs.map(r => rfqBadge(r.status)).join(' ')
                        : '<span style="color:var(--text-muted)">No RFQs</span>';
                    return `
                        <tr class="clickable-row" data-id="${q.id}">
                            <td class="ref-link">${q.reference || '—'}</td>
                            <td>${q.project?.reference || '—'}</td>
                            <td>${q.project?.client?.name || '—'}</td>
                            <td>${cls.total}</td>
                            <td>${cls.classified}/${cls.total}</td>
                            <td>${cls.subcontracted}</td>
                            <td>${boqRfqs.length}</td>
                            <td>${statusSummary}</td>
                        </tr>
                    `;
                }).join('') : '<tr><td colspan="8" class="empty-row">No BOQs found. Create a quote first.</td></tr>';

                tbody.querySelectorAll('.clickable-row').forEach(row => {
                    row.addEventListener('click', () => {
                        const boq = all.find(q => q.id === row.dataset.id);
                        if (boq) loadClassification(win, boq);
                    });
                });
            }

            function applyFilters() {
                const q = search.value.toLowerCase();
                let filtered = all;
                if (q) {
                    filtered = filtered.filter(item =>
                        (item.reference || '').toLowerCase().includes(q) ||
                        (item.project?.reference || '').toLowerCase().includes(q) ||
                        (item.project?.client?.name || '').toLowerCase().includes(q)
                    );
                }
                render(filtered);
            }

            search.addEventListener('input', applyFilters);
            render(all);
        } catch (err) {
            body.innerHTML = `<div class="app-error">Failed to load RFQs: ${err.message}</div>`;
        }
    }

    function showBoqPicker(win, boqs) {
        const body = win.querySelector('.app-container');
        body.innerHTML = `
            <div class="form-view">
                <div class="form-header">
                    <button class="back-btn" id="picker-back">← Back</button>
                    <h2>Select BOQ for RFQ Process</h2>
                </div>
                <div class="form-body">
                    <div class="form-section">
                        <h4>Available BOQs</h4>
                        <div class="app-table-wrap" style="max-height:400px;overflow:auto">
                            <table class="app-table">
                                <thead><tr>
                                    <th>Reference</th>
                                    <th>Project</th>
                                    <th>Client</th>
                                    <th></th>
                                </tr></thead>
                                <tbody>
                                    ${boqs.map(q => `
                                        <tr>
                                            <td class="ref-link">${q.reference || '—'}</td>
                                            <td>${q.project?.reference || '—'}</td>
                                            <td>${q.project?.client?.name || '—'}</td>
                                            <td><button class="import-btn rfq-pick-boq" data-id="${q.id}">Select</button></td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;

        body.querySelector('#picker-back').addEventListener('click', () => loadList(win));
        body.querySelectorAll('.rfq-pick-boq').forEach(btn => {
            btn.addEventListener('click', () => {
                const boq = boqs.find(q => q.id === btn.dataset.id);
                if (boq) loadClassification(win, boq);
            });
        });
    }

    /* ===== View 2: Classification Screen ===== */
    async function loadClassification(win, boq) {
        const body = win.querySelector('.app-container');
        body.innerHTML = '<div class="app-loading">Loading items for classification...</div>';

        try {
            const { data: items, error } = await SupabaseClient.from('boq_items')
                .select('*, category:boq_categories(name)')
                .eq('boq_id', boq.id)
                .order('sort_order', { ascending: true });
            if (error) throw error;
            const lineItems = items || [];

            if (lineItems.length === 0) {
                body.innerHTML = `
                    <div class="detail-view">
                        <div class="detail-header">
                            <button class="back-btn" id="class-back">← Back</button>
                            <h2>Classification — ${boq.reference || 'BOQ'}</h2>
                        </div>
                        <div class="empty-state">No line items in this BOQ. Add items in the Quotes app first.</div>
                    </div>
                `;
                body.querySelector('#class-back').addEventListener('click', () => loadList(win));
                return;
            }

            // Fetch subcontractors for auto-suggestion
            const { data: subs } = await SupabaseClient.from('subcontractors')
                .select('trades')
                .eq('is_active', true);
            const subTrades = new Set();
            (subs || []).forEach(s => (s.trades || []).forEach(t => subTrades.add(t.toLowerCase())));

            // Auto-suggest: if item category matches a known subcontractor trade, default to subcontracted
            lineItems.forEach(item => {
                if (item.procurement_type === 'unclassified' || !item.procurement_type) {
                    const catName = (item.category?.name || '').toLowerCase();
                    if (catName && subTrades.has(catName)) {
                        item._suggested = 'subcontracted';
                    }
                }
            });

            // Group by category
            const groups = {};
            lineItems.forEach(item => {
                const cat = item.category?.name || 'Uncategorized';
                if (!groups[cat]) groups[cat] = [];
                groups[cat].push(item);
            });

            const inHouseCost = lineItems.filter(i => (i.procurement_type || i._suggested) === 'in_house').reduce((s, i) => s + (i.cost || 0), 0);
            const subCost = lineItems.filter(i => (i.procurement_type || i._suggested) === 'subcontracted').reduce((s, i) => s + (i.cost || 0), 0);
            const inHouseCount = lineItems.filter(i => (i.procurement_type || i._suggested) === 'in_house').length;
            const subCount = lineItems.filter(i => (i.procurement_type || i._suggested) === 'subcontracted').length;

            body.innerHTML = `
                <div class="detail-view">
                    <div class="detail-header">
                        <button class="back-btn" id="class-back">← Back</button>
                        <h2>Classification — ${boq.reference || 'BOQ'}</h2>
                        <div style="flex:1"></div>
                        <button class="btn-edit" id="class-bulk-inhouse">Bulk: In-House</button>
                        <button class="btn-edit" id="class-bulk-sub">Bulk: Subcontracted</button>
                    </div>
                    <div class="rfq-summary-bar" id="class-summary">
                        <span class="rfq-summary-item inhouse">${inHouseCount} in-house (${Utils.formatCurrency(inHouseCost)})</span>
                        <span class="rfq-summary-divider">|</span>
                        <span class="rfq-summary-item sub">${subCount} subcontracted (${Utils.formatCurrency(subCost)})</span>
                    </div>
                    <div class="app-table-wrap">
                        <table class="app-table">
                            <thead><tr>
                                <th><input type="checkbox" id="class-select-all"></th>
                                <th>Category</th>
                                <th>Description</th>
                                <th>Qty</th>
                                <th>Unit</th>
                                <th>Cost</th>
                                <th>Classification</th>
                            </tr></thead>
                            <tbody id="class-tbody">
                                ${lineItems.map(item => {
                                    const currentType = item.procurement_type && item.procurement_type !== 'unclassified'
                                        ? item.procurement_type
                                        : (item._suggested || 'unclassified');
                                    return `
                                        <tr data-id="${item.id}" class="${item._suggested ? 'rfq-suggested' : ''}">
                                            <td><input type="checkbox" class="class-check" data-id="${item.id}"></td>
                                            <td>${item.category?.name || '—'}</td>
                                            <td>${item.description || '—'}</td>
                                            <td>${item.quantity || 0}</td>
                                            <td>${item.unit || '—'}</td>
                                            <td>${Utils.formatCurrency(item.cost)}</td>
                                            <td>
                                                <select class="rfq-class-select" data-id="${item.id}">
                                                    <option value="unclassified" ${currentType === 'unclassified' ? 'selected' : ''}>Unclassified</option>
                                                    <option value="in_house" ${currentType === 'in_house' ? 'selected' : ''}>In-House</option>
                                                    <option value="subcontracted" ${currentType === 'subcontracted' ? 'selected' : ''}>Subcontracted</option>
                                                </select>
                                                ${item._suggested ? '<span class="rfq-auto-tag">auto</span>' : ''}
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                    <div class="form-actions">
                        <button class="back-btn" id="class-cancel">Cancel</button>
                        <button class="btn-save" id="class-save">Save & Continue →</button>
                    </div>
                </div>
            `;

            body.querySelector('#class-back').addEventListener('click', () => loadList(win));
            body.querySelector('#class-cancel').addEventListener('click', () => loadList(win));

            // Select all
            body.querySelector('#class-select-all').addEventListener('change', (e) => {
                body.querySelectorAll('.class-check').forEach(cb => cb.checked = e.target.checked);
            });

            // Bulk classification
            body.querySelector('#class-bulk-inhouse').addEventListener('click', () => {
                body.querySelectorAll('.class-check:checked').forEach(cb => {
                    const sel = body.querySelector(`.rfq-class-select[data-id="${cb.dataset.id}"]`);
                    if (sel) sel.value = 'in_house';
                });
                updateSummary();
            });

            body.querySelector('#class-bulk-sub').addEventListener('click', () => {
                body.querySelectorAll('.class-check:checked').forEach(cb => {
                    const sel = body.querySelector(`.rfq-class-select[data-id="${cb.dataset.id}"]`);
                    if (sel) sel.value = 'subcontracted';
                });
                updateSummary();
            });

            // Live summary update
            function updateSummary() {
                let ihCount = 0, ihCost = 0, scCount = 0, scCost = 0;
                body.querySelectorAll('.rfq-class-select').forEach(sel => {
                    const item = lineItems.find(i => i.id === sel.dataset.id);
                    if (!item) return;
                    if (sel.value === 'in_house') { ihCount++; ihCost += item.cost || 0; }
                    if (sel.value === 'subcontracted') { scCount++; scCost += item.cost || 0; }
                });
                const sumEl = body.querySelector('#class-summary');
                sumEl.innerHTML = `
                    <span class="rfq-summary-item inhouse">${ihCount} in-house (${Utils.formatCurrency(ihCost)})</span>
                    <span class="rfq-summary-divider">|</span>
                    <span class="rfq-summary-item sub">${scCount} subcontracted (${Utils.formatCurrency(scCost)})</span>
                `;
            }

            body.querySelectorAll('.rfq-class-select').forEach(sel => {
                sel.addEventListener('change', updateSummary);
            });

            // Save classifications
            body.querySelector('#class-save').addEventListener('click', async () => {
                const btn = body.querySelector('#class-save');
                btn.disabled = true;
                btn.textContent = 'Saving...';
                try {
                    const updates = [];
                    body.querySelectorAll('.rfq-class-select').forEach(sel => {
                        updates.push({ id: sel.dataset.id, procurement_type: sel.value });
                    });
                    // Batch update
                    for (const u of updates) {
                        await SupabaseClient.from('boq_items')
                            .update({ procurement_type: u.procurement_type })
                            .eq('id', u.id);
                    }
                    await loadAssignment(win, boq);
                } catch (err) {
                    btn.disabled = false;
                    btn.textContent = 'Save & Continue →';
                    alert('Error saving classifications: ' + err.message);
                }
            });
        } catch (err) {
            body.innerHTML = `<div class="app-error">Failed to load items: ${err.message}</div>`;
        }
    }

    /* ===== View 3: Subcontractor Assignment ===== */
    async function loadAssignment(win, boq) {
        const body = win.querySelector('.app-container');
        body.innerHTML = '<div class="app-loading">Loading subcontracted items...</div>';

        try {
            // Fetch subcontracted items
            const { data: items, error } = await SupabaseClient.from('boq_items')
                .select('*, category:boq_categories(name)')
                .eq('boq_id', boq.id)
                .eq('procurement_type', 'subcontracted')
                .order('sort_order', { ascending: true });
            if (error) throw error;
            const subItems = items || [];

            if (subItems.length === 0) {
                body.innerHTML = `
                    <div class="detail-view">
                        <div class="detail-header">
                            <button class="back-btn" id="assign-back">← Back</button>
                            <h2>Assignment — ${boq.reference || 'BOQ'}</h2>
                        </div>
                        <div class="empty-state">No subcontracted items. Go back and classify items first.</div>
                    </div>
                `;
                body.querySelector('#assign-back').addEventListener('click', () => loadClassification(win, boq));
                return;
            }

            // Fetch all active subcontractors
            const { data: allSubs } = await SupabaseClient.from('subcontractors')
                .select('*')
                .eq('is_active', true)
                .order('company_name', { ascending: true });
            const subs = allSubs || [];

            // Fetch existing RFQs for this BOQ
            const { data: existingRfqs } = await SupabaseClient.from('rfqs')
                .select('*, subcontractor:subcontractors(company_name, trades)')
                .eq('boq_id', boq.id);
            const rfqs = existingRfqs || [];

            // Fetch existing RFQ items
            const rfqIds = rfqs.map(r => r.id);
            let existingRfqItems = [];
            if (rfqIds.length > 0) {
                const { data: riData } = await SupabaseClient.from('rfq_items')
                    .select('*')
                    .in('rfq_id', rfqIds);
                existingRfqItems = riData || [];
            }

            // Build assignment map: item_id → [sub_ids]
            const assignmentMap = {};
            existingRfqItems.forEach(ri => {
                if (!assignmentMap[ri.boq_item_id]) assignmentMap[ri.boq_item_id] = [];
                const rfq = rfqs.find(r => r.id === ri.rfq_id);
                if (rfq) assignmentMap[ri.boq_item_id].push(rfq.subcontractor_id);
            });

            body.innerHTML = `
                <div class="detail-view">
                    <div class="detail-header">
                        <button class="back-btn" id="assign-back">← Back to Classification</button>
                        <h2>Subcontractor Assignment — ${boq.reference || 'BOQ'}</h2>
                    </div>
                    <div class="app-content-scroll" id="assign-content">
                        ${subItems.map(item => {
                            const catName = (item.category?.name || '').toLowerCase();
                            const matchingSubs = subs.filter(s =>
                                (s.trades || []).some(t => t.toLowerCase() === catName)
                            );
                            const assigned = assignmentMap[item.id] || [];
                            const hasWarning = assigned.length < 2;
                            return `
                                <div class="rfq-assign-card ${hasWarning ? 'rfq-assign-warning' : ''}" data-item-id="${item.id}">
                                    <div class="rfq-assign-card-header">
                                        <div>
                                            <strong>${item.description || '—'}</strong>
                                            <span class="rfq-assign-meta">${item.category?.name || '—'} · ${item.quantity || 0} ${item.unit || ''} · ${Utils.formatCurrency(item.cost)}</span>
                                        </div>
                                        ${hasWarning ? '<span class="rfq-warning-badge">Needs 2+ subs</span>' : `<span class="rfq-ok-badge">${assigned.length} subs</span>`}
                                    </div>
                                    <div class="rfq-assign-subs">
                                        ${assigned.map(subId => {
                                            const sub = subs.find(s => s.id === subId);
                                            return sub ? `
                                                <span class="rfq-assigned-sub">
                                                    ${sub.company_name}
                                                    <button class="rfq-remove-sub" data-item-id="${item.id}" data-sub-id="${subId}" title="Remove">×</button>
                                                </span>
                                            ` : '';
                                        }).join('')}
                                        <select class="rfq-add-sub-select" data-item-id="${item.id}">
                                            <option value="">+ Add subcontractor...</option>
                                            ${(matchingSubs.length > 0 ? matchingSubs : subs)
                                                .filter(s => !assigned.includes(s.id))
                                                .map(s => `<option value="${s.id}">${s.company_name}${matchingSubs.includes(s) ? '' : ' (other trade)'}</option>`)
                                                .join('')}
                                        </select>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    <div class="form-actions">
                        <button class="back-btn" id="assign-cancel">← Back</button>
                        <button class="btn-save" id="assign-generate">Generate RFQs →</button>
                    </div>
                </div>
            `;

            body.querySelector('#assign-back').addEventListener('click', () => loadClassification(win, boq));
            body.querySelector('#assign-cancel').addEventListener('click', () => loadClassification(win, boq));

            // Add subcontractor to item
            body.querySelectorAll('.rfq-add-sub-select').forEach(sel => {
                sel.addEventListener('change', async () => {
                    const subId = sel.value;
                    const itemId = sel.dataset.itemId;
                    if (!subId) return;

                    sel.disabled = true;
                    try {
                        const item = subItems.find(i => i.id === itemId);
                        // Find or create RFQ for this (boq_id, sub_id) pair
                        let rfq = rfqs.find(r => r.subcontractor_id === subId);
                        if (!rfq) {
                            const nextRef = `RFQ-${new Date().getFullYear()}-${String(rfqs.length + 1).padStart(3, '0')}`;
                            const { data: newRfq, error: rfqErr } = await SupabaseClient.from('rfqs')
                                .insert({
                                    boq_id: boq.id,
                                    subcontractor_id: subId,
                                    reference: nextRef,
                                    status: 'draft',
                                })
                                .select('*, subcontractor:subcontractors(company_name, trades)')
                                .single();
                            if (rfqErr) throw rfqErr;
                            rfq = newRfq;
                            rfqs.push(rfq);
                        }

                        // Add rfq_item
                        const { error: itemErr } = await SupabaseClient.from('rfq_items')
                            .insert({
                                rfq_id: rfq.id,
                                boq_item_id: itemId,
                                description: item.description,
                                quantity: item.quantity,
                                unit: item.unit,
                                our_unit_cost: item.unit_cost,
                                our_cost: item.cost,
                            });
                        if (itemErr) throw itemErr;

                        // Refresh
                        await loadAssignment(win, boq);
                    } catch (err) {
                        sel.disabled = false;
                        alert('Error adding subcontractor: ' + err.message);
                    }
                });
            });

            // Remove subcontractor from item
            body.querySelectorAll('.rfq-remove-sub').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const itemId = btn.dataset.itemId;
                    const subId = btn.dataset.subId;
                    try {
                        const rfq = rfqs.find(r => r.subcontractor_id === subId);
                        if (rfq) {
                            await SupabaseClient.from('rfq_items')
                                .delete()
                                .eq('rfq_id', rfq.id)
                                .eq('boq_item_id', itemId);

                            // Check if RFQ has any items left
                            const { data: remaining } = await SupabaseClient.from('rfq_items')
                                .select('id')
                                .eq('rfq_id', rfq.id);
                            if (!remaining || remaining.length === 0) {
                                await SupabaseClient.from('rfqs').delete().eq('id', rfq.id);
                                const idx = rfqs.indexOf(rfq);
                                if (idx > -1) rfqs.splice(idx, 1);
                            }
                        }
                        await loadAssignment(win, boq);
                    } catch (err) {
                        alert('Error removing: ' + err.message);
                    }
                });
            });

            // Generate RFQs → go to review
            body.querySelector('#assign-generate').addEventListener('click', () => loadReview(win, boq));
        } catch (err) {
            body.innerHTML = `<div class="app-error">Failed to load assignment: ${err.message}</div>`;
        }
    }

    /* ===== View 4: RFQ Review & Send ===== */
    async function loadReview(win, boq) {
        const body = win.querySelector('.app-container');
        body.innerHTML = '<div class="app-loading">Loading RFQs for review...</div>';

        try {
            const { data: rfqs, error } = await SupabaseClient.from('rfqs')
                .select('*, subcontractor:subcontractors(company_name, email, trades, rating)')
                .eq('boq_id', boq.id)
                .order('created_at', { ascending: true });
            if (error) throw error;
            const allRfqs = rfqs || [];

            if (allRfqs.length === 0) {
                body.innerHTML = `
                    <div class="detail-view">
                        <div class="detail-header">
                            <button class="back-btn" id="review-back">← Back</button>
                            <h2>Review RFQs — ${boq.reference || 'BOQ'}</h2>
                        </div>
                        <div class="empty-state">No RFQs generated yet. Go back and assign subcontractors.</div>
                    </div>
                `;
                body.querySelector('#review-back').addEventListener('click', () => loadAssignment(win, boq));
                return;
            }

            // Fetch items for each RFQ
            const rfqIds = allRfqs.map(r => r.id);
            const { data: allRfqItems } = await SupabaseClient.from('rfq_items')
                .select('*')
                .in('rfq_id', rfqIds);
            const rfqItemsMap = {};
            (allRfqItems || []).forEach(ri => {
                if (!rfqItemsMap[ri.rfq_id]) rfqItemsMap[ri.rfq_id] = [];
                rfqItemsMap[ri.rfq_id].push(ri);
            });

            const draftRfqs = allRfqs.filter(r => r.status === 'draft');

            body.innerHTML = `
                <div class="detail-view">
                    <div class="detail-header">
                        <button class="back-btn" id="review-back">← Back to Assignment</button>
                        <h2>Review & Send — ${boq.reference || 'BOQ'}</h2>
                        <div style="flex:1"></div>
                        ${draftRfqs.length > 0 ? `<button class="import-btn confirm" id="review-send-all">Send All Drafts (${draftRfqs.length})</button>` : ''}
                    </div>
                    <div class="app-content-scroll" id="review-content">
                        ${allRfqs.map(rfq => {
                            const items = rfqItemsMap[rfq.id] || [];
                            const estTotal = items.reduce((s, i) => s + (i.our_cost || 0), 0);
                            return `
                                <div class="rfq-review-card" data-rfq-id="${rfq.id}">
                                    <div class="rfq-review-card-header">
                                        <div>
                                            <strong>${rfq.reference}</strong>
                                            <span style="margin-left:8px">${rfqBadge(rfq.status)}</span>
                                        </div>
                                        <div class="rfq-review-sub-info">
                                            <strong>${rfq.subcontractor?.company_name || '—'}</strong>
                                            <span style="color:var(--text-muted);font-size:12px">${rfq.subcontractor?.email || 'No email'}</span>
                                            ${rfq.subcontractor?.rating ? `<span class="rating-cell">${Utils.ratingStars(rfq.subcontractor.rating)}</span>` : ''}
                                        </div>
                                    </div>
                                    <table class="app-table rfq-review-items">
                                        <thead><tr>
                                            <th>Description</th>
                                            <th>Qty</th>
                                            <th>Unit</th>
                                            <th>Our Est.</th>
                                        </tr></thead>
                                        <tbody>
                                            ${items.map(i => `
                                                <tr>
                                                    <td>${i.description || '—'}</td>
                                                    <td>${i.quantity || 0}</td>
                                                    <td>${i.unit || '—'}</td>
                                                    <td>${Utils.formatCurrency(i.our_cost)}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                        <tfoot><tr>
                                            <td colspan="3" style="text-align:right;font-weight:600;color:var(--text-primary)">Estimated Total</td>
                                            <td class="strong">${Utils.formatCurrency(estTotal)}</td>
                                        </tr></tfoot>
                                    </table>
                                    <div class="rfq-review-actions">
                                        <div class="form-group" style="flex:1;max-width:200px">
                                            <label>Due Date</label>
                                            <input type="date" class="rfq-due-date" data-rfq-id="${rfq.id}" value="${rfq.due_date || ''}">
                                        </div>
                                        ${rfq.status === 'draft' ? `
                                            <button class="import-btn confirm rfq-send-btn" data-rfq-id="${rfq.id}">Send RFQ</button>
                                        ` : ''}
                                        ${rfq.status === 'sent' ? `
                                            <button class="import-btn rfq-received-btn" data-rfq-id="${rfq.id}">Mark Received</button>
                                        ` : ''}
                                        ${rfq.status === 'received' ? `
                                            <button class="import-btn rfq-enter-response-btn" data-rfq-id="${rfq.id}">Enter Response</button>
                                        ` : ''}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    <div class="form-actions">
                        <button class="back-btn" id="review-list">← Back to List</button>
                        <button class="btn-save" id="review-compare">Compare Responses →</button>
                    </div>
                </div>
            `;

            body.querySelector('#review-back').addEventListener('click', () => loadAssignment(win, boq));
            body.querySelector('#review-list').addEventListener('click', () => loadList(win));
            body.querySelector('#review-compare').addEventListener('click', () => loadComparison(win, boq));

            // Due date change
            body.querySelectorAll('.rfq-due-date').forEach(input => {
                input.addEventListener('change', async () => {
                    try {
                        await SupabaseClient.from('rfqs')
                            .update({ due_date: input.value || null })
                            .eq('id', input.dataset.rfqId);
                    } catch (err) {
                        alert('Error saving due date: ' + err.message);
                    }
                });
            });

            // Send individual RFQ
            async function sendRfq(rfqId) {
                const rfq = allRfqs.find(r => r.id === rfqId);
                if (!rfq) return;
                const items = rfqItemsMap[rfqId] || [];
                const dueDateInput = body.querySelector(`.rfq-due-date[data-rfq-id="${rfqId}"]`);
                const dueDate = dueDateInput?.value || null;

                try {
                    // Call edge function
                    const response = await fetch(
                        `${SupabaseClient.getClient().supabaseUrl}/functions/v1/send-rfq`,
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${(await SupabaseClient.getSession()).access_token}`,
                            },
                            body: JSON.stringify({
                                rfq_id: rfqId,
                                to_email: rfq.subcontractor?.email,
                                subcontractor_name: rfq.subcontractor?.company_name,
                                rfq_reference: rfq.reference,
                                items: items.map(i => ({
                                    description: i.description,
                                    quantity: i.quantity,
                                    unit: i.unit,
                                })),
                                due_date: dueDate,
                                boq_reference: boq.reference,
                                project_reference: boq.project?.reference,
                            }),
                        }
                    );
                    const result = await response.json();
                    if (!result.success) throw new Error(result.error || 'Failed to send email');

                    // Update RFQ status
                    await SupabaseClient.from('rfqs')
                        .update({
                            status: 'sent',
                            sent_at: new Date().toISOString(),
                            due_date: dueDate,
                        })
                        .eq('id', rfqId);

                    return true;
                } catch (err) {
                    // If edge function fails, still update status (email might not be configured)
                    console.warn('Email send failed (updating status anyway):', err.message);
                    await SupabaseClient.from('rfqs')
                        .update({
                            status: 'sent',
                            sent_at: new Date().toISOString(),
                            due_date: dueDate,
                        })
                        .eq('id', rfqId);
                    return true;
                }
            }

            body.querySelectorAll('.rfq-send-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    btn.disabled = true;
                    btn.textContent = 'Sending...';
                    await sendRfq(btn.dataset.rfqId);
                    await loadReview(win, boq);
                });
            });

            // Send all drafts
            const sendAllBtn = body.querySelector('#review-send-all');
            if (sendAllBtn) {
                sendAllBtn.addEventListener('click', async () => {
                    sendAllBtn.disabled = true;
                    sendAllBtn.textContent = 'Sending...';
                    for (const rfq of draftRfqs) {
                        await sendRfq(rfq.id);
                    }
                    await loadReview(win, boq);
                });
            }

            // Mark received
            body.querySelectorAll('.rfq-received-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    btn.disabled = true;
                    btn.textContent = 'Updating...';
                    await SupabaseClient.from('rfqs')
                        .update({ status: 'received', received_at: new Date().toISOString() })
                        .eq('id', btn.dataset.rfqId);
                    await loadReview(win, boq);
                });
            });

            // Enter response
            body.querySelectorAll('.rfq-enter-response-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const rfq = allRfqs.find(r => r.id === btn.dataset.rfqId);
                    if (rfq) loadResponseEntry(win, boq, rfq, rfqItemsMap[rfq.id] || []);
                });
            });
        } catch (err) {
            body.innerHTML = `<div class="app-error">Failed to load review: ${err.message}</div>`;
        }
    }

    /* ===== View 5a: Response Entry ===== */
    async function loadResponseEntry(win, boq, rfq, rfqItems) {
        const body = win.querySelector('.app-container');

        body.innerHTML = `
            <div class="detail-view">
                <div class="detail-header">
                    <button class="back-btn" id="resp-back">← Back to Review</button>
                    <h2>Enter Response — ${rfq.reference}</h2>
                    <span style="color:var(--text-muted);font-size:13px">${rfq.subcontractor?.company_name || '—'}</span>
                </div>
                <div class="app-content-scroll" style="padding:16px">
                    <table class="app-table">
                        <thead><tr>
                            <th>Description</th>
                            <th>Qty</th>
                            <th>Unit</th>
                            <th>Our Est. Unit</th>
                            <th>Our Est. Total</th>
                            <th>Quoted Unit Cost</th>
                            <th>Quoted Total</th>
                            <th>Variance</th>
                        </tr></thead>
                        <tbody id="resp-tbody">
                            ${rfqItems.map(item => `
                                <tr data-id="${item.id}">
                                    <td>${item.description || '—'}</td>
                                    <td>${item.quantity || 0}</td>
                                    <td>${item.unit || '—'}</td>
                                    <td>${Utils.formatCurrency(item.our_unit_cost)}</td>
                                    <td>${Utils.formatCurrency(item.our_cost)}</td>
                                    <td>
                                        <input type="number" class="rfq-quoted-unit" data-id="${item.id}"
                                            step="0.01" value="${item.quoted_unit_cost || ''}"
                                            style="width:100px;height:30px;background:rgba(0,0,0,0.3);border:1px solid var(--window-border);border-radius:4px;color:var(--text-primary);padding:0 6px;font-size:12px">
                                    </td>
                                    <td class="rfq-quoted-total strong" data-id="${item.id}">
                                        ${item.quoted_cost ? Utils.formatCurrency(item.quoted_cost) : '—'}
                                    </td>
                                    <td class="rfq-variance" data-id="${item.id}">—</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="4" style="text-align:right;font-weight:600;color:var(--text-primary)">Totals</td>
                                <td class="strong">${Utils.formatCurrency(rfqItems.reduce((s, i) => s + (i.our_cost || 0), 0))}</td>
                                <td></td>
                                <td class="strong" id="resp-quoted-grand">—</td>
                                <td id="resp-variance-grand">—</td>
                            </tr>
                        </tfoot>
                    </table>
                    <div class="form-group" style="margin-top:16px;max-width:400px">
                        <label>Notes</label>
                        <textarea id="resp-notes" placeholder="Any notes about this response...">${rfq.notes || ''}</textarea>
                    </div>
                </div>
                <div class="form-actions">
                    <button class="back-btn" id="resp-cancel">Cancel</button>
                    <button class="btn-save" id="resp-save">Save Response</button>
                </div>
            </div>
        `;

        body.querySelector('#resp-back').addEventListener('click', () => loadReview(win, boq));
        body.querySelector('#resp-cancel').addEventListener('click', () => loadReview(win, boq));

        function recalcAll() {
            let grandQuoted = 0;
            let grandOur = 0;
            rfqItems.forEach(item => {
                const input = body.querySelector(`.rfq-quoted-unit[data-id="${item.id}"]`);
                const totalEl = body.querySelector(`.rfq-quoted-total[data-id="${item.id}"]`);
                const varEl = body.querySelector(`.rfq-variance[data-id="${item.id}"]`);
                const quotedUnit = parseFloat(input.value) || 0;
                const quotedTotal = quotedUnit * (item.quantity || 0);
                const ourTotal = item.our_cost || 0;

                totalEl.textContent = quotedUnit > 0 ? Utils.formatCurrency(quotedTotal) : '—';

                if (quotedUnit > 0 && ourTotal > 0) {
                    const variance = ((quotedTotal - ourTotal) / ourTotal) * 100;
                    varEl.textContent = `${variance > 0 ? '+' : ''}${variance.toFixed(1)}%`;
                    varEl.style.color = variance > 10 ? '#ef4444' : variance < -10 ? '#22c55e' : 'var(--text-secondary)';
                } else {
                    varEl.textContent = '—';
                    varEl.style.color = '';
                }

                if (quotedUnit > 0) grandQuoted += quotedTotal;
                grandOur += ourTotal;
            });

            body.querySelector('#resp-quoted-grand').textContent = grandQuoted > 0 ? Utils.formatCurrency(grandQuoted) : '—';
            if (grandQuoted > 0 && grandOur > 0) {
                const gv = ((grandQuoted - grandOur) / grandOur) * 100;
                const gvEl = body.querySelector('#resp-variance-grand');
                gvEl.textContent = `${gv > 0 ? '+' : ''}${gv.toFixed(1)}%`;
                gvEl.style.color = gv > 10 ? '#ef4444' : gv < -10 ? '#22c55e' : 'var(--text-secondary)';
            }
        }

        body.querySelectorAll('.rfq-quoted-unit').forEach(input => {
            input.addEventListener('input', recalcAll);
        });
        recalcAll();

        body.querySelector('#resp-save').addEventListener('click', async () => {
            const btn = body.querySelector('#resp-save');
            btn.disabled = true;
            btn.textContent = 'Saving...';
            try {
                let totalQuoted = 0;
                for (const item of rfqItems) {
                    const input = body.querySelector(`.rfq-quoted-unit[data-id="${item.id}"]`);
                    const quotedUnit = parseFloat(input.value) || 0;
                    const quotedTotal = quotedUnit * (item.quantity || 0);
                    totalQuoted += quotedTotal;

                    await SupabaseClient.from('rfq_items')
                        .update({
                            quoted_unit_cost: quotedUnit || null,
                            quoted_cost: quotedTotal || null,
                        })
                        .eq('id', item.id);
                }

                const notes = body.querySelector('#resp-notes').value.trim();
                await SupabaseClient.from('rfqs')
                    .update({
                        total_quoted: totalQuoted || null,
                        notes: notes || null,
                    })
                    .eq('id', rfq.id);

                await loadReview(win, boq);
            } catch (err) {
                btn.disabled = false;
                btn.textContent = 'Save Response';
                alert('Error saving: ' + err.message);
            }
        });
    }

    /* ===== View 5b: Comparison View ===== */
    async function loadComparison(win, boq) {
        const body = win.querySelector('.app-container');
        body.innerHTML = '<div class="app-loading">Loading comparison data...</div>';

        try {
            // Get all subcontracted items
            const { data: boqItems } = await SupabaseClient.from('boq_items')
                .select('*, category:boq_categories(name)')
                .eq('boq_id', boq.id)
                .eq('procurement_type', 'subcontracted')
                .order('sort_order', { ascending: true });
            const items = boqItems || [];

            // Get all RFQs for this BOQ
            const { data: rfqs } = await SupabaseClient.from('rfqs')
                .select('*, subcontractor:subcontractors(company_name, rating)')
                .eq('boq_id', boq.id)
                .order('created_at', { ascending: true });
            const allRfqs = rfqs || [];

            // Get all RFQ items
            const rfqIds = allRfqs.map(r => r.id);
            let allRfqItems = [];
            if (rfqIds.length > 0) {
                const { data: riData } = await SupabaseClient.from('rfq_items')
                    .select('*')
                    .in('rfq_id', rfqIds);
                allRfqItems = riData || [];
            }

            // Build comparison matrix: boq_item_id → { rfq_id → rfq_item }
            const matrix = {};
            allRfqItems.forEach(ri => {
                if (!matrix[ri.boq_item_id]) matrix[ri.boq_item_id] = {};
                matrix[ri.boq_item_id][ri.rfq_id] = ri;
            });

            body.innerHTML = `
                <div class="detail-view">
                    <div class="detail-header">
                        <button class="back-btn" id="comp-back">← Back to Review</button>
                        <h2>Comparison — ${boq.reference || 'BOQ'}</h2>
                    </div>
                    <div class="app-table-wrap">
                        <table class="app-table rfq-comparison-table">
                            <thead><tr>
                                <th>Item</th>
                                <th>Our Est.</th>
                                ${allRfqs.map(r => `
                                    <th class="rfq-comp-sub-header">
                                        <div>${r.subcontractor?.company_name || '—'}</div>
                                        <div class="rfq-comp-sub-meta">
                                            ${rfqBadge(r.status)}
                                            ${r.subcontractor?.rating ? `<span class="rating-cell">${Utils.ratingStars(r.subcontractor.rating)}</span>` : ''}
                                        </div>
                                    </th>
                                `).join('')}
                            </tr></thead>
                            <tbody>
                                ${items.map(item => {
                                    const itemQuotes = matrix[item.id] || {};
                                    // Find lowest quote for highlighting
                                    let lowestCost = Infinity;
                                    allRfqs.forEach(r => {
                                        const ri = itemQuotes[r.id];
                                        if (ri && ri.quoted_cost && ri.quoted_cost < lowestCost) lowestCost = ri.quoted_cost;
                                    });

                                    return `
                                        <tr>
                                            <td>
                                                <div class="strong">${item.description || '—'}</div>
                                                <div class="cell-sub">${item.quantity || 0} ${item.unit || ''}</div>
                                            </td>
                                            <td class="strong">${Utils.formatCurrency(item.cost)}</td>
                                            ${allRfqs.map(r => {
                                                const ri = itemQuotes[r.id];
                                                if (!ri) return '<td style="color:var(--text-muted)">—</td>';
                                                if (!ri.quoted_cost) return '<td style="color:var(--text-muted)">Awaiting</td>';
                                                const isLowest = ri.quoted_cost === lowestCost;
                                                const variance = item.cost ? ((ri.quoted_cost - item.cost) / item.cost * 100) : 0;
                                                return `
                                                    <td class="${isLowest ? 'rfq-lowest-quote' : ''}">
                                                        <div class="strong">${Utils.formatCurrency(ri.quoted_cost)}</div>
                                                        <div class="cell-sub" style="color:${variance > 10 ? '#ef4444' : variance < -10 ? '#22c55e' : 'var(--text-muted)'}">
                                                            ${variance > 0 ? '+' : ''}${variance.toFixed(1)}%
                                                        </div>
                                                    </td>
                                                `;
                                            }).join('')}
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td style="font-weight:600;color:var(--text-primary)">Total</td>
                                    <td class="strong">${Utils.formatCurrency(items.reduce((s, i) => s + (i.cost || 0), 0))}</td>
                                    ${allRfqs.map(r => {
                                        const total = r.total_quoted;
                                        return `<td class="strong">${total ? Utils.formatCurrency(total) : '—'}</td>`;
                                    }).join('')}
                                </tr>
                                <tr>
                                    <td colspan="2" style="font-weight:600;color:var(--text-primary)">Action</td>
                                    ${allRfqs.map(r => `
                                        <td>
                                            ${r.status === 'received' || r.total_quoted ? `
                                                <button class="import-btn rfq-award-btn ${r.status === 'accepted' ? 'confirm' : ''}"
                                                    data-rfq-id="${r.id}">
                                                    ${r.status === 'accepted' ? 'Awarded' : 'Award'}
                                                </button>
                                            ` : ''}
                                        </td>
                                    `).join('')}
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    <div class="form-actions">
                        <button class="back-btn" id="comp-list">← Back to List</button>
                    </div>
                </div>
            `;

            body.querySelector('#comp-back').addEventListener('click', () => loadReview(win, boq));
            body.querySelector('#comp-list').addEventListener('click', () => loadList(win));

            // Award action
            body.querySelectorAll('.rfq-award-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    if (btn.classList.contains('confirm')) return; // Already awarded
                    if (!confirm('Award this RFQ? Other RFQs for this BOQ will be marked as rejected.')) return;
                    btn.disabled = true;
                    btn.textContent = 'Awarding...';
                    try {
                        // Mark this one as accepted
                        await SupabaseClient.from('rfqs')
                            .update({ status: 'accepted' })
                            .eq('id', btn.dataset.rfqId);
                        // Mark others as rejected
                        const otherIds = allRfqs
                            .filter(r => r.id !== btn.dataset.rfqId && r.status !== 'draft')
                            .map(r => r.id);
                        if (otherIds.length > 0) {
                            await SupabaseClient.from('rfqs')
                                .update({ status: 'rejected' })
                                .in('id', otherIds);
                        }
                        await loadComparison(win, boq);
                    } catch (err) {
                        btn.disabled = false;
                        btn.textContent = 'Award';
                        alert('Error: ' + err.message);
                    }
                });
            });
        } catch (err) {
            body.innerHTML = `<div class="app-error">Failed to load comparison: ${err.message}</div>`;
        }
    }

    return { id: 'rfq', name: 'RFQs', icon: ICON, launch };
})();
