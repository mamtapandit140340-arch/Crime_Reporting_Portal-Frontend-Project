/* ============================================================
   report.js — JavaScript for client-facing forms:
   - Multi-step crime report wizard (report-crime.html)
   - Anonymous tip submission (anonymous-tip.html)
   - Report tracking (track-report.html)
   ============================================================ */

/* ════════════════════════════════════════════════════════════
   SECTION A — MULTI-STEP CRIME REPORT WIZARD
   Used by: client/report-crime.html
   ════════════════════════════════════════════════════════════ */

// Tracks which step the user is currently on (1-indexed)
var currentStep = 1;
var totalSteps  = 4;

// Object to hold all form data across steps before final submit
var reportFormData = {};

// Prevent duplicate rapid submissions
var isSubmittingCrimeReport = false;

/**
 * initReportWizard — sets up the multi-step form on page load.
 * Call this from report-crime.html after the DOM is ready.
 */
function initReportWizard() {
  showStep(1);

  // Auto-fill reporter details if a client user is logged in
  if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
    var currentUser = Auth.getSession();
    if (currentUser) {
      var nameInput = document.getElementById('reporter-name');
      var emailInput = document.getElementById('reporter-email');
      if (nameInput && !nameInput.value && currentUser.name) {
        nameInput.value = currentUser.name;
      }
      if (emailInput && !emailInput.value && currentUser.email) {
        emailInput.value = currentUser.email;
      }
    }
  }

  // Attach character counter to description textarea
  var descTextarea = document.getElementById('incident-description');
  if (descTextarea) {
    attachCharCounter(descTextarea, 'desc-counter', 50, 1000);
  }

  // Attach real-time validation to all steps
  var form = document.getElementById('crime-report-form');
  if (form) {
    attachRealTimeValidation(form);
  }
}

/**
 * showStep — displays the given step and hides all others.
 * Updates the progress bar indicators.
 */
