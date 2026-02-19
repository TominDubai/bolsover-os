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
                i++; // skip opening quote
                let val = '';
                while (i < len) {
                    if (text[i] === '"') {
                        if (i + 1 < len && text[i + 1] === '"') {
                            val += '"';
                            i += 2;
                        } else {
                            i++; // skip closing quote
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
            // skip line ending
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
        // Take first meaningful word(s) for known multi-word trades
        if (t.includes('glass') || t.includes('aluminum') || t.includes('aluminium')) return 'glass';
        if (t.includes('gypsum')) return 'gypsum';
        if (t.includes('landscap') || t.includes('pool')) return 'landscaping';
        if (t.includes('wall clad')) return 'wall cladding';
        if (t.includes('wall finish')) return 'wall finishes';
        if (t.includes('garage')) return 'garage door';
        // General single-word trades
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
            // Fill blanks from later rows
            if (!rec.contact_name && contact) rec.contact_name = contact;
            if (!rec.phone && phone) rec.phone = phone.split('/')[0].trim();
            if (!rec.email && email) rec.email = email.split('/')[0].trim();
            // Clean phone: strip commas and formatting artifacts (e.g. "501,138,666.00" → "501138666")
            if (rec.phone) rec.phone = rec.phone.replace(/[,.\s]/g, '').replace(/\.00$/, '');
            // Merge trade
            const norm = normalizeTrade(trade);
            if (norm && !rec.trades.includes(norm)) rec.trades.push(norm);
            // Build notes from location + remarks
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
        // Upsert: delete existing matches by company name, then insert fresh
        const names = records.map(r => r.company_name);
        const { error: delErr } = await SupabaseClient.from('subcontractors')
            .delete()
            .in('company_name', names);
        if (delErr) throw delErr;

        // Insert in batches of 50
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
                // Data starts at row 9 (index 8), skip header rows 1-5, col headers row 6, blanks 7-8
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

            // Collect all unique trades
            const allTrades = [...new Set((subs || []).flatMap(s => s.trades || []))].sort();

            body.innerHTML = `
                <div class="app-toolbar">
                    <input type="text" class="app-search" placeholder="Search subcontractors..." id="sub-search">
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

            function render(list) {
                tbody.innerHTML = list.length > 0 ? list.map(s => `
                    <tr>
                        <td class="strong">${s.company_name || '—'}</td>
                        <td>${s.contact_name || '—'}</td>
                        <td>${s.phone || '—'}</td>
                        <td class="trades-cell">${(s.trades || []).map(t => Utils.tradeBadge(t)).join(' ')}</td>
                        <td class="rating-cell">${Utils.ratingStars(s.rating)}</td>
                        <td>${s.jobs_completed || 0}</td>
                    </tr>
                `).join('') : '<tr><td colspan="6" class="empty-row">No subcontractors found</td></tr>';
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

    return { id: 'subcontractors', name: 'Subcontractors', icon: ICON, launch };
})();
