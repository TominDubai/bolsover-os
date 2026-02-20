/* ===== Dashboard App ===== */
const DashboardApp = (() => {
    const ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="4" rx="1"/><rect x="14" y="10" width="7" height="11" rx="1"/><rect x="3" y="13" width="7" height="8" rx="1"/></svg>`;

    async function launch() {
        const html = `
            <div class="app-container dashboard">
                <div class="app-loading">Loading dashboard...</div>
            </div>
        `;

        WindowManager.createWindow('dashboard', 'Dashboard', html, {
            width: 860, height: 600,
            onReady: async (win) => {
                await loadDashboard(win);
            }
        });
    }

    async function loadDashboard(win) {
        const body = win.querySelector('.app-container');
        try {
            const [projectsRes, variationsRes, boqRes, invoicesRes] = await Promise.all([
                SupabaseClient.from('projects').select('*, client:clients(name)'),
                SupabaseClient.from('variations').select('id, amount, status, payment_status'),
                SupabaseClient.from('boq').select('id, status'),
                SupabaseClient.from('invoices').select('id, amount, paid_amount, status, due_date'),
            ]);

            const projects = projectsRes.data || [];
            const variations = variationsRes.data || [];
            const boqs = boqRes.data || [];
            const invoices = invoicesRes.data || [];

            const pipeline = projects.filter(p => Utils.PIPELINE_STATUSES.includes(p.status));
            const active = projects.filter(p => Utils.ACTIVE_STATUSES.includes(p.status));
            const completed = projects.filter(p => p.status === 'complete');

            const pipelineValue = pipeline.reduce((s, p) => s + (p.contract_value || 0), 0);
            const activeValue = active.reduce((s, p) => s + (p.contract_value || 0), 0);

            const unpaidVariations = variations.filter(v => v.payment_status !== 'paid' && v.status !== 'rejected');
            const unpaidVariationTotal = unpaidVariations.reduce((s, v) => s + (v.amount || 0), 0);

            const pendingBoqs = boqs.filter(b => b.status === 'pending' || b.status === 'review');

            // Invoice stats
            const now = new Date();
            const overdueInvoices = invoices.filter(i =>
                (i.status === 'sent' || i.status === 'overdue') &&
                i.due_date && new Date(i.due_date) < now
            );
            const overdueTotal = overdueInvoices.reduce((s, i) => s + ((i.amount || 0) - (i.paid_amount || 0)), 0);

            const totalOutstanding = invoices
                .filter(i => i.status !== 'cancelled' && i.status !== 'paid')
                .reduce((s, i) => s + ((i.amount || 0) - (i.paid_amount || 0)), 0);

            const topActive = active.slice(0, 5);

            // Attention items
            let attentionHTML = '';
            if (overdueInvoices.length > 0) {
                attentionHTML += `<div class="attention-item warning"><span class="attention-icon">🚨</span><span>${overdueInvoices.length} overdue invoice${overdueInvoices.length > 1 ? 's' : ''} (${Utils.formatCurrencyShort(overdueTotal)})</span></div>`;
            }
            if (pendingBoqs.length > 0) {
                attentionHTML += `<div class="attention-item warning"><span class="attention-icon">📋</span><span>${pendingBoqs.length} BOQ${pendingBoqs.length > 1 ? 's' : ''} pending approval</span></div>`;
            }
            if (unpaidVariations.length > 0) {
                attentionHTML += `<div class="attention-item warning"><span class="attention-icon">💰</span><span>${unpaidVariations.length} unpaid variation${unpaidVariations.length > 1 ? 's' : ''} (${Utils.formatCurrencyShort(unpaidVariationTotal)})</span></div>`;
            }
            if (totalOutstanding > 0 && overdueInvoices.length === 0) {
                attentionHTML += `<div class="attention-item warning"><span class="attention-icon">📄</span><span>${Utils.formatCurrencyShort(totalOutstanding)} outstanding across invoices</span></div>`;
            }
            if (!attentionHTML) {
                attentionHTML = '<div class="attention-item ok"><span class="attention-icon">✅</span><span>All clear — nothing needs attention</span></div>';
            }

            body.innerHTML = `
                <div class="dash-stats">
                    <div class="stat-card">
                        <div class="stat-label">Pipeline</div>
                        <div class="stat-value">${pipeline.length}</div>
                        <div class="stat-sub">${Utils.formatCurrencyShort(pipelineValue)}</div>
                    </div>
                    <div class="stat-card accent">
                        <div class="stat-label">Active Projects</div>
                        <div class="stat-value">${active.length}</div>
                        <div class="stat-sub">${Utils.formatCurrencyShort(activeValue)}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Completed</div>
                        <div class="stat-value">${completed.length}</div>
                        <div class="stat-sub">All time</div>
                    </div>
                    <div class="stat-card ${totalOutstanding > 0 ? 'warning' : ''}">
                        <div class="stat-label">Outstanding</div>
                        <div class="stat-value">${Utils.formatCurrencyShort(totalOutstanding)}</div>
                        <div class="stat-sub">${overdueInvoices.length > 0 ? overdueInvoices.length + ' overdue' : 'All current'}</div>
                    </div>
                </div>

                <div class="dash-grid">
                    <div class="dash-section">
                        <h3>Needs Attention</h3>
                        <div class="attention-list">${attentionHTML}</div>
                    </div>

                    <div class="dash-section">
                        <h3>Active Projects</h3>
                        <div class="dash-table">
                            <table>
                                <thead><tr><th>Reference</th><th>Client</th><th>Status</th><th>Value</th></tr></thead>
                                <tbody>
                                    ${topActive.length > 0 ? topActive.map(p => `
                                        <tr>
                                            <td class="ref-link">${p.reference || '—'}</td>
                                            <td>${p.client?.name || '—'}</td>
                                            <td>${Utils.statusBadge(p.status)}</td>
                                            <td>${Utils.formatCurrencyShort(p.contract_value)}</td>
                                        </tr>
                                    `).join('') : '<tr><td colspan="4" class="empty-row">No active projects</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        } catch (err) {
            body.innerHTML = `<div class="app-error">Failed to load dashboard: ${err.message}</div>`;
        }
    }

    return { id: 'dashboard', name: 'Dashboard', icon: ICON, launch };
})();