function showStep(stepNumber) {
  currentStep = stepNumber;

  // Show/hide step panels
  for (var s = 1; s <= totalSteps; s++) {
    var panel = document.getElementById('step-' + s);
    if (panel) {
      panel.classList.toggle('active', s === stepNumber);
    }
  }

  // Update step progress indicators
  for (var i = 1; i <= totalSteps; i++) {
    var item = document.getElementById('step-indicator-' + i);
    if (!item) continue;
    item.classList.remove('active', 'completed');
    if (i < stepNumber)  item.classList.add('completed');
    if (i === stepNumber) item.classList.add('active');
  }

  // Scroll to top of form
  var formCard = document.getElementById('report-form-card');
  if (formCard) {
    formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/**
 * nextStep — validates the current step fields before advancing.
 * Each step has fields with data-step="N" or lives inside #step-N.
 */
function nextStep() {
  var stepPanel = document.getElementById('step-' + currentStep);
  if (!stepPanel) return;

  // Validate only the fields inside the current visible step
  var fieldsInStep = stepPanel.querySelectorAll('[data-validate]');
  var tempForm = { querySelectorAll: function () { return fieldsInStep; } };
  var valid = validateForm(tempForm);

  if (!valid) {
    showToast('Please fix the errors before continuing.', 'error');
    return;
  }

  // Collect data from this step
  collectStepData(stepPanel);

  // If on the last step before review, populate review panel
  if (currentStep === 3) {
    populateReviewPanel();
  }

  if (currentStep < totalSteps) {
    showStep(currentStep + 1);
  }
}

/**
 * prevStep — goes back one step without validation.
 */
function prevStep() {
  if (currentStep > 1) {
    showStep(currentStep - 1);
  }
}

/**
 * collectStepData — reads all named inputs in the given step panel
 * and stores them in reportFormData.
 */
function collectStepData(stepPanel) {
  var inputs = stepPanel.querySelectorAll('input, select, textarea');
  inputs.forEach(function (input) {
    if (!input.name) return;
    if (input.type === 'radio') {
      if (input.checked) reportFormData[input.name] = input.value;
    } else if (input.type === 'checkbox') {
      reportFormData[input.name] = input.checked;
    } else {
      reportFormData[input.name] = input.value;
    }
  });
}

/**
 * populateReviewPanel — fills the Step 4 review summary with
 * data collected from previous steps.
 */
function populateReviewPanel() {
  var setVal = function (id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val || '—';
  };

  setVal('review-crime-type',    reportFormData['crime-type']);
  setVal('review-date',          reportFormData['incident-date']);
  setVal('review-time',          reportFormData['incident-time']);
  setVal('review-severity',      reportFormData['severity']);
  setVal('review-description',   reportFormData['incident-description']);
  setVal('review-address',       reportFormData['street-address']);
  setVal('review-district',      reportFormData['district']);
  setVal('review-state',         reportFormData['state']);
  setVal('review-landmark',      reportFormData['landmark'] || 'None provided');
  setVal('review-suspect-name',  reportFormData['suspect-name'] || 'None provided');
  setVal('review-suspect-desc',  reportFormData['suspect-desc'] || 'None provided');
  setVal('review-reporter-name', reportFormData['reporter-name']);
  setVal('review-reporter-email',reportFormData['reporter-email']);
  setVal('review-reporter-phone',reportFormData['reporter-phone']);
}

/**
 * submitCrimeReport — called when the user clicks "Submit Report"
 * on the final step. Validates the step, collects data, saves to
 * localStorage, and shows the success modal with tracking ID.
 */
function submitCrimeReport() {
  if (isSubmittingCrimeReport) return; // Prevent duplicate rapid clicks

  var stepPanel = document.getElementById('step-4');
  if (!stepPanel) return;

  // Validate final step fields
  var fields = stepPanel.querySelectorAll('[data-validate]');
  var tempForm = { querySelectorAll: function () { return fields; } };
  var valid = validateForm(tempForm);

  // Also check the confirmation checkbox
  var confirmCheckbox = document.getElementById('confirm-accuracy');
  if (confirmCheckbox && !confirmCheckbox.checked) {
    showToast('Please confirm that the information is accurate.', 'error');
    return;
  }

  if (!valid) {
    showToast('Please fill in all required fields.', 'error');
    return;
  }

  isSubmittingCrimeReport = true;
  var submitBtn = stepPanel.querySelector('.btn-submit-report');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Submitting…';
  }

  // Collect final step data
  collectStepData(stepPanel);

  // Retrieve logged-in user unique ID
  var currentUser = typeof Auth !== 'undefined' ? Auth.getSession() : null;
  var currentUserId = currentUser ? (currentUser.userId || '') : (localStorage.getItem('sc_client_userId') || '');

  // Generate a unique tracking ID
  var trackingId = generateId('SC');
  var nowISO = new Date().toISOString();
  reportFormData.id          = trackingId;
  reportFormData.status      = 'Pending';
  reportFormData.priority    = derivePriority(reportFormData['severity']);
  reportFormData.submittedAt = nowISO;
  reportFormData.assignedOfficer = '';

  // Map form field names to storage field names with proper user ownership
  var report = {
    id:              trackingId,
    reportId:        trackingId, // Alias for compatibility
    userId:          currentUserId, // Attached logged-in user's unique ID
    title:           reportFormData['crime-type'] + ' at ' + (reportFormData['street-address'] || reportFormData['district'] || 'Location'),
    type:            reportFormData['crime-type'],
    category:        reportFormData['crime-type'],
    date:            reportFormData['incident-date'],
    time:            reportFormData['incident-time'],
    location:        reportFormData['street-address'] + ', ' + reportFormData['district'],
    district:        reportFormData['district'],
    state:           reportFormData['state'] || '',
    landmark:        reportFormData['landmark'] || '',
    description:     reportFormData['incident-description'],
    severity:        reportFormData['severity'],
    status:          'Pending',
    priority:        reportFormData.priority,
    reporterName:    reportFormData['reporter-name'],
    reporterEmail:   reportFormData['reporter-email'],
    reporterPhone:   reportFormData['reporter-phone'],
    suspectName:     reportFormData['suspect-name'] || '',
    suspectDesc:     reportFormData['suspect-desc'] || '',
    assignedOfficer: '',
    submittedAt:     nowISO,
    updatedAt:       nowISO,
    statusHistory:   [
      {
        status: 'Pending',
        date: nowISO,
        note: 'Crime report filed by citizen'
      }
    ]
  };

  // Save to localStorage using the shared sc_reports array
  var reports = safeGetJSON('sc_reports');
  reports.unshift(report); // Add to beginning of array
  safeSetJSON('sc_reports', reports);

  // Add initial notification for user
  if (currentUserId && typeof addNotification === 'function') {
    addNotification({
      userId: currentUserId,
      reportId: trackingId,
      title: 'Report Submitted',
      message: 'Your crime report ' + trackingId + ' (' + report.type + ') has been submitted and is pending police review.',
      type: 'info'
    });
  }

  showToast('Crime report submitted successfully! Tracking ID: ' + trackingId, 'success', 3500);

  // Show success modal
  showReportSuccessModal(trackingId);

  // Reset submit state
  setTimeout(function () {
    isSubmittingCrimeReport = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="bi bi-send me-1"></i> Submit Report';
    }
  }, 1000);
}

