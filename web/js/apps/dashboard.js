/* ===== Dashboard App ===== */
const DashboardApp = (() => {
    const ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="4" rx="1"/><rect x="14" y="10" width="7" height="11" rx="1"/><rect x="3" y="13" width="7" height="8" rx="1"/></svg>`;

    // Track chart instances for cleanup
    let chartInstances = [];

    function destroyCharts() {
        chartInstances.forEach(c => c.destroy());
        chartInstances = [];
    }

    async function launch() {
        const html = `
            <div class="app-container dashboard">
                <div class="app-loading">Loading dashboard...</div>
            </div>
        `;

        WindowManager.createWindow('dashboard', 'Dashboard', html, {
            width: 960, height: 700,
            onReady: async (win) => {
                await loadDashboard(win);
            }
        });
    }

    async function loadDashboard(win) {
        const body = win.querySelector('.app-container');
        destroyCharts();

        // Set Chart.js dark theme defaults
        if (typeof Chart !== 'undefined') {
            Chart.defaults.color = '#667';
            Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            Chart.defaults.plugins.legend.display = false;
            Chart.defaults.scale = Chart.defaults.scale || {};
        }

        try {
            const [projectsRes, variationsRes, boqRes, invoicesRes, tasksRes, reportsRes, paymentsRes] = await Promise.all([
                SupabaseClient.from('projects').select('*, client:clients(name)'),
                SupabaseClient.from('variations').select('id, amount, status, payment_status'),
                SupabaseClient.from('boq').select('id, status'),
                SupabaseClient.from('invoices').select('id, amount, paid_amount, status, due_date, created_at'),
                SupabaseClient.from('schedule_tasks').select('id, task_name, due_date, project_id, status, project:projects(reference)').order('due_date', { ascending: true }),
                SupabaseClient.from('daily_reports').select('id, report_date, notes, project_id, project:projects(reference)').order('report_date', { ascending: false }).limit(5),
                SupabaseClient.from('payments').select('id, amount, payment_date, invoice_id'),
            ]);

            const projects = projectsRes.data || [];
            const variations = variationsRes.data || [];
            const boqs = boqRes.data || [];
            const invoices = invoicesRes.data || [];
            const tasks = tasksRes.data || [];
            const reports = reportsRes.data || [];

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

            // Monthly revenue data (last 6 months)
            const monthlyRevenue = buildMonthlyRevenue(invoices, 6);

            // Pipeline funnel data
            const funnelData = buildPipelineFunnel(projects);

            // Project health breakdown
            const healthData = buildHealthBreakdown(active);

            // Upcoming deadlines
            const upcomingDeadlines = buildUpcomingDeadlines(invoices, tasks, now);

            // Recent activity
            const recentActivityHTML = buildRecentActivity(reports);

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

                <div class="dash-widget-grid">
                    <div class="dash-section">
                        <h3>Monthly Revenue</h3>
                        <div class="dash-chart"><canvas id="dash-revenue-chart"></canvas></div>
                    </div>

                    <div class="dash-section">
                        <h3>Pipeline Funnel</h3>
                        <div class="dash-chart"><canvas id="dash-funnel-chart"></canvas></div>
                    </div>

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

                    <div class="dash-section">
                        <h3>Project Health</h3>
                        <div class="dash-health-list">
                            ${healthData.length > 0 ? healthData.map(h => `
                                <div class="health-row">
                                    <span class="health-row-icon">${Utils.HEALTH_ICONS[h.key] || '—'}</span>
                                    <span class="health-row-label">${Utils.HEALTH_LABELS[h.key] || h.key}</span>
                                    <span class="health-row-count">${h.count}</span>
                                    <div class="health-row-bar"><div class="health-row-fill" style="width:${h.pct}%;background:${h.color}"></div></div>
                                </div>
                            `).join('') : '<div class="dash-empty">No active projects</div>'}
                        </div>
                    </div>

                    <div class="dash-section">
                        <h3>Upcoming Deadlines</h3>
                        <div class="dash-deadline-list">
                            ${upcomingDeadlines.length > 0 ? upcomingDeadlines.map(d => `
                                <div class="deadline-item">
                                    <span class="deadline-icon">${d.icon}</span>
                                    <div class="deadline-info">
                                        <span class="deadline-label">${d.label}</span>
                                        <span class="deadline-sub">${d.sub}</span>
                                    </div>
                                    <span class="deadline-date ${d.urgent ? 'deadline-urgent' : ''}">${d.dateStr}</span>
                                </div>
                            `).join('') : '<div class="dash-empty">No upcoming deadlines</div>'}
                        </div>
                    </div>

                    <div class="dash-section">
                        <h3>Recent Activity</h3>
                        <div class="dash-activity-list">
                            ${recentActivityHTML}
                        </div>
                    </div>
                </div>
            `;

            // Render charts
            if (typeof Chart !== 'undefined') {
                renderRevenueChart(body, monthlyRevenue);
                renderFunnelChart(body, funnelData);
            }

        } catch (err) {
            body.innerHTML = `<div class="app-error">Failed to load dashboard: ${err.message}</div>`;
        }
    }

    // --- Data builders ---

    function buildMonthlyRevenue(invoices, months) {
        const now = new Date();
        const labels = [];
        const values = [];
        for (let i = months - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = d.toLocaleString('en-GB', { month: 'short', year: '2-digit' });
            labels.push(label);
            const monthTotal = invoices
                .filter(inv => inv.created_at && inv.created_at.startsWith(key))
                .reduce((s, inv) => s + (inv.amount || 0), 0);
            values.push(monthTotal);
        }
        return { labels, values };
    }

    function buildPipelineFunnel(projects) {
        const stages = [
            { key: 'enquiry', label: 'Enquiry' },
            { key: 'qualifying', label: 'Qualifying' },
            { key: 'site_visit_scheduled', label: 'Site Visit' },
            { key: 'boq_in_progress', label: 'BOQ' },
            { key: 'quoted', label: 'Quoted' },
            { key: 'accepted', label: 'Accepted' },
        ];
        return stages.map(s => ({
            label: s.label,
            count: projects.filter(p => p.status === s.key).length,
        }));
    }

    function buildHealthBreakdown(activeProjects) {
        const counts = { on_track: 0, minor_delay: 0, behind: 0, blocked: 0 };
        const colors = { on_track: '#22c55e', minor_delay: '#f59e0b', behind: '#ef4444', blocked: '#6b7280' };
        activeProjects.forEach(p => {
            const h = p.health || 'on_track';
            if (counts[h] !== undefined) counts[h]++;
        });
        const total = activeProjects.length || 1;
        return Object.entries(counts).map(([key, count]) => ({
            key,
            count,
            pct: Math.round((count / total) * 100),
            color: colors[key],
        }));
    }

    function buildUpcomingDeadlines(invoices, tasks, now) {
        const items = [];
        // Invoice due dates
        invoices.forEach(inv => {
            if (inv.due_date && (inv.status === 'sent' || inv.status === 'overdue')) {
                const due = new Date(inv.due_date);
                const daysLeft = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
                items.push({
                    date: due,
                    icon: '📄',
                    label: `Invoice #${inv.id}`,
                    sub: Utils.formatCurrencyShort(inv.amount),
                    dateStr: Utils.formatDate(inv.due_date),
                    urgent: daysLeft <= 3,
                });
            }
        });
        // Task deadlines
        tasks.forEach(t => {
            if (t.due_date && t.status !== 'complete' && t.status !== 'completed') {
                const due = new Date(t.due_date);
                const daysLeft = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
                items.push({
                    date: due,
                    icon: '📋',
                    label: t.task_name || 'Task',
                    sub: t.project?.reference || '',
                    dateStr: Utils.formatDate(t.due_date),
                    urgent: daysLeft <= 3,
                });
            }
        });
        items.sort((a, b) => a.date - b.date);
        return items.slice(0, 5);
    }

    function buildRecentActivity(reports) {
        if (!reports || reports.length === 0) {
            return '<div class="dash-empty">No reports yet</div>';
        }
        return reports.map(r => `
            <div class="activity-item">
                <span class="activity-icon">📝</span>
                <div class="activity-info">
                    <span class="activity-label">${r.project?.reference || 'Unknown project'}</span>
                    <span class="activity-sub">${r.notes ? (r.notes.length > 60 ? r.notes.substring(0, 60) + '...' : r.notes) : 'Daily report'}</span>
                </div>
                <span class="activity-date">${Utils.formatRelativeDate(r.report_date)}</span>
            </div>
        `).join('');
    }

    // --- Chart renderers ---

    function renderRevenueChart(container, data) {
        const canvas = container.querySelector('#dash-revenue-chart');
        if (!canvas) return;
        const chart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.values,
                    backgroundColor: 'rgba(233, 69, 96, 0.7)',
                    borderColor: '#e94560',
                    borderWidth: 1,
                    borderRadius: 4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: {
                        grid: { color: 'rgba(255,255,255,0.06)', drawBorder: false },
                        ticks: { color: '#667', font: { size: 11 } },
                    },
                    y: {
                        grid: { color: 'rgba(255,255,255,0.06)', drawBorder: false },
                        ticks: {
                            color: '#667',
                            font: { size: 11 },
                            callback: v => {
                                if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
                                if (v >= 1000) return (v / 1000).toFixed(0) + 'K';
                                return v;
                            }
                        },
                        beginAtZero: true,
                    }
                }
            }
        });
        chartInstances.push(chart);
    }

    function renderFunnelChart(container, data) {
        const canvas = container.querySelector('#dash-funnel-chart');
        if (!canvas) return;
        const colors = ['#e94560', '#f472b6', '#a855f7', '#6366f1', '#3b82f6', '#22c55e'];
        const chart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: data.map(d => d.label),
                datasets: [{
                    data: data.map(d => d.count),
                    backgroundColor: colors.slice(0, data.length),
                    borderWidth: 0,
                    borderRadius: 4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: { legend: { display: false } },
                scales: {
                    x: {
                        grid: { color: 'rgba(255,255,255,0.06)', drawBorder: false },
                        ticks: { color: '#667', font: { size: 11 }, stepSize: 1 },
                        beginAtZero: true,
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: '#aab', font: { size: 11 } },
                    }
                }
            }
        });
        chartInstances.push(chart);
    }

    return { id: 'dashboard', name: 'Dashboard', icon: ICON, launch };
})();
