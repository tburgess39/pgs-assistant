const APP_NAME = 'PGS CU Assistant';
const WORKBOOK_NAME = 'PGS CU Assistant Data';
const ROOT_FOLDER_NAME = 'PGS Column Advancement';
const TIME_ZONE = 'America/Los_Angeles';
const MIN_ACTIVITY_DATE = '2024-05-01';

const SHEETS = Object.freeze({
  ACTIVITIES: 'Activity Log',
  RULES: 'Category Rules',
  SETTINGS: 'Settings',
  CHANGE_LOG: 'Change Log'
});

const ACTIVITY_HEADERS = Object.freeze([
  'ID', 'Activity Title', 'Description', 'Start Date', 'End Date',
  'Organization / Site', 'Role', 'Category Key', 'Parent Category',
  'Activity Category', 'Payment Status', 'Quantity', 'Unit',
  'Title I Exception', 'Estimated CUs', 'Status', 'Official Approved CUs',
  'Evidence Link', 'Activity Folder ID', 'Activity Folder URL', 'Notes',
  'Rule Version', 'Created At', 'Updated At'
]);

const RULE_HEADERS = Object.freeze([
  'Category Key', 'Parent Category', 'Activity Category', 'Maximum CUs',
  'Calculation Type', 'Allowed Units JSON', 'Unit Rates JSON',
  'Unpaid Hours per CU', 'Paid Hours per CU', 'Per-Unit CUs', 'Fixed CUs',
  'Title I Exception Allowed', 'Contract Time Allowed', 'Submission Mode',
  'Active', 'Effective For Activities From', 'Rule Version', 'Source Page',
  'Source URL', 'Required Documentation', 'Limitations', 'Match Tags JSON',
  'Keywords JSON', 'Notes'
]);

const STATUS_OPTIONS = Object.freeze([
  'Needs evidence', 'In progress', 'Ready for ELMS', 'Submitted',
  'Returned for corrections',
  'Approved — enter only after official CCSD approval', 'Denied'
]);