/**
 * derivePriority — maps severity label to priority level.
 */
function derivePriority(severity) {
  var map = { 'Critical': 'Critical', 'Serious': 'High', 'Moderate': 'Medium', 'Minor': 'Low' };
  return map[severity] || 'Medium';
}

/**
 * showReportSuccessModal — displays the success overlay with tracking ID.
 */
function showReportSuccessModal(trackingId) {
  var el = document.getElementById('report-success-modal');
  var idEl = document.getElementById('modal-tracking-id');
  if (el) {
    if (idEl) idEl.textContent = trackingId;
    el.style.display = 'flex';
  }
}

/**
 * copyTrackingId — copies the tracking ID to clipboard.
 */
function copyTrackingId() {
  var idEl = document.getElementById('modal-tracking-id');
  if (!idEl) return;
  navigator.clipboard.writeText(idEl.textContent).then(function () {
    showToast('Tracking ID copied to clipboard!', 'success');
  }).catch(function () {
    // Fallback for older browsers
    var el = document.createElement('textarea');
    el.value = idEl.textContent;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    showToast('Tracking ID copied!', 'success');
  });
}

/* ════════════════════════════════════════════════════════════
   SECTION B — ANONYMOUS TIP SUBMISSION
   Used by: client/anonymous-tip.html
   ════════════════════════════════════════════════════════════ */

/**
 * submitAnonymousTip — validates and submits the anonymous tip form.
 */
function submitAnonymousTip(formEl) {
  var valid = validateForm(formEl);
  if (!valid) {
    showToast('Please fill in all required fields.', 'error');
    return;
  }

  // Build tip object from form data
  var tipId = generateId('TIP');
  var tip = {
    id:          tipId,
    date:        formEl.querySelector('[name="tip-date"]') ? formEl.querySelector('[name="tip-date"]').value : new Date().toISOString().split('T')[0],
    category:    formEl.querySelector('[name="tip-category"]').value,
    description: formEl.querySelector('[name="tip-description"]').value,
    location:    formEl.querySelector('[name="tip-location"]').value,
    suspectInfo: formEl.querySelector('[name="suspect-info"]') ? formEl.querySelector('[name="suspect-info"]').value : '',
    status:      'New',
    submittedAt: new Date().toISOString()
  };

  // Save to localStorage
  var tips = safeGetJSON('sc_tips');
  tips.unshift(tip);
  safeSetJSON('sc_tips', tips);

  // Show success modal
  var el = document.getElementById('tip-success-modal');
  var idEl = document.getElementById('modal-tip-id');
  if (el) {
    if (idEl) idEl.textContent = tipId;
    el.style.display = 'flex';
  }
}

/* ════════════════════════════════════════════════════════════
   SECTION C — TRACK REPORT
   Used by: client/track-report.html
   ════════════════════════════════════════════════════════════ */

