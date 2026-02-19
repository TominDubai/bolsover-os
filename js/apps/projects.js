/* ===== Projects App ===== */
const ProjectsApp = (() => {
    const ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`;

    let currentWin = null;

    async function launch() {
        const html = `
            <div class="app-container projects">
                <div class="app-loading">Loading projects...</div>
            </div>
        `;

        WindowManager.createWindow('projects', 'Projects', html, {
            width: 920, height: 600,
            onReady: async (win) => {
                currentWin = win;
                await loadList(win);
            }
        });
    }

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

    async function loadDetail(win, projectId, allProjects) {
        const body = win.querySelector('.app-container');
        const project = allProjects.find(p => p.id === projectId);
        if (!project) return;

        const outstanding = (project.total_invoiced || 0) - (project.total_paid || 0);
        const totalWithVariations = (project.contract_value || 0) + (project.variation_total || 0);

        body.innerHTML = `
            <div class="detail-view">
                <div class="detail-header">
                    <button class="back-btn" id="proj-back">← Back to Projects</button>
                    <h2>${project.reference || 'Project'} ${Utils.healthBadge(project.health)}</h2>
                    <div class="detail-status">${Utils.statusBadge(project.status)}</div>
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
            </div>
        `;

        body.querySelector('#proj-back').addEventListener('click', () => loadList(win));
    }

    return { id: 'projects', name: 'Projects', icon: ICON, launch };
})();
