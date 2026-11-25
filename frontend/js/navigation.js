/* ==========================================================================
   IDS Colleges Student Services Queue — Navigation Module
   ========================================================================== */
(function (window) {
  'use strict';

  function initNavigation() {
    const currentPage = document.body.getAttribute('data-page');

    // Highlight active top navigation link
    const navLinks = document.querySelectorAll('.ids-nav-link[data-nav-page]');
    navLinks.forEach((link) => {
      const target = link.getAttribute('data-nav-page');
      if (target === currentPage) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
      }
    });

    // Close mobile collapse menu after clicking a nav item
    const navbarCollapse = document.getElementById('idsMainNav');
    if (navbarCollapse && window.bootstrap && window.bootstrap.Collapse) {
      navLinks.forEach((link) => {
        link.addEventListener('click', () => {
          if (navbarCollapse.classList.contains('show')) {
            const bsCollapse = window.bootstrap.Collapse.getOrCreateInstance(navbarCollapse);
            bsCollapse.hide();
          }
        });
      });
    }

    return true;
  }

  window.IDSNav = {
    initNavigation,
  };
})(window);