const PAYMENT_OPTIONS = Object.freeze(['unpaid', 'paid', 'contract']);

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle(APP_NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getBootstrapData() {
  const spreadsheet = getOrCreateWorkbook_();
  const rules = getRules_(spreadsheet);
  const activities = readActivities_(spreadsheet);
  const folders = getFolderLinks_();

  return {
    appName: APP_NAME,
    workspace: {
      spreadsheetUrl: spreadsheet.getUrl(),
      spreadsheetName: spreadsheet.getName(),
      rootFolderUrl: folders.rootFolderUrl || '',
      activityEvidenceFolderUrl: folders.activityEvidenceFolderUrl || ''
    },
    rules: rules,
    activities: activities,
    summary: buildSummary_(activities, rules),
    specialRules: PGS_SPECIAL_RULES,
    expiredActivityNames: PGS_EXPIRED_ACTIVITY_NAMES,
    libraryCount: rules.filter(function(rule) { return rule.active; }).length,
    warnings: [
      'This assistant and its associated tools apply only to activities occurring on or after May 1, 2024.',
      'Category suggestions are guidance, not final CCSD eligibility decisions.',
      'Estimated CUs are not official approvals.',
      'Review special PGS announcements in addition to the Reference Guide.',
      'The assistant prepares records and evidence but does not submit directly into ELMS.'
    ]
  };
}

function saveActivity(input) {
  const spreadsheet = getOrCreateWorkbook_();
  const sheet = spreadsheet.getSheetByName(SHEETS.ACTIVITIES);
  const rules = getRules_(spreadsheet);
  const activity = normalizeActivityInput_(input);
  const rule = rules.find(function(item) {
    return item.categoryKey === activity.categoryKey && item.active;
  });

  if (!rule) {
    throw new Error('The selected activity category does not have an active rule.');
  }

  const existingRow = activity.id ? findActivityRow_(sheet, activity.id) : 0;
  const existing = existingRow
    ? rowToActivity_(sheet.getRange(existingRow, 1, 1, ACTIVITY_HEADERS.length).getValues()[0])
    : null;

  const estimate = calculateEstimatedCUs_(activity, rule);
  const now = new Date();
  const id = activity.id || Utilities.getUuid();

  let folderId = existing ? existing.activityFolderId : '';
  let folderUrl = existing ? existing.activityFolderUrl : '';
  let evidenceLink = activity.evidenceLink || (existing ? existing.evidenceLink : '');

  if (activity.createFolder && !folderId) {
    const folder = createActivityFolder_(id, activity.title, activity.startDate);
    folderId = folder.id;
    folderUrl = folder.url;
    evidenceLink = evidenceLink || folder.url;
  }

  const officialApprovedCUs = activity.status.indexOf('Approved') === 0
    ? numberOrBlank_(activity.officialApprovedCUs)
    : '';

  const record = {
    id: id,
    title: activity.title,
    description: activity.description,
    startDate: activity.startDate,
    endDate: activity.endDate,
    organization: activity.organization,
    role: activity.role,
    categoryKey: rule.categoryKey,
    parentCategory: rule.parentCategory,
    categoryName: rule.activityName,
    paymentStatus: activity.paymentStatus,
    quantity: activity.quantity,
    unit: activity.unit,
    titleIException: activity.titleIException,
    estimatedCUs: estimate,
    status: activity.status,
    officialApprovedCUs: officialApprovedCUs,
    evidenceLink: evidenceLink,
    activityFolderId: folderId,
    activityFolderUrl: folderUrl,
    notes: activity.notes,
    ruleVersion: rule.ruleVersion,
    createdAt: existing ? existing.createdAt : formatDateTime_(now),
    updatedAt: formatDateTime_(now)
  };

  const rowValues = activityToRow_(record);

  if (existingRow) {
    sheet.getRange(existingRow, 1, 1, ACTIVITY_HEADERS.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }

  applyActivityRowFormatting_(sheet);
  appendChangeLog_(spreadsheet, existingRow ? 'UPDATED ACTIVITY' : 'CREATED ACTIVITY', id, activity.title);
  return getBootstrapData();
}

function deleteActivity(activityId) {
  const spreadsheet = getOrCreateWorkbook_();
  const sheet = spreadsheet.getSheetByName(SHEETS.ACTIVITIES);
  const row = findActivityRow_(sheet, String(activityId || ''));

  if (!row) throw new Error('The activity could not be found.');

  const title = sheet.getRange(row, 2).getDisplayValue();
  sheet.deleteRow(row);
  appendChangeLog_(spreadsheet, 'DELETED ACTIVITY RECORD', activityId,
    title + ' — Drive folders were not deleted.');
  return getBootstrapData();
}

function createWorkspaceFolders() {
  createOrGetFolderStructure_();
  const spreadsheet = getOrCreateWorkbook_();
  updateSettingsSheet_(spreadsheet);
  appendChangeLog_(spreadsheet, 'CREATED / VERIFIED FOLDER STRUCTURE', '', ROOT_FOLDER_NAME);
  return getBootstrapData();
}

function createEvidenceFolderForActivity(activityId) {
  const spreadsheet = getOrCreateWorkbook_();
  const sheet = spreadsheet.getSheetByName(SHEETS.ACTIVITIES);
  const row = findActivityRow_(sheet, String(activityId || ''));

  if (!row) throw new Error('The activity could not be found.');

  const record = rowToActivity_(
    sheet.getRange(row, 1, 1, ACTIVITY_HEADERS.length).getValues()[0]
  );

  if (record.activityFolderId) {
    try {
      DriveApp.getFolderById(record.activityFolderId);
      return getBootstrapData();
    } catch (error) {}
  }

  const folder = createActivityFolder_(record.id, record.title, record.startDate);
  const map = getHeaderMap_(ACTIVITY_HEADERS);
  sheet.getRange(row, map['Activity Folder ID']).setValue(folder.id);
  sheet.getRange(row, map['Activity Folder URL']).setValue(folder.url);
  if (!record.evidenceLink) {
    sheet.getRange(row, map['Evidence Link']).setValue(folder.url);
  }
  sheet.getRange(row, map['Updated At']).setValue(formatDateTime_(new Date()));
  appendChangeLog_(spreadsheet, 'CREATED ACTIVITY FOLDER', record.id, folder.url);
  return getBootstrapData();
}

function getOrCreateWorkbook_() {
  const properties = PropertiesService.getUserProperties();
  const storedId = properties.getProperty('PGS_SPREADSHEET_ID');

  if (storedId) {
    try {
      const existing = SpreadsheetApp.openById(storedId);
      ensureWorkbookStructure_(existing);
      return existing;
    } catch (error) {
      properties.deleteProperty('PGS_SPREADSHEET_ID');
    }
  }

  const spreadsheet = SpreadsheetApp.create(WORKBOOK_NAME);
  setupWorkbook_(spreadsheet);
  properties.setProperty('PGS_SPREADSHEET_ID', spreadsheet.getId());
  return spreadsheet;
}

function setupWorkbook_(spreadsheet) {
  const activities = spreadsheet.getSheets()[0];
  activities.setName(SHEETS.ACTIVITIES);
  const rules = spreadsheet.insertSheet(SHEETS.RULES);
  const settings = spreadsheet.insertSheet(SHEETS.SETTINGS);
  const changeLog = spreadsheet.insertSheet(SHEETS.CHANGE_LOG);

  activities.getRange(1, 1, 1, ACTIVITY_HEADERS.length).setValues([ACTIVITY_HEADERS]);
  rules.getRange(1, 1, 1, RULE_HEADERS.length).setValues([RULE_HEADERS]);
  const ruleRows = PGS_ACTIVITY_LIBRARY.map(activityRuleToRow_);
  rules.getRange(2, 1, ruleRows.length, RULE_HEADERS.length).setValues(ruleRows);

  settings.getRange(1, 1, 1, 3).setValues([['Setting', 'Value', 'Purpose']]);
  settings.getRange(2, 1, 8, 3).setValues([
    ['Goal CUs', 225, 'Dashboard progress target.'],
    ['Current Active Activity Options', PGS_ACTIVITY_LIBRARY.length, 'Loaded from the current activity library.'],
    ['Rule Warning', 'Suggestions and estimates must be verified against current official guidance.', 'Visible administrator reminder.'],
    ['Reference Guide', '9/1/23 PGS Reference Guide', 'Current base guide listed on the CCSD PGS page.'],
    ['Applicability Start Date', MIN_ACTIVITY_DATE, 'Assistant applies only to activities occurring on or after May 1, 2024.'],
    ['Root Folder ID', '', 'Created by Workspace Setup.'],
    ['Root Folder URL', '', 'Created by Workspace Setup.'],
    ['Activity Evidence Folder URL', '', 'Created by Workspace Setup.']
  ]);
  changeLog.getRange(1, 1, 1, 5)
    .setValues([['Timestamp', 'Action', 'Activity ID', 'Details', 'User']]);

  styleWorkbook_(spreadsheet);
  applyValidations_(spreadsheet);
  updateSettingsSheet_(spreadsheet);
}

function ensureWorkbookStructure_(spreadsheet) {
  const required = [
    [SHEETS.ACTIVITIES, ACTIVITY_HEADERS],
    [SHEETS.RULES, RULE_HEADERS],
    [SHEETS.SETTINGS, ['Setting', 'Value', 'Purpose']],
    [SHEETS.CHANGE_LOG, ['Timestamp', 'Action', 'Activity ID', 'Details', 'User']]
  ];

  required.forEach(function(item) {
    let sheet = spreadsheet.getSheetByName(item[0]);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(item[0]);
      sheet.getRange(1, 1, 1, item[1].length).setValues([item[1]]);
    }
  });

  const rulesSheet = spreadsheet.getSheetByName(SHEETS.RULES);
  if (rulesSheet.getLastRow() < 2) {
    const rows = PGS_ACTIVITY_LIBRARY.map(activityRuleToRow_);
    rulesSheet.getRange(2, 1, rows.length, RULE_HEADERS.length).setValues(rows);
  }

  styleWorkbook_(spreadsheet);
  applyValidations_(spreadsheet);
}

function activityRuleToRow_(rule) {
  return [
    rule.categoryKey, rule.parentCategory, rule.activityName,
    rule.maximumCUs === null ? '' : rule.maximumCUs,
    rule.calculationType, JSON.stringify(rule.units || []),
    JSON.stringify(rule.unitRates || {}),
    rule.unpaidHoursPerCU === null ? '' : rule.unpaidHoursPerCU,
    rule.paidHoursPerCU === null ? '' : rule.paidHoursPerCU,
    rule.perUnitCUs === null ? '' : rule.perUnitCUs,
    rule.fixedCUs === null ? '' : rule.fixedCUs,
    rule.titleIExceptionAllowed, rule.contractTimeAllowed,
    rule.submissionMode, rule.active, rule.effectiveForActivitiesFrom,
    rule.ruleVersion, rule.sourcePage, rule.sourceUrl,
    rule.documentation, rule.limitations,
    JSON.stringify(rule.matchTags || []), JSON.stringify(rule.keywords || []),
    rule.notes || ''
  ];
}

function styleWorkbook_(spreadsheet) {
  const navy = '#17365d';
  spreadsheet.getSheets().forEach(function(sheet) {
    const lastColumn = Math.max(1, sheet.getLastColumn());
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, lastColumn)
      .setBackground(navy).setFontColor('#ffffff')
      .setFontWeight('bold').setWrap(true);
  });

  const activitySheet = spreadsheet.getSheetByName(SHEETS.ACTIVITIES);
  activitySheet.setColumnWidth(1, 220);
  activitySheet.setColumnWidth(2, 240);
  activitySheet.setColumnWidth(3, 360);
  activitySheet.setColumnWidths(4, 2, 105);
  activitySheet.setColumnWidths(6, 2, 170);
  activitySheet.setColumnWidth(9, 210);
  activitySheet.setColumnWidth(10, 300);
  activitySheet.setColumnWidth(18, 300);
  activitySheet.setColumnWidth(20, 300);
  activitySheet.setColumnWidth(21, 300);

  const rulesSheet = spreadsheet.getSheetByName(SHEETS.RULES);
  rulesSheet.setColumnWidth(1, 210);
  rulesSheet.setColumnWidth(2, 250);
  rulesSheet.setColumnWidth(3, 360);
  rulesSheet.setColumnWidths(4, 15, 130);
  rulesSheet.setColumnWidths(19, 6, 360);

  const settings = spreadsheet.getSheetByName(SHEETS.SETTINGS);
  settings.setColumnWidth(1, 240);
  settings.setColumnWidth(2, 420);
  settings.setColumnWidth(3, 420);
}

