/* ==========================================================================
   IDS Colleges Student Services Queue — Core UI Config & Utilities
   ========================================================================== */
(function (window) {
  'use strict';

  // Supported service destinations (Registrar and Cashier only)
  const OFFICES = {
    registrar: {
      key: 'registrar',
      name: 'Registrar',
      shortName: 'Registrar',
      destinationLabel: 'Registrar Office',
      voiceEnding: 'Please proceed to the Registrar Office.',
      icon: 'bi-building',
      description: 'Enrollment, academic records, and document requests.',
    },
    cashier: {
      key: 'cashier',
      name: 'Cashier',
      shortName: 'Cashier',
      destinationLabel: 'Cashier Counter',
      voiceEnding: 'Please proceed to the Cashier Counter.',
      icon: 'bi-wallet2',
      description: 'Tuition payments, official receipts, and cash transactions.',
    },
  };

  function resolveDepartmentKey(rawValue) {
    const val = String(rawValue || '').trim().toLowerCase();
    if (val === 'registrar' || val.includes('registrar')) return 'registrar';
    if (val === 'cashier' || val.includes('cashier')) return 'cashier';
    return null;
  }

  function getDepartmentInfo(recordOrKey) {
    const raw =
      recordOrKey && typeof recordOrKey === 'object'
        ? recordOrKey.department || recordOrKey.office || recordOrKey.destination
        : recordOrKey;
    const key = resolveDepartmentKey(raw);
    return key ? OFFICES[key] : null;
  }

  function formatTime(isoString) {
    if (!isoString) return '—';
    try {
      const date = new Date(isoString);
      if (Number.isNaN(date.getTime())) return '—';
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch (err) {
      return '—';
    }
  }

  function formatTodayDate() {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }

  function escapeHTML(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function setButtonLoading(button, isLoading, loadingLabel) {
    if (!button) return;
    if (isLoading) {
      if (!button.dataset.originalHtml) {
        button.dataset.originalHtml = button.innerHTML;
      }
      button.disabled = true;
      button.innerHTML = `
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        <span>${escapeHTML(loadingLabel || 'Loading...')}</span>
      `;
    } else {
      button.disabled = false;
      if (button.dataset.originalHtml) {
        button.innerHTML = button.dataset.originalHtml;
      }
    }
  }

  function showToast(message, variant = 'neutral') {
    let container = document.getElementById('idsToastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'idsToastContainer';
      container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
      container.style.zIndex = '1080';
      document.body.appendChild(container);
    }

    const bgMap = {
      success: 'bg-success text-white',
      warning: 'bg-warning text-dark',
      danger: 'bg-danger text-white',
      neutral: 'bg-dark text-white',
    };

    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center border-0 shadow-lg ${bgMap[variant] || bgMap.neutral}`;
    toastEl.setAttribute('role', 'status');
    toastEl.setAttribute('aria-live', 'polite');
    toastEl.setAttribute('aria-atomic', 'true');
    toastEl.innerHTML = `
      <div class="d-flex">
        <div class="toast-body fw-semibold" style="font-size: 0.8125rem;">${escapeHTML(message)}</div>
        <button type="button" class="btn-close ${variant === 'warning' ? '' : 'btn-close-white'} me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    `;
    container.appendChild(toastEl);

    if (window.bootstrap && window.bootstrap.Toast) {
      const toast = new window.bootstrap.Toast(toastEl, { delay: 3000 });
      toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
      toast.show();
    } else {
      setTimeout(() => toastEl.remove(), 3000);
    }
  }

  window.IDSQueue = {
    OFFICES,
    resolveDepartmentKey,
    getDepartmentInfo,
    formatTime,
    formatTodayDate,
    escapeHTML,
    setButtonLoading,
    showToast,
  };
})(window);
