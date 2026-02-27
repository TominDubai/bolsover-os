/* ===== Projects App ===== */
const ProjectsApp = (() => {
    const ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`;

    const ALL_STATUSES = Object.keys(Utils.STATUS_LABELS);

    /* ── Hub Icons (copied from each sub-app) ── */
    const HUB_ICONS = {
        quotes: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
        invoices: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="2" y1="9" x2="22" y2="9"/><line x1="9" y1="3" x2="9" y2="9"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/></svg>`,
        variations: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
        schedule: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
        sitework: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 20h20"/><path d="M5 20V8l7-5 7 5v12"/><path d="M9 20v-5h6v5"/><path d="M9 12h.01"/><path d="M15 12h.01"/></svg>`,
    };

    /* ── Status maps for hub badges ── */
    const QUOTE_STATUSES = {
        draft: { label: 'Draft', bg: '#f3f4f6', text: '#374151' },
        pending: { label: 'Pending', bg: '#fef3c7', text: '#92400e' },
        sent: { label: 'Sent', bg: '#dbeafe', text: '#1e40af' },
        accepted: { label: 'Accepted', bg: '#dcfce7', text: '#166534' },
        rejected: { label: 'Rejected', bg: '#fee2e2', text: '#991b1b' },
        revised: { label: 'Revised', bg: '#ede9fe', text: '#6b21a8' },
    };
    const INV_STATUSES = {
        draft: { label: 'Draft', bg: '#f3f4f6', text: '#374151' },
        sent: { label: 'Sent', bg: '#dbeafe', text: '#1e40af' },
        overdue: { label: 'Overdue', bg: '#fee2e2', text: '#991b1b' },
        partially_paid: { label: 'Partial', bg: '#fef3c7', text: '#92400e' },
        paid: { label: 'Paid', bg: '#dcfce7', text: '#166534' },
        cancelled: { label: 'Cancelled', bg: '#f3f4f6', text: '#6b7280' },
    };
    const INV_TYPES = {
        progress_claim: 'Progress Claim', milestone: 'Milestone', variation: 'Variation',
        final: 'Final Invoice', deposit: 'Deposit', retention: 'Retention Release',
    };
    const VAR_STATUSES = {
        pending: { label: 'Pending', bg: '#fef3c7', text: '#92400e' },
        approved: { label: 'Approved', bg: '#dcfce7', text: '#166534' },
        rejected: { label: 'Rejected', bg: '#fee2e2', text: '#991b1b' },
    };
    const PHASE_STATUSES = {
        pending: { label: 'Pending', bg: '#f3f4f6', text: '#374151' },
        in_progress: { label: 'In Progress', bg: '#dbeafe', text: '#1e40af' },
        completed: { label: 'Completed', bg: '#dcfce7', text: '#166534' },
        delayed: { label: 'Delayed', bg: '#fee2e2', text: '#991b1b' },
        on_hold: { label: 'On Hold', bg: '#fef3c7', text: '#92400e' },
    };
    const TASK_STATUSES = { ...PHASE_STATUSES };
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

    function hubBadge(status, map) {
        const s = map[status];
        if (!s) return `<span class="status-badge" style="background:${map.pending?.bg || '#f3f4f6'};color:${map.pending?.text || '#374151'}">${status || '—'}</span>`;
        return `<span class="status-badge" style="background:${s.bg};color:${s.text}">${s.label}</span>`;
    }

    /* ── Fetch hub data for a project ── */
    async function fetchHubData(projectId) {
        const [boqRes, invRes, payRes, varRes, phaseRes, taskRes, reportRes, snagRes] = await Promise.all([
            SupabaseClient.from('boq').select('id, status, total_cost, client_price').eq('project_id', projectId),
            SupabaseClient.from('invoices').select('id, status, amount, due_date').eq('project_id', projectId),
            SupabaseClient.from('payments').select('id, amount').eq('project_id', projectId),
            SupabaseClient.from('variations').select('id, status, cost, price').eq('project_id', projectId),
            SupabaseClient.from('schedule_phases').select('id, status').eq('project_id', projectId),
            SupabaseClient.from('schedule_tasks').select('id, status, phase_id'),
            SupabaseClient.from('daily_reports').select('id').eq('project_id', projectId),
            SupabaseClient.from('snagging_items').select('id, status').eq('project_id', projectId),
        ]);

        const boqs = boqRes.data || [];
        const invoices = invRes.data || [];
        const payments = payRes.data || [];
        const variations = varRes.data || [];
        const phases = phaseRes.data || [];
        const allTasks = taskRes.data || [];
        const reports = reportRes.data || [];
        const snags = snagRes.data || [];

        // Filter tasks to only those belonging to this project's phases
        const phaseIds = new Set(phases.map(p => p.id));
        const tasks = allTasks.filter(t => phaseIds.has(t.phase_id));

        const totalBilled = invoices.reduce((s, i) => s + (i.amount || 0), 0);
        const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
        const overdueCount = invoices.filter(i => i.status === 'overdue' || (i.status === 'sent' && i.due_date && new Date(i.due_date) < new Date())).length;

        const approvedVars = variations.filter(v => v.status === 'approved');
        const pendingVars = variations.filter(v => v.status === 'pending');

        const phasesCompleted = phases.filter(p => p.status === 'completed').length;
        const tasksCompleted = tasks.filter(t => t.status === 'completed').length;

        const openSnags = snags.filter(s => s.status !== 'resolved').length;

        return {
            quotes: {
                count: boqs.length,
                totalValue: boqs.reduce((s, b) => s + (b.client_price || 0), 0),
                accepted: boqs.filter(b => b.status === 'accepted').length,
            },
            invoices: {
                count: invoices.length,
                billed: totalBilled,
                paid: totalPaid,
                overdue: overdueCount,
            },
            variations: {
                count: variations.length,
                approvedValue: approvedVars.reduce((s, v) => s + (v.price || 0), 0),
                pending: pendingVars.length,
            },
            schedule: {
                phasesTotal: phases.length,
                phasesDone: phasesCompleted,
                tasksTotal: tasks.length,
                tasksDone: tasksCompleted,
            },
            sitework: {
                reports: reports.length,
                openSnags,
                totalSnags: snags.length,
            },
        };
    }

    /* ── Launch ── */
    async function launch() {
        const html = `
            <div class="app-container projects">
                <div class="app-loading">Loading projects...</div>
            </div>
        `;

        WindowManager.createWindow('projects', 'Projects', html, {
            width: 920, height: 600,
            onReady: async (win) => {
                await loadList(win);
            }
        });
    }

    /* ── Project List ── */
    async function loadList(win) {
        const body = win.querySelector('.app-container');
        try {
            const { data: projects, error } = await SupabaseClient.from('projects')
                .select('*, client:clients(name)')
                .order('created_at', { ascending: false });

            if (error) throw error;

            body.innerHTML = `
                <div class="app-toolbar">
                    <input type="text" class="app-search" placeholder="Search projects..." id="proj-search">
                    <select class="app-filter" id="proj-filter">
                        <option value="all">All Statuses</option>
                        <option value="pipeline">Pipeline</option>
                        <option value="active">Active</option>
                        <option value="snagging">Snagging</option>
                        <option value="complete">Complete</option>
                        <option value="on_hold">On Hold</option>
                        <option value="lost">Lost</option>
                    </select>
                </div>
                <div class="app-table-wrap">
                    <table class="app-table" id="proj-table">
                        <thead><tr>
                            <th>Reference</th>
                            <th>Client</th>
                            <th>Status</th>
                            <th>Health</th>
                            <th>Value</th>
                            <th>Created</th>
                        </tr></thead>
                        <tbody id="proj-tbody"></tbody>
                    </table>
                </div>
            `;

            const tbody = body.querySelector('#proj-tbody');
            const search = body.querySelector('#proj-search');
            const filter = body.querySelector('#proj-filter');

            function render(list) {
                tbody.innerHTML = list.length > 0 ? list.map(p => `
                    <tr class="clickable-row" data-id="${p.id}">
                        <td class="ref-link">${p.reference || '—'}</td>
                        <td>${p.client?.name || '—'}</td>
                        <td>${Utils.statusBadge(p.status)}</td>
                        <td>${Utils.healthBadge(p.health)}</td>
                        <td>${Utils.formatCurrencyShort(p.contract_value)}</td>
                        <td>${Utils.formatRelativeDate(p.created_at)}</td>
                    </tr>
                `).join('') : '<tr><td colspan="6" class="empty-row">No projects found</td></tr>';

                tbody.querySelectorAll('.clickable-row').forEach(row => {
                    row.addEventListener('click', () => loadDetail(win, row.dataset.id, projects));
                });
            }

            function applyFilters() {
                const q = search.value.toLowerCase();
                const f = filter.value;
                let filtered = projects || [];

                if (q) {
                    filtered = filtered.filter(p =>
                        (p.reference || '').toLowerCase().includes(q) ||
                        (p.client?.name || '').toLowerCase().includes(q)
                    );
                }

                if (f !== 'all') {
                    if (f === 'pipeline') filtered = filtered.filter(p => Utils.PIPELINE_STATUSES.includes(p.status));
                    else if (f === 'active') filtered = filtered.filter(p => Utils.ACTIVE_STATUSES.includes(p.status));
                    else filtered = filtered.filter(p => p.status === f);
                }

                render(filtered);
            }

            search.addEventListener('input', applyFilters);
            filter.addEventListener('change', applyFilters);
            render(projects || []);
        } catch (err) {
            body.innerHTML = `<div class="app-error">Failed to load projects: ${err.message}</div>`;
        }
    }

    /* ── Project Detail (Hub) ── */
    async function loadDetail(win, projectId, allProjects) {
        const body = win.querySelector('.app-container');
        const project = allProjects.find(p => p.id === projectId);
        if (!project) return;

        const outstanding = (project.total_invoiced || 0) - (project.total_paid || 0);
        const totalWithVariations = (project.contract_value || 0) + (project.variation_total || 0);

        const statusOptions = ALL_STATUSES
            .filter(s => s !== project.status)
            .map(s => `<option value="${s}">${Utils.STATUS_LABELS[s]}</option>`)
            .join('');

        body.innerHTML = `
            <div class="detail-view">
                <div class="detail-header">
                    <button class="back-btn" id="proj-back">← Back</button>
                    <h2>${project.reference || 'Project'} ${Utils.healthBadge(project.health)}</h2>
                    <div class="status-advance">
                        ${Utils.statusBadge(project.status)}
                        <select id="proj-status-select">${statusOptions}</select>
                        <button id="proj-status-go">Update</button>
                    </div>
                    <button class="btn-edit" id="proj-edit-btn">Edit</button>
                </div>

                <div class="detail-grid">
                    <div class="detail-section">
                        <h4>Financial Summary</h4>
                        <div class="detail-fields">
                            <div class="field"><span class="field-label">Contract Value</span><span class="field-value">${Utils.formatCurrency(project.contract_value)}</span></div>
                            <div class="field"><span class="field-label">Variations</span><span class="field-value">${Utils.formatCurrency(project.variation_total)}</span></div>
                            <div class="field"><span class="field-label">Total (incl. vars)</span><span class="field-value strong">${Utils.formatCurrency(totalWithVariations)}</span></div>
                            <div class="field"><span class="field-label">Total Invoiced</span><span class="field-value">${Utils.formatCurrency(project.total_invoiced)}</span></div>
                            <div class="field"><span class="field-label">Total Paid</span><span class="field-value">${Utils.formatCurrency(project.total_paid)}</span></div>
                            <div class="field"><span class="field-label">Outstanding</span><span class="field-value ${outstanding > 0 ? 'warning-text' : ''}">${Utils.formatCurrency(outstanding)}</span></div>
                        </div>
                    </div>

                    <div class="detail-section">
                        <h4>Client & Location</h4>
                        <div class="detail-fields">
                            <div class="field"><span class="field-label">Client</span><span class="field-value">${project.client?.name || '—'}</span></div>
                            <div class="field"><span class="field-label">Community</span><span class="field-value">${project.community || '—'}</span></div>
                            <div class="field"><span class="field-label">Address</span><span class="field-value">${project.address || '—'}</span></div>
                            <div class="field"><span class="field-label">Property Type</span><span class="field-value">${project.property_type || '—'}</span></div>
                            <div class="field"><span class="field-label">Source</span><span class="field-value">${project.source || '—'}</span></div>
                        </div>
                    </div>

                    <div class="detail-section">
                        <h4>Key Dates</h4>
                        <div class="detail-fields">
                            <div class="field"><span class="field-label">Enquiry Date</span><span class="field-value">${Utils.formatDate(project.enquiry_date)}</span></div>
                            <div class="field"><span class="field-label">Site Visit</span><span class="field-value">${Utils.formatDate(project.site_visit_date)}</span></div>
                            <div class="field"><span class="field-label">Quote Sent</span><span class="field-value">${Utils.formatDate(project.quote_sent_date)}</span></div>
                            <div class="field"><span class="field-label">Accepted</span><span class="field-value">${Utils.formatDate(project.accepted_date)}</span></div>
                            <div class="field"><span class="field-label">Start Date</span><span class="field-value">${Utils.formatDate(project.start_date)}</span></div>
                            <div class="field"><span class="field-label">Due Date</span><span class="field-value">${Utils.formatDate(project.due_date)}</span></div>
                            <div class="field"><span class="field-label">Completed</span><span class="field-value">${Utils.formatDate(project.completed_date)}</span></div>
                        </div>
                    </div>

                    <div class="detail-section">
                        <h4>Project Details</h4>
                        <div class="detail-fields">
                            <div class="field"><span class="field-label">Design</span><span class="field-value">${project.has_design || '—'}</span></div>
                            <div class="field"><span class="field-label">Drawings</span><span class="field-value">${project.has_drawings || '—'}</span></div>
                            <div class="field full-width"><span class="field-label">Scope</span><span class="field-value">${project.scope_summary || '—'}</span></div>
                            ${project.notes ? `<div class="field full-width"><span class="field-label">Notes</span><span class="field-value">${project.notes}</span></div>` : ''}
                        </div>
                    </div>
                </div>

                <div class="hub-cards-section" id="hub-cards-section">
                    <h3>Project Sections</h3>
                    <div class="hub-cards-loading">Loading hub data...</div>
                </div>
            </div>
        `;

        body.querySelector('#proj-back').addEventListener('click', () => loadList(win));
        body.querySelector('#proj-edit-btn').addEventListener('click', () => showEditForm(win, project));

        body.querySelector('#proj-status-go').addEventListener('click', async () => {
            const newStatus = body.querySelector('#proj-status-select').value;
            const btn = body.querySelector('#proj-status-go');
            btn.disabled = true;
            btn.textContent = '...';
            try {
                const { error } = await SupabaseClient.from('projects')
                    .update({ status: newStatus })
                    .eq('id', project.id);
                if (error) throw error;
                const { data: refreshed } = await SupabaseClient.from('projects')
                    .select('*, client:clients(name)')
                    .eq('id', project.id)
                    .single();
                if (refreshed) loadDetail(win, refreshed.id, [refreshed]);
                else await loadList(win);
            } catch (err) {
                btn.textContent = 'Error';
                btn.disabled = false;
            }
        });

        // Async-load hub cards
        try {
            const hub = await fetchHubData(projectId);
            const section = body.querySelector('#hub-cards-section');
            if (!section) return; // user navigated away

            const schedPct = hub.schedule.tasksTotal > 0 ? Math.round((hub.schedule.tasksDone / hub.schedule.tasksTotal) * 100) : 0;

            section.innerHTML = `
                <h3>Project Sections</h3>
                <div class="hub-cards-grid">
                    <div class="hub-card hub-card--quotes">
                        <div class="hub-card-header">
                            <div class="hub-card-icon">${HUB_ICONS.quotes}</div>
                            <div class="hub-card-title">Quotes / BOQ</div>
                        </div>
                        <div class="hub-card-metrics">
                            <div class="hub-metric"><span class="hub-metric-value">${hub.quotes.count}</span><span class="hub-metric-label">Quotes</span></div>
                            <div class="hub-metric"><span class="hub-metric-value">${Utils.formatCurrencyShort(hub.quotes.totalValue)}</span><span class="hub-metric-label">Total Value</span></div>
                            <div class="hub-metric"><span class="hub-metric-value highlight">${hub.quotes.accepted}</span><span class="hub-metric-label">Accepted</span></div>
                        </div>
                        <button class="hub-card-action" data-section="quotes">View All →</button>
                    </div>

                    <div class="hub-card hub-card--invoices">
                        <div class="hub-card-header">
                            <div class="hub-card-icon">${HUB_ICONS.invoices}</div>
                            <div class="hub-card-title">Invoices</div>
                        </div>
                        <div class="hub-card-metrics">
                            <div class="hub-metric"><span class="hub-metric-value">${hub.invoices.count}</span><span class="hub-metric-label">Invoices</span></div>
                            <div class="hub-metric"><span class="hub-metric-value">${Utils.formatCurrencyShort(hub.invoices.billed)}</span><span class="hub-metric-label">Billed</span></div>
                            <div class="hub-metric"><span class="hub-metric-value">${Utils.formatCurrencyShort(hub.invoices.paid)}</span><span class="hub-metric-label">Paid</span></div>
                            ${hub.invoices.overdue > 0 ? `<div class="hub-metric"><span class="hub-metric-value warning">${hub.invoices.overdue}</span><span class="hub-metric-label">Overdue</span></div>` : ''}
                        </div>
                        <button class="hub-card-action" data-section="invoices">View All →</button>
                    </div>

                    <div class="hub-card hub-card--variations">
                        <div class="hub-card-header">
                            <div class="hub-card-icon">${HUB_ICONS.variations}</div>
                            <div class="hub-card-title">Variations</div>
                        </div>
                        <div class="hub-card-metrics">
                            <div class="hub-metric"><span class="hub-metric-value">${hub.variations.count}</span><span class="hub-metric-label">Total</span></div>
                            <div class="hub-metric"><span class="hub-metric-value highlight">${Utils.formatCurrencyShort(hub.variations.approvedValue)}</span><span class="hub-metric-label">Approved Value</span></div>
                            ${hub.variations.pending > 0 ? `<div class="hub-metric"><span class="hub-metric-value warning">${hub.variations.pending}</span><span class="hub-metric-label">Pending</span></div>` : ''}
                        </div>
                        <button class="hub-card-action" data-section="variations">View All →</button>
                    </div>

                    <div class="hub-card hub-card--schedule">
                        <div class="hub-card-header">
                            <div class="hub-card-icon">${HUB_ICONS.schedule}</div>
                            <div class="hub-card-title">Schedule</div>
                        </div>
                        <div class="hub-card-metrics">
                            <div class="hub-metric"><span class="hub-metric-value">${hub.schedule.phasesDone}/${hub.schedule.phasesTotal}</span><span class="hub-metric-label">Phases Done</span></div>
                            <div class="hub-metric"><span class="hub-metric-value">${hub.schedule.tasksDone}/${hub.schedule.tasksTotal}</span><span class="hub-metric-label">Tasks Done</span></div>
                        </div>
                        <div class="hub-progress-bar"><div class="hub-progress-fill" style="width:${schedPct}%"></div></div>
                        <button class="hub-card-action" data-section="schedule">View All →</button>
                    </div>

                    <div class="hub-card hub-card--sitework">
                        <div class="hub-card-header">
                            <div class="hub-card-icon">${HUB_ICONS.sitework}</div>
                            <div class="hub-card-title">Site Work</div>
                        </div>
                        <div class="hub-card-metrics">
                            <div class="hub-metric"><span class="hub-metric-value">${hub.sitework.reports}</span><span class="hub-metric-label">Reports</span></div>
                            <div class="hub-metric"><span class="hub-metric-value ${hub.sitework.openSnags > 0 ? 'warning' : ''}">${hub.sitework.openSnags}</span><span class="hub-metric-label">Open Snags</span></div>
                        </div>
                        <button class="hub-card-action" data-section="sitework">View All →</button>
                    </div>
                </div>
            `;

            // Wire up "View All" buttons
            section.querySelectorAll('.hub-card-action').forEach(btn => {
                btn.addEventListener('click', () => {
                    const sec = btn.dataset.section;
                    if (sec === 'quotes') loadProjectQuotes(win, project, allProjects);
                    else if (sec === 'invoices') loadProjectInvoices(win, project, allProjects);
                    else if (sec === 'variations') loadProjectVariations(win, project, allProjects);
                    else if (sec === 'schedule') loadProjectSchedule(win, project, allProjects);
                    else if (sec === 'sitework') loadProjectSitework(win, project, allProjects);
                });
            });
        } catch (err) {
            const section = body.querySelector('#hub-cards-section');
            if (section) section.innerHTML = `<div class="app-error" style="height:auto;padding:12px">Failed to load hub data: ${err.message}</div>`;
        }
    }

    /* ══════════════════════════════════════════════
       SUB-SECTION LIST VIEWS
       ══════════════════════════════════════════════ */

    /* ── Quotes List ── */
    async function loadProjectQuotes(win, project, allProjects) {
        const body = win.querySelector('.app-container');
        body.innerHTML = `<div class="app-loading">Loading quotes...</div>`;

        try {
            const { data: quotes, error } = await SupabaseClient.from('boq')
                .select('*')
                .eq('project_id', project.id)
                .order('created_at', { ascending: false });
            if (error) throw error;

            const list = quotes || [];
            const totalVal = list.reduce((s, q) => s + (q.client_price || 0), 0);

            body.innerHTML = `
                <div class="detail-view">
                    <div class="detail-header">
                        <button class="back-btn" id="sub-back">← ${project.reference || 'Project'}</button>
                        <h2>Quotes / BOQ</h2>
                        <span style="color:var(--text-muted);font-size:12px">${list.length} quotes · ${Utils.formatCurrencyShort(totalVal)} total</span>
                    </div>
                    <div class="app-table-wrap">
                        <table class="app-table">
                            <thead><tr>
                                <th>Reference</th>
                                <th>Status</th>
                                <th>Cost</th>
                                <th>Client Price</th>
                                <th>Margin</th>
                                <th>Created</th>
                            </tr></thead>
                            <tbody>${list.length > 0 ? list.map(q => `
                                <tr class="clickable-row" data-id="${q.id}">
                                    <td class="ref-link">${q.reference || '—'}</td>
                                    <td>${hubBadge(q.status, QUOTE_STATUSES)}</td>
                                    <td>${Utils.formatCurrencyShort(q.total_cost)}</td>
                                    <td>${Utils.formatCurrencyShort(q.client_price)}</td>
                                    <td>${q.margin_percent != null ? q.margin_percent.toFixed(1) + '%' : '—'}</td>
                                    <td>${Utils.formatRelativeDate(q.created_at)}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="6" class="empty-row">No quotes found</td></tr>'}</tbody>
                        </table>
                    </div>
                </div>
            `;

            body.querySelector('#sub-back').addEventListener('click', () => loadDetail(win, project.id, allProjects));
            body.querySelectorAll('.clickable-row').forEach(row => {
                row.addEventListener('click', () => loadQuoteDetail(win, row.dataset.id, project, allProjects));
            });
        } catch (err) {
            body.innerHTML = `<div class="app-error">Failed to load quotes: ${err.message}</div>`;
        }
    }

    /* ── Invoices List ── */
    async function loadProjectInvoices(win, project, allProjects) {
        const body = win.querySelector('.app-container');
        body.innerHTML = `<div class="app-loading">Loading invoices...</div>`;

        try {
            const [invRes, payRes] = await Promise.all([
                SupabaseClient.from('invoices').select('*').eq('project_id', project.id).order('created_at', { ascending: false }),
                SupabaseClient.from('payments').select('*').eq('project_id', project.id),
            ]);
            if (invRes.error) throw invRes.error;

            const list = invRes.data || [];
            const payments = payRes.data || [];
            const paymentsByInv = {};
            payments.forEach(p => {
                if (!paymentsByInv[p.invoice_id]) paymentsByInv[p.invoice_id] = 0;
                paymentsByInv[p.invoice_id] += (p.amount || 0);
            });

            const totalBilled = list.reduce((s, i) => s + (i.amount || 0), 0);
            const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);

            body.innerHTML = `
                <div class="detail-view">
                    <div class="detail-header">
                        <button class="back-btn" id="sub-back">← ${project.reference || 'Project'}</button>
                        <h2>Invoices</h2>
                        <span style="color:var(--text-muted);font-size:12px">${list.length} invoices · ${Utils.formatCurrencyShort(totalBilled)} billed · ${Utils.formatCurrencyShort(totalPaid)} paid</span>
                    </div>
                    <div class="app-table-wrap">
                        <table class="app-table">
                            <thead><tr>
                                <th>Reference</th>
                                <th>Type</th>
                                <th>Status</th>
                                <th>Amount</th>
                                <th>Paid</th>
                                <th>Due Date</th>
                            </tr></thead>
                            <tbody>${list.length > 0 ? list.map(inv => `
                                <tr class="clickable-row" data-id="${inv.id}">
                                    <td class="ref-link">${inv.reference || '—'}</td>
                                    <td>${INV_TYPES[inv.invoice_type] || inv.invoice_type || '—'}</td>
                                    <td>${hubBadge(inv.status, INV_STATUSES)}</td>
                                    <td>${Utils.formatCurrencyShort(inv.amount)}</td>
                                    <td>${Utils.formatCurrencyShort(paymentsByInv[inv.id] || 0)}</td>
                                    <td>${Utils.formatDate(inv.due_date)}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="6" class="empty-row">No invoices found</td></tr>'}</tbody>
                        </table>
                    </div>
                </div>
            `;

            body.querySelector('#sub-back').addEventListener('click', () => loadDetail(win, project.id, allProjects));
            body.querySelectorAll('.clickable-row').forEach(row => {
                row.addEventListener('click', () => loadInvoiceDetail(win, row.dataset.id, project, allProjects));
            });
        } catch (err) {
            body.innerHTML = `<div class="app-error">Failed to load invoices: ${err.message}</div>`;
        }
    }

    /* ── Variations List ── */
    async function loadProjectVariations(win, project, allProjects) {
        const body = win.querySelector('.app-container');
        body.innerHTML = `<div class="app-loading">Loading variations...</div>`;

        try {
            const { data: vars, error } = await SupabaseClient.from('variations')
                .select('*')
                .eq('project_id', project.id)
                .order('created_at', { ascending: false });
            if (error) throw error;

            const list = vars || [];
            const totalPrice = list.reduce((s, v) => s + (v.price || 0), 0);

            body.innerHTML = `
                <div class="detail-view">
                    <div class="detail-header">
                        <button class="back-btn" id="sub-back">← ${project.reference || 'Project'}</button>
                        <h2>Variations</h2>
                        <span style="color:var(--text-muted);font-size:12px">${list.length} variations · ${Utils.formatCurrencyShort(totalPrice)} total</span>
                    </div>
                    <div class="app-table-wrap">
                        <table class="app-table">
                            <thead><tr>
                                <th>Reference</th>
                                <th>Description</th>
                                <th>Status</th>
                                <th>Cost</th>
                                <th>Price</th>
                            </tr></thead>
                            <tbody>${list.length > 0 ? list.map(v => `
                                <tr class="clickable-row" data-id="${v.id}">
                                    <td class="ref-link">${v.reference || '—'}</td>
                                    <td>${v.description ? (v.description.length > 50 ? v.description.substring(0, 50) + '...' : v.description) : '—'}</td>
                                    <td>${hubBadge(v.status, VAR_STATUSES)}</td>
                                    <td>${Utils.formatCurrencyShort(v.cost)}</td>
                                    <td>${Utils.formatCurrencyShort(v.price)}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="5" class="empty-row">No variations found</td></tr>'}</tbody>
                        </table>
                    </div>
                </div>
            `;

            body.querySelector('#sub-back').addEventListener('click', () => loadDetail(win, project.id, allProjects));
            body.querySelectorAll('.clickable-row').forEach(row => {
                row.addEventListener('click', () => loadVariationDetail(win, row.dataset.id, project, allProjects));
            });
        } catch (err) {
            body.innerHTML = `<div class="app-error">Failed to load variations: ${err.message}</div>`;
        }
    }

    /* ── Schedule List ── */
    async function loadProjectSchedule(win, project, allProjects) {
        const body = win.querySelector('.app-container');
        body.innerHTML = `<div class="app-loading">Loading schedule...</div>`;

        try {
            const { data: phasesRaw, error } = await SupabaseClient.from('schedule_phases')
                .select('*, tasks:schedule_tasks(*)')
                .eq('project_id', project.id)
                .order('sort_order', { ascending: true });
            if (error) throw error;

            const allPhases = phasesRaw || [];
            const totalTasks = allPhases.reduce((s, p) => s + (p.tasks || []).length, 0);
            const inProgress = allPhases.filter(p => p.status === 'in_progress').length;
            const delayed = allPhases.filter(p => p.status === 'delayed').length;
            const completedPhases = allPhases.filter(p => p.status === 'completed').length;

            body.innerHTML = `
                <div class="app-container schedule">
                    <div class="dash-stats compact">
                        <div class="stat-card small"><div class="stat-label">Phases</div><div class="stat-value">${allPhases.length}</div></div>
                        <div class="stat-card small"><div class="stat-label">In Progress</div><div class="stat-value">${inProgress}</div></div>
                        <div class="stat-card small ${delayed > 0 ? 'accent' : ''}"><div class="stat-label">Delayed</div><div class="stat-value">${delayed}</div></div>
                        <div class="stat-card small"><div class="stat-label">Completed</div><div class="stat-value">${completedPhases}</div></div>
                    </div>
                    <div class="app-toolbar">
                        <button class="back-btn" id="sub-back">← ${project.reference || 'Project'}</button>
                        <input type="text" class="app-search" placeholder="Search phases..." id="sched-search">
                        <select class="app-filter" id="sched-status-filter">
                            <option value="all">All Statuses</option>
                            ${Object.entries(PHASE_STATUSES).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}
                        </select>
                        <button class="import-btn" id="sched-new-btn">+ New Phase</button>
                        <button class="btn-edit" id="sched-timeline-btn">Timeline View</button>
                    </div>
                    <div id="sched-content" style="flex:1;overflow:auto;min-height:0"></div>
                </div>
            `;

            body.querySelector('#sub-back').addEventListener('click', () => loadDetail(win, project.id, allProjects));
            body.querySelector('#sched-new-btn').addEventListener('click', () => showProjectPhaseForm(win, null, project, allProjects));

            const search = body.querySelector('#sched-search');
            const statusFilter = body.querySelector('#sched-status-filter');
            let showingTimeline = false;

            body.querySelector('#sched-timeline-btn').addEventListener('click', () => {
                showingTimeline = !showingTimeline;
                body.querySelector('#sched-timeline-btn').textContent = showingTimeline ? 'Table View' : 'Timeline View';
                applyFilters();
            });

            function renderTable(list) {
                const contentEl = body.querySelector('#sched-content');
                contentEl.innerHTML = `
                    <div class="app-table-wrap">
                        <table class="app-table">
                            <thead><tr>
                                <th>Phase</th>
                                <th>Start</th>
                                <th>End</th>
                                <th>Tasks</th>
                                <th>Status</th>
                            </tr></thead>
                            <tbody id="sched-tbody"></tbody>
                        </table>
                    </div>
                `;
                const tb = contentEl.querySelector('#sched-tbody');
                tb.innerHTML = list.length > 0 ? list.map(p => {
                    const taskCount = (p.tasks || []).length;
                    const doneCount = (p.tasks || []).filter(t => t.status === 'completed').length;
                    return `
                        <tr class="clickable-row" data-id="${p.id}">
                            <td class="strong">${p.name || '—'}</td>
                            <td>${Utils.formatDate(p.start_date)}</td>
                            <td>${Utils.formatDate(p.end_date)}</td>
                            <td>${doneCount}/${taskCount}</td>
                            <td>${hubBadge(p.status, PHASE_STATUSES)}</td>
                        </tr>
                    `;
                }).join('') : '<tr><td colspan="5" class="empty-row">No phases scheduled</td></tr>';

                tb.querySelectorAll('.clickable-row').forEach(row => {
                    row.addEventListener('click', () => {
                        const phase = allPhases.find(p => p.id === row.dataset.id);
                        if (phase) loadPhaseDetail(win, phase.id, project, allProjects);
                    });
                });
            }

            function renderTimeline(list) {
                const container = body.querySelector('#sched-content');
                if (list.length === 0) { container.innerHTML = '<div class="empty-state">No phases to display</div>'; return; }
                const dates = [];
                list.forEach(p => {
                    if (p.start_date) dates.push(new Date(p.start_date));
                    if (p.end_date) dates.push(new Date(p.end_date));
                    (p.tasks || []).forEach(t => {
                        if (t.due_date) dates.push(new Date(t.due_date));
                        if (t.start_date) dates.push(new Date(t.start_date));
                    });
                });
                if (dates.length === 0) { container.innerHTML = '<div class="empty-state">No dates set on phases</div>'; return; }

                const minDate = new Date(Math.min(...dates));
                const maxDate = new Date(Math.max(...dates));
                const DAY = 86400000;
                const totalDays = Math.max(1, Math.ceil((maxDate - minDate) / DAY) + 1);

                const weeks = [];
                const wd = new Date(minDate);
                wd.setDate(wd.getDate() - wd.getDay() + 1);
                while (wd <= maxDate) { weeks.push(new Date(wd)); wd.setDate(wd.getDate() + 7); }

                const months = [];
                const md = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
                while (md <= maxDate) {
                    const mStart = new Date(Math.max(md, minDate));
                    const mEnd = new Date(md.getFullYear(), md.getMonth() + 1, 0);
                    const leftPct = ((mStart - minDate) / DAY) / totalDays * 100;
                    const widthPct = (Math.min(mEnd, maxDate) - mStart) / DAY / totalDays * 100;
                    months.push({ label: md.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), leftPct, widthPct });
                    md.setMonth(md.getMonth() + 1);
                }

                const phaseColors = ['#e94560','#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#84cc16'];

                function barCalc(startStr, endStr) {
                    const s = startStr ? new Date(startStr) : minDate;
                    const e = endStr ? new Date(endStr) : s;
                    const left = ((s - minDate) / DAY) / totalDays * 100;
                    const width = Math.max(0.5, ((e - s) / DAY + 1) / totalDays * 100);
                    return { left, width };
                }

                container.innerHTML = `
                    <div class="timeline-wrap">
                        <div class="timeline-header" style="display:flex">
                            <div class="timeline-label-col" style="display:flex;align-items:center;justify-content:space-between">
                                <span>Activity</span>
                                <button class="btn-edit" id="tl-toggle-all" style="font-size:10px;padding:2px 6px;height:auto">Collapse All</button>
                            </div>
                            <div class="timeline-bars-col" style="position:relative">
                                <div style="display:flex;position:relative;height:16px">
                                    ${months.map(m => `<div style="position:absolute;left:${m.leftPct}%;width:${m.widthPct}%;text-align:center;font-size:10px;font-weight:600;color:var(--text-secondary)">${m.label}</div>`).join('')}
                                </div>
                                <div class="timeline-weeks">
                                    ${weeks.map(w => `<div class="timeline-week">${w.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>`).join('')}
                                </div>
                            </div>
                        </div>
                        <div class="timeline-body">
                            ${list.map((p, pi) => {
                                const color = phaseColors[pi % phaseColors.length];
                                const colorFaded = color + '33';
                                const pb = barCalc(p.start_date, p.end_date);
                                const tasks = p.tasks || [];
                                const doneCount = tasks.filter(t => t.status === 'completed').length;
                                return `
                                    <div class="tl-phase-header timeline-row" data-phase-idx="${pi}" style="background:rgba(255,255,255,0.03);border-bottom:1px solid rgba(255,255,255,0.08);cursor:pointer">
                                        <div class="timeline-label-col" style="display:flex;align-items:center;gap:6px">
                                            <span class="tl-chevron" style="font-size:10px;color:var(--text-muted);transition:transform 0.15s;display:inline-block">▼</span>
                                            <div style="min-width:0">
                                                <div class="timeline-task-name">${p.name || '—'}</div>
                                                <div class="timeline-task-sub">${hubBadge(p.status, PHASE_STATUSES)}</div>
                                            </div>
                                        </div>
                                        <div class="timeline-bars-col">
                                            <div class="timeline-bar" style="left:${pb.left}%;width:${pb.width}%;background:${color};color:#fff;font-weight:600;opacity:0.9" title="${p.name}: ${Utils.formatDate(p.start_date)} — ${Utils.formatDate(p.end_date)}">
                                                ${doneCount}/${tasks.length}
                                            </div>
                                        </div>
                                    </div>
                                    <div class="tl-phase-tasks" data-phase-idx="${pi}">
                                        ${tasks.map(t => {
                                            const tStart = t.start_date || t.due_date;
                                            const tEnd = t.due_date || t.start_date;
                                            const tb = barCalc(tStart, tEnd);
                                            return `
                                                <div class="timeline-row" style="min-height:28px">
                                                    <div class="timeline-label-col" style="padding-left:24px">
                                                        <div class="timeline-task-name" style="font-size:11px;font-weight:400;color:var(--text-secondary)" title="${t.name || ''}">${t.name || '—'}</div>
                                                    </div>
                                                    <div class="timeline-bars-col">
                                                        <div class="timeline-bar" style="left:${tb.left}%;width:${Math.max(tb.width, 1)}%;background:${colorFaded};color:${color};border:1px solid ${color}40;height:16px;top:6px;border-radius:3px;font-size:9px;line-height:16px" title="${t.name}: ${Utils.formatDate(tStart)} — ${Utils.formatDate(tEnd)}"></div>
                                                    </div>
                                                </div>
                                            `;
                                        }).join('')}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;

                let allCollapsed = false;
                container.querySelectorAll('.tl-phase-header').forEach(header => {
                    header.addEventListener('click', () => {
                        const idx = header.dataset.phaseIdx;
                        const tasksEl = container.querySelector(`.tl-phase-tasks[data-phase-idx="${idx}"]`);
                        const chevron = header.querySelector('.tl-chevron');
                        const isHidden = tasksEl.style.display === 'none';
                        tasksEl.style.display = isHidden ? '' : 'none';
                        chevron.style.transform = isHidden ? '' : 'rotate(-90deg)';
                    });
                });
                const toggleAllBtn = container.querySelector('#tl-toggle-all');
                if (toggleAllBtn) {
                    toggleAllBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        allCollapsed = !allCollapsed;
                        toggleAllBtn.textContent = allCollapsed ? 'Expand All' : 'Collapse All';
                        container.querySelectorAll('.tl-phase-tasks').forEach(el => { el.style.display = allCollapsed ? 'none' : ''; });
                        container.querySelectorAll('.tl-chevron').forEach(ch => { ch.style.transform = allCollapsed ? 'rotate(-90deg)' : ''; });
                    });
                }
            }

            function applyFilters() {
                const q = search.value.toLowerCase();
                const sf = statusFilter.value;
                let filtered = allPhases;
                if (q) filtered = filtered.filter(p => (p.name || '').toLowerCase().includes(q));
                if (sf !== 'all') filtered = filtered.filter(p => p.status === sf);
                if (showingTimeline) renderTimeline(filtered);
                else renderTable(filtered);
            }

            search.addEventListener('input', applyFilters);
            statusFilter.addEventListener('change', applyFilters);
            renderTable(allPhases);
        } catch (err) {
            body.innerHTML = `<div class="app-error">Failed to load schedule: ${err.message}</div>`;
        }
    }

    /* ── Site Work (Tabs: Reports / Snags) ── */
    async function loadProjectSitework(win, project, allProjects) {
        const body = win.querySelector('.app-container');
        body.innerHTML = `<div class="app-loading">Loading site work...</div>`;

        try {
            const [reportRes, snagRes] = await Promise.all([
                SupabaseClient.from('daily_reports').select('*').eq('project_id', project.id).order('report_date', { ascending: false }),
                SupabaseClient.from('snagging_items').select('*').eq('project_id', project.id).order('created_at', { ascending: false }),
            ]);
            if (reportRes.error) throw reportRes.error;

            const reports = reportRes.data || [];
            const snags = snagRes.data || [];

            let activeTab = 'reports';

            function renderSitework() {
                body.innerHTML = `
                    <div class="detail-view">
                        <div class="detail-header">
                            <button class="back-btn" id="sub-back">← ${project.reference || 'Project'}</button>
                            <h2>Site Work</h2>
                            <div class="sitework-tabs">
                                <button class="trade-filter-btn ${activeTab === 'reports' ? 'active' : ''}" data-tab="reports">Daily Reports (${reports.length})</button>
                                <button class="trade-filter-btn ${activeTab === 'snags' ? 'active' : ''}" data-tab="snags">Snag List (${snags.length})</button>
                            </div>
                        </div>
                        <div class="app-table-wrap" id="sitework-content"></div>
                    </div>
                `;

                body.querySelector('#sub-back').addEventListener('click', () => loadDetail(win, project.id, allProjects));
                body.querySelectorAll('[data-tab]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        activeTab = btn.dataset.tab;
                        renderSitework();
                    });
                });

                const content = body.querySelector('#sitework-content');
                if (activeTab === 'reports') {
                    content.innerHTML = `
                        <table class="app-table">
                            <thead><tr>
                                <th>Date</th>
                                <th>Progress</th>
                                <th>Staff</th>
                                <th>Subcontractors</th>
                            </tr></thead>
                            <tbody>${reports.length > 0 ? reports.map(r => `
                                <tr class="clickable-row" data-id="${r.id}" data-type="report">
                                    <td class="ref-link">${Utils.formatDate(r.report_date)}</td>
                                    <td>${r.progress_status ? hubBadge(r.progress_status, PROGRESS_STATUSES) : '—'}</td>
                                    <td>${r.staff_count || 0}</td>
                                    <td>${r.subcontractor_count || 0} (${r.subcontractor_workers || 0} workers)</td>
                                </tr>
                            `).join('') : '<tr><td colspan="4" class="empty-row">No daily reports found</td></tr>'}</tbody>
                        </table>
                    `;
                } else {
                    content.innerHTML = `
                        <table class="app-table">
                            <thead><tr>
                                <th>Description</th>
                                <th>Location</th>
                                <th>Priority</th>
                                <th>Status</th>
                                <th>Created</th>
                            </tr></thead>
                            <tbody>${snags.length > 0 ? snags.map(s => `
                                <tr class="clickable-row" data-id="${s.id}" data-type="snag">
                                    <td>${s.description ? (s.description.length > 40 ? s.description.substring(0, 40) + '...' : s.description) : '—'}</td>
                                    <td>${s.location || '—'}</td>
                                    <td>${s.priority ? hubBadge(s.priority, SNAG_PRIORITIES) : '—'}</td>
                                    <td>${hubBadge(s.status, SNAG_STATUSES)}</td>
                                    <td>${Utils.formatRelativeDate(s.created_at)}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="5" class="empty-row">No snags found</td></tr>'}</tbody>
                        </table>
                    `;
                }

                content.querySelectorAll('.clickable-row').forEach(row => {
                    row.addEventListener('click', () => {
                        if (row.dataset.type === 'report') loadReportDetail(win, row.dataset.id, project, allProjects);
                        else loadSnagDetail(win, row.dataset.id, project, allProjects);
                    });
                });
            }

            renderSitework();
        } catch (err) {
            body.innerHTML = `<div class="app-error">Failed to load site work: ${err.message}</div>`;
        }
    }

    /* ══════════════════════════════════════════════
       SUB-SECTION DETAIL VIEWS
       ══════════════════════════════════════════════ */

    /* ── Quote Detail ── */
    async function loadQuoteDetail(win, quoteId, project, allProjects) {
        const body = win.querySelector('.app-container');
        body.innerHTML = `<div class="app-loading">Loading quote...</div>`;

        try {
            const [boqRes, itemsRes, catsRes] = await Promise.all([
                SupabaseClient.from('boq').select('*').eq('id', quoteId).single(),
                SupabaseClient.from('boq_items').select('*').eq('boq_id', quoteId).order('sort_order'),
                SupabaseClient.from('boq_categories').select('*').eq('boq_id', quoteId).order('sort_order'),
            ]);
            if (boqRes.error) throw boqRes.error;

            const q = boqRes.data;
            const items = itemsRes.data || [];
            const cats = catsRes.data || [];
            const catMap = {};
            cats.forEach(c => catMap[c.id] = c.name);

            const statusOptions = Object.keys(QUOTE_STATUSES)
                .filter(s => s !== q.status)
                .map(s => `<option value="${s}">${QUOTE_STATUSES[s].label}</option>`)
                .join('');

            body.innerHTML = `
                <div class="detail-view">
                    <div class="detail-header">
                        <button class="back-btn" id="sub-back">← Quotes</button>
                        <h2>${q.reference || 'Quote'}</h2>
                        <div class="status-advance">
                            ${hubBadge(q.status, QUOTE_STATUSES)}
                            <select id="sub-status-select">${statusOptions}</select>
                            <button id="sub-status-go">Update</button>
                        </div>
                    </div>
                    <div class="boq-detail-body">
                        <div class="boq-meta">
                            <div class="boq-meta-item"><span class="field-label">Total Cost</span><span class="field-value">${Utils.formatCurrency(q.total_cost)}</span></div>
                            <div class="boq-meta-item"><span class="field-label">Client Price</span><span class="field-value strong">${Utils.formatCurrency(q.client_price)}</span></div>
                            <div class="boq-meta-item"><span class="field-label">Margin</span><span class="field-value">${q.margin_percent != null ? q.margin_percent.toFixed(1) + '%' : '—'}</span></div>
                            <div class="boq-meta-item"><span class="field-label">Version</span><span class="field-value">${q.version || '—'}</span></div>
                            <div class="boq-meta-item"><span class="field-label">Created</span><span class="field-value">${Utils.formatDate(q.created_at)}</span></div>
                        </div>
                        <div class="app-table-wrap">
                            <table class="app-table">
                                <thead><tr>
                                    <th>Category</th>
                                    <th>Description</th>
                                    <th>Qty</th>
                                    <th>Unit</th>
                                    <th>Unit Cost</th>
                                    <th>Cost</th>
                                    <th>Price</th>
                                </tr></thead>
                                <tbody>${items.length > 0 ? items.map(it => `
                                    <tr>
                                        <td>${catMap[it.category_id] || '—'}</td>
                                        <td>${it.description || '—'}</td>
                                        <td>${it.quantity != null ? it.quantity : '—'}</td>
                                        <td>${it.unit || '—'}</td>
                                        <td>${Utils.formatCurrencyShort(it.unit_cost)}</td>
                                        <td>${Utils.formatCurrencyShort(it.cost)}</td>
                                        <td>${Utils.formatCurrencyShort(it.price)}</td>
                                    </tr>
                                `).join('') : '<tr><td colspan="7" class="empty-row">No line items</td></tr>'}</tbody>
                                <tfoot><tr>
                                    <td colspan="5"></td>
                                    <td class="strong">${Utils.formatCurrencyShort(q.total_cost)}</td>
                                    <td class="strong">${Utils.formatCurrencyShort(q.client_price)}</td>
                                </tr></tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            `;

            body.querySelector('#sub-back').addEventListener('click', () => loadProjectQuotes(win, project, allProjects));
            body.querySelector('#sub-status-go').addEventListener('click', async () => {
                const newStatus = body.querySelector('#sub-status-select').value;
                const btn = body.querySelector('#sub-status-go');
                btn.disabled = true; btn.textContent = '...';
                try {
                    const { error } = await SupabaseClient.from('boq').update({ status: newStatus }).eq('id', quoteId);
                    if (error) throw error;
                    loadQuoteDetail(win, quoteId, project, allProjects);
                } catch (e) { btn.textContent = 'Error'; btn.disabled = false; }
            });
        } catch (err) {
            body.innerHTML = `<div class="app-error">Failed to load quote: ${err.message}</div>`;
        }
    }

    /* ── Invoice Detail ── */
    async function loadInvoiceDetail(win, invoiceId, project, allProjects) {
        const body = win.querySelector('.app-container');
        body.innerHTML = `<div class="app-loading">Loading invoice...</div>`;

        try {
            const [invRes, payRes] = await Promise.all([
                SupabaseClient.from('invoices').select('*').eq('id', invoiceId).single(),
                SupabaseClient.from('payments').select('*').eq('invoice_id', invoiceId).order('payment_date', { ascending: false }),
            ]);
            if (invRes.error) throw invRes.error;

            const inv = invRes.data;
            const payments = payRes.data || [];
            const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
            const balance = (inv.amount || 0) - totalPaid;

            const statusOptions = Object.keys(INV_STATUSES)
                .filter(s => s !== inv.status)
                .map(s => `<option value="${s}">${INV_STATUSES[s].label}</option>`)
                .join('');

            body.innerHTML = `
                <div class="detail-view">
                    <div class="detail-header">
                        <button class="back-btn" id="sub-back">← Invoices</button>
                        <h2>${inv.reference || 'Invoice'}</h2>
                        <div class="status-advance">
                            ${hubBadge(inv.status, INV_STATUSES)}
                            <select id="sub-status-select">${statusOptions}</select>
                            <button id="sub-status-go">Update</button>
                        </div>
                    </div>
                    <div class="boq-detail-body">
                        <div class="boq-meta">
                            <div class="boq-meta-item"><span class="field-label">Type</span><span class="field-value">${INV_TYPES[inv.invoice_type] || inv.invoice_type || '—'}</span></div>
                            <div class="boq-meta-item"><span class="field-label">Amount</span><span class="field-value strong">${Utils.formatCurrency(inv.amount)}</span></div>
                            <div class="boq-meta-item"><span class="field-label">Paid</span><span class="field-value">${Utils.formatCurrency(totalPaid)}</span></div>
                            <div class="boq-meta-item"><span class="field-label">Balance</span><span class="field-value ${balance > 0 ? 'warning-text' : ''}">${Utils.formatCurrency(balance)}</span></div>
                            <div class="boq-meta-item"><span class="field-label">Due Date</span><span class="field-value">${Utils.formatDate(inv.due_date)}</span></div>
                            <div class="boq-meta-item"><span class="field-label">Issued</span><span class="field-value">${Utils.formatDate(inv.issued_date)}</span></div>
                        </div>
                        ${inv.description ? `<div class="boq-notes">${inv.description}</div>` : ''}
                        <div class="boq-items-header"><h3>Payments</h3></div>
                        <div class="app-table-wrap inv-payments-area">
                            <table class="app-table">
                                <thead><tr>
                                    <th>Date</th>
                                    <th>Amount</th>
                                    <th>Method</th>
                                    <th>Reference</th>
                                    <th>Notes</th>
                                </tr></thead>
                                <tbody>${payments.length > 0 ? payments.map(p => `
                                    <tr>
                                        <td>${Utils.formatDate(p.payment_date)}</td>
                                        <td class="strong">${Utils.formatCurrency(p.amount)}</td>
                                        <td>${p.method || '—'}</td>
                                        <td>${p.reference || '—'}</td>
                                        <td>${p.notes || '—'}</td>
                                    </tr>
                                `).join('') : '<tr><td colspan="5" class="empty-row">No payments recorded</td></tr>'}</tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;

            body.querySelector('#sub-back').addEventListener('click', () => loadProjectInvoices(win, project, allProjects));
            body.querySelector('#sub-status-go').addEventListener('click', async () => {
                const newStatus = body.querySelector('#sub-status-select').value;
                const btn = body.querySelector('#sub-status-go');
                btn.disabled = true; btn.textContent = '...';
                try {
                    const { error } = await SupabaseClient.from('invoices').update({ status: newStatus }).eq('id', invoiceId);
                    if (error) throw error;
                    loadInvoiceDetail(win, invoiceId, project, allProjects);
                } catch (e) { btn.textContent = 'Error'; btn.disabled = false; }
            });
        } catch (err) {
            body.innerHTML = `<div class="app-error">Failed to load invoice: ${err.message}</div>`;
        }
    }

    /* ── Variation Detail ── */
    async function loadVariationDetail(win, variationId, project, allProjects) {
        const body = win.querySelector('.app-container');
        body.innerHTML = `<div class="app-loading">Loading variation...</div>`;

        try {
            const { data: v, error } = await SupabaseClient.from('variations').select('*').eq('id', variationId).single();
            if (error) throw error;

            const statusOptions = Object.keys(VAR_STATUSES)
                .filter(s => s !== v.status)
                .map(s => `<option value="${s}">${VAR_STATUSES[s].label}</option>`)
                .join('');

            body.innerHTML = `
                <div class="detail-view">
                    <div class="detail-header">
                        <button class="back-btn" id="sub-back">← Variations</button>
                        <h2>${v.reference || 'Variation'}</h2>
                        <div class="status-advance">
                            ${hubBadge(v.status, VAR_STATUSES)}
                            <select id="sub-status-select">${statusOptions}</select>
                            <button id="sub-status-go">Update</button>
                        </div>
                    </div>
                    <div class="boq-detail-body">
                        <div class="boq-meta">
                            <div class="boq-meta-item"><span class="field-label">Cost</span><span class="field-value">${Utils.formatCurrency(v.cost)}</span></div>
                            <div class="boq-meta-item"><span class="field-label">Price</span><span class="field-value strong">${Utils.formatCurrency(v.price)}</span></div>
                            <div class="boq-meta-item"><span class="field-label">Requested By</span><span class="field-value">${v.requested_by || '—'}</span></div>
                            <div class="boq-meta-item"><span class="field-label">Request Date</span><span class="field-value">${Utils.formatDate(v.request_date)}</span></div>
                            <div class="boq-meta-item"><span class="field-label">Work Status</span><span class="field-value">${v.work_status || '—'}</span></div>
                            <div class="boq-meta-item"><span class="field-label">Payment</span><span class="field-value">${v.payment_status || '—'}</span></div>
                        </div>
                        ${v.description ? `<div class="boq-notes"><strong>Description:</strong> ${v.description}</div>` : ''}
                        ${v.request_notes ? `<div class="boq-notes"><strong>Notes:</strong> ${v.request_notes}</div>` : ''}
                    </div>
                </div>
            `;

            body.querySelector('#sub-back').addEventListener('click', () => loadProjectVariations(win, project, allProjects));
            body.querySelector('#sub-status-go').addEventListener('click', async () => {
                const newStatus = body.querySelector('#sub-status-select').value;
                const btn = body.querySelector('#sub-status-go');
                btn.disabled = true; btn.textContent = '...';
                try {
                    const { error } = await SupabaseClient.from('variations').update({ status: newStatus }).eq('id', variationId);
                    if (error) throw error;
                    loadVariationDetail(win, variationId, project, allProjects);
                } catch (e) { btn.textContent = 'Error'; btn.disabled = false; }
            });
        } catch (err) {
            body.innerHTML = `<div class="app-error">Failed to load variation: ${err.message}</div>`;
        }
    }

    /* ── Phase Detail ── */
    async function loadPhaseDetail(win, phaseId, project, allProjects) {
        const body = win.querySelector('.app-container');
        body.innerHTML = `<div class="app-loading">Loading phase...</div>`;

        try {
            const { data: ph, error } = await SupabaseClient.from('schedule_phases')
                .select('*, tasks:schedule_tasks(*)')
                .eq('id', phaseId).single();
            if (error) throw error;

            const tasks = ph.tasks || [];
            const done = tasks.filter(t => t.status === 'completed').length;

            const statusOptions = Object.keys(PHASE_STATUSES)
                .filter(s => s !== ph.status)
                .map(s => `<option value="${s}">${PHASE_STATUSES[s].label}</option>`)
                .join('');

            body.innerHTML = `
                <div class="detail-view">
                    <div class="detail-header">
                        <button class="back-btn" id="sub-back">← Schedule</button>
                        <h2>${ph.name || 'Phase'}</h2>
                        <div class="status-advance">
                            ${hubBadge(ph.status, PHASE_STATUSES)}
                            <select id="sub-status-select">${statusOptions}</select>
                            <button id="sub-status-go">Update</button>
                        </div>
                        <button class="btn-edit" id="sched-edit-btn">Edit Phase</button>
                    </div>
                    <div class="detail-grid">
                        <div class="detail-section">
                            <h4>Phase Details</h4>
                            <div class="detail-fields">
                                <div class="field"><span class="field-label">Start Date</span><span class="field-value">${Utils.formatDate(ph.start_date)}</span></div>
                                <div class="field"><span class="field-label">End Date</span><span class="field-value">${Utils.formatDate(ph.end_date)}</span></div>
                                <div class="field"><span class="field-label">Tasks</span><span class="field-value">${done} / ${tasks.length} completed</span></div>
                            </div>
                        </div>
                        <div class="detail-section" style="grid-column:1/-1">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                                <h4>Tasks</h4>
                                <button class="import-btn" id="sched-add-task">+ Add Task</button>
                            </div>
                            <div class="app-table-wrap">
                                <table class="app-table">
                                    <thead><tr>
                                        <th>Task</th>
                                        <th>Due Date</th>
                                        <th>Status</th>
                                        <th></th>
                                    </tr></thead>
                                    <tbody>
                                        ${tasks.length > 0 ? tasks.map(t => `
                                            <tr>
                                                <td class="strong">${t.name || '—'}</td>
                                                <td>${Utils.formatDate(t.due_date)}</td>
                                                <td>${hubBadge(t.status, TASK_STATUSES)}</td>
                                                <td>
                                                    <button class="btn-edit task-edit-btn" data-id="${t.id}" title="Edit">✎</button>
                                                    <button class="btn-edit task-del-btn" data-id="${t.id}" title="Delete">✕</button>
                                                </td>
                                            </tr>
                                        `).join('') : '<tr><td colspan="4" class="empty-row">No tasks — click "+ Add Task"</td></tr>'}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            body.querySelector('#sub-back').addEventListener('click', () => loadProjectSchedule(win, project, allProjects));
            body.querySelector('#sched-edit-btn').addEventListener('click', () => showProjectPhaseForm(win, ph, project, allProjects));
            body.querySelector('#sched-add-task').addEventListener('click', () => showProjectTaskForm(win, ph, null, project, allProjects));

            body.querySelector('#sub-status-go').addEventListener('click', async () => {
                const newStatus = body.querySelector('#sub-status-select').value;
                const btn = body.querySelector('#sub-status-go');
                btn.disabled = true; btn.textContent = '...';
                try {
                    const { error } = await SupabaseClient.from('schedule_phases').update({ status: newStatus }).eq('id', phaseId);
                    if (error) throw error;
                    loadPhaseDetail(win, phaseId, project, allProjects);
                } catch (e) { btn.textContent = 'Error'; btn.disabled = false; }
            });

            body.querySelectorAll('.task-edit-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const task = tasks.find(t => t.id === btn.dataset.id);
                    if (task) showProjectTaskForm(win, ph, task, project, allProjects);
                });
            });

            body.querySelectorAll('.task-del-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (!confirm('Delete this task?')) return;
                    try {
                        const { error } = await SupabaseClient.from('schedule_tasks').delete().eq('id', btn.dataset.id);
                        if (error) throw error;
                        loadPhaseDetail(win, phaseId, project, allProjects);
                    } catch (err) { alert('Error: ' + err.message); }
                });
            });
        } catch (err) {
            body.innerHTML = `<div class="app-error">Failed to load phase: ${err.message}</div>`;
        }
    }

    /* ── Project Phase Form (New / Edit) ── */
    async function showProjectPhaseForm(win, existing, project, allProjects) {
        const body = win.querySelector('.app-container');
        const isEdit = !!existing;
        const p = existing || {};

        body.innerHTML = `
            <div class="form-view">
                <div class="form-header">
                    <button class="back-btn" id="sched-form-back">← Back</button>
                    <h2>${isEdit ? 'Edit Phase' : 'New Phase'}</h2>
                </div>
                <div class="form-body">
                    <div class="form-section">
                        <div class="form-grid">
                            <div class="form-group full">
                                <label>Phase Name *</label>
                                <input type="text" id="f-name" value="${p.name || ''}" placeholder="e.g. Demolition, Structural, MEP">
                            </div>
                            <div class="form-group">
                                <label>Status</label>
                                <select id="f-status">
                                    ${Object.entries(PHASE_STATUSES).map(([k, v]) => `<option value="${k}" ${k === (p.status || 'pending') ? 'selected' : ''}>${v.label}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Start Date</label>
                                <input type="date" id="f-start" value="${p.start_date || ''}">
                            </div>
                            <div class="form-group">
                                <label>End Date</label>
                                <input type="date" id="f-end" value="${p.end_date || ''}">
                            </div>
                        </div>
                    </div>
                    <div id="sched-form-error"></div>
                </div>
                <div class="form-actions">
                    <button class="back-btn" id="sched-form-cancel">Cancel</button>
                    <button class="btn-save" id="sched-form-save">${isEdit ? 'Save Changes' : 'Create Phase'}</button>
                </div>
            </div>
        `;

        const goBack = () => isEdit ? loadPhaseDetail(win, p.id, project, allProjects) : loadProjectSchedule(win, project, allProjects);
        body.querySelector('#sched-form-back').addEventListener('click', goBack);
        body.querySelector('#sched-form-cancel').addEventListener('click', goBack);

        body.querySelector('#sched-form-save').addEventListener('click', async () => {
            const btn = body.querySelector('#sched-form-save');
            const errEl = body.querySelector('#sched-form-error');
            errEl.innerHTML = '';

            const name = body.querySelector('#f-name').value.trim();
            if (!name) { errEl.innerHTML = '<div class="form-error">Name is required</div>'; return; }

            const record = {
                name,
                project_id: project.id,
                status: body.querySelector('#f-status').value,
                start_date: body.querySelector('#f-start').value || null,
                end_date: body.querySelector('#f-end').value || null,
            };

            btn.disabled = true; btn.textContent = 'Saving...';
            try {
                let result;
                if (isEdit) { result = await SupabaseClient.from('schedule_phases').update(record).eq('id', p.id); }
                else { result = await SupabaseClient.from('schedule_phases').insert(record); }
                if (result.error) throw result.error;
                await loadProjectSchedule(win, project, allProjects);
            } catch (err) {
                errEl.innerHTML = `<div class="form-error">Error: ${err.message}</div>`;
                btn.disabled = false; btn.textContent = isEdit ? 'Save Changes' : 'Create Phase';
            }
        });
    }

    /* ── Project Task Form (Add / Edit) ── */
    async function showProjectTaskForm(win, phase, existing, project, allProjects) {
        const body = win.querySelector('.app-container');
        const isEdit = !!existing;
        const t = existing || {};

        body.innerHTML = `
            <div class="form-view">
                <div class="form-header">
                    <button class="back-btn" id="task-form-back">← Back to Phase</button>
                    <h2>${isEdit ? 'Edit Task' : 'Add Task'} — ${phase.name || 'Phase'}</h2>
                </div>
                <div class="form-body">
                    <div class="form-section">
                        <div class="form-grid">
                            <div class="form-group full">
                                <label>Task Name *</label>
                                <input type="text" id="f-name" value="${t.name || ''}" placeholder="e.g. Install conduits">
                            </div>
                            <div class="form-group">
                                <label>Due Date</label>
                                <input type="date" id="f-due" value="${t.due_date || ''}">
                            </div>
                            <div class="form-group">
                                <label>Status</label>
                                <select id="f-status">
                                    ${Object.entries(TASK_STATUSES).map(([k, v]) => `<option value="${k}" ${k === (t.status || 'pending') ? 'selected' : ''}>${v.label}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div id="task-form-error"></div>
                </div>
                <div class="form-actions">
                    <button class="back-btn" id="task-form-cancel">Cancel</button>
                    <button class="btn-save" id="task-form-save">${isEdit ? 'Save Changes' : 'Add Task'}</button>
                </div>
            </div>
        `;

        const goBack = () => loadPhaseDetail(win, phase.id, project, allProjects);
        body.querySelector('#task-form-back').addEventListener('click', goBack);
        body.querySelector('#task-form-cancel').addEventListener('click', goBack);

        body.querySelector('#task-form-save').addEventListener('click', async () => {
            const btn = body.querySelector('#task-form-save');
            const errEl = body.querySelector('#task-form-error');
            errEl.innerHTML = '';

            const name = body.querySelector('#f-name').value.trim();
            if (!name) { errEl.innerHTML = '<div class="form-error">Name is required</div>'; return; }

            const record = {
                phase_id: phase.id,
                name,
                due_date: body.querySelector('#f-due').value || null,
                status: body.querySelector('#f-status').value,
            };

            btn.disabled = true; btn.textContent = 'Saving...';
            try {
                let result;
                if (isEdit) { result = await SupabaseClient.from('schedule_tasks').update(record).eq('id', t.id); }
                else { result = await SupabaseClient.from('schedule_tasks').insert(record); }
                if (result.error) throw result.error;
                await goBack();
            } catch (err) {
                errEl.innerHTML = `<div class="form-error">Error: ${err.message}</div>`;
                btn.disabled = false; btn.textContent = isEdit ? 'Save Changes' : 'Add Task';
            }
        });
    }

    /* ── Daily Report Detail ── */
    async function loadReportDetail(win, reportId, project, allProjects) {
        const body = win.querySelector('.app-container');
        body.innerHTML = `<div class="app-loading">Loading report...</div>`;

        try {
            const [repRes, staffRes, subRes] = await Promise.all([
                SupabaseClient.from('daily_reports').select('*').eq('id', reportId).single(),
                SupabaseClient.from('daily_report_staff').select('*').eq('daily_report_id', reportId),
                SupabaseClient.from('daily_report_subcontractors').select('*').eq('daily_report_id', reportId),
            ]);
            if (repRes.error) throw repRes.error;

            const r = repRes.data;
            const staff = staffRes.data || [];
            const subs = subRes.data || [];

            body.innerHTML = `
                <div class="detail-view">
                    <div class="detail-header">
                        <button class="back-btn" id="sub-back">← Site Work</button>
                        <h2>Report — ${Utils.formatDate(r.report_date)}</h2>
                        ${r.progress_status ? hubBadge(r.progress_status, PROGRESS_STATUSES) : ''}
                    </div>
                    <div class="boq-detail-body">
                        <div class="boq-meta">
                            <div class="boq-meta-item"><span class="field-label">Staff On Site</span><span class="field-value">${r.staff_count || 0}</span></div>
                            <div class="boq-meta-item"><span class="field-label">Subcontractors</span><span class="field-value">${r.subcontractor_count || 0}</span></div>
                            <div class="boq-meta-item"><span class="field-label">Sub Workers</span><span class="field-value">${r.subcontractor_workers || 0}</span></div>
                        </div>
                        ${r.notes ? `<div class="boq-notes">${r.notes}</div>` : ''}

                        ${staff.length > 0 ? `
                        <div class="boq-items-header"><h3>Staff</h3></div>
                        <div class="app-table-wrap">
                            <table class="app-table">
                                <thead><tr><th>Name</th><th>Present</th><th>Notes</th></tr></thead>
                                <tbody>${staff.map(s => `
                                    <tr>
                                        <td>${s.name || '—'}</td>
                                        <td>${s.present ? 'Yes' : 'No'}</td>
                                        <td>${s.notes || '—'}</td>
                                    </tr>
                                `).join('')}</tbody>
                            </table>
                        </div>` : ''}

                        ${subs.length > 0 ? `
                        <div class="boq-items-header"><h3>Subcontractors</h3></div>
                        <div class="app-table-wrap">
                            <table class="app-table">
                                <thead><tr><th>Company</th><th>Trade</th><th>Workers</th><th>Notes</th></tr></thead>
                                <tbody>${subs.map(s => `
                                    <tr>
                                        <td>${s.company_name || '—'}</td>
                                        <td>${s.trade || '—'}</td>
                                        <td>${s.workers_count || 0}</td>
                                        <td>${s.notes || '—'}</td>
                                    </tr>
                                `).join('')}</tbody>
                            </table>
                        </div>` : ''}
                    </div>
                </div>
            `;

            body.querySelector('#sub-back').addEventListener('click', () => loadProjectSitework(win, project, allProjects));
        } catch (err) {
            body.innerHTML = `<div class="app-error">Failed to load report: ${err.message}</div>`;
        }
    }

    /* ── Snag Detail ── */
    async function loadSnagDetail(win, snagId, project, allProjects) {
        const body = win.querySelector('.app-container');
        body.innerHTML = `<div class="app-loading">Loading snag...</div>`;

        try {
            const { data: s, error } = await SupabaseClient.from('snagging_items').select('*').eq('id', snagId).single();
            if (error) throw error;

            const statusOptions = Object.keys(SNAG_STATUSES)
                .filter(st => st !== s.status)
                .map(st => `<option value="${st}">${SNAG_STATUSES[st].label}</option>`)
                .join('');

            body.innerHTML = `
                <div class="detail-view">
                    <div class="detail-header">
                        <button class="back-btn" id="sub-back">← Site Work</button>
                        <h2>Snag Item</h2>
                        <div class="status-advance">
                            ${hubBadge(s.status, SNAG_STATUSES)}
                            <select id="sub-status-select">${statusOptions}</select>
                            <button id="sub-status-go">Update</button>
                        </div>
                    </div>
                    <div class="boq-detail-body">
                        <div class="boq-meta">
                            <div class="boq-meta-item"><span class="field-label">Priority</span><span class="field-value">${s.priority ? hubBadge(s.priority, SNAG_PRIORITIES) : '—'}</span></div>
                            <div class="boq-meta-item"><span class="field-label">Location</span><span class="field-value">${s.location || '—'}</span></div>
                            <div class="boq-meta-item"><span class="field-label">Created</span><span class="field-value">${Utils.formatDate(s.created_at)}</span></div>
                            ${s.resolved_at ? `<div class="boq-meta-item"><span class="field-label">Resolved</span><span class="field-value">${Utils.formatDate(s.resolved_at)}</span></div>` : ''}
                        </div>
                        ${s.description ? `<div class="boq-notes">${s.description}</div>` : ''}
                        ${s.photo_url ? `<div style="padding:16px"><img src="${s.photo_url}" style="max-width:100%;border-radius:var(--radius);border:1px solid var(--window-border)" alt="Snag photo"></div>` : ''}
                    </div>
                </div>
            `;

            body.querySelector('#sub-back').addEventListener('click', () => loadProjectSitework(win, project, allProjects));
            body.querySelector('#sub-status-go').addEventListener('click', async () => {
                const newStatus = body.querySelector('#sub-status-select').value;
                const btn = body.querySelector('#sub-status-go');
                btn.disabled = true; btn.textContent = '...';
                const updateData = { status: newStatus };
                if (newStatus === 'resolved') updateData.resolved_at = new Date().toISOString();
                try {
                    const { error } = await SupabaseClient.from('snagging_items').update(updateData).eq('id', snagId);
                    if (error) throw error;
                    loadSnagDetail(win, snagId, project, allProjects);
                } catch (e) { btn.textContent = 'Error'; btn.disabled = false; }
            });
        } catch (err) {
            body.innerHTML = `<div class="app-error">Failed to load snag: ${err.message}</div>`;
        }
    }

    /* ── Edit Form (unchanged) ── */
    async function showEditForm(win, project) {
        const body = win.querySelector('.app-container');
        const p = project;

        let clients = [];
        try {
            const { data } = await SupabaseClient.from('clients').select('id, name').order('name');
            clients = data || [];
        } catch (e) {}

        const healthOptions = ['', 'on_track', 'minor_delay', 'behind', 'blocked'];

        body.innerHTML = `
            <div class="form-view">
                <div class="form-header">
                    <button class="back-btn" id="proj-form-back">← Back</button>
                    <h2>Edit Project — ${p.reference || 'Untitled'}</h2>
                </div>
                <div class="form-body">
                    <div class="form-section">
                        <h4>General</h4>
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Reference</label>
                                <input type="text" id="f-reference" value="${p.reference || ''}">
                            </div>
                            <div class="form-group">
                                <label>Client</label>
                                <select id="f-client">
                                    <option value="">—</option>
                                    ${clients.map(c => `<option value="${c.id}" ${c.id === p.client_id ? 'selected' : ''}>${c.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Health</label>
                                <select id="f-health">
                                    ${healthOptions.map(h => `<option value="${h}" ${h === (p.health || '') ? 'selected' : ''}>${h ? Utils.HEALTH_LABELS[h] : '—'}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Property Type</label>
                                <select id="f-property-type">
                                    <option value="">—</option>
                                    ${['Villa', 'Apartment', 'Townhouse', 'Commercial', 'Other'].map(t => `<option ${t === p.property_type ? 'selected' : ''}>${t}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Community</label>
                                <input type="text" id="f-community" value="${p.community || ''}">
                            </div>
                            <div class="form-group">
                                <label>Address</label>
                                <input type="text" id="f-address" value="${p.address || ''}">
                            </div>
                            <div class="form-group">
                                <label>Source</label>
                                <select id="f-source">
                                    <option value="">—</option>
                                    ${['Referral', 'Website', 'Social Media', 'Walk-in', 'Repeat Client', 'Other'].map(s => `<option ${s === p.source ? 'selected' : ''}>${s}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="form-section">
                        <h4>Financials</h4>
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Contract Value (AED)</label>
                                <input type="number" id="f-contract-value" value="${p.contract_value || ''}">
                            </div>
                            <div class="form-group">
                                <label>Variation Total (AED)</label>
                                <input type="number" id="f-variation-total" value="${p.variation_total || ''}">
                            </div>
                            <div class="form-group">
                                <label>Total Invoiced (AED)</label>
                                <input type="number" id="f-invoiced" value="${p.total_invoiced || ''}">
                            </div>
                            <div class="form-group">
                                <label>Total Paid (AED)</label>
                                <input type="number" id="f-paid" value="${p.total_paid || ''}">
                            </div>
                        </div>
                    </div>
                    <div class="form-section">
                        <h4>Key Dates</h4>
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Enquiry Date</label>
                                <input type="date" id="f-enquiry-date" value="${p.enquiry_date || ''}">
                            </div>
                            <div class="form-group">
                                <label>Site Visit</label>
                                <input type="date" id="f-visit-date" value="${p.site_visit_date || ''}">
                            </div>
                            <div class="form-group">
                                <label>Quote Sent</label>
                                <input type="date" id="f-quote-date" value="${p.quote_sent_date || ''}">
                            </div>
                            <div class="form-group">
                                <label>Accepted</label>
                                <input type="date" id="f-accepted-date" value="${p.accepted_date || ''}">
                            </div>
                            <div class="form-group">
                                <label>Start Date</label>
                                <input type="date" id="f-start-date" value="${p.start_date || ''}">
                            </div>
                            <div class="form-group">
                                <label>Due Date</label>
                                <input type="date" id="f-due-date" value="${p.due_date || ''}">
                            </div>
                            <div class="form-group">
                                <label>Completed</label>
                                <input type="date" id="f-completed-date" value="${p.completed_date || ''}">
                            </div>
                        </div>
                    </div>
                    <div class="form-section">
                        <h4>Details</h4>
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Has Design?</label>
                                <select id="f-design">
                                    <option value="">—</option>
                                    ${['Yes', 'No', 'Partial'].map(v => `<option ${v === p.has_design ? 'selected' : ''}>${v}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Has Drawings?</label>
                                <select id="f-drawings">
                                    <option value="">—</option>
                                    ${['Yes', 'No', 'Partial'].map(v => `<option ${v === p.has_drawings ? 'selected' : ''}>${v}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group full">
                                <label>Scope Summary</label>
                                <textarea id="f-scope">${p.scope_summary || ''}</textarea>
                            </div>
                            <div class="form-group full">
                                <label>Notes</label>
                                <textarea id="f-notes">${p.notes || ''}</textarea>
                            </div>
                        </div>
                    </div>
                    <div id="proj-form-error"></div>
                </div>
                <div class="form-actions">
                    <button class="back-btn" id="proj-form-cancel">Cancel</button>
                    <button class="btn-save" id="proj-form-save">Save Changes</button>
                </div>
            </div>
        `;

        const goBack = () => loadList(win);
        body.querySelector('#proj-form-back').addEventListener('click', goBack);
        body.querySelector('#proj-form-cancel').addEventListener('click', goBack);

        body.querySelector('#proj-form-save').addEventListener('click', async () => {
            const btn = body.querySelector('#proj-form-save');
            const errEl = body.querySelector('#proj-form-error');
            errEl.innerHTML = '';

            const numOrNull = (v) => v === '' ? null : parseFloat(v);

            const record = {
                reference: body.querySelector('#f-reference').value.trim() || null,
                client_id: body.querySelector('#f-client').value || null,
                health: body.querySelector('#f-health').value || null,
                property_type: body.querySelector('#f-property-type').value || null,
                community: body.querySelector('#f-community').value.trim() || null,
                address: body.querySelector('#f-address').value.trim() || null,
                source: body.querySelector('#f-source').value || null,
                contract_value: numOrNull(body.querySelector('#f-contract-value').value),
                variation_total: numOrNull(body.querySelector('#f-variation-total').value),
                total_invoiced: numOrNull(body.querySelector('#f-invoiced').value),
                total_paid: numOrNull(body.querySelector('#f-paid').value),
                enquiry_date: body.querySelector('#f-enquiry-date').value || null,
                site_visit_date: body.querySelector('#f-visit-date').value || null,
                quote_sent_date: body.querySelector('#f-quote-date').value || null,
                accepted_date: body.querySelector('#f-accepted-date').value || null,
                start_date: body.querySelector('#f-start-date').value || null,
                due_date: body.querySelector('#f-due-date').value || null,
                completed_date: body.querySelector('#f-completed-date').value || null,
                has_design: body.querySelector('#f-design').value || null,
                has_drawings: body.querySelector('#f-drawings').value || null,
                scope_summary: body.querySelector('#f-scope').value.trim() || null,
                notes: body.querySelector('#f-notes').value.trim() || null,
            };

            btn.disabled = true;
            btn.textContent = 'Saving...';

            try {
                const { error } = await SupabaseClient.from('projects')
                    .update(record)
                    .eq('id', p.id);
                if (error) throw error;
                await loadList(win);
            } catch (err) {
                errEl.innerHTML = `<div class="form-error">Error: ${err.message}</div>`;
                btn.disabled = false;
                btn.textContent = 'Save Changes';
            }
        });
    }

    return { id: 'projects', name: 'Projects', icon: ICON, launch };
})();