function applyValidations_(spreadsheet) {
  const sheet = spreadsheet.getSheetByName(SHEETS.ACTIVITIES);
  const rows = Math.max(1000, sheet.getMaxRows());

  const paymentRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(PAYMENT_OPTIONS, true).setAllowInvalid(false).build();
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(STATUS_OPTIONS, true).setAllowInvalid(false).build();
  const yesNoRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['yes', 'no'], true).setAllowInvalid(false).build();

  sheet.getRange(2, 11, rows - 1, 1).setDataValidation(paymentRule);
  sheet.getRange(2, 14, rows - 1, 1).setDataValidation(yesNoRule);
  sheet.getRange(2, 16, rows - 1, 1).setDataValidation(statusRule);
}

function getRules_(spreadsheet) {
  const sheet = spreadsheet.getSheetByName(SHEETS.RULES);
  if (sheet.getLastRow() < 2) return [];

  return sheet.getRange(2, 1, sheet.getLastRow() - 1, RULE_HEADERS.length)
    .getValues()
    .filter(function(row) { return String(row[0] || '').trim() !== ''; })
    .map(function(row) {
      return {
        categoryKey: displayValue_(row[0]),
        parentCategory: displayValue_(row[1]),
        activityName: displayValue_(row[2]),
        maximumCUs: row[3] === '' ? null : numberOrZero_(row[3]),
        calculationType: displayValue_(row[4]),
        units: parseJson_(row[5], []),
        unitRates: parseJson_(row[6], {}),
        unpaidHoursPerCU: row[7] === '' ? null : numberOrZero_(row[7]),
        paidHoursPerCU: row[8] === '' ? null : numberOrZero_(row[8]),
        perUnitCUs: row[9] === '' ? null : numberOrZero_(row[9]),
        fixedCUs: row[10] === '' ? null : numberOrZero_(row[10]),
        titleIExceptionAllowed: booleanValue_(row[11]),
        contractTimeAllowed: booleanValue_(row[12]),
        submissionMode: displayValue_(row[13]),
        active: booleanValue_(row[14]),
        effectiveForActivitiesFrom: dateToInput_(row[15]),
        ruleVersion: displayValue_(row[16]),
        sourcePage: displayValue_(row[17]),
        sourceUrl: displayValue_(row[18]),
        documentation: displayValue_(row[19]),
        limitations: displayValue_(row[20]),
        matchTags: parseJson_(row[21], []),
        keywords: parseJson_(row[22], []),
        notes: displayValue_(row[23])
      };
    });
}

