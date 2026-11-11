/* ============================================================
   main.js — Shared JavaScript for ALL pages
   Responsibilities:
   - Auto-update copyright year in footer
   - Set active nav link based on current URL
   - Seed LocalStorage with realistic sample data (once)
   - Toast notification helper: showToast(msg, type)
   - Confirmation dialog helper: confirmDialog(msg)
   - Mobile hamburger menu (admin sidebar)
   - Admin auth guard: redirect if not logged in on admin pages
   ============================================================ */

/* ── 1. FOOTER YEAR ─────────────────────────────────────── */
// Find any element with id="current-year" and fill it with the current year.
document.addEventListener('DOMContentLoaded', function () {
  var yearEl = document.getElementById('current-year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
});

/* ── 2. ACTIVE NAV LINK ─────────────────────────────────── */
// Compares each nav link's href against the current page URL.
// Adds the "active" class to the matching link.
document.addEventListener('DOMContentLoaded', function () {
  var currentPath = window.location.pathname;
  var navLinks = document.querySelectorAll('.site-navbar .nav-link');
  navLinks.forEach(function (link) {
    var href = link.getAttribute('href');
    if (!href) return;
    // Normalize both paths — strip leading slashes and compare endings
    if (currentPath.endsWith(href) || href.endsWith(currentPath.split('/').pop())) {
      link.classList.add('active');
    }
  });
});

/* ── 3. TOAST NOTIFICATION SYSTEM ─────────────────────── */
/**
 * showToast — displays a temporary notification banner.
 * @param {string} message  - Text to display
 * @param {string} type     - 'success' | 'error' | 'warning' | 'info'
 * @param {number} duration - How long to show it in ms (default 3500)
 */
function showToast(message, type, duration) {
  type = type || 'success';
  duration = duration || 3500;

  // Create container if it doesn't exist
  var container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  // Icon for each type
  var icons = {
    success: 'bi-check-circle-fill',
    error:   'bi-x-circle-fill',
    warning: 'bi-exclamation-triangle-fill',
    info:    'bi-info-circle-fill'
  };

  var toast = document.createElement('div');
  toast.className = 'toast-msg toast-' + type;
  toast.innerHTML = '<i class="bi ' + (icons[type] || icons.info) + '"></i> ' + message;
  container.appendChild(toast);

  // Auto-remove after duration
  setTimeout(function () {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(120%)';
    toast.style.transition = 'opacity 0.3s, transform 0.3s';
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, duration);
}

/* ── 4. CONFIRMATION DIALOG ─────────────────────────────── */
/**
 * confirmDialog — shows a styled modal confirmation dialog.
 * Returns a Promise that resolves to true (confirmed) or false (cancelled).
 * Usage: confirmDialog('Are you sure?').then(function(yes){ if(yes){...} })
 */
function confirmDialog(message, title) {
  title = title || 'Confirm Action';
  return new Promise(function (resolve) {
    // Create the overlay
    var overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML =
      '<div class="confirm-box">' +
        '<h5>' + title + '</h5>' +
        '<p>' + message + '</p>' +
        '<div class="confirm-actions">' +
          '<button class="btn-step-prev" id="confirm-cancel">Cancel</button>' +
          '<button class="btn-primary-custom" id="confirm-ok">Yes, Proceed</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    // OK button
    document.getElementById('confirm-ok').addEventListener('click', function () {
      document.body.removeChild(overlay);
      resolve(true);
    });
    // Cancel button
    document.getElementById('confirm-cancel').addEventListener('click', function () {
      document.body.removeChild(overlay);
      resolve(false);
    });
    // Click outside overlay box
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
        resolve(false);
      }
    });
  });
}

/* ── 5. LOCALSTORAGE SEED DATA ───────────────────────────── */
/**
 * Seed realistic sample data into localStorage on first load.
 * We check a flag "sc_seeded" so this only runs once per browser.
 */
