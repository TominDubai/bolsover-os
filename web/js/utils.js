/* ===== Shared Utilities & Constants ===== */
const Utils = (() => {
    const STATUS_LABELS = {
        enquiry: 'Enquiry',
        qualifying: 'Qualifying',
        awaiting_design: 'Awaiting Design',
        ready_for_visit: 'Ready for Visit',
        site_visit_scheduled: 'Visit Scheduled',
        visited: 'Visited',
        boq_in_progress: 'BOQ in Progress',
        boq_review: 'BOQ Review',
        quoted: 'Quoted',
        accepted: 'Accepted',
        contract_sent: 'Contract Sent',
        contract_signed: 'Contract Signed',
        deposit_pending: 'Deposit Pending',
        deposit_paid: 'Deposit Paid',
        approval_pending: 'Approval Pending',
        scheduling: 'Scheduling',
        scheduled: 'Scheduled',
        active: 'Active',
        snagging: 'Snagging',
        final_invoice_sent: 'Final Invoice',
        complete: 'Complete',
        closed: 'Closed',
        on_hold: 'On Hold',
        lost: 'Lost',
    };

    const STATUS_COLORS = {
        enquiry: { bg: '#dbeafe', text: '#1e40af' },
        qualifying: { bg: '#dbeafe', text: '#1e40af' },
        awaiting_design: { bg: '#fef3c7', text: '#92400e' },
        ready_for_visit: { bg: '#dbeafe', text: '#1e40af' },
        site_visit_scheduled: { bg: '#dbeafe', text: '#1e40af' },
        visited: { bg: '#dbeafe', text: '#1e40af' },
        boq_in_progress: { bg: '#ede9fe', text: '#6b21a8' },
        boq_review: { bg: '#ede9fe', text: '#6b21a8' },
        quoted: { bg: '#e0e7ff', text: '#3730a3' },
        accepted: { bg: '#dcfce7', text: '#166534' },
        contract_sent: { bg: '#dcfce7', text: '#166534' },
        contract_signed: { bg: '#dcfce7', text: '#166534' },
        deposit_pending: { bg: '#fef3c7', text: '#92400e' },
        deposit_paid: { bg: '#dcfce7', text: '#166534' },
        approval_pending: { bg: '#fef3c7', text: '#92400e' },
        scheduling: { bg: '#dbeafe', text: '#1e40af' },
        scheduled: { bg: '#dbeafe', text: '#1e40af' },
        active: { bg: '#dcfce7', text: '#166534' },
        snagging: { bg: '#ffedd5', text: '#9a3412' },
        final_invoice_sent: { bg: '#fef3c7', text: '#92400e' },
        complete: { bg: '#dcfce7', text: '#166534' },
        closed: { bg: '#f3f4f6', text: '#374151' },
        on_hold: { bg: '#f3f4f6', text: '#374151' },
        lost: { bg: '#fee2e2', text: '#991b1b' },
    };

    const HEALTH_ICONS = {
        on_track: '✅',
        minor_delay: '⚠️',
        behind: '🔴',
        blocked: '⏸️',
    };

    const HEALTH_LABELS = {
        on_track: 'On Track',
        minor_delay: 'Minor Delay',
        behind: 'Behind',
        blocked: 'Blocked',
    };

    const PIPELINE_STATUSES = [
        'enquiry', 'qualifying', 'awaiting_design', 'ready_for_visit',
        'site_visit_scheduled', 'visited', 'boq_in_progress', 'boq_review', 'quoted'
    ];

    const ACTIVE_STATUSES = [
        'accepted', 'contract_sent', 'contract_signed', 'deposit_pending',
        'deposit_paid', 'approval_pending', 'scheduling', 'scheduled',
        'active', 'snagging'
    ];

    const ENQUIRY_STATUSES = [
        'enquiry', 'qualifying', 'awaiting_design', 'ready_for_visit',
        'site_visit_scheduled', 'visited', 'boq_in_progress'
    ];

    const TRADE_COLORS = {
        electrical: { bg: '#fef3c7', text: '#b45309' },
        plumbing: { bg: '#dbeafe', text: '#1d4ed8' },
        ac: { bg: '#cffafe', text: '#0e7490' },
        joinery: { bg: '#fef3c7', text: '#b45309' },
        tiling: { bg: '#ffedd5', text: '#c2410c' },
        painting: { bg: '#ede9fe', text: '#7c3aed' },
        gypsum: { bg: '#f3f4f6', text: '#374151' },
        flooring: { bg: '#dcfce7', text: '#16a34a' },
        glass: { bg: '#e0f2fe', text: '#0284c7' },
        steel: { bg: '#e2e8f0', text: '#475569' },
    };

    function formatCurrency(amount) {
        if (amount == null) return 'AED 0';
        return new Intl.NumberFormat('en-AE', {
            style: 'currency',
            currency: 'AED',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    }

    function formatCurrencyShort(amount) {
        if (amount == null || amount === 0) return 'AED 0';
        if (Math.abs(amount) >= 1000000) return `AED ${(amount / 1000000).toFixed(1)}M`;
        if (Math.abs(amount) >= 1000) return `AED ${(amount / 1000).toFixed(0)}K`;
        return formatCurrency(amount);
    }

    function formatDate(date) {
        if (!date) return '—';
        return new Intl.DateTimeFormat('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        }).format(new Date(date));
    }

    function formatRelativeDate(date) {
        if (!date) return '—';
        const now = new Date();
        const then = new Date(date);
        const diffInDays = Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
        if (diffInDays === 0) return 'Today';
        if (diffInDays === 1) return 'Yesterday';
        if (diffInDays < 7) return `${diffInDays} days ago`;
        if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
        return formatDate(date);
    }

    function statusBadge(status) {
        const label = STATUS_LABELS[status] || status;
        const colors = STATUS_COLORS[status] || { bg: '#f3f4f6', text: '#374151' };
        return `<span class="status-badge" style="background:${colors.bg};color:${colors.text}">${label}</span>`;
    }

    function tradeBadge(trade) {
        const colors = TRADE_COLORS[trade] || { bg: '#f3f4f6', text: '#374151' };
        return `<span class="trade-badge" style="background:${colors.bg};color:${colors.text}">${trade}</span>`;
    }

    function healthBadge(health) {
        if (!health) return '';
        const icon = HEALTH_ICONS[health] || '';
        const label = HEALTH_LABELS[health] || health;
        return `<span class="health-badge" title="${label}">${icon}</span>`;
    }

    function ratingStars(rating) {
        if (!rating) return '—';
        const full = Math.floor(rating);
        const half = rating % 1 >= 0.5 ? 1 : 0;
        const empty = 5 - full - half;
        return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
    }

    const RFQ_STATUS_LABELS = {
        draft: 'Draft',
        sent: 'Sent',
        received: 'Received',
        accepted: 'Accepted',
        rejected: 'Rejected',
        expired: 'Expired',
    };

    const RFQ_STATUS_COLORS = {
        draft:    { bg: '#f3f4f6', text: '#374151' },
        sent:     { bg: '#dbeafe', text: '#1e40af' },
        received: { bg: '#fef3c7', text: '#92400e' },
        accepted: { bg: '#dcfce7', text: '#166534' },
        rejected: { bg: '#fee2e2', text: '#991b1b' },
        expired:  { bg: '#f3f4f6', text: '#6b7280' },
    };

    function rfqStatusBadge(status) {
        const label = RFQ_STATUS_LABELS[status] || status;
        const colors = RFQ_STATUS_COLORS[status] || { bg: '#f3f4f6', text: '#374151' };
        return `<span class="status-badge" style="background:${colors.bg};color:${colors.text}">${label}</span>`;
    }

    return {
        STATUS_LABELS, STATUS_COLORS, HEALTH_ICONS, HEALTH_LABELS,
        PIPELINE_STATUSES, ACTIVE_STATUSES, ENQUIRY_STATUSES, TRADE_COLORS,
        RFQ_STATUS_LABELS, RFQ_STATUS_COLORS,
        formatCurrency, formatCurrencyShort, formatDate, formatRelativeDate,
        statusBadge, tradeBadge, healthBadge, ratingStars, rfqStatusBadge,
    };
})();
