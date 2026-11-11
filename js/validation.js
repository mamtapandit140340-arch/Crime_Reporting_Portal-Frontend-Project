/* ============================================================
   validation.js — Shared form validation library
   Used by: report-crime.html, anonymous-tip.html, login.html
   
   Each validator returns an object: { valid: bool, message: string }
   Call validateForm(formElement) to validate an entire form at once.
   ============================================================ */

/* ── INDIVIDUAL FIELD VALIDATORS ─────────────────────────── */

/**
 * validateRequired — checks that a field is not empty.
 */
function validateRequired(value, fieldName) {
  var trimmed = (value || '').toString().trim();
  if (trimmed.length === 0) {
    return { valid: false, message: fieldName + ' is required.' };
  }
  return { valid: true, message: '' };
}

/**
 * 
 * validateEmail — checks standard email format using a regex.
 */
function validateEmail(value) {
  var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var trimmed = (value || '').trim();
  if (trimmed.length === 0) {
    return { valid: false, message: 'Email address is required.' };
  }
  if (!emailRegex.test(trimmed)) {
    return { valid: false, message: 'Please enter a valid email address (e.g. name@example.com).' };
  }
  return { valid: true, message: '' };
}

/**
 * validatePhone — requires at least 10 digits (allows spaces/dashes).
 */
function validatePhone(value) {
  var digits = (value || '').replace(/\D/g, ''); // strip non-digits
  if (digits.length === 0) {
    return { valid: false, message: 'Phone number is required.' };
  }
  if (digits.length < 10) {
    return { valid: false, message: 'Phone number must have at least 10 digits.' };
  }
  return { valid: true, message: '' };
}

/**
 * validateMinLength — checks that text has at least `min` characters.
 */
function validateMinLength(value, min, fieldName) {
  var trimmed = (value || '').trim();
  if (trimmed.length === 0) {
    return { valid: false, message: fieldName + ' is required.' };
  }
  if (trimmed.length < min) {
    return { valid: false, message: fieldName + ' must be at least ' + min + ' characters (currently ' + trimmed.length + ').' };
  }
  return { valid: true, message: '' };
}

/**
 * validateMaxLength — checks that text does not exceed `max` characters.
 */
function validateMaxLength(value, max, fieldName) {
  var trimmed = (value || '').trim();
  if (trimmed.length > max) {
    return { valid: false, message: fieldName + ' cannot exceed ' + max + ' characters.' };
  }
  return { valid: true, message: '' };
}

/**
 * validatePassword — requires at least 8 characters with
 * at least one letter and one number.
 */
function validatePassword(value) {
  if (!value || value.length === 0) {
    return { valid: false, message: 'Password is required.' };
  }
  if (value.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long.' };
  }
  if (!/[a-zA-Z]/.test(value)) {
    return { valid: false, message: 'Password must contain at least one letter.' };
  }
  if (!/[0-9]/.test(value)) {
    return { valid: false, message: 'Password must contain at least one number.' };
  }
  return { valid: true, message: '' };
}

/**
 * validatePasswordMatch — checks that two password fields match.
 */
function validatePasswordMatch(pass, confirmPass) {
  if (!confirmPass || confirmPass.length === 0) {
    return { valid: false, message: 'Please confirm your password.' };
  }
  if (pass !== confirmPass) {
    return { valid: false, message: 'Passwords do not match.' };
  }
  return { valid: true, message: '' };
}

/* ── UI ERROR DISPLAY HELPERS ─────────────────────────────── */

/**
 * showFieldError — marks an input as invalid and shows an error message.
 * Looks for a sibling .invalid-feedback element to put the message in.
 */
function showFieldError(inputEl, message) {
  inputEl.classList.add('is-invalid');
  inputEl.classList.remove('is-valid');

  // Find or create the .invalid-feedback element
  var feedback = inputEl.parentElement.querySelector('.invalid-feedback');
  if (!feedback) {
    feedback = document.createElement('div');
    feedback.className = 'invalid-feedback';
    inputEl.parentElement.appendChild(feedback);
  }
  feedback.textContent = message;
  feedback.style.display = 'block';
}

/**
 * clearFieldError — removes invalid state from an input field.
 */
function clearFieldError(inputEl) {
  inputEl.classList.remove('is-invalid');
  inputEl.classList.add('is-valid');
  var feedback = inputEl.parentElement.querySelector('.invalid-feedback');
  if (feedback) {
    feedback.style.display = 'none';
  }
}

/**
 * resetFieldState — fully resets a field (removes valid AND invalid states).
 */