(function seedSampleData() {
  try {
    if (localStorage.getItem('sc_seeded') === 'true') return; // already seeded

    /* ── SAMPLE CRIME REPORTS ── */
    var reports = [
      {
        id: 'SC-20241001-1021', date: '2024-10-01', time: '14:30',
        type: 'Theft', location: '12 MG Road, Sector 5, Ahmedabad',
        district: 'Ahmedabad', description: 'My motorcycle was stolen from the parking lot near the market. The vehicle is a black Honda Activa with registration GJ01AB1234.',
        severity: 'Serious', status: 'Under Investigation', priority: 'High',
        reporterName: 'Rajesh Patel', reporterEmail: 'rajesh.patel@email.com',
        reporterPhone: '9876543210', assignedOfficer: 'OFF-001',
        suspectName: 'Unknown', suspectDesc: 'Approx 5\'9", slim build, wearing blue jacket',
        submittedAt: '2024-10-01T14:45:00'
      },
      {
        id: 'SC-20241003-2045', date: '2024-10-03', time: '21:00',
        type: 'Assault', location: '7 Station Road, Vadodara',
        district: 'Vadodara', description: 'Was attacked by two individuals near the railway station while returning home. Received minor injuries.',
        severity: 'Serious', status: 'Under Investigation', priority: 'High',
        reporterName: 'Priya Shah', reporterEmail: 'priya.shah@email.com',
        reporterPhone: '9876501234', assignedOfficer: 'OFF-002',
        suspectName: 'Unknown males', suspectDesc: 'Two men, early 20s, one wearing red hoodie',
        submittedAt: '2024-10-03T22:00:00'
      },
      {
        id: 'SC-20241005-3012', date: '2024-10-05', time: '10:15',
        type: 'Vandalism', location: '34 University Campus, Surat',
        district: 'Surat', description: 'Campus wall and notice board were spray-painted with graffiti overnight.',
        severity: 'Moderate', status: 'Pending', priority: 'Medium',
        reporterName: 'Amit Verma', reporterEmail: 'amit.verma@email.com',
        reporterPhone: '9712345678', assignedOfficer: '',
        suspectName: '', suspectDesc: '',
        submittedAt: '2024-10-05T10:30:00'
      },
      {
        id: 'SC-20241007-4089', date: '2024-10-07', time: '03:00',
        type: 'Burglary', location: '89 Civil Lines, Rajkot',
        district: 'Rajkot', description: 'House was broken into while family was away. Jewellery and electronics worth approx Rs 2 lakhs stolen.',
        severity: 'Critical', status: 'Under Investigation', priority: 'Critical',
        reporterName: 'Sunita Mehta', reporterEmail: 'sunita.mehta@email.com',
        reporterPhone: '9811122233', assignedOfficer: 'OFF-003',
        suspectName: 'Unknown', suspectDesc: 'Broken rear window suggests forced entry',
        submittedAt: '2024-10-07T08:15:00'
      },
      {
        id: 'SC-20241009-5001', date: '2024-10-09', time: '16:45',
        type: 'Fraud', location: 'Online / Gandhinagar',
        district: 'Gandhinagar', description: 'Received fake job offer email and paid Rs 15,000 as registration fee. Company turned out to be non-existent.',
        severity: 'Moderate', status: 'Resolved', priority: 'Medium',
        reporterName: 'Kiran Joshi', reporterEmail: 'kiran.joshi@email.com',
        reporterPhone: '9900112233', assignedOfficer: 'OFF-001',
        suspectName: 'FakeJobs Ltd (email: fakeinfo@jobs.com)',
        suspectDesc: 'Online fraud via email',
        submittedAt: '2024-10-09T17:00:00'
      },
      {
        id: 'SC-20241012-6007', date: '2024-10-12', time: '11:30',
        type: 'Harassment', location: '5 College Road, Anand',
        district: 'Anand', description: 'Persistent verbal harassment and threatening calls from an ex-colleague over past 2 weeks.',
        severity: 'Moderate', status: 'Closed', priority: 'Low',
        reporterName: 'Nisha Desai', reporterEmail: 'nisha.desai@email.com',
        reporterPhone: '9988776655', assignedOfficer: 'OFF-004',
        suspectName: 'Harsh Trivedi', suspectDesc: 'Former colleague',
        submittedAt: '2024-10-12T12:00:00'
      },
      {
        id: 'SC-20241015-7034', date: '2024-10-15', time: '20:00',
        type: 'Theft', location: '56 Market Area, Bhavnagar',
        district: 'Bhavnagar', description: 'Mobile phone snatched from hand while walking near the market.',
        severity: 'Minor', status: 'Pending', priority: 'Low',
        reporterName: 'Deepak Nair', reporterEmail: 'deepak.nair@email.com',
        reporterPhone: '9123456780', assignedOfficer: '',
        suspectName: '', suspectDesc: 'Teenager on bicycle',
        submittedAt: '2024-10-15T20:30:00'
      },
      {
        id: 'SC-20241018-8099', date: '2024-10-18', time: '13:00',
        type: 'Vandalism', location: '22 Park Street, Jamnagar',
        district: 'Jamnagar', description: 'Public park benches and lights were damaged. Estimated damage Rs 50,000.',
        severity: 'Moderate', status: 'Pending', priority: 'Medium',
        reporterName: 'Leela Rao', reporterEmail: 'leela.rao@email.com',
        reporterPhone: '9566778899', assignedOfficer: '',
        suspectName: '', suspectDesc: '',
        submittedAt: '2024-10-18T13:45:00'
      },
      {
        id: 'SC-20241020-9012', date: '2024-10-20', time: '22:30',
        type: 'Assault', location: '3 Hotel Lane, Ahmedabad',
        district: 'Ahmedabad', description: 'Physical altercation outside a restaurant. Victim hospitalized with broken arm.',
        severity: 'Critical', status: 'Under Investigation', priority: 'Critical',
        reporterName: 'Mohit Kumar', reporterEmail: 'mohit.kumar@email.com',
        reporterPhone: '9811900011', assignedOfficer: 'OFF-002',
        suspectName: 'Group of 4 men', suspectDesc: 'Restaurant staff confirmed CCTV footage exists',
        submittedAt: '2024-10-20T23:00:00'
      },
      {
        id: 'SC-20241023-1056', date: '2024-10-23', time: '08:00',
        type: 'Burglary', location: '17 Business Park, Surat',
        district: 'Surat', description: 'Office broken into overnight. Laptops and cash from safe stolen.',
        severity: 'Critical', status: 'Under Investigation', priority: 'Critical',
        reporterName: 'Ananya Krishnan', reporterEmail: 'ananya.k@email.com',
        reporterPhone: '9711223344', assignedOfficer: 'OFF-003',
        suspectName: 'Unknown', suspectDesc: 'Security camera footage being reviewed',
        submittedAt: '2024-10-23T08:30:00'
      },
      {
        id: 'SC-20241025-1177', date: '2024-10-25', time: '17:00',
        type: 'Fraud', location: 'Online / Vadodara',
        district: 'Vadodara', description: 'UPI fraud — received call claiming to be bank official, OTP shared and Rs 45,000 debited.',
        severity: 'Serious', status: 'Under Investigation', priority: 'High',
        reporterName: 'Ravi Shankar', reporterEmail: 'ravi.s@email.com',
        reporterPhone: '9900334455', assignedOfficer: 'OFF-001',
        suspectName: 'Unknown caller', suspectDesc: 'Number traced to Rajasthan',
        submittedAt: '2024-10-25T17:30:00'
      },
      {
        id: 'SC-20241028-1290', date: '2024-10-28', time: '09:30',
        type: 'Theft', location: 'Railway Station Parking, Rajkot',
        district: 'Rajkot', description: 'Car window broken and laptop bag stolen from inside the parked vehicle.',
        severity: 'Moderate', status: 'Resolved', priority: 'Medium',
        reporterName: 'Fatima Sheikh', reporterEmail: 'fatima.s@email.com',
        reporterPhone: '9833221100', assignedOfficer: 'OFF-004',
        suspectName: 'Unknown', suspectDesc: '',
        submittedAt: '2024-10-28T10:00:00'
      },
      {
        id: 'SC-20241030-1345', date: '2024-10-30', time: '14:00',
        type: 'Harassment', location: '90 Garden Colony, Anand',
        district: 'Anand', description: 'Neighbour dispute escalating into threats and abusive language.',
        severity: 'Minor', status: 'Closed', priority: 'Low',
        reporterName: 'Suresh Patel', reporterEmail: 'suresh.p@email.com',
        reporterPhone: '9988001122', assignedOfficer: 'OFF-005',
        suspectName: 'Ramesh Patel (Neighbour)', suspectDesc: 'Adjacent house resident',
        submittedAt: '2024-10-30T14:30:00'
      },
      {
        id: 'SC-20241101-1402', date: '2024-11-01', time: '11:00',
        type: 'Assault', location: '15 School Road, Gandhinagar',
        district: 'Gandhinagar', description: 'School student assaulted by seniors near school gate.',
        severity: 'Serious', status: 'Pending', priority: 'High',
        reporterName: 'Meena Gupta', reporterEmail: 'meena.g@email.com',
        reporterPhone: '9712200011', assignedOfficer: '',
        suspectName: 'Senior students (names being identified)',
        suspectDesc: 'Incident captured on mobile phone',
        submittedAt: '2024-11-01T11:30:00'
      },
      {
        id: 'SC-20241103-1498', date: '2024-11-03', time: '19:30',
        type: 'Vandalism', location: '8 Temple Street, Bhavnagar',
        district: 'Bhavnagar', description: 'Religious site boundary wall damaged with cracks. Suspicious activity reported.',
        severity: 'Moderate', status: 'Pending', priority: 'Medium',
        reporterName: 'Prakash Iyer', reporterEmail: 'prakash.i@email.com',
        reporterPhone: '9811908070', assignedOfficer: '',
        suspectName: '', suspectDesc: '',
        submittedAt: '2024-11-03T20:00:00'
      }
    ];

    /* ── SAMPLE ANONYMOUS TIPS ── */
    var tips = [
      {
        id: 'TIP-20241002-001', date: '2024-10-02', category: 'Drug Activity',
        description: 'Suspicious packages being exchanged daily at corner of MG Road and Station Road between 11 PM and midnight. Unfamiliar vehicles stopping briefly.',
        location: 'MG Road Junction, Ahmedabad', status: 'Actionable',
        submittedAt: '2024-10-02T23:30:00'
      },
      {
        id: 'TIP-20241004-002', date: '2024-10-04', category: 'Suspicious Person',
        description: 'A person has been seen photographing school children at dismissal time for the past 3 days. Drives a white SUV, partially visible plate GJ05.',
        location: 'Near Green Valley School, Surat', status: 'Reviewed',
        submittedAt: '2024-10-04T16:00:00'
      },
      {
        id: 'TIP-20241006-003', date: '2024-10-06', category: 'Theft',
        description: 'Chain snatching gang operating near ATMs on weekends. Usually 2 people on a bike. Targeting elderly women.',
        location: 'SBI ATM, Civil Lines, Rajkot', status: 'Actionable',
        submittedAt: '2024-10-06T09:00:00'
      },
      {
        id: 'TIP-20241008-004', date: '2024-10-08', category: 'Domestic Disturbance',
        description: 'Loud arguments and sounds of violence heard repeatedly from apartment 3B. The woman inside seems scared.',
        location: 'Sunrise Apartments, Block C, Vadodara', status: 'Reviewed',
        submittedAt: '2024-10-08T22:00:00'
      },
      {
        id: 'TIP-20241010-005', date: '2024-10-10', category: 'Vandalism',
        description: 'Group of teenagers destroying public property in the central park at night. Spray cans and tools observed.',
        location: 'Central Park, Gandhinagar', status: 'Dismissed',
        submittedAt: '2024-10-10T23:00:00'
      },
      {
        id: 'TIP-20241014-006', date: '2024-10-14', category: 'Suspicious Person',
        description: 'Man loitering near ATM for hours, watching customers enter PIN. Possibly skimming device attached.',
        location: 'HDFC Bank ATM, Anand', status: 'Actionable',
        submittedAt: '2024-10-14T18:30:00'
      },
      {
        id: 'TIP-20241017-007', date: '2024-10-17', category: 'Drug Activity',
        description: 'Illegal gambling and substance use happening inside the abandoned warehouse near the textile mill.',
        location: 'Old Textile Mill Road, Surat', status: 'New',
        submittedAt: '2024-10-17T20:00:00'
      },
      {
        id: 'TIP-20241022-008', date: '2024-10-22', category: 'Other',
        description: 'Fireworks being stored illegally in a residential building basement. Fire hazard.',
        location: 'Lal Building, Bhavnagar Road, Jamnagar', status: 'New',
        submittedAt: '2024-10-22T14:00:00'
      },
      {
        id: 'TIP-20241027-009', date: '2024-10-27', category: 'Theft',
        description: 'Two-wheeler theft racket operating from a repair shop. Bikes with altered number plates seen inside.',
        location: 'Ramji Bike Workshop, Station Road, Rajkot', status: 'Reviewed',
        submittedAt: '2024-10-27T11:00:00'
      },
      {
        id: 'TIP-20241101-010', date: '2024-11-01', category: 'Suspicious Person',
        description: 'Individual seen testing door handles of parked cars in office parking lot every evening around 7 PM.',
        location: 'IT Park Parking, Gandhinagar', status: 'New',
        submittedAt: '2024-11-01T19:15:00'
      }
    ];

    /* ── SAMPLE INVESTIGATIONS ── */
    var investigations = [
      {
        id: 'INV-2024-001', reportId: 'SC-20241001-1021', title: 'Motorcycle Theft — MG Road',
        startDate: '2024-10-02', status: 'Active', assignedOfficer: 'OFF-001',
        notes: 'CCTV footage recovered from nearby shop. Suspect identified as local resident. Warrant issued.',
        lastUpdated: '2024-10-18'
      },
      {
        id: 'INV-2024-002', reportId: 'SC-20241003-2045', title: 'Station Road Assault Case',
        startDate: '2024-10-04', status: 'Active', assignedOfficer: 'OFF-002',
        notes: 'Two suspects detained for questioning. Medical report obtained. Case referred to court.',
        lastUpdated: '2024-10-20'
      },
      {
        id: 'INV-2024-003', reportId: 'SC-20241007-4089', title: 'Civil Lines Residential Burglary',
        startDate: '2024-10-08', status: 'Active', assignedOfficer: 'OFF-003',
        notes: 'Fingerprints collected. Similar MO reported in 2 nearby areas. Task force assigned.',
        lastUpdated: '2024-10-25'
      },
      {
        id: 'INV-2024-004', reportId: 'SC-20241009-5001', title: 'Job Offer Online Fraud',
        startDate: '2024-10-10', status: 'Closed', assignedOfficer: 'OFF-001',
        notes: 'Bank account frozen. Suspect arrested in Mumbai. Case closed after recovery.',
        lastUpdated: '2024-10-30'
      },
      {
        id: 'INV-2024-005', reportId: 'SC-20241020-9012', title: 'Restaurant Assault — Ahmedabad',
        startDate: '2024-10-21', status: 'Active', assignedOfficer: 'OFF-002',
        notes: 'CCTV reviewed. 3 of 4 suspects identified. Victim recovering in hospital.',
        lastUpdated: '2024-10-28'
      },
      {
        id: 'INV-2024-006', reportId: 'SC-20241023-1056', title: 'Business Park Office Burglary',
        startDate: '2024-10-24', status: 'Active', assignedOfficer: 'OFF-003',
        notes: 'Security footage retrieved. Electronic tracking on stolen laptops active.',
        lastUpdated: '2024-10-29'
      },
      {
        id: 'INV-2024-007', reportId: 'SC-20241025-1177', title: 'UPI Fraud — Vadodara',
        startDate: '2024-10-26', status: 'Active', assignedOfficer: 'OFF-001',
        notes: 'Call records requested from telecom. Modus operandi matches known fraud network.',
        lastUpdated: '2024-11-01'
      },
      {
        id: 'INV-2024-008', reportId: 'SC-20241101-1402', title: 'School Gate Assault — Gandhinagar',
        startDate: '2024-11-02', status: 'Open', assignedOfficer: '',
        notes: 'Report received. School administration being contacted for witness list.',
        lastUpdated: '2024-11-03'
      }
    ];

    /* ── SAMPLE OFFICERS ── */
    var officers = [
      {
        id: 'OFF-001', name: 'Inspector Ramesh Sharma', badge: 'GJ-IPS-1041',
        rank: 'Inspector', department: 'Crime Branch',
        phone: '9800001111', email: 'r.sharma@gujaratpolice.gov.in',
        status: 'Active', casesAssigned: 3, joinDate: '2015-03-10'
      },
      {
        id: 'OFF-002', name: 'Sub-Inspector Kavya Menon', badge: 'GJ-SI-2089',
        rank: 'Sub-Inspector', department: 'Assault & Violent Crimes',
        phone: '9800002222', email: 'k.menon@gujaratpolice.gov.in',
        status: 'Active', casesAssigned: 2, joinDate: '2018-07-15'
      },
      {
        id: 'OFF-003', name: 'Inspector Arjun Singh', badge: 'GJ-IPS-1056',
        rank: 'Inspector', department: 'Burglary & Property Crime',
        phone: '9800003333', email: 'a.singh@gujaratpolice.gov.in',
        status: 'Active', casesAssigned: 2, joinDate: '2013-11-20'
      },
      {
        id: 'OFF-004', name: 'ASI Deepika Nair', badge: 'GJ-ASI-3012',
        rank: 'Assistant Sub-Inspector', department: 'Community Policing',
        phone: '9800004444', email: 'd.nair@gujaratpolice.gov.in',
        status: 'Active', casesAssigned: 1, joinDate: '2020-01-05'
      },
      {
        id: 'OFF-005', name: 'Constable Ravi Patel', badge: 'GJ-CON-5021',
        rank: 'Constable', department: 'Beat Patrol',
        phone: '9800005555', email: 'r.patel@gujaratpolice.gov.in',
        status: 'Active', casesAssigned: 1, joinDate: '2021-06-12'
      },
      {
        id: 'OFF-006', name: 'Inspector Meera Kulkarni', badge: 'GJ-IPS-1078',
        rank: 'Inspector', department: 'Cyber Crime',
        phone: '9800006666', email: 'm.kulkarni@gujaratpolice.gov.in',
        status: 'On Leave', casesAssigned: 0, joinDate: '2016-04-18'
      },
      {
        id: 'OFF-007', name: 'Sub-Inspector Farhan Qureshi', badge: 'GJ-SI-2103',
        rank: 'Sub-Inspector', department: 'Narcotics',
        phone: '9800007777', email: 'f.qureshi@gujaratpolice.gov.in',
        status: 'Active', casesAssigned: 0, joinDate: '2019-09-30'
      },
      {
        id: 'OFF-008', name: 'ASI Sunita Pillai', badge: 'GJ-ASI-3029',
        rank: 'Assistant Sub-Inspector', department: 'Women Safety',
        phone: '9800008888', email: 's.pillai@gujaratpolice.gov.in',
        status: 'Active', casesAssigned: 0, joinDate: '2022-02-14'
      },
      {
        id: 'OFF-009', name: 'Inspector Dhruv Bhatt', badge: 'GJ-IPS-1092',
        rank: 'Inspector', department: 'Traffic',
        phone: '9800009999', email: 'd.bhatt@gujaratpolice.gov.in',
        status: 'Off Duty', casesAssigned: 0, joinDate: '2012-08-01'
      },
      {
        id: 'OFF-010', name: 'Constable Anjali Rawat', badge: 'GJ-CON-5045',
        rank: 'Constable', department: 'Beat Patrol',
        phone: '9800010000', email: 'a.rawat@gujaratpolice.gov.in',
        status: 'Active', casesAssigned: 0, joinDate: '2023-03-25'
      }
    ];

    // Save everything to localStorage
    localStorage.setItem('sc_reports',         JSON.stringify(reports));
    localStorage.setItem('sc_tips',            JSON.stringify(tips));
    localStorage.setItem('sc_investigations',  JSON.stringify(investigations));
    localStorage.setItem('sc_officers',        JSON.stringify(officers));
    localStorage.setItem('sc_seeded',          'true');

  } catch (err) {
    console.warn('SafeCity: Could not seed localStorage.', err);
  }
})();

