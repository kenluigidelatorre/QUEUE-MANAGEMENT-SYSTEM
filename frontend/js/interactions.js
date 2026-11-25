/* ==========================================================================
   IDS Colleges Student Services Queue — Page Interactions & API Integration
   ========================================================================== */
(function (window) {
  'use strict';

  const {
    OFFICES,
    resolveDepartmentKey,
    getDepartmentInfo,
    formatTime,
    formatTodayDate,
    escapeHTML,
    setButtonLoading,
    showToast,
  } = window.IDSQueue;

  // Only two supported departments: Registrar and Cashier
  const DEPARTMENT_KEYS = ['registrar', 'cashier'];

  /* ------------------------------------------------------------------------
     1. Welcome / Home Page
     ------------------------------------------------------------------------ */
  function initHomePage() {
    const summaryContainer = document.getElementById('homeOfficeSummaryList');
    if (!summaryContainer) return;

    function renderHomeSummary(summaryData, statusMessage) {
      const rows = DEPARTMENT_KEYS.map((key) => {
        const office = OFFICES[key];
        const info = summaryData && summaryData[key] ? summaryData[key] : null;
        const servingText = info && info.nowServing ? escapeHTML(info.nowServing) : '—';
        const waitingText =
          info && typeof info.waitingCount === 'number' && info.waitingCount > 0
            ? `<span class="tabular-nums">${info.waitingCount}</span> waiting`
            : 'No customers are currently waiting.';

        return `
          <div class="office-summary-row">
            <div class="icon-tile icon-tile-white" aria-hidden="true">
              <i class="bi ${escapeHTML(office.icon)} fs-5"></i>
            </div>
            <div class="min-w-0 flex-grow-1">
              <p class="mb-0 fw-bold" style="font-size: 0.875rem; color: #334155;">${escapeHTML(office.name)}</p>
              <p class="mb-0 mt-1" style="font-size: 0.75rem; color: #94a3b8;">
                ${waitingText}
              </p>
            </div>
            <p class="mb-0 tabular-nums" style="font-size: 1.5rem; font-weight: 900; letter-spacing: -0.02em; color: #15552f;">
              ${servingText}
            </p>
          </div>
        `;
      });

      summaryContainer.innerHTML =
        rows.join('') +
        (statusMessage
          ? `<p class="mb-0 text-center" style="font-size: 0.72rem; color: #64748b;">${escapeHTML(statusMessage)}</p>`
          : '');
    }

    async function loadHomeSummary() {
      const res = await window.IDSQueueService.fetchOfficeSummary();
      if (res.ok && res.data) {
        renderHomeSummary(res.data, '');
      } else if (res.notConfigured) {
        renderHomeSummary(null, '');
      } else {
        renderHomeSummary(null, res.error || 'Unable to load queue summary.');
      }
    }

    loadHomeSummary();
  }

  /* ------------------------------------------------------------------------
     2. Student Queue & Digital Ticket Page
     ------------------------------------------------------------------------ */
  function initStudentQueuePage() {
    const formView = document.getElementById('studentFormView');
    const ticketView = document.getElementById('studentTicketView');
    const form = document.getElementById('studentQueueForm');
    const nameInput = document.getElementById('studentName');
    const officeCards = document.querySelectorAll('.office-choice-card[data-office]');
    const errorBox = document.getElementById('studentFormError');
    const submitBtn = document.getElementById('studentSubmitBtn');
    const printBtn = document.getElementById('printTicketBtn');
    const generateAnotherBtn = document.getElementById('generateAnotherBtn');

    if (!form || !formView || !ticketView) return;

    let selectedOffice = null;

    function showError(msg) {
      if (!errorBox) return;
      if (msg) {
        errorBox.textContent = msg;
        errorBox.classList.remove('d-none');
      } else {
        errorBox.textContent = '';
        errorBox.classList.add('d-none');
      }
    }

    officeCards.forEach((card) => {
      card.addEventListener('click', () => {
        selectedOffice = card.getAttribute('data-office');
        officeCards.forEach((c) => {
          const isMatch = c.getAttribute('data-office') === selectedOffice;
          c.classList.toggle('selected', isMatch);
          c.setAttribute('aria-pressed', isMatch ? 'true' : 'false');
        });
        showError('');
      });
    });

    function renderTicket(record) {
      if (!record) return;
      const office = getDepartmentInfo(record);
      document.getElementById('ticketNumberDisplay').textContent = record.number || record.queueNumber || '—';
      document.getElementById('ticketStudentName').textContent = record.name || record.fullName || '—';
      document.getElementById('ticketOfficeName').textContent = office
        ? office.destinationLabel
        : record.department || record.office || '—';
      document.getElementById('ticketTimeIssued').textContent = formatTime(record.createdAt);

      const status = (record.status || 'waiting').toLowerCase();
      const statusBadge = document.getElementById('ticketStatusBadge');
      if (statusBadge) {
        const dotColors = {
          waiting: '#f59e0b',
          serving: '#16a34a',
          completed: '#059669',
          skipped: '#64748b',
        };
        statusBadge.className = `status-badge mt-3 ${escapeHTML(status)}`;
        statusBadge.innerHTML = `
          <span class="rounded-circle d-inline-block" style="width: 8px; height: 8px; background-color: ${dotColors[status] || '#f59e0b'};"></span>
          <span>${escapeHTML(status.toUpperCase())}</span>
        `;
      }
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const validation = window.IDSValidation.validateStudentTicketForm(nameInput.value, selectedOffice);
      if (!validation.valid) {
        showError(validation.message);
        return;
      }

      showError('');
      setButtonLoading(submitBtn, true, 'Generating ticket...');

      const res = await window.IDSQueueService.createTicket({
        name: nameInput.value.trim(),
        department: selectedOffice,
        office: selectedOffice,
      });

      setButtonLoading(submitBtn, false);

      if (!res.ok || !res.data) {
        showError(res.error || 'Failed to generate queue ticket.');
        return;
      }

      renderTicket(res.data);
      formView.classList.add('d-none');
      ticketView.classList.remove('d-none');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showToast(`Ticket ${res.data.number || res.data.queueNumber || ''} generated.`, 'success');
    });

    if (printBtn) {
      printBtn.addEventListener('click', () => {
        window.print();
      });
    }

    if (generateAnotherBtn) {
      generateAnotherBtn.addEventListener('click', () => {
        nameInput.value = '';
        selectedOffice = null;
        officeCards.forEach((c) => {
          c.classList.remove('selected');
          c.setAttribute('aria-pressed', 'false');
        });
        showError('');
        ticketView.classList.add('d-none');
        formView.classList.remove('d-none');
        nameInput.focus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  /* ------------------------------------------------------------------------
     3. Staff Login Page
     ------------------------------------------------------------------------ */
  function initStaffLoginPage() {
    const form = document.getElementById('staffLoginForm');
    const emailInput = document.getElementById('staffEmail');
    const passwordInput = document.getElementById('staffPassword');
    const errorBox = document.getElementById('staffLoginError');
    const submitBtn = document.getElementById('staffLoginSubmitBtn');
    const togglePasswordBtn = document.getElementById('togglePasswordBtn');

    if (!form) return;

    function showError(msg) {
      if (!errorBox) return;
      if (msg) {
        errorBox.textContent = msg;
        errorBox.classList.remove('d-none');
      } else {
        errorBox.textContent = '';
        errorBox.classList.add('d-none');
      }
    }

    if (togglePasswordBtn && passwordInput) {
      togglePasswordBtn.addEventListener('click', () => {
        const isPassword = passwordInput.getAttribute('type') === 'password';
        passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
        const icon = togglePasswordBtn.querySelector('i');
        if (icon) {
          icon.className = isPassword ? 'bi bi-eye-slash' : 'bi bi-eye';
        }
        togglePasswordBtn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
      });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const result = window.IDSValidation.validateStaffLoginForm(emailInput.value, passwordInput.value);
      if (!result.valid) {
        showError(result.message);
        return;
      }

      showError('');
      setButtonLoading(submitBtn, true, 'Signing in...');

      const res = await window.IDSAuthService.login({
        email: emailInput.value.trim(),
        password: passwordInput.value,
      });

      setButtonLoading(submitBtn, false);

      if (!res.ok) {
        showError(
          res.notConfigured
            ? 'Backend authentication API is not connected yet. Configure your API endpoint in js/api/api.js.'
            : res.error || 'Invalid email or password. Please try again.'
        );
        return;
      }

      window.location.href = './staff-dashboard.html';
    });
  }

  /* ------------------------------------------------------------------------
     4. Staff Office Dashboard & Voice Calling Interface
     ------------------------------------------------------------------------ */
  function initStaffDashboardPage() {
    const sessionUser = window.IDSAuthService.getSession();
    const sessionOfficeKey =
      sessionUser && (sessionUser.department || sessionUser.office)
        ? resolveDepartmentKey(sessionUser.department || sessionUser.office)
        : null;
    const sessionOffice = sessionOfficeKey ? OFFICES[sessionOfficeKey] : null;

    let selectedDepartment = sessionOfficeKey || 'registrar';
    let records = [];
    let currentServingRecord = null;
    let activeTab = 'active';
    let searchQuery = '';
    let isLoading = false;
    let isCallingNext = false;
    let apiErrorMessage = '';
    let pendingDeleteId = null;

    const staffRoleLabel = document.getElementById('staffRoleLabel');
    const officeCodeLabel = document.getElementById('dashboardOfficeCode');
    const officeTitleLabel = document.getElementById('dashboardOfficeTitle');
    const dateBadge = document.getElementById('dashboardDateBadge');
    const statusNotice = document.getElementById('dashboardStatusNotice');
    const deptFilterSelect = document.getElementById('dashboardDepartmentSelect');

    if (staffRoleLabel) {
      staffRoleLabel.textContent = sessionOffice ? `${sessionOffice.name} Staff` : 'Staff Portal';
    }
    if (dateBadge) {
      dateBadge.textContent = formatTodayDate();
    }

    if (deptFilterSelect) {
      if (sessionOfficeKey) {
        deptFilterSelect.value = sessionOfficeKey;
        deptFilterSelect.disabled = true;
      } else {
        deptFilterSelect.value = selectedDepartment;
        deptFilterSelect.addEventListener('change', (e) => {
          selectedDepartment = e.target.value || 'registrar';
          updateDashboardHeaderLabels();
          loadQueueRecords();
        });
      }
    }

    function updateDashboardHeaderLabels() {
      const activeDept =
        selectedDepartment !== 'all' && OFFICES[selectedDepartment]
          ? OFFICES[selectedDepartment]
          : sessionOffice;
      if (officeCodeLabel) {
        officeCodeLabel.textContent = activeDept
          ? `${activeDept.destinationLabel} · Selected Department`
          : 'Registrar & Cashier · All Departments';
      }
      if (officeTitleLabel) {
        officeTitleLabel.textContent = activeDept
          ? `${activeDept.name} Dashboard`
          : 'Office Dashboard';
      }
    }
    updateDashboardHeaderLabels();

    const logoutBtn = document.getElementById('staffLogoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await window.IDSAuthService.logout();
        window.location.href = './staff-login.html';
      });
    }

    const refreshBtn = document.getElementById('refreshQueueBtn');
    const skipBtn = document.getElementById('dashSkipBtn');
    const completeBtn = document.getElementById('dashCompleteBtn');
    const callNextBtn = document.getElementById('dashCallNextBtn');
    const repeatVoiceBtn = document.getElementById('dashRepeatVoiceBtn');
    const stopVoiceBtn = document.getElementById('dashStopVoiceBtn');
    const voiceStatusBadge = document.getElementById('dashVoiceStatusBadge');
    const voiceTranscriptEl = document.getElementById('dashVoiceTranscript');
    const voiceSelect = document.getElementById('voiceSelectInput');
    const voiceVolumeInput = document.getElementById('voiceVolumeInput');
    const voiceRateInput = document.getElementById('voiceRateInput');
    const voicePitchInput = document.getElementById('voicePitchInput');
    const voiceVolumeVal = document.getElementById('voiceVolumeVal');
    const voiceRateVal = document.getElementById('voiceRateVal');
    const voicePitchVal = document.getElementById('voicePitchVal');

    const tabActiveBtn = document.getElementById('tabActiveQueue');
    const tabHistoryBtn = document.getElementById('tabHistoryQueue');
    const searchInput = document.getElementById('dashboardSearchInput');
    const confirmDeleteBtn = document.getElementById('confirmDeleteRecordBtn');
    const deleteModalEl = document.getElementById('deleteRecordModal');

    // Initialize Voice Controls & Web Speech Status Listener
    const voiceApi = window.IDSVoiceAnnouncement;
    function populateVoices() {
      if (!voiceSelect || !voiceApi) return;
      const voices = voiceApi.getEnglishVoices();
      const currentVal = voiceSelect.value;
      voiceSelect.innerHTML =
        `<option value="">Default English Voice</option>` +
        voices
          .map(
            (v) =>
              `<option value="${escapeHTML(v.voiceURI)}">${escapeHTML(v.name)} (${escapeHTML(v.lang)})</option>`
          )
          .join('');
      if (currentVal) voiceSelect.value = currentVal;
    }

    if (voiceApi) {
      populateVoices();
      if (voiceApi.isSupported() && window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = populateVoices;
      }

      voiceApi.onStatusChange(({ status, isSpeaking, detail }) => {
        updateVoiceStatusUI(status, isSpeaking, detail);
      });

      if (!voiceApi.isSupported()) {
        updateVoiceStatusUI('unsupported', false, '');
      } else {
        updateVoiceStatusUI('idle', false, '');
      }
    }

    if (voiceSelect && voiceApi) {
      voiceSelect.addEventListener('change', (e) => {
        voiceApi.setSettings({ voiceURI: e.target.value });
      });
    }
    if (voiceVolumeInput && voiceApi) {
      voiceVolumeInput.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        voiceApi.setSettings({ volume: val });
        if (voiceVolumeVal) voiceVolumeVal.textContent = `${Math.round(val * 100)}%`;
      });
    }
    if (voiceRateInput && voiceApi) {
      voiceRateInput.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        voiceApi.setSettings({ rate: val });
        if (voiceRateVal) voiceRateVal.textContent = `${val.toFixed(2)}x`;
      });
    }
    if (voicePitchInput && voiceApi) {
      voicePitchInput.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        voiceApi.setSettings({ pitch: val });
        if (voicePitchVal) voicePitchVal.textContent = val.toFixed(1);
      });
    }

    function updateVoiceStatusUI(status, isSpeaking, detail) {
      if (voiceStatusBadge) {
        const labelMap = {
          idle: 'Ready',
          speaking: 'Announcing...',
          stopped: 'Stopped',
          unsupported: 'Speech Unavailable',
          error: 'Announcement Error',
        };
        voiceStatusBadge.textContent = labelMap[status] || 'Ready';
        voiceStatusBadge.className = `voice-status-pill ${status}`;
      }
      if (voiceTranscriptEl && detail && status === 'speaking') {
        voiceTranscriptEl.textContent = `"${detail}"`;
        voiceTranscriptEl.classList.remove('d-none');
      } else if (voiceTranscriptEl && status === 'stopped') {
        voiceTranscriptEl.classList.add('d-none');
      }
      if (stopVoiceBtn) {
        stopVoiceBtn.disabled = !isSpeaking;
      }
    }

    function renderDashboard() {
      const serving =
        currentServingRecord ||
        records.find((r) => String(r.status || '').toLowerCase() === 'serving') ||
        null;
      const waiting = records.filter((r) => String(r.status || '').toLowerCase() === 'waiting');
      const completed = records.filter((r) => String(r.status || '').toLowerCase() === 'completed');
      const skipped = records.filter((r) => String(r.status || '').toLowerCase() === 'skipped');
      const activeList = records.filter((r) => {
        const st = String(r.status || '').toLowerCase();
        return st === 'waiting' || st === 'serving';
      });
      const historyList = records
        .filter((r) => {
          const st = String(r.status || '').toLowerCase();
          return st === 'completed' || st === 'skipped';
        })
        .slice()
        .reverse();

      const hasError = Boolean(apiErrorMessage);

      // KPIs
      document.getElementById('kpiServingValue').textContent =
        !hasError ? (serving ? serving.number || serving.queueNumber : '—') : '—';
      document.getElementById('kpiWaitingValue').textContent =
        !hasError ? String(waiting.length) : '—';
      document.getElementById('kpiCompletedValue').textContent =
        !hasError ? String(completed.length) : '—';
      document.getElementById('kpiSkippedValue').textContent =
        !hasError ? String(skipped.length) : '—';

      // Now Serving Card (Queue Number, Full Customer Name, Department Destination)
      const servingNumberEl = document.getElementById('dashNowServingNumber');
      const servingNameEl = document.getElementById('dashNowServingName');
      const servingDeptEl = document.getElementById('dashNowServingDepartment');

      if (servingNumberEl) {
        servingNumberEl.textContent = serving ? serving.number || serving.queueNumber || '—' : '—';
      }
      if (servingNameEl) {
        servingNameEl.textContent = serving
          ? serving.name || serving.fullName || '—'
          : 'No customer currently serving';
      }
      if (servingDeptEl) {
        const deptInfo = serving ? getDepartmentInfo(serving) : null;
        servingDeptEl.textContent = deptInfo
          ? `Proceed to: ${deptInfo.destinationLabel}`
          : 'Destination: —';
      }

      // Next in Line Card
      const nextPerson = waiting[0] || null;
      const nextNumEl = document.getElementById('dashNextInLineNumber');
      const nextNameEl = document.getElementById('dashNextInLineName');
      const nextDeptEl = document.getElementById('dashNextInLineDept');
      if (nextPerson) {
        const nextDept = getDepartmentInfo(nextPerson);
        if (nextNumEl) nextNumEl.textContent = nextPerson.number || nextPerson.queueNumber || '—';
        if (nextNameEl) nextNameEl.textContent = nextPerson.name || nextPerson.fullName || '—';
        if (nextDeptEl) {
          nextDeptEl.textContent = nextDept ? nextDept.destinationLabel : '—';
        }
      } else {
        if (nextNumEl) nextNumEl.textContent = '—';
        if (nextNameEl) nextNameEl.textContent = 'No customers are currently waiting.';
        if (nextDeptEl) nextDeptEl.textContent = '—';
      }

      // Button States
      if (skipBtn) skipBtn.disabled = isLoading || isCallingNext || !serving;
      if (completeBtn) completeBtn.disabled = isLoading || isCallingNext || !serving;
      if (repeatVoiceBtn) repeatVoiceBtn.disabled = !serving;
      if (callNextBtn && !isCallingNext) {
        callNextBtn.disabled = isLoading || Boolean(serving) || waiting.length === 0;
      }

      // Status / Error Banner
      if (statusNotice) {
        if (apiErrorMessage) {
          statusNotice.textContent = apiErrorMessage;
          statusNotice.classList.remove('d-none');
        } else {
          statusNotice.textContent = '';
          statusNotice.classList.add('d-none');
        }
      }

      // Tabs
      if (tabActiveBtn) {
        tabActiveBtn.textContent = `Waiting & active (${activeList.length})`;
        tabActiveBtn.classList.toggle('active', activeTab === 'active');
      }
      if (tabHistoryBtn) {
        tabHistoryBtn.textContent = `Completed & history (${historyList.length})`;
        tabHistoryBtn.classList.toggle('active', activeTab === 'history');
      }

      const tbody = document.getElementById('dashboardQueueTableBody');
      if (!tbody) return;

      if (isLoading) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" class="text-center py-5" style="color: #64748b;">
              <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Loading queue records...
            </td>
          </tr>
        `;
        return;
      }

      const sourceList = activeTab === 'active' ? activeList : historyList;
      const q = searchQuery.trim().toLowerCase();
      const filteredList = q
        ? sourceList.filter((r) => {
            const deptInfo = getDepartmentInfo(r);
            return (
              String(r.number || r.queueNumber || '').toLowerCase().includes(q) ||
              String(r.name || r.fullName || '').toLowerCase().includes(q) ||
              String(deptInfo ? deptInfo.destinationLabel : r.department || r.office || '')
                .toLowerCase()
                .includes(q) ||
              String(r.status || '').toLowerCase().includes(q)
            );
          })
        : sourceList;

      if (!filteredList.length) {
        const emptyMessage = q
          ? 'No matching records found.'
          : activeTab === 'history'
          ? 'No completed records yet.'
          : 'No customers are currently waiting.';
        tbody.innerHTML = `
          <tr>
            <td colspan="6" class="text-center py-5" style="color: #94a3b8;">
              ${escapeHTML(emptyMessage)}
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = filteredList
        .map((rec) => {
          const idAttr = escapeHTML(rec.id);
          const numberLabel = escapeHTML(rec.number || rec.queueNumber || '—');
          const nameLabel = escapeHTML(rec.name || rec.fullName || '—');
          const deptInfo = getDepartmentInfo(rec);
          const deptLabel = escapeHTML(
            deptInfo ? deptInfo.destinationLabel : rec.department || rec.office || '—'
          );
          const status = String(rec.status || 'waiting').toLowerCase();

          const primaryAction =
            status === 'skipped'
              ? `<button type="button" class="btn btn-sm btn-outline-success fw-bold px-2 py-1 recall-ticket-btn" data-ticket-id="${idAttr}" style="font-size: 0.72rem; border-radius: 0.5rem;">Re-queue</button>`
              : status === 'waiting' && !serving
              ? `<button type="button" class="btn btn-sm btn-outline-success fw-bold px-2 py-1 call-specific-btn" data-ticket-id="${idAttr}" style="font-size: 0.72rem; border-radius: 0.5rem;">Call</button>`
              : '';

          return `
            <tr>
              <td class="fw-extrabold tabular-nums" style="font-weight: 800; color: #23713d;">${numberLabel}</td>
              <td class="fw-semibold" style="color: #334155;">${nameLabel}</td>
              <td style="font-size: 0.8125rem; color: #475569;">${deptLabel}</td>
              <td class="tabular-nums" style="font-size: 0.75rem; color: #64748b;">${escapeHTML(formatTime(rec.createdAt))}</td>
              <td><span class="status-badge ${escapeHTML(status)}">${escapeHTML(status)}</span></td>
              <td class="text-end">
                <div class="d-inline-flex align-items-center gap-1">
                  ${primaryAction}
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-danger px-2 py-1 delete-ticket-btn"
                    data-ticket-id="${idAttr}"
                    data-ticket-number="${numberLabel}"
                    aria-label="Delete record ${numberLabel}"
                    style="font-size: 0.72rem; border-radius: 0.5rem;"
                  >
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          `;
        })
        .join('');

      tbody.querySelectorAll('.recall-ticket-btn').forEach((btn) => {
        btn.addEventListener('click', () => handleStatusUpdate(btn.getAttribute('data-ticket-id'), 'waiting', false));
      });

      tbody.querySelectorAll('.call-specific-btn').forEach((btn) => {
        btn.addEventListener('click', () => handleStatusUpdate(btn.getAttribute('data-ticket-id'), 'serving', true));
      });

      tbody.querySelectorAll('.delete-ticket-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          pendingDeleteId = btn.getAttribute('data-ticket-id');
          const ticketNum = btn.getAttribute('data-ticket-number') || 'this record';
          const modalBody = document.getElementById('deleteRecordModalText');
          if (modalBody) {
            modalBody.textContent = `Are you sure you want to delete queue record ${ticketNum}?`;
          }
          if (deleteModalEl && window.bootstrap && window.bootstrap.Modal) {
            window.bootstrap.Modal.getOrCreateInstance(deleteModalEl).show();
          }
        });
      });
    }

    async function loadQueueRecords() {
      isLoading = true;
      apiErrorMessage = '';
      renderDashboard();

      const filters = {};
      if (selectedDepartment && selectedDepartment !== 'all') {
        filters.department = selectedDepartment;
      }

      const res = await window.IDSQueueService.fetchTickets(filters);
      isLoading = false;

      if (res.ok && Array.isArray(res.data)) {
        records = res.data;
        currentServingRecord =
          records.find((r) => String(r.status || '').toLowerCase() === 'serving') || null;
        apiErrorMessage = '';
      } else {
        records = [];
        currentServingRecord = null;
        apiErrorMessage = res.notConfigured
          ? 'Backend API is not connected yet. Configure your API endpoints in js/api/api.js.'
          : res.error || 'Failed to load queue records from the server.';
      }

      renderDashboard();
    }

    async function handleCallNext() {
      if (isCallingNext) return;

      isCallingNext = true;
      setButtonLoading(callNextBtn, true, 'Calling next...');

      const payload = {};
      if (selectedDepartment && selectedDepartment !== 'all') {
        payload.department = selectedDepartment;
      }

      const res = await window.IDSQueueService.callNext(payload);
      isCallingNext = false;
      setButtonLoading(callNextBtn, false);

      // Never advance or announce if the API request fails
      if (!res.ok) {
        showToast(res.error || 'Unable to call next waiting customer.', 'danger');
        return;
      }

      const calledRecord = res.data && res.data.ticket ? res.data.ticket : res.data;
      if (!calledRecord || (!calledRecord.number && !calledRecord.queueNumber)) {
        showToast('No customers are currently waiting.', 'warning');
        await loadQueueRecords();
        return;
      }

      currentServingRecord = { ...calledRecord, status: 'serving' };
      renderDashboard();

      // Automatically announce confirmed record (Queue Number -> Customer Name -> Department)
      if (voiceApi) {
        const speechRes = voiceApi.announce(currentServingRecord);
        if (!speechRes.ok && !speechRes.duplicate && speechRes.error) {
          showToast(speechRes.error, 'warning');
        }
      }

      await loadQueueRecords();
    }

    async function handleStatusUpdate(ticketId, nextStatus, shouldAnnounce) {
      if (!ticketId) return;
      const res = await window.IDSQueueService.updateTicket(ticketId, { status: nextStatus });
      if (!res.ok) {
        showToast(res.error || 'Unable to update queue status.', 'danger');
        return;
      }

      const updatedRecord =
        (res.data && res.data.ticket ? res.data.ticket : res.data) ||
        records.find((r) => r.id === ticketId);

      if (nextStatus === 'completed' || nextStatus === 'skipped') {
        if (currentServingRecord && currentServingRecord.id === ticketId) {
          currentServingRecord = null;
        }
      }

      if (shouldAnnounce && nextStatus === 'serving' && updatedRecord && voiceApi) {
        currentServingRecord = { ...updatedRecord, status: 'serving' };
        voiceApi.announce(currentServingRecord);
      }

      showToast(`Ticket updated to ${nextStatus}.`, 'success');
      await loadQueueRecords();
    }

    if (callNextBtn) {
      callNextBtn.addEventListener('click', handleCallNext);
    }

    if (repeatVoiceBtn && voiceApi) {
      repeatVoiceBtn.addEventListener('click', () => {
        const serving =
          currentServingRecord ||
          records.find((r) => String(r.status || '').toLowerCase() === 'serving');
        if (!serving) {
          showToast('No active queue record to announce.', 'warning');
          return;
        }
        const res = voiceApi.repeat(serving);
        if (!res.ok && res.error) {
          showToast(res.error, 'warning');
        }
      });
    }

    if (stopVoiceBtn && voiceApi) {
      stopVoiceBtn.addEventListener('click', () => {
        voiceApi.stop();
        showToast('Voice announcement stopped.', 'neutral');
      });
    }

    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        const current =
          currentServingRecord ||
          records.find((r) => String(r.status || '').toLowerCase() === 'serving');
        if (current) handleStatusUpdate(current.id, 'skipped', false);
      });
    }

    if (completeBtn) {
      completeBtn.addEventListener('click', () => {
        const current =
          currentServingRecord ||
          records.find((r) => String(r.status || '').toLowerCase() === 'serving');
        if (current) handleStatusUpdate(current.id, 'completed', false);
      });
    }

    if (tabActiveBtn) {
      tabActiveBtn.addEventListener('click', () => {
        activeTab = 'active';
        renderDashboard();
      });
    }

    if (tabHistoryBtn) {
      tabHistoryBtn.addEventListener('click', () => {
        activeTab = 'history';
        renderDashboard();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderDashboard();
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        loadQueueRecords();
      });
    }

    if (confirmDeleteBtn) {
      confirmDeleteBtn.addEventListener('click', async () => {
        if (!pendingDeleteId) return;
        setButtonLoading(confirmDeleteBtn, true, 'Deleting...');
        const res = await window.IDSQueueService.deleteTicket(pendingDeleteId);
        setButtonLoading(confirmDeleteBtn, false);

        if (deleteModalEl && window.bootstrap && window.bootstrap.Modal) {
          const modal = window.bootstrap.Modal.getInstance(deleteModalEl);
          if (modal) modal.hide();
        }

        if (!res.ok) {
          showToast(res.error || 'Unable to delete record.', 'danger');
          return;
        }

        if (currentServingRecord && currentServingRecord.id === pendingDeleteId) {
          currentServingRecord = null;
        }
        pendingDeleteId = null;
        showToast('Queue record deleted.', 'success');
        await loadQueueRecords();
      });
    }

    loadQueueRecords();
  }

  /* ------------------------------------------------------------------------
     5. Public Live Queue Display Page
     ------------------------------------------------------------------------ */
  function initPublicDisplayPage() {
    const grid = document.getElementById('publicDisplayGrid');
    const announcementPill = document.getElementById('publicAnnouncementStatus');
    if (!grid) return;

    function updatePublicAnnouncementStatus(status) {
      if (!announcementPill) return;
      const labelMap = {
        idle: 'Standby',
        speaking: 'Announcing...',
        stopped: 'Stopped',
        unsupported: 'Audio Ready',
        error: 'Standby',
      };
      const dotColor = status === 'speaking' ? '#34d399' : '#94a3b8';
      announcementPill.innerHTML = `
        <span class="status-dot-emerald ${status === 'speaking' ? 'status-dot-pulse' : ''}" style="background-color: ${dotColor};" aria-hidden="true"></span>
        <span>Announcement: ${escapeHTML(labelMap[status] || 'Standby')}</span>
      `;
    }

    if (window.IDSVoiceAnnouncement) {
      window.IDSVoiceAnnouncement.onStatusChange(({ status }) => {
        updatePublicAnnouncementStatus(status);
      });
    }

    function renderDisplay(recordsByOffice) {
      grid.innerHTML = DEPARTMENT_KEYS.map((key) => {
        const office = OFFICES[key];
        const records =
          recordsByOffice && Array.isArray(recordsByOffice[key]) ? recordsByOffice[key] : [];
        const serving = records.find((r) => String(r.status || '').toLowerCase() === 'serving');
        const waiting = records.filter((r) => String(r.status || '').toLowerCase() === 'waiting');
        const nextInLine = waiting[0] || null;
        const upcoming = waiting.slice(1, 5);

        const upcomingHtml = upcoming.length
          ? upcoming
              .map(
                (item, index) => `
                  <div class="display-up-next-row">
                    <div class="d-flex align-items-center gap-3 min-w-0">
                      <span class="display-pos-badge tabular-nums">${index + 2}</span>
                      <span class="fw-semibold text-truncate" style="font-size: 0.875rem; color: #475569;">${escapeHTML(item.name || item.fullName)}</span>
                    </div>
                    <strong class="tabular-nums ms-2" style="font-size: 1.125rem; color: #23713d;">${escapeHTML(item.number || item.queueNumber)}</strong>
                  </div>
                `
              )
              .join('')
          : `
            <div class="rounded-3 text-center py-3" style="border: 1px dashed #cbd5e1; color: #94a3b8; font-size: 0.8125rem;">
              No customers are currently waiting.
            </div>
          `;

        return `
          <div class="col-12 col-lg-6">
            <section class="display-office-card h-100 d-flex flex-column">
              <header class="d-flex align-items-center gap-3 px-4 py-3 border-bottom" style="border-color: #e2e8f0 !important;">
                <div class="icon-tile icon-tile-green" aria-hidden="true">
                  <i class="bi ${escapeHTML(office.icon)} fs-5"></i>
                </div>
                <div>
                  <h2 class="mb-0 fw-extrabold" style="font-size: 1.125rem; font-weight: 800; color: #174b2b;">
                    ${escapeHTML(office.name)}
                  </h2>
                  <p class="mb-0" style="font-size: 0.75rem; color: #64748b;">
                    ${escapeHTML(office.destinationLabel)}
                  </p>
                </div>
              </header>

              <div class="display-now-serving">
                <p class="mb-0 fw-extrabold text-uppercase" style="font-size: 0.75rem; font-weight: 800; letter-spacing: 0.2em; color: #318d48;">
                  Now serving
                </p>
                <p class="display-ticket-giant tabular-nums mt-2 mb-0">
                  ${serving ? escapeHTML(serving.number || serving.queueNumber) : '—'}
                </p>
                <p class="mt-3 mb-1 fw-bold" style="font-size: 1rem; color: #1e293b;">
                  ${serving ? escapeHTML(serving.name || serving.fullName) : 'No customer currently serving'}
                </p>
                <span class="destination-chip mt-1">
                  <i class="bi bi-geo-alt-fill"></i>
                  <span>${escapeHTML(office.destinationLabel)}</span>
                </span>
              </div>

              <div class="p-4 flex-grow-1 d-flex flex-column gap-3">
                <div>
                  <p class="mb-2 fw-extrabold text-uppercase" style="font-size: 0.7rem; font-weight: 800; letter-spacing: 0.16em; color: #2f8f46;">
                    Next in line
                  </p>
                  ${
                    nextInLine
                      ? `
                        <div class="display-next-highlight">
                          <span class="fw-bold text-truncate" style="font-size: 0.9rem; color: #174b2b;">
                            ${escapeHTML(nextInLine.name || nextInLine.fullName)}
                          </span>
                          <strong class="tabular-nums ms-2" style="font-size: 1.25rem; color: #15552f;">
                            ${escapeHTML(nextInLine.number || nextInLine.queueNumber)}
                          </strong>
                        </div>
                      `
                      : `
                        <div class="rounded-3 text-center py-3" style="background-color: #f8fafc; border: 1px dashed #cbd5e1; color: #94a3b8; font-size: 0.8125rem;">
                          No customers are currently waiting.
                        </div>
                      `
                  }
                </div>

                <div>
                  <p class="mb-2 fw-extrabold text-uppercase" style="font-size: 0.7rem; font-weight: 800; letter-spacing: 0.16em; color: #94a3b8;">
                    Upcoming queue numbers
                  </p>
                  <div class="d-flex flex-column gap-2">
                    ${upcomingHtml}
                  </div>
                </div>
              </div>
            </section>
          </div>
        `;
      }).join('');
    }

    async function loadDisplay() {
      const res = await window.IDSQueueService.fetchTickets();
      if (res.ok && Array.isArray(res.data)) {
        const grouped = {
          registrar: res.data.filter((r) => resolveDepartmentKey(r.department || r.office) === 'registrar'),
          cashier: res.data.filter((r) => resolveDepartmentKey(r.department || r.office) === 'cashier'),
        };
        renderDisplay(grouped);
      } else {
        renderDisplay(null);
      }
    }

    renderDisplay(null);
    loadDisplay();
  }

  /* ------------------------------------------------------------------------
     Application Entrypoint
     ------------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', () => {
    window.IDSNav.initNavigation();

    const page = document.body.getAttribute('data-page');
    if (page === 'welcome') initHomePage();
    if (page === 'student') initStudentQueuePage();
    if (page === 'login') initStaffLoginPage();
    if (page === 'dashboard') initStaffDashboardPage();
    if (page === 'display') initPublicDisplayPage();
  });
})(window);
