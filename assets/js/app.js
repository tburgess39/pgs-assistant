'use strict';

const pageMeta = {
  dashboard: ['Dashboard', 'Your guided path from professional activity to organized CU documentation.'],
  activity: ['Add Activity', 'Classify, calculate, and organize one professional activity.'],
  folders: ['Folder Setup', 'Create a clear Google Drive system for CU evidence.'],
  evidence: ['Evidence Guide', 'Prepare complete, accessible, and ethical documentation.'],
  elms: ['Prepare for ELMS', 'Gather everything before entering the district system.'],
  videos: ['Video Tutorials', 'Short visual lessons for every major step.'],
  records: ['Activity Records', 'Review totals, status, and category balances.']
};

const rules = window.PGS_RULES.categories;
const goalCUs = window.PGS_RULES.goalCUs;
const storageKey = 'pgsActs';
let activities = loadActivities();

const elements = {
  mobileNav: document.getElementById('mobileNav'),
  heading: document.getElementById('heading'),
  subheading: document.getElementById('sub'),
  form: document.getElementById('activityForm'),
  title: document.getElementById('title'),
  description: document.getElementById('desc'),
  category: document.getElementById('category'),
  payment: document.getElementById('payment'),
  hours: document.getElementById('hours'),
  titleI: document.getElementById('titleI'),
  status: document.getElementById('status'),
  drive: document.getElementById('drive'),
  result: document.getElementById('result'),
  resultCategory: document.getElementById('rCat'),
  resultCUs: document.getElementById('rCu'),
  resultMaximum: document.getElementById('rMax'),
  resultBalance: document.getElementById('rBal'),
  resultNotice: document.getElementById('rNotice'),
  estimated: document.getElementById('estimated'),
  approved: document.getElementById('approved'),
  percent: document.getElementById('pct'),
  remaining: document.getElementById('remaining'),
  recordsBody: document.getElementById('recordsBody'),
  categoryBody: document.getElementById('categoryBody')
};

function createActivityId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }

  return `activity-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadActivities() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    console.error('Unable to read saved activities:', error);
    return [];
  }
}

function saveActivities() {
  localStorage.setItem(storageKey, JSON.stringify(activities));
}

function show(viewId) {
  document.querySelectorAll('.view').forEach((view) => {
    view.classList.remove('active');
  });

  const selectedView = document.getElementById(viewId);
  if (!selectedView || !pageMeta[viewId]) {
    return;
  }

  selectedView.classList.add('active');

  document.querySelectorAll('nav button').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === viewId);
  });

  elements.mobileNav.value = viewId;
  elements.heading.textContent = pageMeta[viewId][0];
  elements.subheading.textContent = pageMeta[viewId][1];

  if (viewId === 'records') {
    renderRecords();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Kept global temporarily because the current HTML uses inline onclick attributes.
window.show = show;

function usedCUs(categoryName, excludedId = '') {
  return activities
    .filter((activity) =>
      activity.category === categoryName && activity.id !== excludedId
    )
    .reduce((total, activity) => total + Number(activity.cu || 0), 0);
}

function calculateCUs(categoryName, paymentStatus, qualifyingHours, titleIStatus) {
  const categoryRule = rules[categoryName] || {};

  if (Number.isFinite(categoryRule.fixed)) {
    return categoryRule.fixed;
  }

  if (paymentStatus === 'contract') {
    return 0;
  }

  const exceptionApplies =
    window.PGS_RULES.titleIExceptionCategories.includes(categoryName) &&
    titleIStatus === 'yes';

  const hoursPerCU = paymentStatus === 'paid' && !exceptionApplies ? 6 : 3;
  return qualifyingHours / hoursPerCU;
}

function isOfficiallyApproved(status) {
  return status.startsWith('Approved');
}

function updateDashboard() {
  const estimatedTotal = activities.reduce(
    (total, activity) => total + Number(activity.cu || 0),
    0
  );

  const approvedTotal = activities
    .filter((activity) => isOfficiallyApproved(activity.status))
    .reduce((total, activity) => total + Number(activity.cu || 0), 0);

  elements.estimated.textContent = estimatedTotal.toFixed(2);
  elements.approved.textContent = approvedTotal.toFixed(2);
  elements.percent.textContent =
    `${Math.min(100, Math.round((approvedTotal / goalCUs) * 100))}%`;
  elements.remaining.textContent =
    Math.max(0, goalCUs - approvedTotal).toFixed(2);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function safeDriveUrl(url) {
  if (!url) {
    return '';
  }

  try {
    const parsed = new URL(url);
    return ['https:', 'http:'].includes(parsed.protocol) ? parsed.href : '';
  } catch {
    return '';
  }
}

function renderRecords() {
  if (!activities.length) {
    elements.recordsBody.innerHTML =
      '<tr><td colspan="7">No activities saved yet.</td></tr>';
  } else {
    elements.recordsBody.innerHTML = activities.map((activity) => {
      const driveUrl = safeDriveUrl(activity.drive);
      const evidenceCell = driveUrl
        ? `<a target="_blank" rel="noopener" href="${escapeHtml(driveUrl)}">Open</a>`
        : 'Missing';

      return `
        <tr>
          <td>
            <strong>${escapeHtml(activity.title)}</strong><br>
            <small>${escapeHtml(activity.desc.slice(0, 70))}</small>
          </td>
          <td>${escapeHtml(activity.category)}</td>
          <td>${Number(activity.hours).toFixed(2)}</td>
          <td>${Number(activity.cu).toFixed(2)}</td>
          <td><span class="tag">${escapeHtml(activity.status)}</span></td>
          <td>${evidenceCell}</td>
          <td>
            <div class="table-actions">
              <button class="btn small ghost" type="button"
                data-action="edit" data-id="${escapeHtml(activity.id)}">Edit</button>
              <button class="btn small danger-button" type="button"
                data-action="delete" data-id="${escapeHtml(activity.id)}">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  elements.categoryBody.innerHTML = Object.entries(rules)
    .map(([categoryName, categoryRule]) => {
      const used = usedCUs(categoryName);
      return `
        <tr>
          <td>${escapeHtml(categoryName)}</td>
          <td>${used.toFixed(2)}</td>
          <td>${Number(categoryRule.max).toFixed(2)}</td>
          <td>${Math.max(0, categoryRule.max - used).toFixed(2)}</td>
        </tr>
      `;
    })
    .join('');
}

