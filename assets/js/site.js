'use strict';

const config = window.PGS_SITE_CONFIG || {};
const assistantButton = document.getElementById('assistantButton');
const assistantStatusButton = document.getElementById('assistantStatusButton');
const assistantStatusHeading = document.getElementById('assistantStatusHeading');
const assistantStatusText = document.getElementById('assistantStatusText');
const menuButton = document.getElementById('menuButton');
const siteNav = document.getElementById('siteNav');

function isSafeAssistantUrl(value) {
  if (!value) return false;

  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' &&
      (parsed.hostname === 'script.google.com' ||
       parsed.hostname.endsWith('.googleusercontent.com'));
  } catch (error) {
    return false;
  }
}

function configureAssistantButtons() {
  if (!isSafeAssistantUrl(config.assistantUrl)) {
    return;
  }

  [assistantButton, assistantStatusButton].forEach((button) => {
    button.href = config.assistantUrl;
    button.target = '_blank';
    button.rel = 'noopener';
    button.textContent = 'Open My PGS Assistant';
    button.classList.remove('disabled');
    button.removeAttribute('aria-disabled');
  });

  assistantStatusHeading.textContent = 'Your private PGS workspace is ready';
  assistantStatusText.textContent =
    'Open the secure Google Workspace assistant to identify an activity, ' +
    'create one master record, organize evidence, and prepare for ELMS.';
}

menuButton.addEventListener('click', () => {
  const isOpen = siteNav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(isOpen));
});

siteNav.addEventListener('click', (event) => {
  if (event.target.matches('a')) {
    siteNav.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
  }
});

configureAssistantButtons();