function readActivities_(spreadsheet) {
  const sheet = spreadsheet.getSheetByName(SHEETS.ACTIVITIES);
  if (sheet.getLastRow() < 2) return [];

  return sheet.getRange(2, 1, sheet.getLastRow() - 1, ACTIVITY_HEADERS.length)
    .getValues()
    .filter(function(row) { return String(row[0] || '').trim() !== ''; })
    .map(rowToActivity_);
}

function rowToActivity_(row) {
  return {
    id: displayValue_(row[0]), title: displayValue_(row[1]),
    description: displayValue_(row[2]), startDate: dateToInput_(row[3]),
    endDate: dateToInput_(row[4]), organization: displayValue_(row[5]),
    role: displayValue_(row[6]), categoryKey: displayValue_(row[7]),
    parentCategory: displayValue_(row[8]), categoryName: displayValue_(row[9]),
    paymentStatus: displayValue_(row[10]), quantity: numberOrZero_(row[11]),
    unit: displayValue_(row[12]), titleIException: displayValue_(row[13]) || 'no',
    estimatedCUs: row[14] === '' ? '' : numberOrZero_(row[14]),
    status: displayValue_(row[15]),
    officialApprovedCUs: row[16] === '' ? '' : numberOrZero_(row[16]),
    evidenceLink: displayValue_(row[17]), activityFolderId: displayValue_(row[18]),
    activityFolderUrl: displayValue_(row[19]), notes: displayValue_(row[20]),
    ruleVersion: displayValue_(row[21]), createdAt: dateTimeToString_(row[22]),
    updatedAt: dateTimeToString_(row[23])
  };
}