/* ── 6. LOCALSTORAGE HELPERS ─────────────────────────────── */
/**
 * escapeHTML — escapes HTML special characters to prevent XSS.
 * @param {string} str - string to escape
 * @returns {string} escaped string
 */
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(String(str)));
  return div.innerHTML;
}

/**
 * safeGetJSON — safely retrieves and parses a JSON array from localStorage.
 * Returns an empty array if the key doesn't exist or JSON is corrupted.
 */
function safeGetJSON(key) {
  try {
    var raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) || [];
  } catch (e) {
    console.warn('SafeCity: Failed to parse localStorage key:', key);
    return [];
  }
}

/**
 * safeSetJSON — safely serialises a value and stores it in localStorage.
 */
function safeSetJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('SafeCity: Failed to write to localStorage key:', key);
  }
}

/**
 * getUserReports — retrieves all crime reports belonging to a specific userId.
 * @param {string} userId - The unique identifier of the user
 * @returns {Array} array of reports matching the user
 */
function getUserReports(userId) {
  if (!userId) return [];
  var allReports = safeGetJSON('sc_reports');
  return allReports.filter(function (r) {
    return r.userId === userId;
  });
}

/**
 * addNotification — creates and stores a notification for a user.
 * Avoids duplicate notifications for the same user, report, and title.
 * @param {Object} notif - { userId, reportId, title, message, type }
 */
