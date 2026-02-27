/* ===== Subcontractors App ===== */
const SubcontractorsApp = (() => {
    const ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/></svg>`;

    /* --- CSV Parsing & Import helpers --- */

    function parseCSV(text) {
        const rows = [];
        let i = 0;
        const len = text.length;

        function parseField() {
            if (i >= len || text[i] === '\n' || text[i] === '\r') return '';
            if (text[i] === '"') {
                i++;
                let val = '';
                while (i < len) {
                    if (text[i] === '"') {
                        if (i + 1 < len && text[i + 1] === '"') {
                            val += '"';
                            i += 2;
                        } else {
                            i++;
                            break;
                        }
                    } else {
                        val += text[i++];
                    }
                }
                return val;
            }
            let val = '';
            while (i < len && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') {
                val += text[i++];
            }
            return val;
        }

        while (i < len) {
            const row = [];
            while (true) {
                row.push(parseField());
                if (i < len && text[i] === ',') { i++; continue; }
                break;
            }
            if (i < len && text[i] === '\r') i++;
            if (i < len && text[i] === '\n') i++;
            rows.push(row);
        }
        return rows;
    }

    function normalizeTrade(raw) {
        if (!raw || !raw.trim()) return null;
        let t = raw.trim().toLowerCase();
        t = t.replace(/\s*(works?|package)\s*$/i, '').trim();
        if (t.includes('glass') || t.includes('aluminum') || t.includes('aluminium')) return 'glass';
        if (t.includes('gypsum')) return 'gypsum';
        if (t.includes('landscap') || t.includes('pool')) return 'landscaping';
        if (t.includes('wall clad')) return 'wall cladding';
        if (t.includes('wall finish')) return 'wall finishes';
        if (t.includes('garage')) return 'garage door';
        const first = t.split(/[\/\s]/)[0];
        return first || null;
    }

    function groupByCompany(dataRows) {
        const map = new Map();
        for (const row of dataRows) {
            const trade = row[0], company = (row[2] || '').trim(), location = (row[3] || '').trim();
            const contact = (row[4] || '').trim(), phone = (row[6] || '').trim();
            const email = (row[7] || '').trim(), remarks = (row[8] || '').trim();
            if (!company) continue;
            const key = company.toLowerCase();
            if (!map.has(key)) {
                map.set(key, {
                    company_name: company,
                    contact_name: contact || '',
                    phone: phone ? phone.split('/')[0].trim() : '',
                    email: email ? email.split('/')[0].trim() : '',
                    trades: [],
                    notes: '',
                    is_active: true,
                    jobs_completed: 0
                });
            }
            const rec = map.get(key);
            if (!rec.contact_name && contact) rec.contact_name = contact;
            if (!rec.phone && phone) rec.phone = phone.split('/')[0].trim();
            if (!rec.email && email) rec.email = email.split('/')[0].trim();
            if (rec.phone) rec.phone = rec.phone.replace(/[,.\s]/g, '').replace(/\.00$/, '');
            const norm = normalizeTrade(trade);
            if (norm && !rec.trades.includes(norm)) rec.trades.push(norm);
            const parts = [];
            if (location && !rec.notes.includes(location)) parts.push(location);
            if (remarks && !rec.notes.includes(remarks)) parts.push(remarks);
            if (parts.length) rec.notes = rec.notes ? rec.notes + '; ' + parts.join(' — ') : parts.join(' — ');
        }
        return [...map.values()];
    }

    function showPreview(win, grouped) {
        const body = win.querySelector('.app-container');
        body.innerHTML = `
            <div class="preview-summary">
                <h3>CSV Import Preview</h3>
                <p>${grouped.length} companies found — review before importing</p>
            </div>
            <div class="app-table-wrap">
                <table class="app-table">
                    <thead><tr>
                        <th>Company</th>
                        <th>Contact</th>
                        <th>Phone</th>
                        <th>Email</th>
                        <th>Trades</th>
                    </tr></thead>
                    <tbody>${grouped.map(r => `
                        <tr>
                            <td class="strong">${r.company_name}</td>
                            <td>${r.contact_name || '—'}</td>
                            <td>${r.phone || '—'}</td>
                            <td>${r.email || '—'}</td>
                            <td class="trades-cell">${r.trades.map(t => `<span class="trade-badge" style="background:rgba(255,255,255,0.08);color:var(--text-secondary)">${t}</span>`).join(' ')}</td>
                        </tr>
                    `).join('')}</tbody>
                </table>
            </div>
            <div class="preview-actions">
                <button class="back-btn" id="csv-cancel">Cancel</button>
                <button class="import-btn confirm" id="csv-confirm">Confirm Import (${grouped.length})</button>
            </div>
        `;
        body.querySelector('#csv-cancel').addEventListener('click', () => loadSubcontractors(win));
        body.querySelector('#csv-confirm').addEventListener('click', async () => {
            const btn = body.querySelector('#csv-confirm');
            btn.disabled = true;
            btn.textContent = 'Importing...';
            try {
                await importToSupabase(grouped);
                await loadSubcontractors(win);
            } catch (err) {
                btn.textContent = 'Error: ' + err.message;
                btn.disabled = false;
            }
        });
    }

    async function importToSupabase(records) {
        const names = records.map(r => r.company_name);
        const { error: delErr } = await SupabaseClient.from('subcontractors')
            .delete()
            .in('company_name', names);
        if (delErr) throw delErr;

        const batch = 50;
        for (let i = 0; i < records.length; i += batch) {
            const chunk = records.slice(i, i + batch);
            const { error } = await SupabaseClient.from('subcontractors').insert(chunk);
            if (error) throw error;
        }
    }

    function handleCSVImport(win) {
        const input = win.querySelector('#csv-file-input');
        input.value = '';
        input.click();
        input.onchange = () => {
            const file = input.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                const allRows = parseCSV(e.target.result);
                const dataRows = allRows.slice(8).filter(r => r.length >= 3 && r[2] && r[2].trim());
                const grouped = groupByCompany(dataRows);
                if (grouped.length === 0) {
                    alert('No subcontractor rows found in CSV.');
                    return;
                }
                showPreview(win, grouped);
            };
            reader.readAsText(file);
        };
    }

    /* --- Main app --- */

    async function launch() {
        const html = `
            <div class="app-container subcontractors">
                <div class="app-loading">Loading subcontractors...</div>
            </div>
        `;

        WindowManager.createWindow('subcontractors', 'Subcontractors', html, {
            width: 880, height: 560,
            onReady: async (win) => {
                await loadSubcontractors(win);
            }
        });
    }

    async function loadSubcontractors(win) {
        const body = win.querySelector('.app-container');
        try {
            const { data: subs, error } = await SupabaseClient.from('subcontractors')
                .select('*')
                .eq('is_active', true)
                .order('company_name', { ascending: true });

            if (error) throw error;

            const allTrades = [...new Set((subs || []).flatMap(s => s.trades || []))].sort();

            body.innerHTML = `
                <div class="app-toolbar">
                    <input type="text" class="app-search" placeholder="Search subcontractors..." id="sub-search">
                    <button class="import-btn" id="sub-new-btn">+ Add Subcontractor</button>
                    <button class="import-btn" id="csv-import-btn">Import CSV</button>
                    <input type="file" id="csv-file-input" accept=".csv" style="display:none">
                    <div class="trade-filters" id="trade-filters">
                        <button class="trade-filter-btn active" data-trade="all">All</button>
                        ${allTrades.map(t => `<button class="trade-filter-btn" data-trade="${t}">${t}</button>`).join('')}
                    </div>
                </div>
                <div class="app-table-wrap">
                    <table class="app-table" id="sub-table">
                        <thead><tr>
                            <th>Company</th>
                            <th>Contact</th>
                            <th>Phone</th>
                            <th>Trades</th>
                            <th>Rating</th>
                            <th>Jobs</th>
                        </tr></thead>
                        <tbody id="sub-tbody"></tbody>
                    </table>
                </div>
            `;

            const tbody = body.querySelector('#sub-tbody');
            const search = body.querySelector('#sub-search');
            const filters = body.querySelector('#trade-filters');
            let activeTrade = 'all';

            body.querySelector('#sub-new-btn').addEventListener('click', () => showForm(win));

            function render(list) {
                tbody.innerHTML = list.length > 0 ? list.map(s => `
                    <tr class="clickable-row" data-id="${s.id}">
                        <td class="strong">${s.company_name || '—'}</td>
                        <td>${s.contact_name || '—'}</td>
                        <td>${s.phone || '—'}</td>
                        <td class="trades-cell">${(s.trades || []).map(t => Utils.tradeBadge(t)).join(' ')}</td>
                        <td class="rating-cell">${Utils.ratingStars(s.rating)}</td>
                        <td>${s.jobs_completed || 0}</td>
                    </tr>
                `).join('') : '<tr><td colspan="6" class="empty-row">No subcontractors found</td></tr>';

                tbody.querySelectorAll('.clickable-row').forEach(row => {
                    row.addEventListener('click', () => {
                        const sub = (subs || []).find(s => s.id === row.dataset.id);
                        if (sub) showDetail(win, sub);
                    });
                });
            }

            function applyFilters() {
                const q = search.value.toLowerCase();
                let filtered = subs || [];

                if (q) {
                    filtered = filtered.filter(s =>
                        (s.company_name || '').toLowerCase().includes(q) ||
                        (s.contact_name || '').toLowerCase().includes(q)
                    );
                }

                if (activeTrade !== 'all') {
                    filtered = filtered.filter(s => (s.trades || []).includes(activeTrade));
                }

                render(filtered);
            }

            search.addEventListener('input', applyFilters);

            filters.addEventListener('click', (e) => {
                const btn = e.target.closest('.trade-filter-btn');
                if (!btn) return;
                filters.querySelectorAll('.trade-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeTrade = btn.dataset.trade;
                applyFilters();
            });

            body.querySelector('#csv-import-btn').addEventListener('click', () => handleCSVImport(win));

            render(subs || []);
        } catch (err) {
            body.innerHTML = `<div class="app-error">Failed to load subcontractors: ${err.message}</div>`;
        }
    }

    async function showDetail(win, sub) {
        const body = win.querySelector('.app-container');

        body.innerHTML = `
            <div class="detail-view">
                <div class="detail-header">
                    <button class="back-btn" id="sub-back">← Back</button>
                    <h2>${sub.company_name}</h2>
                    <button class="btn-edit" id="sub-edit-btn">Edit</button>
                </div>
                <div class="detail-grid">
                    <div class="detail-section">
                        <h4>Contact Details</h4>
                        <div class="detail-fields">
                            <div class="field"><span class="field-label">Contact Name</span><span class="field-value">${sub.contact_name || '—'}</span></div>
                            <div class="field"><span class="field-label">Phone</span><span class="field-value">${sub.phone || '—'}</span></div>
                            <div class="field"><span class="field-label">Email</span><span class="field-value">${sub.email || '—'}</span></div>
                        </div>
                    </div>
                    <div class="detail-section">
                        <h4>Work</h4>
                        <div class="detail-fields">
                            <div class="field"><span class="field-label">Trades</span><span class="field-value trades-cell">${(sub.trades || []).map(t => Utils.tradeBadge(t)).join(' ') || '—'}</span></div>
                            <div class="field"><span class="field-label">Rating</span><span class="field-value rating-cell">${Utils.ratingStars(sub.rating)}</span></div>
                            <div class="field"><span class="field-label">Jobs Completed</span><span class="field-value">${sub.jobs_completed || 0}</span></div>
                            ${sub.notes ? `<div class="field full-width"><span class="field-label">Notes</span><span class="field-value">${sub.notes}</span></div>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        body.querySelector('#sub-back').addEventListener('click', () => loadSubcontractors(win));
        body.querySelector('#sub-edit-btn').addEventListener('click', () => showForm(win, sub));
    }

    async function showForm(win, existing) {
        const body = win.querySelector('.app-container');
        const isEdit = !!existing;
        const s = existing || {};

        body.innerHTML = `
            <div class="form-view">
                <div class="form-header">
                    <button class="back-btn" id="sub-form-back">← Back</button>
                    <h2>${isEdit ? 'Edit Subcontractor' : 'New Subcontractor'}</h2>
                </div>
                <div class="form-body">
                    <div class="form-section">
                        <h4>Company Details</h4>
                        <div class="form-grid">
                            <div class="form-group full">
                                <label>Company Name *</label>
                                <input type="text" id="f-company" value="${s.company_name || ''}">
                            </div>
                            <div class="form-group">
                                <label>Contact Name</label>
                                <input type="text" id="f-contact" value="${s.contact_name || ''}">
                            </div>
                            <div class="form-group">
                                <label>Phone</label>
                                <input type="text" id="f-phone" value="${s.phone || ''}">
                            </div>
                            <div class="form-group full">
                                <label>Email</label>
                                <input type="email" id="f-email" value="${s.email || ''}">
                            </div>
                        </div>
                    </div>
                    <div class="form-section">
                        <h4>Work</h4>
                        <div class="form-grid">
                            <div class="form-group full">
                                <label>Trades (comma-separated)</label>
                                <input type="text" id="f-trades" value="${(s.trades || []).join(', ')}" placeholder="e.g. electrical, plumbing, ac">
                            </div>
                            <div class="form-group">
                                <label>Rating (1-5)</label>
                                <input type="number" id="f-rating" min="1" max="5" step="0.5" value="${s.rating || ''}">
                            </div>
                            <div class="form-group">
                                <label>Jobs Completed</label>
                                <input type="number" id="f-jobs" min="0" value="${s.jobs_completed || 0}">
                            </div>
                            <div class="form-group full">
                                <label>Notes</label>
                                <textarea id="f-notes">${s.notes || ''}</textarea>
                            </div>
                        </div>
                    </div>
                    <div id="sub-form-error"></div>
                </div>
                <div class="form-actions">
                    <button class="back-btn" id="sub-form-cancel">Cancel</button>
                    <button class="btn-save" id="sub-form-save">${isEdit ? 'Save Changes' : 'Add Subcontractor'}</button>
                </div>
            </div>
        `;

        const goBack = () => loadSubcontractors(win);
        body.querySelector('#sub-form-back').addEventListener('click', goBack);
        body.querySelector('#sub-form-cancel').addEventListener('click', goBack);

        body.querySelector('#sub-form-save').addEventListener('click', async () => {
            const btn = body.querySelector('#sub-form-save');
            const errEl = body.querySelector('#sub-form-error');
            errEl.innerHTML = '';

            const companyName = body.querySelector('#f-company').value.trim();
            if (!companyName) {
                errEl.innerHTML = '<div class="form-error">Company name is required</div>';
                return;
            }

            const tradesRaw = body.querySelector('#f-trades').value;
            const trades = tradesRaw
                .split(',')
                .map(t => t.trim().toLowerCase())
                .filter(Boolean);

            const ratingVal = body.querySelector('#f-rating').value;

            const record = {
                company_name: companyName,
                contact_name: body.querySelector('#f-contact').value.trim() || null,
                phone: body.querySelector('#f-phone').value.trim() || null,
                email: body.querySelector('#f-email').value.trim() || null,
                trades,
                rating: ratingVal ? parseFloat(ratingVal) : null,
                jobs_completed: parseInt(body.querySelector('#f-jobs').value) || 0,
                notes: body.querySelector('#f-notes').value.trim() || null,
                is_active: true,
            };

            btn.disabled = true;
            btn.textContent = 'Saving...';

            try {
                let result;
                if (isEdit) {
                    result = await SupabaseClient.from('subcontractors').update(record).eq('id', s.id);
                } else {
                    result = await SupabaseClient.from('subcontractors').insert(record);
                }
                if (result.error) throw result.error;
                await loadSubcontractors(win);
            } catch (err) {
                errEl.innerHTML = `<div class="form-error">Error: ${err.message}</div>`;
                btn.disabled = false;
                btn.textContent = isEdit ? 'Save Changes' : 'Add Subcontractor';
            }
        });
    }

    return { id: 'subcontractors', name: 'Subcontractors', icon: ICON, launch };
})();
