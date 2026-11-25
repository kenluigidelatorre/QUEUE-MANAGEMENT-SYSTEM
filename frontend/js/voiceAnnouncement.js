/* ==========================================================================
   IDS Colleges Student Services Queue — Automatic Voice Announcement Module
   Uses the built-in browser Web Speech API (window.speechSynthesis)
   Supports only Registrar and Cashier destinations.
   ========================================================================== */
(function (window) {
  'use strict';

  const DIGIT_WORDS = {
    '0': 'zero',
    '1': 'one',
    '2': 'two',
    '3': 'three',
    '4': 'four',
    '5': 'five',
    '6': 'six',
    '7': 'seven',
    '8': 'eight',
    '9': 'nine',
  };

  const DEPARTMENT_ENDINGS = {
    registrar: 'Please proceed to the Registrar Office.',
    cashier: 'Please proceed to the Cashier Counter.',
  };

  const state = {
    volume: 1.0,
    rate: 0.95,
    pitch: 1.0,
    voiceURI: '',
    isSpeaking: false,
    status: 'idle',
    lastRecord: null,
    lastAnnouncedId: null,
    lastAnnouncedAt: 0,
    listeners: [],
  };

  function isSupported() {
    return (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      typeof window.SpeechSynthesisUtterance === 'function'
    );
  }

  function emitStatus(status, detail) {
    state.status = status;
    state.isSpeaking = status === 'speaking';
    state.listeners.forEach((cb) => {
      try {
        cb({
          status,
          isSpeaking: state.isSpeaking,
          detail: detail || '',
          record: state.lastRecord,
        });
      } catch (err) {
        // Ignore listener errors
      }
    });
  }

  function onStatusChange(callback) {
    if (typeof callback === 'function') {
      state.listeners.push(callback);
    }
  }

  function getEnglishVoices() {
    if (!isSupported()) return [];
    const all = window.speechSynthesis.getVoices() || [];
    const english = all.filter((v) => /^en\b/i.test(v.lang));
    return english.length ? english : all;
  }

  function pickDefaultEnglishVoice() {
    const voices = getEnglishVoices();
    if (!voices.length) return null;

    if (state.voiceURI) {
      const chosen = voices.find((v) => v.voiceURI === state.voiceURI);
      if (chosen) return chosen;
    }

    return (
      voices.find((v) => /en-US/i.test(v.lang) && !/compact/i.test(v.name)) ||
      voices.find((v) => /en-US/i.test(v.lang)) ||
      voices.find((v) => /^en/i.test(v.lang)) ||
      voices[0]
    );
  }

  function normalizeDepartmentKey(rawDepartment) {
    const val = String(rawDepartment || '').trim().toLowerCase();
    if (val === 'registrar' || val.includes('registrar')) return 'registrar';
    if (val === 'cashier' || val.includes('cashier')) return 'cashier';
    return null;
  }

  function formatQueueNumberForSpeech(queueNumber) {
    const raw = String(queueNumber || '').trim();
    if (!raw) return '';

    const parts = raw
      .replace(/[-_]+/g, ' ')
      .split(/\s+/)
      .filter(Boolean);

    return parts
      .map((token) =>
        token
          .split('')
          .map((ch) => (DIGIT_WORDS[ch] ? DIGIT_WORDS[ch] : ch))
          .join(' ')
      )
      .join(', ');
  }

  /**
   * Returns exact human-readable announcement text:
   * "Now serving number [Queue Number], [Customer Name]. Please proceed to the Registrar Office."
   */
  function buildAnnouncementText(record) {
    if (!record) return null;

    const queueNumber = String(record.number || record.queueNumber || '').trim();
    const fullName = String(record.name || record.fullName || '').trim();
    const deptKey = normalizeDepartmentKey(
      record.department || record.office || record.destination
    );

    if (!queueNumber || !fullName || !deptKey || !DEPARTMENT_ENDINGS[deptKey]) {
      return null;
    }

    return `Now serving number ${queueNumber}, ${fullName}. ${DEPARTMENT_ENDINGS[deptKey]}`;
  }

  function buildSpokenText(record) {
    if (!record) return null;

    const queueNumber = String(record.number || record.queueNumber || '').trim();
    const fullName = String(record.name || record.fullName || '').trim();
    const deptKey = normalizeDepartmentKey(
      record.department || record.office || record.destination
    );

    if (!queueNumber || !fullName || !deptKey || !DEPARTMENT_ENDINGS[deptKey]) {
      return null;
    }

    const spokenNumber = formatQueueNumberForSpeech(queueNumber);
    return `Now serving number ${spokenNumber}, ${fullName}. ${DEPARTMENT_ENDINGS[deptKey]}`;
  }

  function speakText(spokenText, displayText, record) {
    if (!isSupported()) {
      emitStatus('unsupported', 'Web Speech API is not supported in this browser.');
      return { ok: false, error: 'Web Speech API is not supported in this browser.' };
    }

    // Cancel active/queued utterances to prevent overlapping announcements
    window.speechSynthesis.cancel();

    const utterance = new window.SpeechSynthesisUtterance(spokenText);
    const selectedVoice = pickDefaultEnglishVoice();
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang || 'en-US';
    } else {
      utterance.lang = 'en-US';
    }

    utterance.volume = Math.min(1, Math.max(0, Number(state.volume)));
    utterance.rate = Math.min(1.5, Math.max(0.5, Number(state.rate)));
    utterance.pitch = Math.min(1.5, Math.max(0.5, Number(state.pitch)));

    utterance.onstart = () => {
      emitStatus('speaking', displayText);
    };

    utterance.onend = () => {
      if (state.status === 'speaking') {
        emitStatus('idle', '');
      }
    };

    utterance.onerror = (event) => {
      if (event && (event.error === 'interrupted' || event.error === 'canceled')) {
        return;
      }
      emitStatus('error', 'Voice playback error occurred.');
    };

    state.lastRecord = record;
    window.speechSynthesis.speak(utterance);
    emitStatus('speaking', displayText);

    return { ok: true, text: displayText };
  }

  function announce(record, options = {}) {
    const displayText = buildAnnouncementText(record);
    const spokenText = buildSpokenText(record);
    if (!displayText || !spokenText) {
      emitStatus('error', 'Missing queue number, customer name, or valid department.');
      return {
        ok: false,
        error: 'Incomplete queue record: queue number, customer name, and Registrar or Cashier department are required.',
      };
    }

    const recordId = record.id || `${record.number}-${record.name}`;
    const now = Date.now();
    if (
      !options.force &&
      state.lastAnnouncedId === recordId &&
      now - state.lastAnnouncedAt < 2500
    ) {
      return { ok: false, duplicate: true };
    }

    state.lastAnnouncedId = recordId;
    state.lastAnnouncedAt = now;

    return speakText(spokenText, displayText, record);
  }

  function repeat(currentRecord) {
    const target = currentRecord || state.lastRecord;
    if (!target) {
      return { ok: false, error: 'No active queue record to announce.' };
    }
    return announce(target, { force: true });
  }

  function stop() {
    if (isSupported()) {
      window.speechSynthesis.cancel();
    }
    emitStatus('stopped', 'Announcement stopped.');
  }

  function setSettings(partial = {}) {
    if (partial.volume !== undefined) {
      state.volume = Math.min(1, Math.max(0, Number(partial.volume)));
    }
    if (partial.rate !== undefined) {
      state.rate = Math.min(1.5, Math.max(0.5, Number(partial.rate)));
    }
    if (partial.pitch !== undefined) {
      state.pitch = Math.min(1.5, Math.max(0.5, Number(partial.pitch)));
    }
    if (partial.voiceURI !== undefined) {
      state.voiceURI = String(partial.voiceURI || '');
    }
  }

  function getSettings() {
    return {
      volume: state.volume,
      rate: state.rate,
      pitch: state.pitch,
      voiceURI: state.voiceURI,
      supported: isSupported(),
      status: state.status,
      isSpeaking: state.isSpeaking,
    };
  }

  window.IDSVoiceAnnouncement = {
    DEPARTMENT_ENDINGS,
    isSupported,
    getEnglishVoices,
    normalizeDepartmentKey,
    formatQueueNumberForSpeech,
    buildAnnouncementText,
    announce,
    repeat,
    stop,
    setSettings,
    getSettings,
    onStatusChange,
  };
})(window);