function activityToRow_(a) {
  return [
    safeText_(a.id), safeText_(a.title), safeText_(a.description),
    inputToDate_(a.startDate), inputToDate_(a.endDate),
    safeText_(a.organization), safeText_(a.role), safeText_(a.categoryKey),
    safeText_(a.parentCategory), safeText_(a.categoryName),
    safeText_(a.paymentStatus), a.quantity, safeText_(a.unit),
    safeText_(a.titleIException), a.estimatedCUs, safeText_(a.status),
    a.officialApprovedCUs, safeText_(a.evidenceLink),
    safeText_(a.activityFolderId), safeText_(a.activityFolderUrl),
    safeText_(a.notes), safeText_(a.ruleVersion),
    safeText_(a.createdAt), safeText_(a.updatedAt)
  ];
}

function normalizeActivityInput_(input) {
  const a = input || {};
  const title = cleanString_(a.title);
  const description = cleanString_(a.description);
  const categoryKey = cleanString_(a.categoryKey);
  const paymentStatus = cleanString_(a.paymentStatus) || 'unpaid';
  const status = cleanString_(a.status) || STATUS_OPTIONS[0];

  if (!title) throw new Error('Activity title is required.');
  if (!description) throw new Error('Activity description is required.');
  if (!categoryKey) throw new Error('Choose or confirm an activity category.');
  if (PAYMENT_OPTIONS.indexOf(paymentStatus) === -1) throw new Error('Select a valid payment status.');
  if (STATUS_OPTIONS.indexOf(status) === -1) throw new Error('Select a valid status.');

  const startDate = cleanString_(a.startDate);
  const endDate = cleanString_(a.endDate);

  if (!startDate) {
    throw new Error('Enter the activity start date. This assistant applies only to activities occurring on or after May 1, 2024.');
  }

  if (startDate < MIN_ACTIVITY_DATE) {
    throw new Error('This assistant applies only to activities occurring on or after May 1, 2024.');
  }

  if (endDate && endDate < MIN_ACTIVITY_DATE) {
    throw new Error('This assistant applies only to activities occurring on or after May 1, 2024.');
  }

  if (endDate && endDate < startDate) {
    throw new Error('The activity end date cannot be earlier than the start date.');
  }

  return {
    id: cleanString_(a.id), title: title, description: description,
    startDate: startDate, endDate: endDate,
    organization: cleanString_(a.organization), role: cleanString_(a.role),
    categoryKey: categoryKey, paymentStatus: paymentStatus,
    quantity: Math.max(0, numberOrZero_(a.quantity)),
    unit: cleanString_(a.unit), titleIException: cleanString_(a.titleIException) === 'yes' ? 'yes' : 'no',
    status: status, officialApprovedCUs: a.officialApprovedCUs,
    evidenceLink: validHttpUrlOrBlank_(a.evidenceLink),
    notes: cleanString_(a.notes), createFolder: Boolean(a.createFolder)
  };
}

