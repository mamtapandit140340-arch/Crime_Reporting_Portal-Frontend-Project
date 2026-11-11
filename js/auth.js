
/* ============================================================
   js/auth.js — Authentication & Dynamic Navbar for SafeCity
   ============================================================
   Responsibilities:
   - Store/retrieve session data in sessionStorage
   - Validate login credentials and register new users
   - Render navbar links based on login role
   - Guard protected pages
   - Provide logout functionality

   SESSION STORAGE KEY: 'sc_session'

   Role values:
   'admin' | 'user' | null (guest)
   ============================================================ */


/* ── 1. AUTH OBJECT ─────────────────────────────────────── */

var Auth = {

  /* ---- LOGIN -------------------------------------------- */

  login: function (email, password) {

    email = email.trim().toLowerCase();

    // Admin login
    if (email === 'admin@safecity.gov' && password === 'admin123') {

      var session = {
        role: 'admin',
        userId: 'ADMIN-001',
        name: 'Administrator',
        email: email
      };

      sessionStorage.setItem('sc_session', JSON.stringify(session));

      localStorage.setItem('sc_admin_logged_in', 'true');
      localStorage.setItem('sc_admin_name', 'Administrator');

      return {
        ok: true,
        role: 'admin',
        session: session
      };
    }

    // Demo client login
    if (email === 'user@safecity.gov' && password === 'user1234') {

      var session = {
        role: 'user',
        userId: 'USER-101',
        name: 'Demo User',
        email: email
      };

      sessionStorage.setItem('sc_session', JSON.stringify(session));

      localStorage.setItem('sc_client_logged_in', 'true');
      localStorage.setItem('sc_client_name', 'Demo User');
      localStorage.setItem('sc_client_userId', 'USER-101');

      return {
        ok: true,
        role: 'user',
        session: session
      };
    }

    // Check registered users
    var users = JSON.parse(localStorage.getItem('sc_users') || '[]');

    var foundIndex = users.findIndex(function (u) {
      return u.email &&
        u.email.toLowerCase() === email &&
        u.password === password;
    });

    if (foundIndex !== -1) {

      var found = users[foundIndex];

      // Generate user ID if missing
      if (!found.userId) {

        found.userId = 'USER-' +
          Math.floor(1000 + Math.random() * 9000);

        users[foundIndex] = found;

        localStorage.setItem('sc_users', JSON.stringify(users));
      }

      var session = {
        role: 'user',
        userId: found.userId,
        name: found.name,
        email: found.email
      };

      sessionStorage.setItem('sc_session', JSON.stringify(session));

      localStorage.setItem('sc_client_logged_in', 'true');
      localStorage.setItem('sc_client_name', found.name);
      localStorage.setItem('sc_client_userId', found.userId);

      return {
        ok: true,
        role: 'user',
        session: session
      };
    }

    return {
      ok: false,
      message: 'Invalid email or password. Please try again.'
    };
  },


  /* ---- LOGOUT ------------------------------------------- */

  logout: function (basePath) {

    basePath = basePath || '';

    sessionStorage.removeItem('sc_session');
    sessionStorage.removeItem('sc_intended');

    localStorage.removeItem('sc_admin_logged_in');
    localStorage.removeItem('sc_admin_name');

    localStorage.removeItem('sc_client_logged_in');
    localStorage.removeItem('sc_client_name');
    localStorage.removeItem('sc_client_userId');

    window.location.href = basePath + 'client/login.html';
  },


  /* ---- GET SESSION -------------------------------------- */

  getSession: function () {

    var raw = sessionStorage.getItem('sc_session');

    if (!raw) return null;

    try {

      var session = JSON.parse(raw);

      if (!session || !session.role) return null;

      // Repair older client sessions without userId
      if (session.role === 'user' && !session.userId) {

        var email = (session.email || '').trim().toLowerCase();

        if (email === 'user@safecity.gov') {

          session.userId = 'USER-101';

        } else {

          var users = JSON.parse(
            localStorage.getItem('sc_users') || '[]'
          );

          var matchedUser = users.find(function (user) {
            return user.email &&
              user.email.trim().toLowerCase() === email;
          });

          if (matchedUser) {

            if (!matchedUser.userId) {

              matchedUser.userId = 'USER-' +
                Math.floor(1000 + Math.random() * 9000);

              localStorage.setItem(
                'sc_users',
                JSON.stringify(users)
              );
            }

            session.userId = matchedUser.userId;

          } else if (
            email &&
            email === localStorage.getItem('sc_client_email')
          ) {

            session.userId = localStorage.getItem('sc_client_userId');
          }
        }

        if (session.userId) {

          sessionStorage.setItem(
            'sc_session',
            JSON.stringify(session)
          );

          localStorage.setItem(
            'sc_client_userId',
            session.userId
          );
        }
      }

      return session;

    } catch (e) {

      console.warn('SafeCity: Invalid login session.', e);

      return null;
    }
  },


  /* ---- GET USER ID -------------------------------------- */

  getUserId: function () {

    var s = this.getSession();

    return s && s.userId ? s.userId : '';
  },


  /* ---- GET EMAIL ---------------------------------------- */

  getEmail: function () {

    var s = this.getSession();

    return s && s.email ? s.email : '';
  },


  /* ---- GET ROLE ----------------------------------------- */

  getRole: function () {

    var s = this.getSession();

    return s ? s.role : 'guest';
  },


  /* ---- IS LOGGED IN ------------------------------------- */

  isLoggedIn: function () {

    return this.getSession() !== null;
  },


  /* ---- GET NAME ----------------------------------------- */

  getName: function () {

    var s = this.getSession();

    return s ? s.name : '';
  }
};


