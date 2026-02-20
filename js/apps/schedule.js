/* ===== Schedule App ===== */
const ScheduleApp = (() => {
    const ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;

    const PHASE_STATUSES = {
        pending: { label: 'Pending', bg: '#f3f4f6', text: '#374151' },
        in_progress: { label: 'In Progress', bg: '#dbeafe', text: '#1e40af' },
        completed: { label: 'Completed', bg: '#dcfce7', text: '#166534' },
        delayed: { label: 'Delayed', bg: '#fee2e2', text: '#991b1b' },
        on_hold: { label: 'On Hold', bg: '#fef3c7', text: '#92400e' },
    };

    const TASK_STATUSES = {
        pending: { label: 'Pending', bg: '#f3f4f6', text: '#374151' },
        in_progress: { label: 'In Progress', bg: '#dbeafe', text: '#1e40af' },
        completed: { label: 'Completed', bg: '#dcfce7', text: '#166534' },
        delayed: { label: 'Delayed', bg: '#fee2e2', text: '#991b1b' },
        on_hold: { label: 'On Hold', bg: '#fef3c7', text: '#92400e' },
    };

    function statusBadge(status, map) {
        const s = (map || TASK_STATUSES)[status] || TASK_STATUSES.pending;
        return `<span class="status-badge" style="background:${s.bg};color:${s.text}">${s.label}</span>`;
    }

    async function launch() {
        const html = `<div class="app-container schedule"><div class="app-loading">Loading schedule...</div></div>`;
        WindowManager.createWindow('schedule', 'Schedule', html, {
            width: 960, height: 600,
            onReady: async (win) => { await loadList(win); }
        });
    }

    async function loadList(win) {
        const body = win.querySelector('.app-container');
        try {
            const [phasesRes, projectsRes] = await Promise.all([
                SupabaseClient.from('schedule_phases')
                    .select('*, project:projects(reference), tasks:schedule_tasks(*)')
                    .order('sort_order', { ascending: true }),
                SupabaseClient.from('projects').select('id, reference').order('reference'),
            ]);

            if (phasesRes.error) throw phasesRes.error;
            const allPhases = phasesRes.data || [];
            const projects = projectsRes.data || [];

            const totalTasks = allPhases.reduce((s, p) => s + (p.tasks || []).length, 0);
            const inProgress = allPhases.filter(p => p.status === 'in_progress').length;
            const delayed = allPhases.filter(p => p.status === 'delayed').length;
            const completedPhases = allPhases.filter(p => p.status === 'completed').length;

            body.innerHTML = `
                <div class="dash-stats compact">
                    <div class="stat-card small"><div class="stat-label">Phases</div><div class="stat-value">${allPhases.length}</div></div>
                    <div class="stat-card small"><div class="stat-label">In Progress</div><div class="stat-value">${inProgress}</div></div>
                    <div class="stat-card small ${delayed > 0 ? 'accent' : ''}"><div class="stat-label">Delayed</div><div class="stat-value">${delayed}</div></div>
                    <div class="stat-card small"><div class="stat-label">Completed</div><div class="stat-value">${completedPhases}</div></div>
                </div>
                <div class="app-toolbar">
                    <input type="text" class="app-search" placeholder="Search phases..." id="sched-search">
                    <select class="app-filter" id="sched-proj-filter">
                        <option value="all">All Projects</option>
                        ${projects.map(p => `<option value="${p.id}">${p.reference || 'Untitled'}</option>`).join('')}
                    </select>
                    <select class="app-filter" id="sched-status-filter">
                        <option value="all">All Statuses</option>
                        ${Object.entries(PHASE_STATUSES).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}
                    </select>
                    <button class="import-btn" id="sched-new-btn">+ New Phase</button>
                    <button class="btn-edit" id="sched-timeline-btn">Timeline View</button>
                </div>
                <div id="sched-content"></div>
            `;

            const search = body.querySelector('#sched-search');
            const projFilter = body.querySelector('#sched-proj-filter');
            const statusFilter = body.querySelector('#sched-status-filter');

            body.querySelector('#sched-new-btn').addEventListener('click', () => showPhaseForm(win, null, projects));

            let showingTimeline = false;
            body.querySelector('#sched-timeline-btn').addEventListener('click', () => {
                showingTimeline = !showingTimeline;
                body.querySelector('#sched-timeline-btn').textContent = showingTimeline ? 'Table View' : 'Timeline View';
                applyFilters();
            });

            function render(list) {
                const contentEl = body.querySelector('#sched-content');
                if (showingTimeline) {
                    renderTimeline(contentEl, list);
                    return;
                }

                contentEl.innerHTML = `
                    <div class="app-table-wrap">
                        <table class="app-table">
                            <thead><tr>
                                <th>Phase</th>
                                <th>Project</th>
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
                            <td>${p.project?.reference || '—'}</td>
                            <td>${Utils.formatDate(p.start_date)}</td>
                            <td>${Utils.formatDate(p.end_date)}</td>
                            <td>${doneCount}/${taskCount}</td>
                            <td>${statusBadge(p.status, PHASE_STATUSES)}</td>
                        </tr>
                    `;
                }).join('') : '<tr><td colspan="6" class="empty-row">No phases scheduled</td></tr>';

                tb.querySelectorAll('.clickable-row').forEach(row => {
                    row.addEventListener('click', () => {
                        const phase = allPhases.find(p => p.id === row.dataset.id);
                        if (phase) showPhaseDetail(win, phase, projects);
                    });
                });
            }

            function renderTimeline(container, list) {
                if (list.length === 0) {
                    container.innerHTML = '<div class="empty-state">No phases to display</div>';
                    return;
                }
                const dates = list.flatMap(p => [p.start_date, p.end_date].filter(Boolean)).map(d => new Date(d));
                if (dates.length === 0) {
                    container.innerHTML = '<div class="empty-state">No dates set on phases</div>';
                    return;
                }
                const minDate = new Date(Math.min(...dates));
                const maxDate = new Date(Math.max(...dates));
                const totalDays = Math.max(1, Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1);

                const weeks = [];
                const d = new Date(minDate);
                while (d <= maxDate) {
                    weeks.push(new Date(d));
                    d.setDate(d.getDate() + 7);
                }

                container.innerHTML = `
                    <div class="timeline-wrap">
                        <div class="timeline-header">
                            <div class="timeline-label-col">Phase</div>
                            <div class="timeline-bars-col">
                                <div class="timeline-weeks">
                                    ${weeks.map(w => `<div class="timeline-week">${w.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>`).join('')}
                                </div>
                            </div>
                        </div>
                        <div class="timeline-body">
                            ${list.map(p => {
                                const start = p.start_date ? new Date(p.start_date) : minDate;
                                const end = p.end_date ? new Date(p.end_date) : start;
                                const leftPct = ((start - minDate) / (1000 * 60 * 60 * 24)) / totalDays * 100;
                                const widthPct = Math.max(1, ((end - start) / (1000 * 60 * 60 * 24) + 1) / totalDays * 100);
                                const colors = PHASE_STATUSES[p.status] || PHASE_STATUSES.pending;
                                return `
                                    <div class="timeline-row">
                                        <div class="timeline-label-col">
                                            <div class="timeline-task-name">${p.name || '—'}</div>
                                            <div class="timeline-task-sub">${p.project?.reference || ''}</div>
                                        </div>
                                        <div class="timeline-bars-col">
                                            <div class="timeline-bar" style="left:${leftPct}%;width:${widthPct}%;background:${colors.bg};color:${colors.text}" title="${p.name}: ${Utils.formatDate(p.start_date)} — ${Utils.formatDate(p.end_date)}">
                                                ${(p.tasks || []).filter(t => t.status === 'completed').length}/${(p.tasks || []).length}
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }

            function applyFilters() {
                const q = search.value.toLowerCase();
                const pf = projFilter.value;
                const sf = statusFilter.value;
                let filtered = allPhases;
                if (q) filtered = filtered.filter(p => (p.name || '').toLowerCase().includes(q) || (p.project?.reference || '').toLowerCase().includes(q));
                if (pf !== 'all') filtered = filtered.filter(p => p.project_id === pf);
                if (sf !== 'all') filtered = filtered.filter(p => p.status === sf);
                render(filtered);
            }

            search.addEventListener('input', applyFilters);
            projFilter.addEventListener('change', applyFilters);
            statusFilter.addEventListener('change', applyFilters);
            render(allPhases);
        } catch (err) {
            body.innerHTML = `<div class="app-error">Failed to load schedule: ${err.message}</div>`;
        }
    }

    async function showPhaseDetail(win, phase, projects) {
        const body = win.querySelector('.app-container');
        const tasks = phase.tasks || [];
        const statusOpts = Object.entries(PHASE_STATUSES).filter(([k]) => k !== phase.status).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');

        body.innerHTML = `
            <div class="detail-view">
                <div class="detail-header">
                    <button class="back-btn" id="sched-back">← Back</button>
                    <h2>${phase.name || 'Phase'}</h2>
                    <div class="status-advance">
                        ${statusBadge(phase.status, PHASE_STATUSES)}
                        <select id="sched-status-sel">${statusOpts}</select>
                        <button id="sched-status-go">Update</button>
                    </div>
                    <button class="btn-edit" id="sched-edit-btn">Edit Phase</button>
                </div>
                <div class="detail-grid">
                    <div class="detail-section">
                        <h4>Phase Details</h4>
                        <div class="detail-fields">
                            <div class="field"><span class="field-label">Project</span><span class="field-value">${phase.project?.reference || '—'}</span></div>
                            <div class="field"><span class="field-label">Start Date</span><span class="field-value">${Utils.formatDate(phase.start_date)}</span></div>
                            <div class="field"><span class="field-label">End Date</span><span class="field-value">${Utils.formatDate(phase.end_date)}</span></div>
                            <div class="field"><span class="field-label">Tasks</span><span class="field-value">${tasks.filter(t => t.status === 'completed').length} / ${tasks.length} completed</span></div>
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
                                            <td>${statusBadge(t.status)}</td>
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

        body.querySelector('#sched-back').addEventListener('click', () => loadList(win));
        body.querySelector('#sched-edit-btn').addEventListener('click', () => showPhaseForm(win, phase, projects));
        body.querySelector('#sched-add-task').addEventListener('click', () => showTaskForm(win, phase, null));

        body.querySelector('#sched-status-go').addEventListener('click', async () => {
            const btn = body.querySelector('#sched-status-go');
            btn.disabled = true; btn.textContent = '...';
            try {
                const { error } = await SupabaseClient.from('schedule_phases')
                    .update({ status: body.querySelector('#sched-status-sel').value })
                    .eq('id', phase.id);
                if (error) throw error;
                await reloadPhaseDetail(win, phase.id, projects);
            } catch (err) { btn.textContent = 'Error'; btn.disabled = false; }
        });

        body.querySelectorAll('.task-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const task = tasks.find(t => t.id === btn.dataset.id);
                if (task) showTaskForm(win, phase, task);
            });
        });

        body.querySelectorAll('.task-del-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!confirm('Delete this task?')) return;
                try {
                    const { error } = await SupabaseClient.from('schedule_tasks').delete().eq('id', btn.dataset.id);
                    if (error) throw error;
                    await reloadPhaseDetail(win, phase.id, projects);
                } catch (err) { alert('Error: ' + err.message); }
            });
        });
    }

    async function reloadPhaseDetail(win, phaseId, projects) {
        const { data } = await SupabaseClient.from('schedule_phases')
            .select('*, project:projects(reference), tasks:schedule_tasks(*)')
            .eq('id', phaseId).single();
        if (data) showPhaseDetail(win, data, projects);
    }

    async function showPhaseForm(win, existing, projects) {
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
                                <label>Project *</label>
                                <select id="f-project">
                                    <option value="">— Select project —</option>
                                    ${projects.map(proj => `<option value="${proj.id}" ${proj.id === p.project_id ? 'selected' : ''}>${proj.reference || 'Untitled'}</option>`).join('')}
                                </select>
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

        const goBack = () => isEdit ? reloadPhaseDetail(win, p.id, projects) : loadList(win);
        body.querySelector('#sched-form-back').addEventListener('click', goBack);
        body.querySelector('#sched-form-cancel').addEventListener('click', goBack);

        body.querySelector('#sched-form-save').addEventListener('click', async () => {
            const btn = body.querySelector('#sched-form-save');
            const errEl = body.querySelector('#sched-form-error');
            errEl.innerHTML = '';

            const name = body.querySelector('#f-name').value.trim();
            const projectId = body.querySelector('#f-project').value;
            if (!name) { errEl.innerHTML = '<div class="form-error">Name is required</div>'; return; }
            if (!projectId) { errEl.innerHTML = '<div class="form-error">Select a project</div>'; return; }

            const record = {
                name,
                project_id: projectId,
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
                await loadList(win);
            } catch (err) {
                errEl.innerHTML = `<div class="form-error">Error: ${err.message}</div>`;
                btn.disabled = false; btn.textContent = isEdit ? 'Save Changes' : 'Create Phase';
            }
        });
    }

    async function showTaskForm(win, phase, existing) {
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

        const goBack = async () => {
            const { data } = await SupabaseClient.from('schedule_phases')
                .select('*, project:projects(reference), tasks:schedule_tasks(*)')
                .eq('id', phase.id).single();
            if (data) {
                const { data: projects } = await SupabaseClient.from('projects').select('id, reference').order('reference');
                showPhaseDetail(win, data, projects || []);
            }
        };
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

    return { id: 'schedule', name: 'Schedule', icon: ICON, launch };
})();