function calculateEstimatedCUs_(activity, rule) {
  let result = '';

  if (rule.calculationType === 'hours') {
    if (activity.paymentStatus === 'contract' && !rule.contractTimeAllowed) return 0;
    const fullRateException = rule.titleIExceptionAllowed &&
      activity.titleIException === 'yes' &&
      activity.paymentStatus === 'paid';
    const divisor = activity.paymentStatus === 'paid' && !fullRateException
      ? rule.paidHoursPerCU : rule.unpaidHoursPerCU;
    result = divisor ? activity.quantity / divisor : '';
  } else if (rule.calculationType === 'count') {
    result = activity.quantity * numberOrZero_(rule.perUnitCUs);
  } else if (rule.calculationType === 'fixed') {
    result = numberOrZero_(rule.fixedCUs);
  } else if (rule.calculationType === 'unit_rate') {
    const rate = Number(rule.unitRates[activity.unit]);
    result = Number.isFinite(rate) ? activity.quantity * rate : '';
  } else if (rule.calculationType === 'manual') {
    if (activity.unit === 'documented_hours') {
      result = activity.quantity / 3;
    } else {
      result = '';
    }
  }

  return result === '' ? '' : roundToTwo_(result);
}

function buildSummary_(activities, rules) {
  const estimatedTotal = activities.reduce(function(total, item) {
    return total + numberOrZero_(item.estimatedCUs);
  }, 0);
  const approvedTotal = activities.reduce(function(total, item) {
    return total + numberOrZero_(item.officialApprovedCUs);
  }, 0);

  const categoryBalances = rules.filter(function(rule) { return rule.active; })
    .map(function(rule) {
      const recorded = activities
        .filter(function(item) { return item.categoryKey === rule.categoryKey; })
        .reduce(function(total, item) { return total + numberOrZero_(item.estimatedCUs); }, 0);
      return {
        categoryKey: rule.categoryKey,
        parentCategory: rule.parentCategory,
        category: rule.activityName,
        recorded: roundToTwo_(recorded),
        maximum: rule.maximumCUs,
        remaining: rule.maximumCUs === null ? null :
          roundToTwo_(Math.max(0, rule.maximumCUs - recorded))
      };
    });

  return {
    estimatedTotal: roundToTwo_(estimatedTotal),
    approvedTotal: roundToTwo_(approvedTotal),
    goalCUs: 225,
    percent: Math.min(100, Math.round((approvedTotal / 225) * 100)),
    remaining: roundToTwo_(Math.max(0, 225 - approvedTotal)),
    categoryBalances: categoryBalances
  };
}