/* ── 2. NAVBAR RENDERING ────────────────────────────────── */

/**
 * Dynamically generates navbar links based on login status.
 *
 * @param {string} basePath
 *
 * Root page:       renderNavbar('')
 * Client page:     renderNavbar('../')
 * Admin page:      renderNavbar('../')
 */

function renderNavbar(basePath) {

  basePath = basePath || '';

  var container = document.getElementById('nav-links-container');

  if (!container) return;

  var role = Auth.getRole();

  var rawName = Auth.getName();

  // Safely display the user's name
  var name = String(rawName || '').replace(/[&<>"']/g, function (char) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char];
  });

  if (!name) {
    name = role === 'admin' ? 'Administrator' : 'User';
  }

  var html = '';

  // Identify currently opened page
  var currentFile = window.location.pathname.split('/').pop();

  if (currentFile === '') {
    currentFile = 'index.html';
  }


  // Reusable navbar link
  function navLink(href, label, icon, activeFile) {

    var isCurrent = currentFile === activeFile;

    var activeClass = isCurrent ? ' active' : '';

    var ariaAttr = isCurrent
      ? ' aria-current="page"'
      : '';

    return '<a class="nav-link' + activeClass +
      '" href="' + href + '"' + ariaAttr + '>' +
      '<i class="bi ' + icon + ' me-1"></i>' +
      label +
      '</a>';
  }


  // ── GUEST NAVBAR ───────────────────────────────────────

  if (role === 'guest') {

    html += navLink(
      basePath + 'index.html',
      'Home',
      'bi-house-fill',
      'index.html'
    );

    html += navLink(
      basePath + 'client/anonymous-tip.html',
      'Anonymous Tip',
      'bi-incognito',
      'anonymous-tip.html'
    );

    html += navLink(
      basePath + 'client/about.html',
      'About Us',
      'bi-info-circle',
      'about.html'
    );

    html += '<div class="nav-auth-btns">';

    html +=
      '<a class="btn-nav-login" href="' +
      basePath + 'client/login.html">' +
      '<i class="bi bi-person-circle me-1"></i>Login</a>';

    html += '</div>';
  }


  // ── LOGGED-IN CLIENT NAVBAR ────────────────────────────

  else if (role === 'user') {

    // Home is intentionally NOT displayed after login.

    html += navLink(
      basePath + 'client/user-dashboard.html',
      'Dashboard',
      'bi-speedometer2',
      'user-dashboard.html'
    );

    html += navLink(
      basePath + 'client/report-crime.html',
      'Report Crime',
      'bi-file-earmark-plus',
      'report-crime.html'
    );

    html += navLink(
      basePath + 'client/track-report.html',
      'Track Report',
      'bi-search',
      'track-report.html'
    );

    html += navLink(
      basePath + 'client/anonymous-tip.html',
      'Anonymous Tip',
      'bi-incognito',
      'anonymous-tip.html'
    );

    // New About Us page
    html += navLink(
      basePath + 'client/about.html',
      'About Us',
      'bi-info-circle',
      'about.html'
    );

    html += '<div class="nav-auth-btns">';

    html +=
      '<a href="' + basePath +
      'client/user-dashboard.html" ' +
      'class="navbar-user-chip" title="Go to Dashboard">' +
      '<i class="bi bi-person-fill me-1"></i>' +
      name +
      '</a>';

    html +=
      '<button type="button" class="btn-nav-logout" ' +
      'onclick="Auth.logout(\'' + basePath + '\')">' +
      '<i class="bi bi-box-arrow-right me-1"></i>Logout' +
      '</button>';

    html += '</div>';
  }


  // ── ADMIN NAVBAR ──────────────────────────────────────

  else if (role === 'admin') {

    // Home is intentionally NOT displayed after login.

    html += navLink(
      basePath + 'admin/dashboard.html',
      'Dashboard',
      'bi-grid-1x2-fill',
      'dashboard.html'
    );

    html += navLink(
      basePath + 'client/anonymous-tip.html',
      'Anonymous Tip',
      'bi-incognito',
      'anonymous-tip.html'
    );

    html += navLink(
      basePath + 'client/about.html',
      'About Us',
      'bi-info-circle',
      'about.html'
    );

    html += '<div class="nav-auth-btns">';

    html +=
      '<span class="navbar-user-chip admin-chip">' +
      '<i class="bi bi-shield-fill me-1"></i>' +
      name +
      '</span>';

    html +=
      '<button type="button" class="btn-nav-logout" ' +
      'onclick="Auth.logout(\'' + basePath + '\')">' +
      '<i class="bi bi-box-arrow-right me-1"></i>Logout' +
      '</button>';

    html += '</div>';
  }


  // Insert generated links
  container.innerHTML = html;
}


