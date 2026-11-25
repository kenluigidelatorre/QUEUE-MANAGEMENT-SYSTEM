/* ==========================================================================
   IDS Colleges Student Services Queue — Client-Side Form Validation
   ========================================================================== */
(function (window) {
  'use strict';

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function validateStudentTicketForm(fullName, selectedOffice) {
    const trimmed = String(fullName || '').trim();
    if (!trimmed || !selectedOffice) {
      return {
        valid: false,
        message: 'Please enter your full name and select an office.',
      };
    }
    if (trimmed.length < 2) {
      return {
        valid: false,
        message: 'Please enter a valid full name (at least 2 characters).',
      };
    }
    if (!window.IDSQueue.OFFICES[selectedOffice]) {
      return {
        valid: false,
        message: 'Please select a valid service office.',
      };
    }
    return { valid: true, message: '' };
  }

  function validateStaffLoginForm(email, password) {
    const normalizedEmail = String(email || '').trim();
    const rawPassword = String(password || '');

    if (!normalizedEmail || !rawPassword) {
      return {
        valid: false,
        message: 'Please enter your email address and password.',
      };
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return {
        valid: false,
        message: 'Please enter a valid email address.',
      };
    }

    return {
      valid: true,
      message: '',
    };
  }

  window.IDSValidation = {
    validateStudentTicketForm,
    validateStaffLoginForm,
  };
})(window);