function createOrGetFolderStructure_() {
  const properties = PropertiesService.getUserProperties();
  let root = getFolderByStoredId_('PGS_ROOT_FOLDER_ID');
  if (!root) {
    root = DriveApp.createFolder(ROOT_FOLDER_NAME);
    properties.setProperty('PGS_ROOT_FOLDER_ID', root.getId());
  }

  const folders = {
    approved: ensureChildFolder_(root, '01 Approved CU Records'),
    submitted: ensureChildFolder_(root, '02 Submitted - Awaiting Review'),
    ready: ensureChildFolder_(root, '03 Ready for ELMS'),
    needs: ensureChildFolder_(root, '04 Needs Documentation'),
    certificates: ensureChildFolder_(root, '05 Certificates and Transcripts'),
    activities: ensureChildFolder_(root, '06 Activity Evidence')
  };
  properties.setProperty('PGS_ACTIVITY_FOLDER_ID', folders.activities.getId());
  return {rootFolder: root, activityEvidenceFolder: folders.activities};
}

function createActivityFolder_(activityId, title, startDate) {
  const parent = createOrGetFolderStructure_().activityEvidenceFolder;
  const datePart = startDate || Utilities.formatDate(new Date(), TIME_ZONE, 'yyyy-MM-dd');
  const folder = parent.createFolder(sanitizeFolderName_(datePart + '_' + title));
  [
    '01 Approval Form', '02 Agenda and Attendance', '03 Meeting Minutes',
    '04 Work Products', '05 Supporting Evidence', '06 ELMS Submission Copy'
  ].forEach(function(name) { folder.createFolder(name); });
  folder.setDescription(APP_NAME + ' activity ID: ' + activityId);
  return {id: folder.getId(), url: folder.getUrl()};
}

function ensureChildFolder_(parent, name) {
  const matches = parent.getFoldersByName(name);
  return matches.hasNext() ? matches.next() : parent.createFolder(name);
}

function getFolderByStoredId_(propertyName) {
  const id = PropertiesService.getUserProperties().getProperty(propertyName);
  if (!id) return null;
  try { return DriveApp.getFolderById(id); }
  catch (error) {
    PropertiesService.getUserProperties().deleteProperty(propertyName);
    return null;
  }
}

function getFolderLinks_() {
  const root = getFolderByStoredId_('PGS_ROOT_FOLDER_ID');
  const activities = getFolderByStoredId_('PGS_ACTIVITY_FOLDER_ID');
  return {
    rootFolderId: root ? root.getId() : '',
    rootFolderUrl: root ? root.getUrl() : '',
    activityEvidenceFolderUrl: activities ? activities.getUrl() : ''
  };
}

