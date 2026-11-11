/* ============================================================
   js/auth.js — Authentication & Dynamic Navbar for SafeCity
   ============================================================
   Responsibilities:
   - Store/retrieve session data in sessionStorage
   - Validate login credentials and register new users
   - Render the correct navbar links based on login role
   - Guard protected pages (redirect if not authorised)
   - Provide logout functionality

   SESSION STORAGE KEY: 'sc_session'
   Value stored: JSON string { role, name, email }
   role values: 'admin' | 'user' | null (guest)

   DEV NOTE — Demo credentials (never shown in HTML):
     Admin : admin@safecity.gov  /  admin123
     User  : user@safecity.gov   /  user1234
   ============================================================ */

/* ── 1. AUTH OBJECT ─────────────────────────────────────── */
var Auth = {

  /* ---- login ------------------------------------------------
     Checks credentials and sets the session.
     Returns { ok: true } on success or { ok: false, message }
     on failure.
  ---------------------------------------------------------------- */
  login: function (email, password) {
    email = email.trim().toLowerCase();

    // Admin credential check
    if (email === 'admin@safecity.gov' && password === 'admin123') {
      var session = { role: 'admin', name: 'Administrator', email: email };
      sessionStorage.setItem('sc_session', JSON.stringify(session));
      // Keep backward-compat key so existing admin.js guard still works
      localStorage.setItem('sc_admin_logged_in', 'true');
      localStorage.setItem('sc_admin_name', 'Administrator');
      return { ok: true, role: 'admin' };
    }

    // Demo user credential check
    if (email === 'user@safecity.gov' && password === 'user1234') {
      var session = { role: 'user', name: 'Demo User', email: email };
      sessionStorage.setItem('sc_session', JSON.stringify(session));
      localStorage.setItem('sc_client_logged_in', 'true');
      localStorage.setItem('sc_client_name', 'Demo User');
      return { ok: true, role: 'user' };
    }

    // Check registered users stored in localStorage
    var users = JSON.parse(localStorage.getItem('sc_users') || '[]');
    var found = users.find(function (u) {
      return u.email.toLowerCase() === email && u.password === password;
    });

    if (found) {
      var session = { role: 'user', name: found.name, email: found.email };
      sessionStorage.setItem('sc_session', JSON.stringify(session));
      localStorage.setItem('sc_client_logged_in', 'true');
      localStorage.setItem('sc_client_name', found.name);
      return { ok: true, role: 'user' };
    }

    return { ok: false, message: 'Invalid email or password. Please try again.' };
  },

  /* ---- logout -----------------------------------------------
     Clears all session and legacy auth keys then redirects to
     the login page (using the basePath to form the correct URL).
  ---------------------------------------------------------------- */
  logout: function (basePath) {
    basePath = basePath || '';
    sessionStorage.removeItem('sc_session');
    localStorage.removeItem('sc_admin_logged_in');
    localStorage.removeItem('sc_admin_name');
    localStorage.removeItem('sc_client_logged_in');
    localStorage.removeItem('sc_client_name');
    window.location.href = basePath + 'client/login.html';
  },

  /* ---- getSession -------------------------------------------
     Returns the parsed session object or null if not logged in.
  ---------------------------------------------------------------- */
  getSession: function () {
    var raw = sessionStorage.getItem('sc_session');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  },

  /* ---- getRole ----------------------------------------------
     Returns 'admin', 'user', or 'guest'.
  ---------------------------------------------------------------- */
  getRole: function () {
    var s = this.getSession();
    return s ? s.role : 'guest';
  },

  /* ---- isLoggedIn -------------------------------------------
     Returns true if any authenticated session exists.
  ---------------------------------------------------------------- */
  isLoggedIn: function () {
    return this.getSession() !== null;
  },

  /* ---- getName ----------------------------------------------
     Returns the logged-in user's display name or empty string.
  ---------------------------------------------------------------- */
  getName: function () {
    var s = this.getSession();
    return s ? s.name : '';
  }
};


/* ── 2. RENDER NAVBAR ───────────────────────────────────── */
/**
 * renderNavbar — builds the right-side nav links based on the
 * user's current role and injects them into #nav-links-container.
 *
 * @param {string} basePath - Relative path prefix to reach the
 *   project root from the current page.
 *   - Root pages (index.html):  basePath = ''
 *   - client/ pages:            basePath = '../'
 *   - admin/ pages:             (admin uses sidebar, not this navbar)
 */
