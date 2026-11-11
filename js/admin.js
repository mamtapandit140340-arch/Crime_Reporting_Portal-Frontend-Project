/* ============================================================
   admin.js — JavaScript for admin pages
   Handles: dashboard charts, CRUD tables, search/filter,
   modals, pagination, CSV export, login/logout.
   ============================================================ */

/* ════════════════════════════════════════════════════════════
   SECTION A — SHARED ADMIN UTILITIES
   ════════════════════════════════════════════════════════════ */

/**
 * adminLogout — clears admin session and redirects to login.
 * CHANGED: now uses Auth.logout() (auth.js) so the new 'sc_session'
 * key is cleared too. Before, only the two old localStorage keys were
 * removed, which would leave the session behind after logout.
 */
function adminLogout() {
  confirmDialog('Are you sure you want to log out?', 'Logout').then(function (yes) {
    if (!yes) return;
    if (typeof Auth !== 'undefined') {
      Auth.logout('../');            // clears every key, then goes to ../client/login.html
    } else {
      // Fallback if auth.js failed to load
      sessionStorage.removeItem('sc_session');
      localStorage.removeItem('sc_admin_logged_in');
      localStorage.removeItem('sc_admin_name');
      window.location.href = '../client/login.html';
    }
  });
}

/**
 * setTopbarDate — fills the topbar date element with today's date.
 */
function setTopbarDate() {
  var el = document.getElementById('topbar-date');
  if (!el) return;
  var now = new Date();
  var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  el.textContent = now.toLocaleDateString('en-IN', options);
}

/**
 * updateNavBadges — updates the red count badges on the sidebar nav.
 * Shows pending reports count and new tips count.
 */
function updateNavBadges() {
  var reports = safeGetJSON('sc_reports');
  var tips    = safeGetJSON('sc_tips');

  var pendingCount  = reports.filter(function (r) { return r.status === 'Pending'; }).length;
  var newTipsCount  = tips.filter(function (t) { return t.status === 'New'; }).length;

  var reportsBadge = document.getElementById('nav-badge-reports');
  var tipsBadge    = document.getElementById('nav-badge-tips');

  if (reportsBadge) reportsBadge.textContent = pendingCount;
  if (tipsBadge)    tipsBadge.textContent    = newTipsCount;
}

/**
 * formatDate — converts "YYYY-MM-DD" to "DD MMM YYYY".
 * (Duplicated here so admin.js works standalone)
 */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var parts   = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  return parts[2] + ' ' + months[parseInt(parts[1], 10) - 1] + ' ' + parts[0];
}

/**
 * statusBadgeHTML — returns a styled badge span for a status string.
 */
function statusBadgeHTML(status) {
  var classMap = {
    'Pending':              'badge-pending',
    'Under Investigation':  'badge-active',
    'Resolved':             'badge-resolved',
    'Closed':               'badge-closed',
    'New':                  'badge-new',
    'Reviewed':             'badge-reviewed',
    'Actionable':           'badge-actionable',
    'Dismissed':            'badge-dismissed',
    'Open':                 'badge-new',
    'Active':               'badge-active',
    'On Leave':             'badge-warning',
    'Off Duty':             'badge-closed'
  };
  var cls = classMap[status] || 'badge-pending';
  return '<span class="badge-status ' + cls + '">' + (status || 'Unknown') + '</span>';
}

/**
 * priorityBadgeHTML — returns a styled badge for a priority level.
 */
function priorityBadgeHTML(priority) {
  var classMap = {
    'Critical': 'badge-critical',
    'High':     'badge-high',
    'Medium':   'badge-medium',
    'Low':      'badge-low'
  };
  var cls = classMap[priority] || 'badge-medium';
  return '<span class="badge-status ' + cls + '">' + (priority || '—') + '</span>';
}

/**
 * exportCSV — converts an array of objects to a CSV file and downloads it.
 * @param {Array}  data     - array of plain objects
 * @param {string} filename - e.g. "crime-reports.csv"
 */