/**
 * trackReport — looks up a report by tracking ID and displays results.
 */
function trackReport() {
  var input = document.getElementById('tracking-id-input');
  if (!input) return;

  var trackingId = input.value.trim().toUpperCase();
  if (!trackingId) {
    showToast('Please enter a tracking ID.', 'error');
    input.classList.add('is-invalid');
    return;
  }

  input.classList.remove('is-invalid');
  var reports = safeGetJSON('sc_reports');
  var report  = null;

  // Find the report with the matching ID
  for (var i = 0; i < reports.length; i++) {
    var r = reports[i];
    if ((r.id && r.id.toUpperCase() === trackingId) ||
        (r.reportId && r.reportId.toUpperCase() === trackingId)) {
      report = r;
      break;
    }
  }

  var resultCard = document.getElementById('track-result');
  var notFound   = document.getElementById('track-not-found');

  if (!report) {
    // Show "not found" message
    if (resultCard)  resultCard.classList.remove('show');
    if (notFound) {
      notFound.style.display = 'block';
      notFound.innerHTML = '<div class="alert" style="background:#fdf3f2;border:1px solid #f5c6cb;color:#721c24;border-radius:8px;padding:1rem;">' +
        '<i class="bi bi-exclamation-circle me-2"></i>' +
        '<strong>Report not found.</strong> Please check the tracking ID and try again. ' +
        'Demo IDs: SC-20241001-1021, SC-20241003-2045, SC-20241007-4089</div>';
    }
    return;
  }

  // Hide not-found, show result card
  if (notFound) notFound.style.display = 'none';
  if (resultCard) {
    populateTrackResult(report);
    resultCard.classList.add('show');
  }
}

/**
 * populateTrackResult — fills the track result card with report details
 * and builds the status timeline.
 */
function populateTrackResult(report) {
  var setEl = function (id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val || '—';
  };

  setEl('result-id',       report.id);
  setEl('result-type',     report.type);
  setEl('result-date',     formatDate(report.date));
  setEl('result-location', report.location);
  setEl('result-reporter', report.reporterName);

  // Set the status badge
  var statusEl = document.getElementById('result-status');
  if (statusEl) {
    statusEl.textContent  = report.status;
    statusEl.className    = 'badge-status badge-' + statusToClass(report.status);
  }

  // Build timeline based on status
  buildTimeline(report);
}

/**
 * buildTimeline — creates timeline steps based on the report's current status.
 * The timeline always shows all 5 steps; completed steps are highlighted.
 */
function buildTimeline(report) {
  var container = document.getElementById('status-timeline');
  if (!container) return;

  // Define the status stages in order
  var stages = [
    { key: 'submitted',    label: 'Report Submitted',     icon: 'bi-send-check' },
    { key: 'review',       label: 'Under Review',          icon: 'bi-eye' },
    { key: 'assigned',     label: 'Assigned to Officer',   icon: 'bi-person-badge' },
    { key: 'active',       label: 'Investigation Active',  icon: 'bi-search' },
    { key: 'resolved',     label: 'Case Resolved / Closed',icon: 'bi-shield-check' }
  ];

  // Map report status to how many stages are completed
  var stageMap = {
    'Pending':              1,
    'Under Investigation':  3,
    'Resolved':             5,
    'Closed':               5
  };
  var completedCount = stageMap[report.status] || 1;

  var html = '';
  stages.forEach(function (stage, index) {
    var stageNum  = index + 1;
    var isCurrent = stageNum === completedCount;
    var isDone    = stageNum < completedCount;
    var cssClass  = isDone ? 'completed' : (isCurrent ? 'current' : '');

    var dateText = '';
    if (isDone || isCurrent) {
      // Show submitted date for first stage, today for active
      if (stageNum === 1 && report.submittedAt) {
        dateText = formatDateTime(report.submittedAt);
      } else if (isCurrent) {
        dateText = 'Currently at this stage';
      } else {
        dateText = formatDate(report.date);
      }
    }

    html +=
      '<div class="timeline-item ' + cssClass + '">' +
        '<div class="timeline-dot"></div>' +
        '<div class="timeline-title"><i class="bi ' + stage.icon + ' me-1"></i>' + stage.label + '</div>' +
        (dateText ? '<div class="timeline-date">' + dateText + '</div>' : '') +
      '</div>';
  });

  container.innerHTML = html;
}