function renderNavbar(basePath) {
  basePath = basePath || '';

  var container = document.getElementById('nav-links-container');
  if (!container) return; // Safety: element must exist in HTML

  var role     = Auth.getRole();
  var name     = escapeHTML(Auth.getName()); // escapeHTML() lives in main.js
  var html     = '';

  // Which page are we on? e.g. "index.html".
  // pathname never contains ?query or #hash. A bare folder URL such as "/"
  // is the home page, so we treat an empty name as "index.html".
  var currentFile = window.location.pathname.split('/').pop();
  if (currentFile === '') currentFile = 'index.html';

  // Helper: build one <a> nav link.
  // The link for the current page gets class "active" (styled in style.css)
  // and aria-current="page" (tells screen readers which page is open).
  function navLink(href, label, icon, activeFile) {
    var isCurrent = (currentFile === activeFile);
    var activeClass = isCurrent ? ' active' : '';
    var ariaAttr    = isCurrent ? ' aria-current="page"' : '';
    return '<a class="nav-link' + activeClass + '" href="' + href + '"' + ariaAttr + '>'
         + '<i class="bi ' + icon + ' me-1"></i>' + label + '</a>';
  }

  // ── GUEST (not logged in) ──────────────────────────────────
  if (role === 'guest') {
    html += navLink(basePath + 'index.html',              'Home',           'bi-house-fill',         'index.html');
    html += navLink(basePath + 'client/anonymous-tip.html', 'Anonymous Tip', 'bi-incognito',         'anonymous-tip.html');
    html += '<div class="nav-auth-btns">';
    html +=   '<a class="btn-nav-login" href="' + basePath + 'client/login.html">'
            + '<i class="bi bi-person-circle me-1"></i>Login</a>';
    html += '</div>';
  }

  // ── USER (logged in as regular user) ─────────────────────
  else if (role === 'user') {
    html += navLink(basePath + 'index.html',                 'Home',          'bi-house-fill',       'index.html');
    html += navLink(basePath + 'client/report-crime.html',   'Report Crime',  'bi-file-earmark-plus','report-crime.html');
    html += navLink(basePath + 'client/track-report.html',   'Track Report',  'bi-search',           'track-report.html');
    html += navLink(basePath + 'client/anonymous-tip.html',  'Anonymous Tip', 'bi-incognito',        'anonymous-tip.html');
    html += '<div class="nav-auth-btns">';
    html +=   '<span class="navbar-user-chip"><i class="bi bi-person-fill me-1"></i>' + name + '</span>';
    html +=   '<button class="btn-nav-logout" onclick="Auth.logout(\'' + basePath + '\')">'
            + '<i class="bi bi-box-arrow-right me-1"></i>Logout</button>';
    html += '</div>';
  }

  // ── ADMIN ─────────────────────────────────────────────────
  else if (role === 'admin') {
    html += navLink(basePath + 'index.html',           'Home',      'bi-house-fill',     'index.html');
    html += navLink(basePath + 'admin/dashboard.html', 'Dashboard', 'bi-grid-1x2-fill',  'dashboard.html');
    html += navLink(basePath + 'client/anonymous-tip.html', 'Anonymous Tip', 'bi-incognito', 'anonymous-tip.html');
    html += '<div class="nav-auth-btns">';
    html +=   '<span class="navbar-user-chip admin-chip"><i class="bi bi-shield-fill me-1"></i>' + name + '</span>';
    html +=   '<button class="btn-nav-logout" onclick="Auth.logout(\'' + basePath + '\')">'
            + '<i class="bi bi-box-arrow-right me-1"></i>Logout</button>';
    html += '</div>';
  }

  container.innerHTML = html;
}


/* ── 3. PAGE GUARD ──────────────────────────────────────── */
/**
 * guardPage — redirects people who are not allowed to see a page.
 *
 * @param {string} requiredRole - which accounts may open the page:
 *   'user'   → any logged-in account (client OR admin)
 *   'client' → client accounts only (guests go to login, admins go to
 *              their own dashboard)
 *   'admin'  → admin accounts only
 * @param {string} basePath     - Relative path prefix to reach root
 *
 * Usage (call it at the top of a protected page):
 *   guardPage('user', '../');    // e.g. Track Report
 *   guardPage('client', '../');  // e.g. Report Crime, User Dashboard
 *   guardPage('admin', '../');   // admin/ pages
 *
 * NOTE: this is a frontend-only demo check. Anyone can edit browser
 * storage, so it is NOT real security. The backend will do the real check.
 */
function guardPage(requiredRole, basePath) {
  basePath = basePath || '';
  var role = Auth.getRole();

  if (requiredRole === 'user') {
    // Any logged-in account may enter
    if (role === 'guest') {
      // Save intended destination so login can redirect back
      sessionStorage.setItem('sc_intended', window.location.href);
      window.location.href = basePath + 'client/login.html';
    }
  } else if (requiredRole === 'client') {
    // Only client accounts may enter
    if (role === 'guest') {
      sessionStorage.setItem('sc_intended', window.location.href);
      window.location.href = basePath + 'client/login.html';
    } else if (role === 'admin') {
      window.location.href = basePath + 'admin/dashboard.html';
    }
  } else if (requiredRole === 'admin') {
    if (role !== 'admin') {
      window.location.href = basePath + 'client/login.html';
    }
  }
}