function addNotification(notif) {
  if (!notif || !notif.userId) return null;
  var list = safeGetJSON('sc_notifications');

  // Prevent duplicate notifications
  var isDuplicate = list.some(function (n) {
    return n.userId === notif.userId &&
           n.reportId === notif.reportId &&
           n.title === notif.title;
  });
  if (isDuplicate) return null;

  var newNotif = {
    id: 'NOTIF-' + Date.now() + '-' + Math.floor(100 + Math.random() * 900),
    userId: notif.userId,
    reportId: notif.reportId || '',
    title: notif.title || 'Notification',
    message: notif.message || '',
    type: notif.type || 'info', // 'info' | 'success' | 'warning' | 'danger'
    read: false,
    createdAt: new Date().toISOString()
  };

  list.unshift(newNotif);
  safeSetJSON('sc_notifications', list);
  return newNotif;
}

/**
 * getUserNotifications — retrieves notifications for a specific user.
 * @param {string} userId - unique user ID
 * @returns {Array} array of user notifications
 */
function getUserNotifications(userId) {
  if (!userId) return [];
  var list = safeGetJSON('sc_notifications');
  return list.filter(function (n) {
    return n.userId === userId;
  });
}

/**
 * markNotificationsAsRead — marks all notifications for a user as read.
 * @param {string} userId - unique user ID
 */
