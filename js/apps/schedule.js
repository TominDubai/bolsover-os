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
                    <button class="import-btn" id="sched-upload-btn">Upload Schedule</button>
                    <button class="btn-edit" id="sched-timeline-btn">Timeline View</button>
                </div>
                <div id="sched-content" style="flex:1;overflow:auto;min-height:0"></div>
            `;

            const search = body.querySelector('#sched-search');
            const projFilter = body.querySelector('#sched-proj-filter');
            const statusFilter = body.querySelector('#sched-status-filter');

            body.querySelector('#sched-new-btn').addEventListener('click', () => showPhaseForm(win, null, projects));
            body.querySelector('#sched-upload-btn').addEventListener('click', () => showUploadForm(win, projects));

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
                const dates = [];
                list.forEach(p => {
                    if (p.start_date) dates.push(new Date(p.start_date));
                    if (p.end_date) dates.push(new Date(p.end_date));
                    (p.tasks || []).forEach(t => {
                        if (t.due_date) dates.push(new Date(t.due_date));
                    });
                });
                if (dates.length === 0) {
                    container.innerHTML = '<div class="empty-state">No dates set on phases</div>';
                    return;
                }
                const minDate = new Date(Math.min(...dates));
                const maxDate = new Date(Math.max(...dates));
                const DAY = 86400000;
                const totalDays = Math.max(1, Math.ceil((maxDate - minDate) / DAY) + 1);

                const weeks = [];
                const wd = new Date(minDate);
                wd.setDate(wd.getDate() - wd.getDay() + 1);
                while (wd <= maxDate) {
                    weeks.push(new Date(wd));
                    wd.setDate(wd.getDate() + 7);
                }

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
                                                <div class="timeline-task-sub">${p.project?.reference || ''} ${statusBadge(p.status, PHASE_STATUSES)}</div>
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

                // Collapsible phase toggles
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
                        container.querySelectorAll('.tl-phase-tasks').forEach(el => {
                            el.style.display = allCollapsed ? 'none' : '';
                        });
                        container.querySelectorAll('.tl-chevron').forEach(ch => {
                            ch.style.transform = allCollapsed ? 'rotate(-90deg)' : '';
                        });
                    });
                }
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

    function parsePrimaveraDate(str) {
        if (!str) return null;
        str = String(str).trim();
        // Handle DD-MMM-YY format (e.g. "23-Feb-26")
        const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
        const m = str.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
        if (m) {
            const day = parseInt(m[1], 10);
            const mon = months[m[2].toLowerCase()];
            let year = parseInt(m[3], 10);
            if (year < 100) year += 2000;
            if (mon !== undefined) {
                const d = new Date(year, mon, day);
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                return `${yyyy}-${mm}-${dd}`;
            }
        }
        // Fallback: try native parse
        const d = new Date(str);
        if (!isNaN(d.getTime())) {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        }
        return null;
    }

    function derivePhaseName(letter, tasks) {
        // For single-task groups, use the task name
        if (tasks.length === 1) {
            const name = tasks[0].name;
            return name.length > 50 ? name.substring(0, 50) + '...' : name;
        }
        // Default: "Phase X (N tasks)" — user renames in preview
        return `Phase ${letter}`;
    }

    async function showUploadForm(win, projects) {
        const body = win.querySelector('.app-container');

        body.innerHTML = `
            <div class="form-view">
                <div class="form-header">
                    <button class="back-btn" id="upload-back">← Back</button>
                    <h2>Upload Schedule</h2>
                </div>
                <div class="form-body">
                    <div class="form-section">
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Project *</label>
                                <select id="upload-project">
                                    <option value="">— Select project —</option>
                                    ${projects.map(p => `<option value="${p.id}">${p.reference || 'Untitled'}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Excel File (.xlsx) *</label>
                                <input type="file" id="upload-file" accept=".xlsx,.xls" style="height:auto;padding:8px 10px">
                            </div>
                        </div>
                    </div>
                    <div style="display:flex;gap:8px">
                        <button class="import-btn" id="upload-parse-btn">Parse File</button>
                    </div>
                    <div id="upload-error"></div>
                    <div id="upload-preview"></div>
                </div>
                <div class="form-actions" id="upload-actions" style="display:none">
                    <button class="back-btn" id="upload-cancel">Cancel</button>
                    <button class="btn-save" id="upload-import-btn">Import Schedule</button>
                </div>
            </div>
        `;

        let parsedPhases = null;

        body.querySelector('#upload-back').addEventListener('click', () => loadList(win));
        body.querySelector('#upload-cancel').addEventListener('click', () => loadList(win));

        body.querySelector('#upload-parse-btn').addEventListener('click', () => {
            const errEl = body.querySelector('#upload-error');
            errEl.innerHTML = '';
            const projectId = body.querySelector('#upload-project').value;
            const fileInput = body.querySelector('#upload-file');

            if (!projectId) { errEl.innerHTML = '<div class="form-error">Select a project</div>'; return; }
            if (!fileInput.files.length) { errEl.innerHTML = '<div class="form-error">Select an Excel file</div>'; return; }

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheet = workbook.Sheets[workbook.SheetNames[0]];
                    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                    if (rows.length < 3) { errEl.innerHTML = '<div class="form-error">File has too few rows</div>'; return; }

                    // Auto-detect columns from first two header rows
                    let codeCol = -1, nameCol = -1, startCol = -1, endCol = -1;
                    for (let r = 0; r < Math.min(2, rows.length); r++) {
                        const row = rows[r].map(c => String(c || '').toLowerCase().trim());
                        row.forEach((cell, i) => {
                            if (cell === 'task_code' || cell === 'activity id') codeCol = i;
                            if (cell === 'task_name' || cell === 'activity name') nameCol = i;
                            if (cell.includes('start')) startCol = i;
                            if (cell.includes('finish') || cell === 'end_date') endCol = i;
                        });
                    }

                    if (codeCol === -1 || nameCol === -1) {
                        errEl.innerHTML = '<div class="form-error">Could not detect task_code/Activity ID and task_name/Activity Name columns</div>';
                        return;
                    }

                    // Extract data rows (skip first 2 header rows)
                    const activities = [];
                    for (let r = 2; r < rows.length; r++) {
                        const row = rows[r];
                        if (!row || !row[codeCol]) continue;
                        const code = String(row[codeCol]).trim();
                        const name = String(row[nameCol] || '').trim();
                        const startDate = startCol >= 0 ? parsePrimaveraDate(row[startCol]) : null;
                        const endDate = endCol >= 0 ? parsePrimaveraDate(row[endCol]) : null;
                        if (code && name) {
                            activities.push({ code, name, start_date: startDate, end_date: endDate });
                        }
                    }

                    if (activities.length === 0) {
                        errEl.innerHTML = '<div class="form-error">No valid activities found in file</div>';
                        return;
                    }

                    // Group by first letter of task_code
                    const groups = {};
                    const groupOrder = [];
                    activities.forEach(a => {
                        const letter = a.code.charAt(0).toUpperCase();
                        if (!groups[letter]) {
                            groups[letter] = [];
                            groupOrder.push(letter);
                        }
                        groups[letter].push(a);
                    });

                    // Build phases with smart naming
                    parsedPhases = groupOrder.map((letter, idx) => {
                        const tasks = groups[letter];
                        const phaseName = derivePhaseName(letter, tasks);
                        const starts = tasks.map(t => t.start_date).filter(Boolean).sort();
                        const ends = tasks.map(t => t.end_date).filter(Boolean).sort();
                        return {
                            name: phaseName,
                            sort_order: idx,
                            start_date: starts[0] || null,
                            end_date: ends[ends.length - 1] || null,
                            tasks,
                        };
                    });

                    // Render preview
                    const previewEl = body.querySelector('#upload-preview');
                    let previewMode = 'table';

                    function renderPreview() {
                        if (previewMode === 'gantt') {
                            renderGanttPreview(previewEl, parsedPhases, activities.length, () => { previewMode = 'table'; renderPreview(); });
                        } else {
                            renderTablePreview(previewEl, parsedPhases, activities.length, () => { previewMode = 'gantt'; renderPreview(); });
                        }
                        body.querySelector('#upload-actions').style.display = '';
                    }

                    function renderTablePreview(el, phases, totalTasks, onToggle) {
                        el.innerHTML = `
                            <div class="preview-summary" style="display:flex;justify-content:space-between;align-items:center">
                                <div>
                                    <h3>Preview: ${phases.length} phases, ${totalTasks} tasks</h3>
                                    <p style="color:var(--accent)">Name each phase below, then click "Import Schedule".</p>
                                </div>
                                <button class="btn-edit" id="preview-toggle-btn">Gantt View</button>
                            </div>
                            <div class="app-table-wrap" style="max-height:340px;overflow:auto">
                                <table class="app-table">
                                    <thead><tr>
                                        <th>Phase Name</th>
                                        <th>Tasks</th>
                                        <th>Start</th>
                                        <th>End</th>
                                    </tr></thead>
                                    <tbody>
                                        ${phases.map(phase => `
                                            <tr style="background:rgba(233,69,96,0.06)">
                                                <td>
                                                    <input type="text" class="phase-name-input" data-sort="${phase.sort_order}" value="${phase.name}" placeholder="Enter phase name..." style="background:rgba(0,0,0,0.4);border:1px solid var(--accent);border-radius:4px;color:var(--text-primary);padding:4px 10px;font-size:13px;font-weight:500;width:100%;font-family:var(--font)">
                                                </td>
                                                <td class="strong">${phase.tasks.length}</td>
                                                <td>${phase.start_date || '—'}</td>
                                                <td>${phase.end_date || '—'}</td>
                                            </tr>
                                            ${phase.tasks.map(t => `
                                                <tr>
                                                    <td style="padding-left:28px;color:var(--text-secondary)">${t.code} — ${t.name}</td>
                                                    <td></td>
                                                    <td style="color:var(--text-muted)">${t.start_date || '—'}</td>
                                                    <td style="color:var(--text-muted)">${t.end_date || '—'}</td>
                                                </tr>
                                            `).join('')}
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        `;
                        el.querySelector('#preview-toggle-btn').addEventListener('click', onToggle);
                        el.querySelectorAll('.phase-name-input').forEach(input => {
                            input.addEventListener('input', () => {
                                const idx = parseInt(input.dataset.sort, 10);
                                if (parsedPhases[idx]) parsedPhases[idx].name = input.value;
                            });
                        });
                    }

                    function renderGanttPreview(el, phases, totalTasks, onToggle) {
                        // Collect all dates to determine range
                        const allDates = [];
                        phases.forEach(p => {
                            p.tasks.forEach(t => {
                                if (t.start_date) allDates.push(new Date(t.start_date));
                                if (t.end_date) allDates.push(new Date(t.end_date));
                            });
                        });
                        if (allDates.length === 0) { el.innerHTML = '<div class="empty-state">No dates to chart</div>'; return; }

                        const minDate = new Date(Math.min(...allDates));
                        const maxDate = new Date(Math.max(...allDates));
                        const totalDays = Math.max(1, Math.ceil((maxDate - minDate) / 86400000) + 1);

                        // Build week markers
                        const weeks = [];
                        const wd = new Date(minDate);
                        wd.setDate(wd.getDate() - wd.getDay() + 1); // start on Monday
                        while (wd <= maxDate) {
                            weeks.push(new Date(wd));
                            wd.setDate(wd.getDate() + 7);
                        }

                        // Month markers
                        const months = [];
                        const md = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
                        while (md <= maxDate) {
                            const mStart = new Date(Math.max(md, minDate));
                            const mEnd = new Date(md.getFullYear(), md.getMonth() + 1, 0);
                            const leftPct = ((mStart - minDate) / 86400000) / totalDays * 100;
                            const widthPct = (Math.min(mEnd, maxDate) - mStart) / 86400000 / totalDays * 100;
                            months.push({ label: md.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), leftPct, widthPct });
                            md.setMonth(md.getMonth() + 1);
                        }

                        function barStyle(startStr, endStr, color, textColor) {
                            const s = startStr ? new Date(startStr) : minDate;
                            const e = endStr ? new Date(endStr) : s;
                            const left = ((s - minDate) / 86400000) / totalDays * 100;
                            const width = Math.max(0.5, ((e - s) / 86400000 + 1) / totalDays * 100);
                            return `left:${left}%;width:${width}%;background:${color};color:${textColor}`;
                        }

                        // Phase colors
                        const phaseColors = ['#e94560','#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#84cc16'];

                        el.innerHTML = `
                            <div class="preview-summary" style="display:flex;justify-content:space-between;align-items:center">
                                <div>
                                    <h3>Gantt Chart: ${phases.length} phases, ${totalTasks} tasks</h3>
                                    <p style="color:var(--text-muted)">Visual schedule overview. Switch to Table View to rename phases.</p>
                                </div>
                                <button class="btn-edit" id="preview-toggle-btn">Table View</button>
                            </div>
                            <div style="overflow:auto;max-height:380px;font-size:11px">
                                <div style="display:flex;position:sticky;top:0;z-index:2;background:var(--window-header);border-bottom:1px solid var(--window-border)">
                                    <div style="width:220px;flex-shrink:0;padding:4px 8px;font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;border-right:1px solid var(--window-border)">Activity</div>
                                    <div style="flex:1;position:relative;min-width:500px">
                                        <div style="display:flex;border-bottom:1px solid rgba(255,255,255,0.06)">
                                            ${months.map(m => `<div style="position:absolute;left:${m.leftPct}%;width:${m.widthPct}%;text-align:center;padding:2px 0;font-size:10px;font-weight:600;color:var(--text-secondary)">${m.label}</div>`).join('')}
                                        </div>
                                        <div style="display:flex;margin-top:16px">
                                            ${weeks.map(w => {
                                                const wLeft = Math.max(0, ((w - minDate) / 86400000) / totalDays * 100);
                                                return `<div style="position:absolute;left:${wLeft}%;font-size:9px;color:var(--text-muted);padding:0 2px">${w.getDate()}</div>`;
                                            }).join('')}
                                        </div>
                                    </div>
                                </div>
                                <div style="min-height:60px">
                                    ${phases.map((phase, pi) => {
                                        const color = phaseColors[pi % phaseColors.length];
                                        const colorFaded = color + '33';
                                        return `
                                            <div style="display:flex;align-items:center;background:rgba(255,255,255,0.04);border-bottom:1px solid rgba(255,255,255,0.08);min-height:30px">
                                                <div style="width:220px;flex-shrink:0;padding:4px 8px;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border-right:1px solid var(--window-border);font-size:11px" title="${phase.name}">${phase.name}</div>
                                                <div style="flex:1;position:relative;min-width:500px;height:24px">
                                                    <div class="timeline-bar" style="${barStyle(phase.start_date, phase.end_date, color, '#fff')};height:20px;top:2px;border-radius:3px;font-size:10px;line-height:20px;font-weight:600;opacity:0.9">${phase.tasks.length} tasks</div>
                                                </div>
                                            </div>
                                            ${phase.tasks.map(t => `
                                                <div style="display:flex;align-items:center;border-bottom:1px solid rgba(255,255,255,0.03);min-height:24px">
                                                    <div style="width:220px;flex-shrink:0;padding:2px 8px 2px 20px;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border-right:1px solid var(--window-border);font-size:10px" title="${t.code} — ${t.name}">${t.code} ${t.name}</div>
                                                    <div style="flex:1;position:relative;min-width:500px;height:20px">
                                                        <div class="timeline-bar" style="${barStyle(t.start_date, t.end_date, colorFaded, color)};height:14px;top:3px;border-radius:2px;font-size:9px;line-height:14px;border:1px solid ${color}40"></div>
                                                    </div>
                                                </div>
                                            `).join('')}
                                        `;
                                    }).join('')}
                                </div>
                                <div style="display:flex;position:sticky;bottom:0;background:var(--window-header);border-top:1px solid var(--window-border);padding:4px 8px">
                                    <div style="width:220px;flex-shrink:0"></div>
                                    <div style="flex:1;display:flex;gap:12px;flex-wrap:wrap;padding:2px 0">
                                        ${phases.map((p, pi) => `<span style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--text-secondary)"><span style="width:10px;height:10px;border-radius:2px;background:${phaseColors[pi % phaseColors.length]};display:inline-block"></span>${p.name}</span>`).join('')}
                                    </div>
                                </div>
                            </div>
                        `;
                        el.querySelector('#preview-toggle-btn').addEventListener('click', onToggle);
                    }

                    renderPreview();
                } catch (err) {
                    errEl.innerHTML = `<div class="form-error">Parse error: ${err.message}</div>`;
                }
            };
            reader.readAsArrayBuffer(fileInput.files[0]);
        });

        body.querySelector('#upload-import-btn').addEventListener('click', async () => {
            if (!parsedPhases) return;
            const projectId = body.querySelector('#upload-project').value;
            const btn = body.querySelector('#upload-import-btn');
            const errEl = body.querySelector('#upload-error');
            errEl.innerHTML = '';
            btn.disabled = true;
            btn.textContent = 'Checking...';

            try {
                // Check for existing phases on this project
                const { data: existing, error: checkErr } = await SupabaseClient.from('schedule_phases')
                    .select('id')
                    .eq('project_id', projectId);
                console.log('Existing phases for project', projectId, ':', existing?.length || 0, checkErr || 'no error');

                if (existing && existing.length > 0) {
                    const ok = confirm('This project already has ' + existing.length + ' phase(s). Replace them with the new import?\n\nThis will delete all existing phases and tasks for this project.');
                    if (!ok) {
                        btn.disabled = false;
                        btn.textContent = 'Import Schedule';
                        return;
                    }
                    btn.textContent = 'Removing old schedule...';
                    // Delete tasks for each existing phase, then delete phases
                    for (const ep of existing) {
                        const { error: dtErr } = await SupabaseClient.from('schedule_tasks')
                            .delete()
                            .eq('phase_id', ep.id);
                        if (dtErr) { console.error('Delete tasks error:', dtErr); throw dtErr; }
                    }
                    const { error: delPhasesErr } = await SupabaseClient.from('schedule_phases')
                        .delete()
                        .eq('project_id', projectId);
                    if (delPhasesErr) { console.error('Delete phases error:', delPhasesErr); throw delPhasesErr; }
                }

                btn.textContent = 'Importing...';

                for (const phase of parsedPhases) {
                    // Insert phase
                    const { data: phaseData, error: phaseErr } = await SupabaseClient.from('schedule_phases')
                        .insert({
                            project_id: projectId,
                            name: phase.name,
                            start_date: phase.start_date,
                            end_date: phase.end_date,
                            status: 'pending',
                            sort_order: phase.sort_order,
                        })
                        .select()
                        .single();
                    if (phaseErr) throw phaseErr;

                    // Insert tasks for this phase
                    if (phase.tasks.length > 0) {
                        const taskRecords = phase.tasks.map(t => {
                            const rec = {
                                phase_id: phaseData.id,
                                name: `${t.code} — ${t.name}`,
                                due_date: t.end_date,
                                status: 'pending',
                            };
                            if (t.start_date) rec.start_date = t.start_date;
                            return rec;
                        });
                        // Try with start_date first, fall back without it if column doesn't exist
                        let taskRes = await SupabaseClient.from('schedule_tasks').insert(taskRecords);
                        if (taskRes.error && taskRes.error.message && taskRes.error.message.includes('start_date')) {
                            const fallbackRecords = taskRecords.map(({ start_date, ...rest }) => rest);
                            taskRes = await SupabaseClient.from('schedule_tasks').insert(fallbackRecords);
                        }
                        if (taskRes.error) throw taskRes.error;
                    }
                }

                await loadList(win);
            } catch (err) {
                errEl.innerHTML = `<div class="form-error">Import error: ${err.message}</div>`;
                btn.disabled = false;
                btn.textContent = 'Import Schedule';
            }
        });
    }

    return { id: 'schedule', name: 'Schedule', icon: ICON, launch };
})();
