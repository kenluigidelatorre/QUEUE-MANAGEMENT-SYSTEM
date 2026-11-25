/* ==========================================================================
   IDS Colleges Student Services Queue — Queue API Service
   Routes all queue operations strictly to configured backend API endpoints.
   ========================================================================== */
(function (window) {
  'use strict';

  const { API_CONFIG, isConfigured, get, post, put, del } = window.IDSApi;

  function resolveTicketEndpoint(ticketId) {
    const template = API_CONFIG.endpoints.ticketById;
    if (!template) return '';
    return template.includes(':id')
      ? template.replace(':id', encodeURIComponent(ticketId))
      : `${template.replace(/\/+$/, '')}/${encodeURIComponent(ticketId)}`;
  }

  function isBackendConnected() {
    return Boolean(API_CONFIG.baseUrl);
  }

  function fetchOfficeSummary() {
    return get(API_CONFIG.endpoints.queueSummary);
  }

  function fetchTickets(filters = {}) {
    return get(API_CONFIG.endpoints.tickets, filters);
  }

  function createTicket(payload) {
    return post(API_CONFIG.endpoints.tickets, payload);
  }

  function callNext(payload = {}) {
    return post(API_CONFIG.endpoints.callNext, payload);
  }

  function updateTicket(ticketId, payload) {
    return put(resolveTicketEndpoint(ticketId), payload);
  }

  function deleteTicket(ticketId) {
    return del(resolveTicketEndpoint(ticketId));
  }

  window.IDSQueueService = {
    isBackendConnected,
    fetchOfficeSummary,
    fetchTickets,
    createTicket,
    callNext,
    updateTicket,
    deleteTicket,
  };
})(window);