function markNotificationsAsRead(userId) {
  if (!userId) return;
  var list = safeGetJSON('sc_notifications');
  var changed = false;
  list.forEach(function (n) {
    if (n.userId === userId && !n.read) {
      n.read = true;
      changed = true;
    }
  });
  if (changed) {
    safeSetJSON('sc_notifications', list);
  }
}

/* ── 7. ADMIN AUTH GUARD ─────────────────────────────────── */
// If the current page is in the /admin/ folder, check if admin is logged in.
// Works for both file:// (local dev) and http:// (server) URLs.
// To bypass during development, set localStorage: sc_admin_logged_in = 'true'
(function checkAdminAuth() {
  var path = window.location.href; // use full href so it works with file:// too
  // Detect admin pages by checking if the URL contains /admin/ anywhere
  var isAdminPage = path.indexOf('/admin/') !== -1 ||
                    path.indexOf('\\admin\\') !== -1 ||
                    path.indexOf('%5Cadmin%5C') !== -1;
  if (isAdminPage) {
    var loggedIn = localStorage.getItem('sc_admin_logged_in');
    if (loggedIn !== 'true') {
      // Redirect to login — handle both / and \ path separators
      window.location.href = '../client/login.html';
    }
  }
})();

/* ── 8. MOBILE HAMBURGER (ADMIN SIDEBAR) ─────────────────── */
// This handles the mobile sidebar open/close on admin pages.
document.addEventListener('DOMContentLoaded', function () {
  var hamburger = document.getElementById('sidebar-hamburger');
  var sidebar   = document.getElementById('admin-sidebar');
  var overlay   = document.getElementById('sidebar-overlay');

  if (!hamburger || !sidebar) return; // Not an admin page

  // Open sidebar
  hamburger.addEventListener('click', function () {
    sidebar.classList.add('open');
    if (overlay) overlay.classList.add('show');
  });

  // Close sidebar when overlay clicked
  if (overlay) {
    overlay.addEventListener('click', function () {
      sidebar.classList.remove('open');
      overlay.classList.remove('show');
    });
  }

  // Close sidebar when a nav link is clicked (mobile)
  var sidebarLinks = sidebar.querySelectorAll('a');
  sidebarLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      if (window.innerWidth < 992) {
        sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('show');
      }
    });
  });
});

/* ── 9. NAVBAR — CLOSE ON OUTSIDE CLICK ─────────────────── */
// Closes the Bootstrap mobile nav when clicking outside it.
document.addEventListener('click', function (e) {
  var toggler = document.querySelector('.navbar-toggler');
  var navCollapse = document.getElementById('mainNav');
  if (!toggler || !navCollapse) return;
  if (!navCollapse.contains(e.target) && !toggler.contains(e.target)) {
    if (navCollapse.classList.contains('show')) {
      toggler.click(); // Bootstrap toggles it off
    }
  }
});