function exportCSV(data, filename) {
  if (!data || data.length === 0) {
    showToast('No data to export.', 'warning');
    return;
  }
  var headers  = Object.keys(data[0]);
  var csvRows  = [headers.join(',')];
  data.forEach(function (row) {
    var values = headers.map(function (h) {
      var val = (row[h] === null || row[h] === undefined) ? '' : String(row[h]);
      // Escape commas and quotes inside values
      return '"' + val.replace(/"/g, '""') + '"';
    });
    csvRows.push(values.join(','));
  });
  var blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Exported ' + data.length + ' records to ' + filename, 'success');
}

/* ════════════════════════════════════════════════════════════
   SECTION B — DASHBOARD
   Used by: admin/dashboard.html
   ════════════════════════════════════════════════════════════ */

// NEW: keeps a reference to the doughnut chart so it can be updated or
// destroyed instead of creating a second chart on the same canvas.
var statusChart = null;

/**
 * NEW: statusCenterTextPlugin — Chart.js plugin that draws
 * "TOTAL REPORTS" and the total number in the hole of the doughnut.
 * It is passed only to the status chart (plugins: [...]), so no other
 * chart is affected. It reads the numbers from the chart's own data,
 * so the total always equals the sum of the doughnut slices.
 */
var statusCenterTextPlugin = {
  id: 'statusCenterText',
  afterDraw: function (chart) {
    var arc = chart.getDatasetMeta(0).data[0];
    if (!arc) return;                                   // chart has no arcs yet

    var total = (chart.data.datasets[0].data || []).reduce(function (sum, v) {
      return sum + (Number(v) || 0);
    }, 0);

    var hole       = arc.innerRadius;                   // radius of the empty centre
    var numberSize = Math.max(18, Math.min(hole * 0.55, 44));
    var labelSize  = Math.max(9,  Math.min(hole * 0.19, 12));
    var navy = getComputedStyle(document.documentElement)
                 .getPropertyValue('--color-primary').trim() || '#0B2D4A';
    var family = Chart.defaults.font.family;

    var ctx = chart.ctx;
    ctx.save();
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    // Big dark-navy number
    ctx.font      = '700 ' + numberSize + 'px ' + family;
    ctx.fillStyle = navy;
    ctx.fillText(total, arc.x, arc.y - labelSize * 0.5);

    // Small muted label (skipped if the hole is too small to fit it)
    if (hole > 40) {
      ctx.font      = '600 ' + labelSize + 'px ' + family;
      ctx.fillStyle = '#5A6B82';
      ctx.fillText('TOTAL REPORTS', arc.x, arc.y + numberSize * 0.55);
    }
    ctx.restore();
  }
};

/**
 * NEW: countReportsByStatus — counts each report once under its status.
 * Only the four statuses shown in the doughnut are counted.
 */
function countReportsByStatus(reports) {
  var counts = { Pending: 0, 'Under Investigation': 0, Resolved: 0, Closed: 0 };
  reports.forEach(function (r) {
    if (counts.hasOwnProperty(r.status)) counts[r.status]++;
  });
  return counts;
}

/**
 * NEW: refreshDashboardData — re-reads localStorage and updates the KPI
 * cards, recent table and doughnut. The centre total follows automatically.
 */
function refreshDashboardData() {
  updateNavBadges();
  renderKpiCards();
  renderRecentReports();
  if (statusChart) {
    var counts = countReportsByStatus(safeGetJSON('sc_reports'));
    statusChart.data.datasets[0].data = Object.values(counts);
    statusChart.update();                // redraws, so the plugin repaints the new total
  }
}

/**
 * loadDashboard — initialises all dashboard elements.
 * Call this once from dashboard.html on DOMContentLoaded.
 */
function loadDashboard() {
  setTopbarDate();
  updateNavBadges();
  renderKpiCards();
  renderRecentReports();
  initDashboardCharts();

  // NEW: if reports change in another browser tab, refresh this dashboard
  window.addEventListener('storage', function (e) {
    if (e.key === 'sc_reports') refreshDashboardData();
  });
}

/**
 * renderKpiCards — calculates statistics from localStorage and
 * fills the KPI cards on the dashboard.
 */
function renderKpiCards() {
  var reports       = safeGetJSON('sc_reports');
  var tips          = safeGetJSON('sc_tips');
  var investigations = safeGetJSON('sc_investigations');
  var officers      = safeGetJSON('sc_officers');

  var totalReports  = reports.length;
  var pendingCount  = reports.filter(function (r) { return r.status === 'Pending'; }).length;
  var activeInvest  = investigations.filter(function (i) { return i.status === 'Active' || i.status === 'Open'; }).length;
  var totalOfficers = officers.filter(function (o) { return o.status === 'Active'; }).length;

  var setKpi = function (id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setKpi('kpi-total-reports',    totalReports);
  setKpi('kpi-pending',          pendingCount);
  setKpi('kpi-investigations',   activeInvest);
  setKpi('kpi-officers',         totalOfficers);
}

/**
 * renderRecentReports — fills the "Recent Reports" table on the dashboard
 * with the 5 most recently submitted reports.
 */
function renderRecentReports() {
  var reports = safeGetJSON('sc_reports');
  var tbody   = document.getElementById('recent-reports-tbody');
  if (!tbody) return;

  // Take the first 5 (they're stored newest-first after the seed)
  var recent = reports.slice(0, 5);
  if (recent.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">No reports yet.</td></tr>';
    return;
  }

  tbody.innerHTML = recent.map(function (r) {
    return '<tr>' +
      '<td><span class="fw-semibold text-primary">' + r.id + '</span></td>' +
      '<td>' + formatDate(r.date) + '</td>' +
      '<td>' + (r.type || '—') + '</td>' +
      '<td>' + (r.district || r.location || '—') + '</td>' +
      '<td>' + statusBadgeHTML(r.status) + '</td>' +
      '<td>' +
        '<a href="crime-reports.html" class="btn-action btn-action-view" title="View All">' +
          '<i class="bi bi-eye"></i>' +
        '</a>' +
      '</td>' +
    '</tr>';
  }).join('');
}

/**
 * initDashboardCharts — creates 4 Chart.js charts on the dashboard.
 * Charts use real data from localStorage.
 */
function initDashboardCharts() {
  var reports = safeGetJSON('sc_reports');
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js not loaded yet.');
    return;
  }

  // ── CHART 1: Crimes by Type (Bar) ──
  var typeCounts = {};
  reports.forEach(function (r) {
    typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
  });
  var typeLabels = Object.keys(typeCounts);
  var typeData   = typeLabels.map(function (t) { return typeCounts[t]; });

  var ctx1 = document.getElementById('chart-crimes-by-type');
  if (ctx1) {
    new Chart(ctx1.getContext('2d'), {
      type: 'bar',
      data: {
        labels: typeLabels,
        datasets: [{
          label: 'Reports',
          data: typeData,
          backgroundColor: ['#c0392b','#2980b9','#27ae60','#f39c12','#8e44ad','#00897b'],
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f0f2f5' } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  // ── CHART 2: Status Distribution (Doughnut) ──
  // CHANGED: counting moved into countReportsByStatus(); the chart is kept in
  // `statusChart`, any old chart on this canvas is destroyed first, and the
  // centre-text plugin is attached. Colours, legend, cutout and size are unchanged.
  var statusCounts = countReportsByStatus(reports);

  var ctx2 = document.getElementById('chart-status-dist');
  if (ctx2) {
    var oldChart = Chart.getChart(ctx2);     // avoids "Canvas is already in use"
    if (oldChart) oldChart.destroy();

    statusChart = new Chart(ctx2.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: Object.keys(statusCounts),
        datasets: [{
          data: Object.values(statusCounts),
          backgroundColor: ['#f39c12','#2980b9','#27ae60','#95a5a6'],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '65%',
        plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } }
      },
      plugins: [statusCenterTextPlugin]
    });
  }

  // ── CHART 3: Monthly Trend (Line) ──
  // Count reports per month for the last 6 months
  var monthLabels = [];
  var monthData   = [];
  var now = new Date();
  for (var m = 5; m >= 0; m--) {
    var d    = new Date(now.getFullYear(), now.getMonth() - m, 1);
    var yy   = d.getFullYear();
    var mm   = String(d.getMonth() + 1).padStart(2, '0');
    var key  = yy + '-' + mm;
    monthLabels.push(d.toLocaleString('en-IN', { month: 'short', year: '2-digit' }));
    var count = reports.filter(function (r) {
      return r.date && r.date.startsWith(key);
    }).length;
    monthData.push(count);
  }

  var ctx3 = document.getElementById('chart-monthly-trend');
  if (ctx3) {
    new Chart(ctx3.getContext('2d'), {
      type: 'line',
      data: {
        labels: monthLabels,
        datasets: [{
          label: 'Reports',
          data: monthData,
          borderColor: '#0d1b2a',
          backgroundColor: 'rgba(13,27,42,0.08)',
          borderWidth: 2.5,
          pointRadius: 5,
          pointBackgroundColor: '#0d1b2a',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f0f2f5' } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  // ── CHART 4: Crimes by District (Bar) ──
  var districtCounts = {};
  reports.forEach(function (r) {
    var d = r.district || 'Unknown';
    districtCounts[d] = (districtCounts[d] || 0) + 1;
  });
  var distLabels = Object.keys(districtCounts);
  var distData   = distLabels.map(function (d) { return districtCounts[d]; });

  var ctx4 = document.getElementById('chart-by-district');
  if (ctx4) {
    new Chart(ctx4.getContext('2d'), {
      type: 'bar',
      data: {
        labels: distLabels,
        datasets: [{
          label: 'Reports',
          data: distData,
          backgroundColor: 'rgba(0,137,123,0.75)',
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        indexAxis: 'y', // horizontal bar chart
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f0f2f5' } },
          y: { grid: { display: false } }
        }
      }
    });
  }
}

/* ════════════════════════════════════════════════════════════
   SECTION C — CRIME REPORTS TABLE
   Used by: admin/crime-reports.html
   ════════════════════════════════════════════════════════════ */

var currentReportsPage = 1;
var reportsPerPage = 10;
var filteredReports = [];

/**
 * loadCrimeReports — initialises the crime reports table page.
 */
function loadCrimeReports() {
  setTopbarDate();
  updateNavBadges();
  filteredReports = safeGetJSON('sc_reports');
  renderReportsTable();
  attachReportsFilters();
}

/**
 * renderReportsTable — renders the current page of filteredReports.
 */
function renderReportsTable() {
  var tbody = document.getElementById('reports-tbody');
  if (!tbody) return;

  var start = (currentReportsPage - 1) * reportsPerPage;
  var end   = start + reportsPerPage;
  var page  = filteredReports.slice(start, end);

  if (filteredReports.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><i class="bi bi-inbox"></i><p>No reports found.</p></div></td></tr>';
    renderPagination('reports-pagination', 0, 1);
    return;
  }

  tbody.innerHTML = page.map(function (r) {
    return '<tr>' +
      '<td><span class="fw-semibold" style="color:var(--primary)">' + r.id + '</span></td>' +
      '<td>' + formatDate(r.date) + '</td>' +
      '<td>' + (r.type || '—') + '</td>' +
      '<td>' + (r.district || (r.location ? r.location.split(',').pop().trim() : '—')) + '</td>' +
      '<td>' + (r.reporterName || '—') + '</td>' +
      '<td>' + statusBadgeHTML(r.status) + '</td>' +
      '<td>' + priorityBadgeHTML(r.priority) + '</td>' +
      '<td>' +
        '<button class="btn-action btn-action-view me-1" onclick="viewReport(\'' + r.id + '\')" title="View"><i class="bi bi-eye"></i></button>' +
        '<button class="btn-action btn-action-edit me-1" onclick="openEditReportModal(\'' + r.id + '\')" title="Edit"><i class="bi bi-pencil"></i></button>' +
        '<button class="btn-action btn-action-delete" onclick="deleteReport(\'' + r.id + '\')" title="Delete"><i class="bi bi-trash"></i></button>' +
      '</td>' +
    '</tr>';
  }).join('');

  renderPagination('reports-pagination', filteredReports.length, currentReportsPage);
  // Update count display — the element ID is 'reports-count' in the pagination footer
  var countEl = document.getElementById('reports-count');
  if (countEl) countEl.textContent = 'Showing ' + Math.min(end, filteredReports.length) + ' of ' + filteredReports.length + ' reports';
  // Also update the header count badge if it exists
  var hdrEl = document.getElementById('reports-header-count');
  if (hdrEl) hdrEl.textContent = filteredReports.length + ' total';
}

/**
 * attachReportsFilters — wires up the search input and status/type dropdowns.
 */
function attachReportsFilters() {
  var searchInput  = document.getElementById('search-reports');
  var statusFilter = document.getElementById('filter-status');
  var typeFilter   = document.getElementById('filter-type');

  function applyFilters() {
    var query  = searchInput  ? searchInput.value.toLowerCase() : '';
    var status = statusFilter ? statusFilter.value : '';
    var type   = typeFilter   ? typeFilter.value   : '';

    var allReports = safeGetJSON('sc_reports');
    filteredReports = allReports.filter(function (r) {
      var matchSearch = !query || (
        r.id.toLowerCase().includes(query) ||
        (r.reporterName  && r.reporterName.toLowerCase().includes(query))  ||
        (r.type          && r.type.toLowerCase().includes(query))          ||
        (r.location      && r.location.toLowerCase().includes(query))
      );
      var matchStatus = !status || r.status === status;
      var matchType   = !type   || r.type   === type;
      return matchSearch && matchStatus && matchType;
    });

    currentReportsPage = 1;
    renderReportsTable();
  }

  if (searchInput)  searchInput.addEventListener('input', applyFilters);
  if (statusFilter) statusFilter.addEventListener('change', applyFilters);
  if (typeFilter)   typeFilter.addEventListener('change', applyFilters);
}

/**
 * viewReport — opens the view modal with full report details (read-only).
 */
function viewReport(reportId) {
  var reports = safeGetJSON('sc_reports');
  var report  = reports.find(function (r) { return r.id === reportId; });
  if (!report) return;

  var bodyEl = document.getElementById('report-modal-body');
  if (bodyEl) {
    bodyEl.innerHTML =
      '<div class="review-section">' +
        '<div class="review-section-title">Incident Details</div>' +
        '<div class="review-row"><span class="review-key">Report ID:</span><span class="review-val">' + report.id + '</span></div>' +
        '<div class="review-row"><span class="review-key">Type:</span><span class="review-val">' + report.type + '</span></div>' +
        '<div class="review-row"><span class="review-key">Date / Time:</span><span class="review-val">' + formatDate(report.date) + (report.time ? ' at ' + report.time : '') + '</span></div>' +
        '<div class="review-row"><span class="review-key">Severity:</span><span class="review-val">' + report.severity + '</span></div>' +
        '<div class="review-row"><span class="review-key">Status:</span><span class="review-val">' + statusBadgeHTML(report.status) + '</span></div>' +
        '<div class="review-row"><span class="review-key">Priority:</span><span class="review-val">' + priorityBadgeHTML(report.priority) + '</span></div>' +
      '</div>' +
      '<div class="review-section">' +
        '<div class="review-section-title">Location</div>' +
        '<div class="review-row"><span class="review-key">Address:</span><span class="review-val">' + report.location + '</span></div>' +
        '<div class="review-row"><span class="review-key">District:</span><span class="review-val">' + (report.district || '—') + '</span></div>' +
      '</div>' +
      '<div class="review-section">' +
        '<div class="review-section-title">Description</div>' +
        '<p style="font-size:0.88rem;color:var(--text)">' + report.description + '</p>' +
      '</div>' +
      '<div class="review-section">' +
        '<div class="review-section-title">Reporter</div>' +
        '<div class="review-row"><span class="review-key">Name:</span><span class="review-val">' + report.reporterName + '</span></div>' +
        '<div class="review-row"><span class="review-key">Email:</span><span class="review-val">' + report.reporterEmail + '</span></div>' +
        '<div class="review-row"><span class="review-key">Phone:</span><span class="review-val">' + report.reporterPhone + '</span></div>' +
      '</div>' +
      (report.suspectName ?
        '<div class="review-section">' +
          '<div class="review-section-title">Suspect Information</div>' +
          '<div class="review-row"><span class="review-key">Name:</span><span class="review-val">' + report.suspectName + '</span></div>' +
          '<div class="review-row"><span class="review-key">Description:</span><span class="review-val">' + (report.suspectDesc || '—') + '</span></div>' +
        '</div>' : '');
  }

  document.getElementById('report-modal-title').textContent = 'Report: ' + reportId;
  openAdminModal('report-modal');
}

/**
 * openEditReportModal — opens the edit modal for a specific report.
 * Pre-fills the status and assigned officer fields.
 */
function openEditReportModal(reportId) {
  var reports = safeGetJSON('sc_reports');
  var report  = reports.find(function (r) { return r.id === reportId; });
  if (!report) return;

  document.getElementById('edit-report-id').value      = report.id;
  document.getElementById('edit-report-status').value  = report.status;
  document.getElementById('edit-report-officer').value = report.assignedOfficer || '';
  document.getElementById('edit-report-priority').value = report.priority || 'Medium';

  openAdminModal('edit-report-modal');
}

/**
 * saveEditReport — saves the edited status/officer back to localStorage.
 * Preserves reportId and userId, updates statusHistory, and generates a notification.
 */
function saveEditReport() {
  var id       = document.getElementById('edit-report-id').value;
  var status   = document.getElementById('edit-report-status').value;
  var officer  = document.getElementById('edit-report-officer').value;
  var priority = document.getElementById('edit-report-priority').value;

  var reports = safeGetJSON('sc_reports');
  var idx = reports.findIndex(function (r) {
    return r.id === id || r.reportId === id;
  });
  if (idx === -1) return;

  var oldStatus = reports[idx].status;
  var nowISO = new Date().toISOString();

  // Update fields in-place while preserving id, reportId, userId, date, reporter details
  reports[idx].status          = status;
  reports[idx].assignedOfficer = officer;
  reports[idx].priority        = priority;
  reports[idx].updatedAt       = nowISO;

  // Record status update in statusHistory
  if (!Array.isArray(reports[idx].statusHistory)) {
    reports[idx].statusHistory = [];
  }

  if (oldStatus !== status) {
    reports[idx].statusHistory.push({
      status: status,
      date: nowISO,
      officer: officer || 'Police Department',
      note: 'Status updated from ' + oldStatus + ' to ' + status
    });

    // Notify user if report belongs to a registered client
    var targetUserId = reports[idx].userId;
    if (targetUserId && typeof addNotification === 'function') {
      var notifType = (status === 'Resolved' || status === 'Closed') ? 'success' : 'info';
      var notifTitle = 'Report Status: ' + status;
      var notifMessage = 'Your crime report ' + (reports[idx].id || id) + ' (' + (reports[idx].type || 'Incident') + ') has been updated to "' + status + '".';
      addNotification({
        userId: targetUserId,
        reportId: reports[idx].id || id,
        title: notifTitle,
        message: notifMessage,
        type: notifType
      });
    }
  }

  safeSetJSON('sc_reports', reports);

  closeAdminModal('edit-report-modal');
  filteredReports = reports;
  renderReportsTable();
  updateNavBadges();
  showToast('Report updated successfully.', 'success');
}

/**
 * deleteReport — confirms then deletes a report from localStorage.
 */
function deleteReport(reportId) {
  confirmDialog('Delete report ' + reportId + '? This cannot be undone.', 'Delete Report').then(function (yes) {
    if (!yes) return;
    var reports = safeGetJSON('sc_reports');
    var updated = reports.filter(function (r) { return r.id !== reportId; });
    safeSetJSON('sc_reports', updated);
    filteredReports = updated;
    renderReportsTable();
    showToast('Report deleted.', 'success');
  });
}

/* ════════════════════════════════════════════════════════════
   SECTION D — ANONYMOUS TIPS TABLE
   Used by: admin/anonymous-tips.html
   ════════════════════════════════════════════════════════════ */

var currentTipsPage = 1;
var tipsPerPage = 10;
var filteredTips = [];

function loadTipsPage() {
  setTopbarDate();
  updateNavBadges();
  filteredTips = safeGetJSON('sc_tips');
  renderTipsTable();
  attachTipsFilters();
}

function renderTipsTable() {
  var tbody = document.getElementById('tips-tbody');
  if (!tbody) return;

  var start = (currentTipsPage - 1) * tipsPerPage;
  var end   = start + tipsPerPage;
  var page  = filteredTips.slice(start, end);

  if (filteredTips.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><i class="bi bi-inbox"></i><p>No tips found.</p></div></td></tr>';
    renderPagination('tips-pagination', 0, 1);
    return;
  }

  tbody.innerHTML = page.map(function (t) {
    return '<tr>' +
      '<td><span class="fw-semibold" style="color:var(--primary)">' + t.id + '</span></td>' +
      '<td>' + formatDate(t.date) + '</td>' +
      '<td>' + (t.category || '—') + '</td>' +
      '<td>' + (t.location || '—') + '</td>' +
      '<td>' + statusBadgeHTML(t.status) + '</td>' +
      '<td>' +
        '<button class="btn-action btn-action-view me-1" onclick="viewTip(\'' + t.id + '\')" title="View"><i class="bi bi-eye"></i></button>' +
        '<button class="btn-action btn-action-edit me-1" onclick="openChangeTipStatus(\'' + t.id + '\')" title="Change Status"><i class="bi bi-toggle-on"></i></button>' +
        '<button class="btn-action btn-action-delete" onclick="deleteTip(\'' + t.id + '\')" title="Delete"><i class="bi bi-trash"></i></button>' +
      '</td>' +
    '</tr>';
  }).join('');

  renderPagination('tips-pagination', filteredTips.length, currentTipsPage);
  var countEl = document.getElementById('tips-count');
  if (countEl) countEl.textContent = 'Showing ' + Math.min(end, filteredTips.length) + ' of ' + filteredTips.length + ' tips';
}

function attachTipsFilters() {
  var searchInput  = document.getElementById('search-tips');
  var statusFilter = document.getElementById('filter-tip-status');
  var catFilter    = document.getElementById('filter-tip-category');

  function applyFilters() {
    var query  = searchInput  ? searchInput.value.toLowerCase() : '';
    var status = statusFilter ? statusFilter.value : '';
    var cat    = catFilter    ? catFilter.value    : '';
    var allTips = safeGetJSON('sc_tips');
    filteredTips = allTips.filter(function (t) {
      var matchSearch = !query  || t.id.toLowerCase().includes(query) || (t.location && t.location.toLowerCase().includes(query)) || (t.description && t.description.toLowerCase().includes(query));
      var matchStatus = !status || t.status   === status;
      var matchCat    = !cat    || t.category === cat;
      return matchSearch && matchStatus && matchCat;
    });
    currentTipsPage = 1;
    renderTipsTable();
  }

  if (searchInput)  searchInput.addEventListener('input', applyFilters);
  if (statusFilter) statusFilter.addEventListener('change', applyFilters);
  if (catFilter)    catFilter.addEventListener('change', applyFilters);
}

function viewTip(tipId) {
  var tips = safeGetJSON('sc_tips');
  var tip  = tips.find(function (t) { return t.id === tipId; });
  if (!tip) return;

  var bodyEl = document.getElementById('tip-modal-body');
  if (bodyEl) {
    bodyEl.innerHTML =
      '<div class="review-section">' +
        '<div class="review-section-title">Tip Details</div>' +
        '<div class="review-row"><span class="review-key">Tip ID:</span><span class="review-val">' + tip.id + '</span></div>' +
        '<div class="review-row"><span class="review-key">Date:</span><span class="review-val">' + formatDate(tip.date) + '</span></div>' +
        '<div class="review-row"><span class="review-key">Category:</span><span class="review-val">' + tip.category + '</span></div>' +
        '<div class="review-row"><span class="review-key">Location:</span><span class="review-val">' + tip.location + '</span></div>' +
        '<div class="review-row"><span class="review-key">Status:</span><span class="review-val">' + statusBadgeHTML(tip.status) + '</span></div>' +
      '</div>' +
      '<div class="review-section">' +
        '<div class="review-section-title">Description</div>' +
        '<p style="font-size:0.88rem;color:var(--text)">' + tip.description + '</p>' +
      '</div>' +
      (tip.suspectInfo ? '<div class="review-section"><div class="review-section-title">Suspect Information</div><p style="font-size:0.88rem">' + tip.suspectInfo + '</p></div>' : '');
  }

  document.getElementById('tip-modal-title').textContent = 'Tip: ' + tipId;
  openAdminModal('tip-modal');
}

function openChangeTipStatus(tipId) {
  document.getElementById('change-tip-id').value = tipId;
  openAdminModal('change-tip-modal');
}

function saveChangeTipStatus() {
  var tipId  = document.getElementById('change-tip-id').value;
  var status = document.getElementById('change-tip-status-select').value;
  var tips   = safeGetJSON('sc_tips');
  var idx    = tips.findIndex(function (t) { return t.id === tipId; });
  if (idx === -1) return;
  tips[idx].status = status;
  safeSetJSON('sc_tips', tips);
  filteredTips = tips;
  renderTipsTable();
  closeAdminModal('change-tip-modal');
  showToast('Tip status updated.', 'success');
}

function deleteTip(tipId) {
  confirmDialog('Delete tip ' + tipId + '?', 'Delete Tip').then(function (yes) {
    if (!yes) return;
    var tips    = safeGetJSON('sc_tips');
    var updated = tips.filter(function (t) { return t.id !== tipId; });
    safeSetJSON('sc_tips', updated);
    filteredTips = updated;
    renderTipsTable();
    showToast('Tip deleted.', 'success');
  });
}

/* ════════════════════════════════════════════════════════════
   SECTION E — INVESTIGATIONS TABLE
   Used by: admin/investigations.html
   ════════════════════════════════════════════════════════════ */

var filteredInvestigations = [];
var currentInvPage = 1;

function loadInvestigationsPage() {
  setTopbarDate();
  updateNavBadges();
  filteredInvestigations = safeGetJSON('sc_investigations');
  renderInvestigationsTable();
  attachInvestigationsFilters();
  populateOfficerDropdowns();
}

function renderInvestigationsTable() {
  var tbody = document.getElementById('inv-tbody');
  if (!tbody) return;

  var start = (currentInvPage - 1) * 10;
  var page  = filteredInvestigations.slice(start, start + 10);

  if (filteredInvestigations.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><i class="bi bi-inbox"></i><p>No investigations found.</p></div></td></tr>';
    renderPagination('inv-pagination', 0, 1);
    return;
  }

  var officers = safeGetJSON('sc_officers');
  tbody.innerHTML = page.map(function (inv) {
    var officer = officers.find(function (o) { return o.id === inv.assignedOfficer; });
    var officerName = officer ? officer.name : (inv.assignedOfficer || 'Unassigned');
    return '<tr>' +
      '<td><span class="fw-semibold" style="color:var(--primary)">' + inv.id + '</span></td>' +
      '<td><span class="text-muted-sm">' + (inv.reportId || '—') + '</span>' + (inv.title ? '<br><strong>' + inv.title + '</strong>' : '') + '</td>' +
      '<td>' + formatDate(inv.startDate) + '</td>' +
      '<td>' + (officerName.length > 25 ? officerName.substring(0,25)+'…' : officerName) + '</td>' +
      '<td>' + statusBadgeHTML(inv.status) + '</td>' +
      '<td>' + (inv.lastUpdated ? formatDate(inv.lastUpdated) : '—') + '</td>' +
      '<td>' +
        '<button class="btn-action btn-action-view me-1" onclick="viewInvestigation(\'' + inv.id + '\')" title="View"><i class="bi bi-eye"></i></button>' +
        '<button class="btn-action btn-action-edit me-1" onclick="openEditInvestigation(\'' + inv.id + '\')" title="Edit"><i class="bi bi-pencil"></i></button>' +
        '<button class="btn-action btn-action-delete" onclick="deleteInvestigation(\'' + inv.id + '\')" title="Delete"><i class="bi bi-trash"></i></button>' +
      '</td>' +
    '</tr>';
  }).join('');

  renderPagination('inv-pagination', filteredInvestigations.length, currentInvPage);
}

function attachInvestigationsFilters() {
  var statusFilter  = document.getElementById('filter-inv-status');
  var officerFilter = document.getElementById('filter-inv-officer');
  function apply() {
    var status  = statusFilter  ? statusFilter.value  : '';
    var officer = officerFilter ? officerFilter.value : '';
    var all = safeGetJSON('sc_investigations');
    filteredInvestigations = all.filter(function (i) {
      return (!status || i.status === status) && (!officer || i.assignedOfficer === officer);
    });
    currentInvPage = 1;
    renderInvestigationsTable();
  }
  if (statusFilter)  statusFilter.addEventListener('change', apply);
  if (officerFilter) officerFilter.addEventListener('change', apply);
}

function viewInvestigation(invId) {
  var investigations = safeGetJSON('sc_investigations');
  var inv = investigations.find(function (i) { return i.id === invId; });
  if (!inv) return;
  var officers = safeGetJSON('sc_officers');
  var officer  = officers.find(function (o) { return o.id === inv.assignedOfficer; });

  var bodyEl = document.getElementById('inv-modal-body');
  if (bodyEl) {
    bodyEl.innerHTML =
      '<div class="review-section">' +
        '<div class="review-section-title">Investigation Details</div>' +
        '<div class="review-row"><span class="review-key">ID:</span><span class="review-val">' + inv.id + '</span></div>' +
        '<div class="review-row"><span class="review-key">Title:</span><span class="review-val">' + inv.title + '</span></div>' +
        '<div class="review-row"><span class="review-key">Related Report:</span><span class="review-val">' + (inv.reportId || '—') + '</span></div>' +
        '<div class="review-row"><span class="review-key">Start Date:</span><span class="review-val">' + formatDate(inv.startDate) + '</span></div>' +
        '<div class="review-row"><span class="review-key">Last Updated:</span><span class="review-val">' + formatDate(inv.lastUpdated) + '</span></div>' +
        '<div class="review-row"><span class="review-key">Status:</span><span class="review-val">' + statusBadgeHTML(inv.status) + '</span></div>' +
        '<div class="review-row"><span class="review-key">Assigned Officer:</span><span class="review-val">' + (officer ? officer.name : 'Unassigned') + '</span></div>' +
      '</div>' +
      '<div class="review-section"><div class="review-section-title">Investigation Notes</div>' +
        '<p style="font-size:0.88rem">' + (inv.notes || 'No notes recorded.') + '</p>' +
      '</div>';
  }
  document.getElementById('inv-modal-title').textContent = 'Investigation: ' + invId;
  openAdminModal('inv-modal');
}

function openEditInvestigation(invId) {
  var investigations = safeGetJSON('sc_investigations');
  var inv = investigations.find(function (i) { return i.id === invId; });
  if (!inv) return;
  document.getElementById('edit-inv-id').value     = inv.id;
  document.getElementById('edit-inv-status').value = inv.status;
  document.getElementById('edit-inv-officer').value = inv.assignedOfficer || '';
  document.getElementById('edit-inv-notes').value  = inv.notes || '';
  openAdminModal('edit-inv-modal');
}

function saveEditInvestigation() {
  var id      = document.getElementById('edit-inv-id').value;
  var status  = document.getElementById('edit-inv-status').value;
  var officer = document.getElementById('edit-inv-officer').value;
  var notes   = document.getElementById('edit-inv-notes').value;
  var invs    = safeGetJSON('sc_investigations');
  var idx     = invs.findIndex(function (i) { return i.id === id; });
  if (idx === -1) return;
  invs[idx].status          = status;
  invs[idx].assignedOfficer = officer;
  invs[idx].notes           = notes;
  invs[idx].lastUpdated     = new Date().toISOString().split('T')[0];
  safeSetJSON('sc_investigations', invs);
  filteredInvestigations = invs;
  renderInvestigationsTable();
  closeAdminModal('edit-inv-modal');
  showToast('Investigation updated.', 'success');
}

function deleteInvestigation(invId) {
  confirmDialog('Delete investigation ' + invId + '?', 'Delete Investigation').then(function (yes) {
    if (!yes) return;
    var invs    = safeGetJSON('sc_investigations');
    var updated = invs.filter(function (i) { return i.id !== invId; });
    safeSetJSON('sc_investigations', updated);
    filteredInvestigations = updated;
    renderInvestigationsTable();
    showToast('Investigation deleted.', 'success');
  });
}

function openCreateInvestigation() {
  document.getElementById('create-inv-form').reset();
  populateOfficerDropdowns();
  openAdminModal('create-inv-modal');
}

function saveCreateInvestigation() {
  var form = document.getElementById('create-inv-form');
  var valid = validateForm(form);
  if (!valid) { showToast('Please fill in required fields.', 'error'); return; }

  var invs = safeGetJSON('sc_investigations');
  var newInv = {
    id:              'INV-' + new Date().getFullYear() + '-' + String(invs.length + 1).padStart(3,'0'),
    reportId:        document.getElementById('new-inv-report-id').value,
    title:           document.getElementById('new-inv-title').value,
    startDate:       new Date().toISOString().split('T')[0],
    status:          document.getElementById('new-inv-status').value,
    assignedOfficer: document.getElementById('new-inv-officer').value,
    notes:           document.getElementById('new-inv-notes').value,
    lastUpdated:     new Date().toISOString().split('T')[0]
  };
  invs.unshift(newInv);
  safeSetJSON('sc_investigations', invs);
  filteredInvestigations = invs;
  renderInvestigationsTable();
  closeAdminModal('create-inv-modal');
  showToast('Investigation created.', 'success');
}

/* ════════════════════════════════════════════════════════════
   SECTION F — OFFICERS TABLE
   Used by: admin/officers.html
   ════════════════════════════════════════════════════════════ */

var filteredOfficers = [];
var currentOfficersPage = 1;

function loadOfficersPage() {
  setTopbarDate();
  updateNavBadges();
  filteredOfficers = safeGetJSON('sc_officers');
  renderOfficersTable();
  attachOfficersFilters();
}

function renderOfficersTable() {
  var tbody = document.getElementById('officers-tbody');
  if (!tbody) return;

  var start = (currentOfficersPage - 1) * 10;
  var page  = filteredOfficers.slice(start, start + 10);

  if (filteredOfficers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><i class="bi bi-person-x"></i><p>No officers found.</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = page.map(function (o) {
    var initials = o.name.split(' ').map(function (w) { return w[0]; }).join('').substring(0,2).toUpperCase();
    return '<tr>' +
      '<td><span class="badge-status badge-low">' + o.badge + '</span></td>' +
      '<td>' +
        '<div style="display:flex;align-items:center;gap:8px">' +
          '<div class="officer-avatar" style="width:32px;height:32px;font-size:0.75rem">' + initials + '</div>' +
          '<div>' +
            '<div class="fw-semibold">' + o.name + '</div>' +
            '<div class="text-muted-sm">' + o.email + '</div>' +
          '</div>' +
        '</div>' +
      '</td>' +
      '<td>' + o.rank + '</td>' +
      '<td>' + o.department + '</td>' +
      '<td><span class="fw-semibold">' + o.casesAssigned + '</span></td>' +
      '<td>' + statusBadgeHTML(o.status) + '</td>' +
      '<td>' +
        '<button class="btn-action btn-action-view me-1" onclick="viewOfficer(\'' + o.id + '\')" title="View"><i class="bi bi-eye"></i></button>' +
        '<button class="btn-action btn-action-edit me-1" onclick="openEditOfficer(\'' + o.id + '\')" title="Edit"><i class="bi bi-pencil"></i></button>' +
        '<button class="btn-action btn-action-delete" onclick="deleteOfficer(\'' + o.id + '\')" title="Delete"><i class="bi bi-trash"></i></button>' +
      '</td>' +
    '</tr>';
  }).join('');

  renderPagination('officers-pagination', filteredOfficers.length, currentOfficersPage);
}

function attachOfficersFilters() {
  var searchInput   = document.getElementById('search-officers');
  var statusFilter  = document.getElementById('filter-officer-status');
  var deptFilter    = document.getElementById('filter-officer-dept');

  function apply() {
    var query  = searchInput  ? searchInput.value.toLowerCase()  : '';
    var status = statusFilter ? statusFilter.value : '';
    var dept   = deptFilter   ? deptFilter.value   : '';
    var all = safeGetJSON('sc_officers');
    filteredOfficers = all.filter(function (o) {
      var matchSearch = !query  || o.name.toLowerCase().includes(query) || o.badge.toLowerCase().includes(query);
      var matchStatus = !status || o.status     === status;
      var matchDept   = !dept   || o.department === dept;
      return matchSearch && matchStatus && matchDept;
    });
    currentOfficersPage = 1;
    renderOfficersTable();
  }

  if (searchInput)  searchInput.addEventListener('input', apply);
  if (statusFilter) statusFilter.addEventListener('change', apply);
  if (deptFilter)   deptFilter.addEventListener('change', apply);
}

function viewOfficer(officerId) {
  var officers = safeGetJSON('sc_officers');
  var o = officers.find(function (x) { return x.id === officerId; });
  if (!o) return;
  var initials = o.name.split(' ').map(function (w) { return w[0]; }).join('').substring(0,2).toUpperCase();

  var bodyEl = document.getElementById('officer-modal-body');
  if (bodyEl) {
    bodyEl.innerHTML =
      '<div class="officer-profile">' +
        '<div class="officer-avatar">' + initials + '</div>' +
        '<div><div class="officer-name">' + o.name + '</div><div class="officer-rank">' + o.rank + ' — ' + o.department + '</div></div>' +
      '</div>' +
      '<div class="review-section">' +
        '<div class="review-section-title">Officer Details</div>' +
        '<div class="review-row"><span class="review-key">Badge #:</span><span class="review-val">' + o.badge + '</span></div>' +
        '<div class="review-row"><span class="review-key">Email:</span><span class="review-val">' + o.email + '</span></div>' +
        '<div class="review-row"><span class="review-key">Phone:</span><span class="review-val">' + o.phone + '</span></div>' +
        '<div class="review-row"><span class="review-key">Status:</span><span class="review-val">' + statusBadgeHTML(o.status) + '</span></div>' +
        '<div class="review-row"><span class="review-key">Cases Assigned:</span><span class="review-val">' + o.casesAssigned + '</span></div>' +
        '<div class="review-row"><span class="review-key">Join Date:</span><span class="review-val">' + formatDate(o.joinDate) + '</span></div>' +
      '</div>';
  }
  document.getElementById('officer-modal-title').textContent = 'Officer: ' + o.name;
  openAdminModal('officer-view-modal');
}

function openAddOfficer() {
  document.getElementById('officer-form').reset();
  document.getElementById('officer-form-title').textContent = 'Add New Officer';
  document.getElementById('edit-officer-id').value = '';
  openAdminModal('officer-form-modal');
}

function openEditOfficer(officerId) {
  var officers = safeGetJSON('sc_officers');
  var o = officers.find(function (x) { return x.id === officerId; });
  if (!o) return;
  document.getElementById('officer-form-title').textContent   = 'Edit Officer';
  document.getElementById('edit-officer-id').value            = o.id;
  document.getElementById('officer-name-input').value         = o.name;
  document.getElementById('officer-badge-input').value        = o.badge;
  document.getElementById('officer-rank-input').value         = o.rank;
  document.getElementById('officer-dept-input').value         = o.department;
  document.getElementById('officer-phone-input').value        = o.phone;
  document.getElementById('officer-email-input').value        = o.email;
  document.getElementById('officer-status-input').value       = o.status;
  openAdminModal('officer-form-modal');
}

function saveOfficer() {
  var form = document.getElementById('officer-form');
  if (!validateForm(form)) { showToast('Please fill required fields.', 'error'); return; }

  var id = document.getElementById('edit-officer-id').value;
  var officers = safeGetJSON('sc_officers');

  var officerData = {
    name:         document.getElementById('officer-name-input').value,
    badge:        document.getElementById('officer-badge-input').value,
    rank:         document.getElementById('officer-rank-input').value,
    department:   document.getElementById('officer-dept-input').value,
    phone:        document.getElementById('officer-phone-input').value,
    email:        document.getElementById('officer-email-input').value,
    status:       document.getElementById('officer-status-input').value,
    casesAssigned: 0
  };

  if (id) {
    // Edit existing
    var idx = officers.findIndex(function (o) { return o.id === id; });
    if (idx !== -1) {
      officerData.id           = id;
      officerData.casesAssigned = officers[idx].casesAssigned;
      officerData.joinDate     = officers[idx].joinDate;
      officers[idx] = officerData;
    }
  } else {
    // Add new
    officerData.id       = 'OFF-' + String(officers.length + 1).padStart(3, '0');
    officerData.joinDate = new Date().toISOString().split('T')[0];
    officers.unshift(officerData);
  }

  safeSetJSON('sc_officers', officers);
  filteredOfficers = officers;
  renderOfficersTable();
  closeAdminModal('officer-form-modal');
  showToast(id ? 'Officer updated.' : 'Officer added.', 'success');
}

function deleteOfficer(officerId) {
  confirmDialog('Delete this officer record?', 'Delete Officer').then(function (yes) {
    if (!yes) return;
    var officers = safeGetJSON('sc_officers');
    var updated  = officers.filter(function (o) { return o.id !== officerId; });
    safeSetJSON('sc_officers', updated);
    filteredOfficers = updated;
    renderOfficersTable();
    showToast('Officer deleted.', 'success');
  });
}

/* ════════════════════════════════════════════════════════════
   SECTION G — SHARED PAGINATION & MODAL HELPERS
   ════════════════════════════════════════════════════════════ */

/**
 * renderPagination — creates page number buttons inside a container.
 * @param {string} containerId  - ID of the pagination div
 * @param {number} totalItems   - total count of items
 * @param {number} currentPage  - which page we're on
 */
function renderPagination(containerId, totalItems, currentPage) {
  var container = document.getElementById(containerId);
  if (!container) return;

  var totalPages = Math.ceil(totalItems / 10) || 1;
  var html = '';

  html += '<button class="btn-page" onclick="changePage(\'' + containerId + '\',' + (currentPage - 1) + ')" ' + (currentPage <= 1 ? 'disabled' : '') + '><i class="bi bi-chevron-left"></i></button>';

  for (var p = 1; p <= totalPages; p++) {
    html += '<button class="btn-page' + (p === currentPage ? ' active' : '') + '" onclick="changePage(\'' + containerId + '\',' + p + ')">' + p + '</button>';
  }

  html += '<button class="btn-page" onclick="changePage(\'' + containerId + '\',' + (currentPage + 1) + ')" ' + (currentPage >= totalPages ? 'disabled' : '') + '><i class="bi bi-chevron-right"></i></button>';

  container.innerHTML = html;
}

/**
 * changePage — updates the current page variable for the correct table
 * and re-renders it.
 */
function changePage(containerId, page) {
  if (containerId === 'reports-pagination') {
    currentReportsPage = page;
    renderReportsTable();
  } else if (containerId === 'tips-pagination') {
    currentTipsPage = page;
    renderTipsTable();
  } else if (containerId === 'inv-pagination') {
    currentInvPage = page;
    renderInvestigationsTable();
  } else if (containerId === 'officers-pagination') {
    currentOfficersPage = page;
    renderOfficersTable();
  }
}

/**
 * openAdminModal — shows a modal overlay by ID.
 */
function openAdminModal(modalId) {
  var el = document.getElementById(modalId);
  if (el) {
    el.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
}

/**
 * closeAdminModal — hides a modal overlay by ID.
 */
function closeAdminModal(modalId) {
  var el = document.getElementById(modalId);
  if (el) {
    el.style.display = 'none';
    document.body.style.overflow = '';
  }
}

// Close modal when clicking the dark overlay background
document.addEventListener('click', function (e) {
  if (e.target.classList.contains('admin-modal-overlay')) {
    e.target.style.display = 'none';
    document.body.style.overflow = '';
  }
});

/**
 * populateOfficerDropdowns — fills officer <select> elements with current officers.
 */
function populateOfficerDropdowns() {
  var officers  = safeGetJSON('sc_officers');
  var dropdowns = document.querySelectorAll('.officer-dropdown');
  dropdowns.forEach(function (sel) {
    var currentVal = sel.value;
    sel.innerHTML = '<option value="">— Unassigned —</option>' +
      officers.map(function (o) {
        return '<option value="' + o.id + '">' + o.name + ' (' + o.rank + ')</option>';
      }).join('');
    sel.value = currentVal; // restore previous selection
  });
}