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

            function render(list) {
                tbody.innerHTML = list.length > 0 ? list.map(e => `
                    <tr>
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

    return { id: 'enquiries', name: 'Enquiries', icon: ICON, launch };
})();