function updateSettingsSheet_(spreadsheet) {
  const sheet = spreadsheet.getSheetByName(SHEETS.SETTINGS);
  const folders = getFolderLinks_();
  const updates = {
    'Root Folder ID': folders.rootFolderId,
    'Root Folder URL': folders.rootFolderUrl,
    'Activity Evidence Folder URL': folders.activityEvidenceFolderUrl
  };
  sheet.getDataRange().getValues().forEach(function(row, index) {
    if (Object.prototype.hasOwnProperty.call(updates, row[0])) {
      sheet.getRange(index + 1, 2).setValue(updates[row[0]]);
    }
  });
}

function appendChangeLog_(spreadsheet, action, activityId, details) {
  spreadsheet.getSheetByName(SHEETS.CHANGE_LOG).appendRow([
    formatDateTime_(new Date()), safeText_(action), safeText_(activityId),
    safeText_(details), safeText_(Session.getActiveUser().getEmail() || 'Authorized user')
  ]);
}

function applyActivityRowFormatting_(sheet) {
  if (sheet.getLastRow() < 2) return;
  sheet.getRange(2, 4, sheet.getLastRow() - 1, 2).setNumberFormat('yyyy-mm-dd');
  sheet.getRange(2, 12, sheet.getLastRow() - 1, 1).setNumberFormat('0.00');
  sheet.getRange(2, 15, sheet.getLastRow() - 1, 1).setNumberFormat('0.00');
  sheet.getRange(2, 17, sheet.getLastRow() - 1, 1).setNumberFormat('0.00');
  sheet.getRange(2, 1, sheet.getLastRow() - 1, ACTIVITY_HEADERS.length).setWrap(true);
}

function findActivityRow_(sheet, activityId) {
  if (!activityId || sheet.getLastRow() < 2) return 0;
  const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1)
    .getDisplayValues().map(function(row) { return row[0]; });
  const index = ids.indexOf(activityId);
  return index === -1 ? 0 : index + 2;
}

function getHeaderMap_(headers) {
  return headers.reduce(function(map, header, index) {
    map[header] = index + 1; return map;
  }, {});
}

function parseJson_(value, fallback) {
  try { return JSON.parse(String(value || '')); }
  catch (error) { return fallback; }
}
function safeText_(value) {
  const text = cleanString_(value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}
function validHttpUrlOrBlank_(value) {
  const text = cleanString_(value);
  if (!text) return '';
  if (!/^https?:\/\//i.test(text)) throw new Error('Evidence links must begin with http:// or https://');
  return text;
}
function sanitizeFolderName_(value) {
  return cleanString_(value).replace(/[\\/:*?"<>|#%{}~&]/g, '-')
    .replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 120) || 'PGS-Activity';
}
function inputToDate_(value) {
  const text = cleanString_(value);
  if (!text) return '';
  const parts = text.split('-').map(Number);
  return parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : text;
}
function dateToInput_(value) {
  return value instanceof Date && !isNaN(value.getTime())
    ? Utilities.formatDate(value, TIME_ZONE, 'yyyy-MM-dd') : cleanString_(value);
}
function dateTimeToString_(value) {
  return value instanceof Date && !isNaN(value.getTime())
    ? formatDateTime_(value) : cleanString_(value);
}
function formatDateTime_(date) {
  return Utilities.formatDate(date, TIME_ZONE, "yyyy-MM-dd'T'HH:mm:ss");
}
function displayValue_(value) { return value === null || value === undefined ? '' : String(value); }
function cleanString_(value) { return value === null || value === undefined ? '' : String(value).trim(); }
function numberOrZero_(value) {
  const number = Number(value); return Number.isFinite(number) ? number : 0;
}
function numberOrBlank_(value) {
  if (value === '' || value === null || value === undefined) return '';
  const number = Number(value); return Number.isFinite(number) ? roundToTwo_(number) : '';
}
function booleanValue_(value) {
  return value === true || ['true', 'yes'].indexOf(String(value).toLowerCase()) >= 0;
}
function roundToTwo_(value) {
  return Math.round((numberOrZero_(value) + Number.EPSILON) * 100) / 100;
}