/* ── 3. PAGE GUARD ──────────────────────────────────────── */

/**
 * Protects pages according to login role.
 *
 * guardPage('user', '../');
 * guardPage('client', '../');
 * guardPage('admin', '../');
 */

function guardPage(requiredRole, basePath) {

  basePath = basePath || '';

  var role = Auth.getRole();

  if (requiredRole === 'user') {

    if (role === 'guest') {

      sessionStorage.setItem(
        'sc_intended',
        window.location.href
      );

      window.location.href = basePath + 'client/login.html';
    }

  } else if (requiredRole === 'client') {

    if (role === 'guest') {

      sessionStorage.setItem(
        'sc_intended',
        window.location.href
      );

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


/* ── 4. LOGIN PAGE HELPERS ───────────────────────────────── */

/**
 * Handles login form submission.
 */

function handleLogin(event) {

  event.preventDefault();

  var form = document.getElementById('login-form');

  if (
    typeof validateForm === 'function' &&
    !validateForm(form)
  ) {
    return;
  }

  var email = document.getElementById('login-email').value.trim();

  var password = document.getElementById('login-password').value;

  var result = Auth.login(email, password);

  if (result.ok) {

    var dest = sessionStorage.getItem('sc_intended');

    sessionStorage.removeItem('sc_intended');

    if (result.role === 'admin') {

      showToast(
        'Welcome, Admin! Redirecting to dashboard…',
        'success',
        1800
      );

      setTimeout(function () {

        window.location.href =
          dest || '../admin/dashboard.html';

      }, 1800);

    } else {

      var userName = Auth.getName();

      showToast(
        'Welcome back, ' + userName + '!',
        'success',
        1800
      );

      setTimeout(function () {

        window.location.href =
          dest || 'user-dashboard.html';

      }, 1800);
    }

  } else {

    showToast(result.message, 'error');

    document.getElementById('login-email')
      .classList.add('is-invalid');

    document.getElementById('login-password')
      .classList.add('is-invalid');
  }
}


/**
 * Handles registration form submission.
 */

function handleRegister(event) {

  event.preventDefault();

  var form = document.getElementById('register-form');

  if (
    typeof validateForm === 'function' &&
    !validateForm(form)
  ) {
    return;
  }

  var name = document.getElementById('reg-name').value.trim();

  var email = document.getElementById('reg-email').value.trim().toLowerCase();

  var phone = document.getElementById('reg-phone').value.trim();

  var password = document.getElementById('reg-password').value;

  var confirm = document.getElementById('reg-confirm-password').value;


  // Password match validation
  if (typeof validatePasswordMatch === 'function') {

    var matchResult = validatePasswordMatch(password, confirm);

    if (!matchResult.valid) {

      if (typeof showFieldError === 'function') {

        showFieldError(
          document.getElementById('reg-confirm-password'),
          matchResult.message
        );
      }

      return;
    }

  } else if (password !== confirm) {

    alert('Passwords do not match.');

    return;
  }


  // Reject reserved emails
  if (
    email === 'admin@safecity.gov' ||
    email === 'user@safecity.gov'
  ) {

    if (typeof showFieldError === 'function') {

      showFieldError(
        document.getElementById('reg-email'),
        'This email address is reserved.'
      );
    }

    return;
  }


  // Check existing users
  var users = JSON.parse(localStorage.getItem('sc_users') || '[]');

  var exists = users.find(function (u) {

    return u.email &&
      u.email.toLowerCase() === email;
  });

  if (exists) {

    if (typeof showFieldError === 'function') {

      showFieldError(
        document.getElementById('reg-email'),
        'This email is already registered.'
      );
    }

    return;
  }


  // Generate unique user ID
  var userId = 'USER-' +
    Math.floor(1000 + Math.random() * 9000);

  while (users.some(function (u) {
    return u.userId === userId;
  })) {

    userId = 'USER-' +
      Math.floor(1000 + Math.random() * 9000);
  }


  // Save registered user
  users.push({

    userId: userId,
    name: name,
    email: email,
    phone: phone,
    password: password,
    createdAt: new Date().toISOString()
  });

  localStorage.setItem(
    'sc_users',
    JSON.stringify(users)
  );

  showToast(
    'Account created! You can now log in.',
    'success'
  );

  document.getElementById('register-form').reset();

  setTimeout(function () {

    switchTab('login');

  }, 1200);
}


/**
 * Switches between Login and Register panels.
 */

function switchTab(tab) {

  var loginPanel = document.getElementById('tab-login');

  var regPanel = document.getElementById('tab-register');

  var loginBtn = document.getElementById('tab-login-btn');

  var regBtn = document.getElementById('tab-register-btn');


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
 * Shows or hides password text.
 */

function togglePasswordVisibility(inputId, btn) {

  var input = document.getElementById(inputId);

  var icon = btn.querySelector('i');

  if (input.type === 'password') {

    input.type = 'text';

    icon.className = 'bi bi-eye-slash';

  } else {

    input.type = 'password';

    icon.className = 'bi bi-eye';
  }
}