function resetFieldState(inputEl) {
  inputEl.classList.remove('is-invalid', 'is-valid');
  var feedback = inputEl.parentElement.querySelector('.invalid-feedback');
  if (feedback) {
    feedback.style.display = 'none';
  }
}

/* ── WHOLE FORM VALIDATOR ─────────────────────────────────── */
/**
 * validateForm — iterates over all fields with [data-validate] attribute
 * and runs the appropriate validators based on the attribute value.
 *
 * data-validate values (pipe-separated):
 *   required          → validateRequired
 *   email             → validateEmail
 *   phone             → validatePhone
 *   password          → validatePassword
 *   minlength:N       → validateMinLength(value, N)
 *   maxlength:N       → validateMaxLength(value, N)
 *
 * Example:
 *   <input data-validate="required|email" data-label="Email">
 *   <textarea data-validate="required|minlength:50" data-label="Description">
 *
 * Returns true if ALL fields pass, false if ANY fail.
 */
function validateForm(formEl) {
  var fields = formEl.querySelectorAll('[data-validate]');
  var allValid = true;

  fields.forEach(function (field) {
    var rules    = field.getAttribute('data-validate').split('|');
    var label    = field.getAttribute('data-label') || field.name || 'This field';
    var value    = field.value;
    var isValid  = true;
    var errorMsg = '';

    // Run each rule in order; stop at first failure
    for (var i = 0; i < rules.length; i++) {
      var rule = rules[i].trim();
      var result;

      if (rule === 'required') {
        result = validateRequired(value, label);
      } else if (rule === 'email') {
        result = validateEmail(value);
      } else if (rule === 'phone') {
        result = validatePhone(value);
      } else if (rule === 'password') {
        result = validatePassword(value);
      } else if (rule.startsWith('minlength:')) {
        var min = parseInt(rule.split(':')[1], 10);
        result = validateMinLength(value, min, label);
      } else if (rule.startsWith('maxlength:')) {
        var max = parseInt(rule.split(':')[1], 10);
        result = validateMaxLength(value, max, label);
      } else {
        result = { valid: true, message: '' };
      }

      if (!result.valid) {
        isValid  = false;
        errorMsg = result.message;
        break; // Stop at first failure for this field
      }
    }

    if (isValid) {
      clearFieldError(field);
    } else {
      showFieldError(field, errorMsg);
      allValid = false;
    }
  });

  return allValid;
}

/* ── REAL-TIME VALIDATION (blur events) ─────────────────── */
/**
 * attachRealTimeValidation — adds blur (focus-out) event listeners
 * to all [data-validate] fields within a form, so users see
 * validation feedback as they fill in the form.
 */
function attachRealTimeValidation(formEl) {
  var fields = formEl.querySelectorAll('[data-validate]');
  fields.forEach(function (field) {
    field.addEventListener('blur', function () {
      // Create a temporary mini-form-like object just for this field
      var tempForm = { querySelectorAll: function () { return [field]; } };
      validateForm(tempForm);
    });
    // Clear error on input (while user is typing)
    field.addEventListener('input', function () {
      if (field.classList.contains('is-invalid')) {
        resetFieldState(field);
      }
    });
  });
}

/* ── PASSWORD STRENGTH INDICATOR ────────────────────────── */
/**
 * attachPasswordStrength — attaches an input event to a password field
 * and updates a strength indicator bar.
 * @param {HTMLElement} passwordInput - the <input type="password">
 * @param {HTMLElement} strengthContainer - element with class .password-strength
 */
function attachPasswordStrength(passwordInput, strengthContainer) {
  if (!passwordInput || !strengthContainer) return;

  passwordInput.addEventListener('input', function () {
    var val = passwordInput.value;
    var score = 0;

    if (val.length >= 8)       score++;
    if (/[A-Z]/.test(val))     score++;
    if (/[0-9]/.test(val))     score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    // Remove old strength classes
    strengthContainer.classList.remove('strength-weak', 'strength-fair', 'strength-strong');
    var label = strengthContainer.querySelector('.strength-label');

    if (val.length === 0) {
      if (label) label.textContent = '';
      return;
    }

    if (score <= 1) {
      strengthContainer.classList.add('strength-weak');
      if (label) label.textContent = 'Weak password';
    } else if (score <= 2) {
      strengthContainer.classList.add('strength-fair');
      if (label) label.textContent = 'Fair password';
    } else {
      strengthContainer.classList.add('strength-strong');
      if (label) label.textContent = 'Strong password';
    }
  });
}