/* ════════════════════════════════════════════════════════════
   SECTION D — UTILITY / HELPER FUNCTIONS
   ════════════════════════════════════════════════════════════ */

/**
 * generateId — creates a unique report/tip ID.
 * Format: PREFIX-YYYYMMDD-XXXX (e.g. SC-20241105-4821)
 */
function generateId(prefix) {
  var now    = new Date();
  var year   = now.getFullYear();
  var month  = String(now.getMonth() + 1).padStart(2, '0');
  var day    = String(now.getDate()).padStart(2, '0');
  var rand   = String(Math.floor(1000 + Math.random() * 9000)); // 4-digit random
  return prefix + '-' + year + month + day + '-' + rand;
}

/**
 * formatDate — converts "YYYY-MM-DD" to "DD MMM YYYY"
 */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  return parts[2] + ' ' + months[parseInt(parts[1], 10) - 1] + ' ' + parts[0];
}

/**
 * formatDateTime — converts ISO timestamp to readable date+time string.
 */
function formatDateTime(isoString) {
  if (!isoString) return '—';
  var d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  return formatDate(d.toISOString().split('T')[0]) + ' at ' +
    d.getHours().toString().padStart(2,'0') + ':' +
    d.getMinutes().toString().padStart(2,'0');
}

/**
 * statusToClass — maps a status string to a CSS badge class suffix.
 */
function statusToClass(status) {
  var map = {
    'Pending':              'pending',
    'Under Investigation':  'active',
    'Resolved':             'resolved',
    'Closed':               'closed',
    'New':                  'new',
    'Reviewed':             'reviewed',
    'Actionable':           'actionable',
    'Dismissed':            'dismissed'
  };
  return map[status] || 'pending';
}

/**
 * attachCharCounter — shows how many characters have been typed in
 * a textarea and warns when approaching the minimum or maximum.
 * @param {HTMLElement} textarea - the textarea element
 * @param {string} counterId - ID of the element showing the count
 * @param {number} minChars  - minimum required characters
 * @param {number} maxChars  - maximum allowed characters
 */
function attachCharCounter(textarea, counterId, minChars, maxChars) {
  var counter = document.getElementById(counterId);
  if (!counter) return;

  textarea.addEventListener('input', function () {
    var len = textarea.value.length;
    counter.textContent = len + ' / ' + maxChars + ' characters';
    counter.classList.remove('near-limit', 'at-limit');
    if (len >= maxChars) {
      counter.classList.add('at-limit');
    } else if (len >= maxChars * 0.9) {
      counter.classList.add('near-limit');
    }
  });
}

/**
 * tryGetLocation — requests GPS coordinates and fills lat/lon fields.
 * Shows a toast if geolocation is not available or denied.
 */
function tryGetLocation() {
  if (!navigator.geolocation) {
    showToast('Geolocation is not supported by your browser.', 'warning');
    return;
  }
  var btn = document.getElementById('gps-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Detecting…'; }

  navigator.geolocation.getCurrentPosition(
    function (position) {
      var lat = position.coords.latitude.toFixed(6);
      var lon = position.coords.longitude.toFixed(6);
      var latEl = document.getElementById('gps-lat');
      var lonEl = document.getElementById('gps-lon');
      if (latEl) latEl.value = lat;
      if (lonEl) lonEl.value = lon;
      if (btn) { btn.disabled = false; btn.textContent = '📍 Location Detected'; }
      showToast('GPS coordinates detected successfully.', 'success');
    },
    function () {
      if (btn) { btn.disabled = false; btn.textContent = '📍 Detect My Location'; }
      showToast('Could not detect location. Please enter manually.', 'warning');
    }
  );
}