/* ── 4. LOGIN PAGE HELPERS ──────────────────────────────── */
/* These functions are used by client/login.html inline script.
   They are defined here so they can easily be found and edited. */

/**
 * handleLogin — called when the login form is submitted.
 * Relies on validateForm() from validation.js being loaded.
 */
function handleLogin(event) {
  event.preventDefault();
  var form = document.getElementById('login-form');
  if (typeof validateForm === 'function' && !validateForm(form)) return;

  var email    = document.getElementById('login-email').value.trim();
  var password = document.getElementById('login-password').value;

  var result = Auth.login(email, password);

  if (result.ok) {
    var dest = sessionStorage.getItem('sc_intended');
    sessionStorage.removeItem('sc_intended');

    if (result.role === 'admin') {
      showToast('Welcome, Admin! Redirecting to dashboard…', 'success', 1800);
      setTimeout(function () {
        window.location.href = dest || '../admin/dashboard.html';
      }, 1800);
    } else {
      var userName = Auth.getName();
      showToast('Welcome back, ' + userName + '!', 'success', 1800);
      setTimeout(function () {
        window.location.href = dest || '../index.html';
      }, 1800);
    }
  } else {
    showToast(result.message, 'error');
    document.getElementById('login-email').classList.add('is-invalid');
    document.getElementById('login-password').classList.add('is-invalid');
  }
}

/**
 * handleRegister — called when the registration form is submitted.
 */
function handleRegister(event) {
  event.preventDefault();
  var form = document.getElementById('register-form');
  if (typeof validateForm === 'function' && !validateForm(form)) return;

  var name     = document.getElementById('reg-name').value.trim();
  var email    = document.getElementById('reg-email').value.trim().toLowerCase();
  var phone    = document.getElementById('reg-phone').value.trim();
  var password = document.getElementById('reg-password').value;
  var confirm  = document.getElementById('reg-confirm-password').value;

  // Check password match
  if (typeof validatePasswordMatch === 'function') {
    var matchResult = validatePasswordMatch(password, confirm);
    if (!matchResult.valid) {
      if (typeof showFieldError === 'function') {
        showFieldError(document.getElementById('reg-confirm-password'), matchResult.message);
      }
      return;
    }
  } else if (password !== confirm) {
    alert('Passwords do not match.');
    return;
  }

  // Reject reserved admin/demo emails
  if (email === 'admin@safecity.gov' || email === 'user@safecity.gov') {
    if (typeof showFieldError === 'function') {
      showFieldError(document.getElementById('reg-email'), 'This email address is reserved.');
    }
    return;
  }

  // Check if email already registered
  var users = JSON.parse(localStorage.getItem('sc_users') || '[]');
  var exists = users.find(function (u) { return u.email.toLowerCase() === email; });
  if (exists) {
    if (typeof showFieldError === 'function') {
      showFieldError(document.getElementById('reg-email'), 'This email is already registered.');
    }
    return;
  }

  // Save new user
  users.push({ name: name, email: email, phone: phone, password: password });
  localStorage.setItem('sc_users', JSON.stringify(users));

  showToast('Account created! You can now log in.', 'success');
  document.getElementById('register-form').reset();
  setTimeout(function () { switchTab('login'); }, 1200);
}

/**
 * switchTab — switches between Login and Register panels on login.html.
 */
function switchTab(tab) {
  var loginPanel = document.getElementById('tab-login');
  var regPanel   = document.getElementById('tab-register');
  var loginBtn   = document.getElementById('tab-login-btn');
  var regBtn     = document.getElementById('tab-register-btn');

  if (tab === 'login') {
    loginPanel.classList.add('active');
    regPanel.classList.remove('active');
    loginBtn.classList.add('active');
    regBtn.classList.remove('active');
  } else {
    regPanel.classList.add('active');
    loginPanel.classList.remove('active');
    regBtn.classList.add('active');
    loginBtn.classList.remove('active');
  }
}

/**
 * togglePasswordVisibility — shows/hides text in a password field.
 * @param {string} inputId - ID of the <input type="password"> element
 * @param {HTMLElement} btn - The toggle button (holds the eye icon)
 */
function togglePasswordVisibility(inputId, btn) {
  var input = document.getElementById(inputId);
  var icon  = btn.querySelector('i');
  if (input.type === 'password') {
    input.type    = 'text';
    icon.className = 'bi bi-eye-slash';
  } else {
    input.type    = 'password';
    icon.className = 'bi bi-eye';
  }
}