function showCalculationResult(activity, previousCategoryTotal) {
  const maximum = rules[activity.category].max;
  const newCategoryTotal = previousCategoryTotal + activity.cu;

  elements.resultCategory.textContent = activity.category;
  elements.resultCUs.textContent = activity.cu.toFixed(2);
  elements.resultMaximum.textContent = Number(maximum).toFixed(2);
  elements.resultBalance.textContent =
    Math.max(0, maximum - newCategoryTotal).toFixed(2);

  let message =
    'Activity saved in this browser. Verify every official requirement before submission.';
  let className = 'notice success';

  if (activity.payment === 'contract') {
    message =
      'Regular contractual-rate time is generally not eligible under this prototype calculation.';
    className = 'notice danger';
  } else if (newCategoryTotal > maximum) {
    message = 'This entry would exceed the current prototype category maximum.';
    className = 'notice warn';
  } else if (!activity.drive) {
    message = 'Calculation saved. The Google Drive evidence link is still missing.';
    className = 'notice warn';
  }

  elements.resultNotice.className = className;
  elements.resultNotice.textContent = message;
  elements.result.classList.add('show');
}

function resetFormForNewActivity() {
  elements.form.reset();
  elements.hours.value = '0';
  elements.form.dataset.editingId = '';
}

function editActivity(activityId) {
  const activity = activities.find((item) => item.id === activityId);
  if (!activity) {
    return;
  }

  elements.title.value = activity.title;
  elements.description.value = activity.desc;
  elements.category.value = activity.category;
  elements.payment.value = activity.payment;
  elements.hours.value = activity.hours;
  elements.titleI.value = activity.titleI;
  elements.status.value = activity.status;
  elements.drive.value = activity.drive;
  elements.form.dataset.editingId = activity.id;

  show('activity');
  elements.title.focus();
}

function deleteActivity(activityId) {
  const activity = activities.find((item) => item.id === activityId);
  if (!activity) {
    return;
  }

  const confirmed = window.confirm(
    `Delete "${activity.title}" from this browser?`
  );

  if (!confirmed) {
    return;
  }

  activities = activities.filter((item) => item.id !== activityId);
  saveActivities();
  updateDashboard();
  renderRecords();
}

document.querySelectorAll('nav button').forEach((button) => {
  button.addEventListener('click', () => show(button.dataset.view));
});

elements.mobileNav.addEventListener('change', (event) => {
  show(event.target.value);
});

elements.form.addEventListener('reset', () => {
  window.setTimeout(() => {
    elements.form.dataset.editingId = '';
    elements.result.classList.remove('show');
    elements.hours.value = '0';
  }, 0);
});

elements.form.addEventListener('submit', (event) => {
  event.preventDefault();

  const categoryName = elements.category.value;
  const editingId = elements.form.dataset.editingId;
  const previousCategoryTotal = usedCUs(categoryName, editingId);

  const activity = {
    id: editingId || createActivityId(),
    title: elements.title.value.trim(),
    desc: elements.description.value.trim(),
    category: categoryName,
    payment: elements.payment.value,
    hours: Number(elements.hours.value || 0),
    titleI: elements.titleI.value,
    status: elements.status.value,
    drive: elements.drive.value.trim(),
    updatedAt: new Date().toISOString()
  };

  activity.cu = Number(
    calculateCUs(
      activity.category,
      activity.payment,
      activity.hours,
      activity.titleI
    ).toFixed(2)
  );

  if (editingId) {
    const index = activities.findIndex((item) => item.id === editingId);
    if (index >= 0) {
      activity.createdAt = activities[index].createdAt;
      activities[index] = activity;
    }
  } else {
    activity.createdAt = activity.updatedAt;
    activities.push(activity);
  }

  saveActivities();
  showCalculationResult(activity, previousCategoryTotal);
  updateDashboard();
  renderRecords();
  elements.form.dataset.editingId = '';
});

elements.recordsBody.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) {
    return;
  }

  if (button.dataset.action === 'edit') {
    editActivity(button.dataset.id);
  } else if (button.dataset.action === 'delete') {
    deleteActivity(button.dataset.id);
  }
});

updateDashboard();
renderRecords();
