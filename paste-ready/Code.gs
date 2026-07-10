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
  'Title I Exception', 'Estimated CUs', 'Status',
  'Legacy Approved CU Override (Unused)', 'Generated Packet Link',
  'Category Folder ID', 'Category Folder URL', 'Notes',
  'Rule Version', 'Created At', 'Updated At', 'Sessions JSON',
  'Official Form URL', 'Session Log PDF URL', 'Packet Created At',
  'Submitted to ELMS At'
]);

const RULE_HEADERS = Object.freeze([
  'Category Key', 'Parent Category', 'Activity Category', 'Maximum CUs',
  'Calculation Type', 'Allowed Units JSON', 'Unit Rates JSON',
  'Unpaid Hours per CU', 'Paid Hours per CU', 'Per-Unit CUs', 'Fixed CUs',
  'Title I Exception Allowed', 'Contract Time Allowed', 'Submission Mode',
  'Active', 'Effective For Activities From', 'Rule Version', 'Source Page',
  'Source URL', 'Required Documentation', 'Limitations', 'Match Tags JSON',
  'Keywords JSON', 'Notes', 'Approval Form', 'Approval Timing',
  'Packet Instructions', 'Evidence Checklist JSON', 'Source Document',
  'Last Verified', 'Entry Mode', 'Date Label', 'End Date Label',
  'Show End Date', 'Quantity Label', 'Quantity Help', 'Quantity Step',
  'Evidence Input Basis'
]);

const STATUS_OPTIONS = Object.freeze([
  'Draft',
  'PDF created - review and sign',
  'Submitted to ELMS',
  'Returned for corrections',
  'Approved',
  'Denied',
  'Tracked - verify in ELMS'
]);

const PAYMENT_OPTIONS = Object.freeze(['unpaid', 'paid', 'contract', 'not_applicable']);
const OFFICIAL_TIME_FORM_FILE_ID = '19ts7-3nb1Gz1ZQZ-eabjwkGykRrrWkrh';
const OFFICIAL_TIME_FORM_URL = 'https://drive.google.com/file/d/19ts7-3nb1Gz1ZQZ-eabjwkGykRrrWkrh/view';

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
      activityEvidenceFolderUrl: folders.activityEvidenceFolderUrl || '',
      officialTimeFormUrl: OFFICIAL_TIME_FORM_URL
    },
    rules: rules,
    activities: activities,
    summary: buildSummary_(activities, rules),
    specialRules: PGS_SPECIAL_RULES,
    finderData: PGS_GUIDED_FINDER,
    expiredActivityNames: PGS_EXPIRED_ACTIVITY_NAMES,
    libraryCount: rules.filter(function(rule) { return rule.active; }).length,
    ruleAudit: {sourceDocument: '9/1/23 PGS Reference Guide', lastVerified: '2026-07-10', currentOptions: 43},
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
  const requestedCategoryKey = cleanString_(input && input.categoryKey);
  const rule = rules.find(function(item) {
    return item.categoryKey === requestedCategoryKey && item.active;
  });

  if (!rule) {
    throw new Error('The selected activity category does not have an active rule.');
  }

  const activity = normalizeActivityInput_(input, rule);
  applyEntryCalculations_(activity, rule);

  if (activity.id && findActivityRow_(sheet, activity.id)) {
    throw new Error(
      'Saved activity details are locked. Delete the record and create a corrected one, ' +
      'or use the status controls in Activity Records.'
    );
  }

  const estimate = calculateEstimatedCUs_(activity, rule);
  const now = new Date();
  const id = Utilities.getUuid();
  const categoryFolder = ensureCategoryFolder_(rule);

  const status = rule.submissionMode === 'automatic'
    ? 'Tracked - verify in ELMS'
    : 'Draft';

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
    titleIException: 'no',
    estimatedCUs: estimate,
    status: status,
    officialApprovedCUs: '',
    evidenceLink: '',
    activityFolderId: categoryFolder.getId(),
    activityFolderUrl: categoryFolder.getUrl(),
    notes: '',
    ruleVersion: rule.ruleVersion,
    createdAt: formatDateTime_(now),
    updatedAt: formatDateTime_(now),
    sessions: activity.sessions,
    officialFormUrl: '',
    sessionLogPdfUrl: '',
    packetCreatedAt: '',
    submittedToElmsAt: ''
  };

  sheet.appendRow(activityToRow_(record));
  applyActivityRowFormatting_(sheet);
  appendChangeLog_(
    spreadsheet,
    'CREATED LOCKED ACTIVITY',
    id,
    activity.title + ' | Category folder: ' + categoryFolder.getUrl()
  );

  return getBootstrapData();
}

function deleteActivity(activityId) {
  const spreadsheet = getOrCreateWorkbook_();
  const sheet = spreadsheet.getSheetByName(SHEETS.ACTIVITIES);
  const row = findActivityRow_(sheet, String(activityId || ''));

  if (!row) throw new Error('The activity could not be found.');

  const title = sheet.getRange(row, 2).getDisplayValue();
  sheet.deleteRow(row);
  appendChangeLog_(
    spreadsheet,
    'DELETED ACTIVITY RECORD',
    activityId,
    title + ' - Category folders and generated files were not deleted.'
  );
  return getBootstrapData();
}

function updateActivityStatus(input) {
  const activityId = cleanString_(input && input.id);
  const requestedStatus = cleanString_(input && input.status);

  if (STATUS_OPTIONS.indexOf(requestedStatus) === -1) {
    throw new Error('Choose a valid activity status.');
  }

  const spreadsheet = getOrCreateWorkbook_();
  const sheet = spreadsheet.getSheetByName(SHEETS.ACTIVITIES);
  const row = findActivityRow_(sheet, activityId);

  if (!row) throw new Error('The activity could not be found.');

  const map = getHeaderMap_(ACTIVITY_HEADERS);
  sheet.getRange(row, map['Status']).setValue(requestedStatus);
  sheet.getRange(row, map['Updated At']).setValue(formatDateTime_(new Date()));

  if (requestedStatus === 'Submitted to ELMS') {
    sheet.getRange(row, map['Submitted to ELMS At'])
      .setValue(formatDateTime_(new Date()));
  }

  appendChangeLog_(
    spreadsheet,
    'UPDATED STATUS',
    activityId,
    requestedStatus
  );

  return getBootstrapData();
}

function prepareActivityPacket(activityId) {
  const spreadsheet = getOrCreateWorkbook_();
  const sheet = spreadsheet.getSheetByName(SHEETS.ACTIVITIES);
  const row = findActivityRow_(sheet, cleanString_(activityId));

  if (!row) throw new Error('The activity could not be found.');

  const rules = getRules_(spreadsheet);
  const record = rowToActivity_(
    sheet.getRange(row, 1, 1, ACTIVITY_HEADERS.length).getValues()[0]
  );
  const rule = rules.find(function(item) {
    return item.categoryKey === record.categoryKey;
  });

  if (!rule) throw new Error('The category rule could not be found.');
  if (rule.entryMode !== 'session_time') {
    throw new Error('The automatic packet generator is currently for time-based activities.');
  }

  const folder = ensureCategoryFolder_(rule);
  const officialCopy = copyOfficialTimeBasedForm_(folder, record);
  const sessionReport = createSessionLogPdf_(folder, record, rule);
  const map = getHeaderMap_(ACTIVITY_HEADERS);
  const now = formatDateTime_(new Date());

  sheet.getRange(row, map['Category Folder ID']).setValue(folder.getId());
  sheet.getRange(row, map['Category Folder URL']).setValue(folder.getUrl());
  sheet.getRange(row, map['Generated Packet Link']).setValue(sessionReport.url);
  sheet.getRange(row, map['Official Form URL']).setValue(officialCopy.url);
  sheet.getRange(row, map['Session Log PDF URL']).setValue(sessionReport.url);
  sheet.getRange(row, map['Packet Created At']).setValue(now);
  sheet.getRange(row, map['Status']).setValue('PDF created - review and sign');
  sheet.getRange(row, map['Updated At']).setValue(now);

  appendChangeLog_(
    spreadsheet,
    'PREPARED TIME-BASED PACKET',
    record.id,
    'Official form: ' + officialCopy.url + ' | Session log: ' + sessionReport.url
  );

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
  const rule = getRules_(spreadsheet).find(function(item) {
    return item.categoryKey === record.categoryKey;
  });

  if (!rule) throw new Error('The category rule could not be found.');

  const folder = ensureCategoryFolder_(rule);
  const map = getHeaderMap_(ACTIVITY_HEADERS);
  sheet.getRange(row, map['Category Folder ID']).setValue(folder.getId());
  sheet.getRange(row, map['Category Folder URL']).setValue(folder.getUrl());
  sheet.getRange(row, map['Updated At']).setValue(formatDateTime_(new Date()));

  appendChangeLog_(spreadsheet, 'VERIFIED CATEGORY FOLDER', record.id, folder.getUrl());
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
    }
    sheet.getRange(1, 1, 1, item[1].length).setValues([item[1]]);
  });

  const rulesSheet = spreadsheet.getSheetByName(SHEETS.RULES);
  rulesSheet.clearContents();
  rulesSheet.getRange(1, 1, 1, RULE_HEADERS.length).setValues([RULE_HEADERS]);
  const rows = PGS_ACTIVITY_LIBRARY.map(activityRuleToRow_);
  rulesSheet.getRange(2, 1, rows.length, RULE_HEADERS.length).setValues(rows);

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
    rule.notes || '', rule.approvalForm || '', rule.approvalTiming || '',
    rule.packetInstructions || '', JSON.stringify(rule.evidenceChecklist || []),
    rule.sourceDocument || '', rule.lastVerified || '',
    rule.entryMode || '', rule.dateLabel || '', rule.endDateLabel || '',
    Boolean(rule.showEndDate), rule.quantityLabel || '', rule.quantityHelp || '',
    rule.quantityStep || 1, rule.evidenceInputBasis || ''
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
  activitySheet.setColumnWidths(26, 4, 260);
  activitySheet.hideColumns(14);
  activitySheet.hideColumns(17);
  activitySheet.hideColumns(18);

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
        notes: displayValue_(row[23]),
        approvalForm: displayValue_(row[24]),
        approvalTiming: displayValue_(row[25]),
        packetInstructions: displayValue_(row[26]),
        evidenceChecklist: parseJson_(row[27], []),
        sourceDocument: displayValue_(row[28]),
        lastVerified: dateToInput_(row[29]) || displayValue_(row[29]),
        entryMode: displayValue_(row[30]),
        dateLabel: displayValue_(row[31]),
        endDateLabel: displayValue_(row[32]),
        showEndDate: booleanValue_(row[33]),
        quantityLabel: displayValue_(row[34]),
        quantityHelp: displayValue_(row[35]),
        quantityStep: numberOrZero_(row[36]) || 1,
        evidenceInputBasis: displayValue_(row[37])
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
    id: displayValue_(row[0]),
    title: displayValue_(row[1]),
    description: displayValue_(row[2]),
    startDate: dateToInput_(row[3]),
    endDate: dateToInput_(row[4]),
    organization: displayValue_(row[5]),
    role: displayValue_(row[6]),
    categoryKey: displayValue_(row[7]),
    parentCategory: displayValue_(row[8]),
    categoryName: displayValue_(row[9]),
    paymentStatus: displayValue_(row[10]),
    quantity: numberOrZero_(row[11]),
    unit: displayValue_(row[12]),
    titleIException: displayValue_(row[13]) || 'no',
    estimatedCUs: row[14] === '' ? '' : numberOrZero_(row[14]),
    status: displayValue_(row[15]) || 'Draft',
    officialApprovedCUs: '',
    evidenceLink: displayValue_(row[17]),
    activityFolderId: displayValue_(row[18]),
    activityFolderUrl: displayValue_(row[19]),
    notes: displayValue_(row[20]),
    ruleVersion: displayValue_(row[21]),
    createdAt: dateTimeToString_(row[22]),
    updatedAt: dateTimeToString_(row[23]),
    sessions: parseJson_(row[24], []),
    officialFormUrl: displayValue_(row[25]),
    sessionLogPdfUrl: displayValue_(row[26]),
    packetCreatedAt: dateTimeToString_(row[27]),
    submittedToElmsAt: dateTimeToString_(row[28])
  };
}

function activityToRow_(a) {
  return [
    safeText_(a.id),
    safeText_(a.title),
    safeText_(a.description),
    inputToDate_(a.startDate),
    inputToDate_(a.endDate),
    safeText_(a.organization),
    safeText_(a.role),
    safeText_(a.categoryKey),
    safeText_(a.parentCategory),
    safeText_(a.categoryName),
    safeText_(a.paymentStatus),
    a.quantity,
    safeText_(a.unit),
    'no',
    a.estimatedCUs,
    safeText_(a.status),
    '',
    safeText_(a.evidenceLink),
    safeText_(a.activityFolderId),
    safeText_(a.activityFolderUrl),
    '',
    safeText_(a.ruleVersion),
    safeText_(a.createdAt),
    safeText_(a.updatedAt),
    JSON.stringify(a.sessions || []),
    safeText_(a.officialFormUrl),
    safeText_(a.sessionLogPdfUrl),
    safeText_(a.packetCreatedAt),
    safeText_(a.submittedToElmsAt)
  ];
}

function normalizeActivityInput_(input, rule) {
  const a = input || {};
  const categoryKey = cleanString_(a.categoryKey);
  const organization = cleanString_(a.organization);
  const role = cleanString_(a.role);
  const entryMode = rule.entryMode || '';
  const paymentStatus = ['session_time', 'duration_hours'].indexOf(entryMode) >= 0
    ? cleanString_(a.paymentStatus)
    : 'not_applicable';

  if (!categoryKey) throw new Error('Choose or confirm an activity category.');
  if (!organization) throw new Error('Enter the school, site, organization, or provider.');
  if (!role) throw new Error('Choose your official role for this activity.');

  const allowedRoles = allowedRolesForCategory_(categoryKey);
  if (allowedRoles.length && allowedRoles.indexOf(role) === -1) {
    throw new Error('Choose a role listed for the official activity category.');
  }

  if (['session_time', 'duration_hours'].indexOf(entryMode) >= 0 &&
      ['unpaid', 'paid', 'contract'].indexOf(paymentStatus) === -1) {
    throw new Error('Select whether the entire activity was unpaid, paid by stipend/supplemental rate, or paid at the contractual rate.');
  }

  const sessions = entryMode === 'session_time'
    ? normalizeSessions_(a.sessions, paymentStatus)
    : [];

  const sessionDates = sessions.map(function(session) {
    return session.date;
  }).sort();

  const startDate = sessionDates.length
    ? sessionDates[0]
    : cleanString_(a.startDate);
  const endDate = sessionDates.length
    ? sessionDates[sessionDates.length - 1]
    : cleanString_(a.endDate);

  if (!startDate) {
    throw new Error('Enter the activity date. This assistant applies only to activities occurring on or after May 1, 2024.');
  }

  if (startDate < MIN_ACTIVITY_DATE ||
      (endDate && endDate < MIN_ACTIVITY_DATE)) {
    throw new Error('This assistant applies only to activities occurring on or after May 1, 2024.');
  }

  if (endDate && endDate < startDate) {
    throw new Error('The activity end date cannot be earlier than the start date.');
  }

  let description = cleanString_(a.description);
  if (entryMode === 'session_time') {
    const uniqueDescriptions = sessions
      .map(function(session) { return session.description; })
      .filter(function(value, index, array) {
        return value && array.indexOf(value) === index;
      });
    description = uniqueDescriptions.join(' | ');
  }

  if (!description) {
    throw new Error(
      entryMode === 'session_time'
        ? 'Enter a brief description for each session.'
        : 'Enter a brief activity description.'
    );
  }

  const title = cleanString_(a.title) ||
    [organization, rule.activityName, role].filter(Boolean).join(' - ');

  return {
    id: '',
    title: title,
    description: description,
    startDate: startDate,
    endDate: endDate,
    organization: organization,
    role: role,
    categoryKey: categoryKey,
    paymentStatus: paymentStatus,
    quantity: Math.max(0, numberOrZero_(a.quantity)),
    unit: cleanString_(a.unit),
    titleIException: 'no',
    status: 'Draft',
    officialApprovedCUs: '',
    evidenceLink: '',
    notes: '',
    createFolder: true,
    sessions: sessions
  };
}

function normalizeSessions_(input, activityPaymentStatus) {
  if (!Array.isArray(input)) return [];

  return input
    .filter(function(session) {
      return session && (
        cleanString_(session.date) ||
        cleanString_(session.startTime) ||
        cleanString_(session.endTime) ||
        cleanString_(session.description)
      );
    })
    .map(function(session, index) {
      const rowNumber = index + 1;
      const date = cleanString_(session.date);
      const startTime = cleanString_(session.startTime);
      const endTime = cleanString_(session.endTime);
      const description = cleanString_(session.description);
      const breakMinutes = Math.max(
        0,
        Math.floor(numberOrZero_(session.breakMinutes))
      );

      if (!date || !startTime || !endTime) {
        throw new Error(
          'Session ' + rowNumber +
          ' requires a date, start time, and end time.'
        );
      }

      if (!description) {
        throw new Error(
          'Session ' + rowNumber + ' requires a brief description.'
        );
      }

      if (date < MIN_ACTIVITY_DATE) {
        throw new Error(
          'Session ' + rowNumber + ' is before May 1, 2024.'
        );
      }

      const startMinutes = timeToMinutes_(startTime);
      const endMinutes = timeToMinutes_(endTime);

      if (endMinutes <= startMinutes) {
        throw new Error(
          'Session ' + rowNumber +
          ' end time must be later than its start time.'
        );
      }

      const grossMinutes = endMinutes - startMinutes;
      if (breakMinutes >= grossMinutes) {
        throw new Error(
          'Session ' + rowNumber +
          ' break must be shorter than the session.'
        );
      }

      const netMinutes = grossMinutes - breakMinutes;

      return {
        date: date,
        startTime: startTime,
        endTime: endTime,
        breakMinutes: breakMinutes,
        paymentStatus: activityPaymentStatus,
        description: description,
        minutes: netMinutes,
        hours: roundToTwo_(netMinutes / 60)
      };
    });
}

function applyEntryCalculations_(activity, rule) {
  const mode = rule.entryMode || '';

  if (mode === 'session_time') {
    if (!activity.sessions.length) {
      throw new Error(
        'Add at least one dated session with a start time, end time, and description.'
      );
    }

    const totalMinutes = activity.sessions.reduce(function(total, session) {
      return total + session.minutes;
    }, 0);

    activity.quantity = totalMinutes / 60;
    activity.unit = 'hours';

    const dates = activity.sessions.map(function(session) {
      return session.date;
    }).sort();

    activity.startDate = dates[0];
    activity.endDate = dates[dates.length - 1];
    return activity;
  }

  activity.sessions = [];

  if (mode === 'automatic') {
    activity.quantity = 0;
    activity.unit = '';
    return activity;
  }

  if (mode === 'fixed') {
    activity.quantity = 1;
    activity.unit = (rule.units || ['submission'])[0];
    return activity;
  }

  if (['duration_hours', 'count', 'credit', 'credit_review', 'ceu_or_hours'].indexOf(mode) >= 0) {
    if (!(activity.quantity > 0)) {
      throw new Error(
        (rule.quantityLabel || 'Quantity') + ' must be greater than zero.'
      );
    }
  }

  if (mode === 'count' &&
      Math.floor(activity.quantity) !== activity.quantity) {
    throw new Error(
      (rule.quantityLabel || 'Quantity') + ' must be a whole number.'
    );
  }

  if (mode === 'duration_hours') activity.unit = 'hours';
  return activity;
}

function timeToMinutes_(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(cleanString_(value));
  if (!match) {
    throw new Error('Enter times using the time picker.');
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

function calculateEstimatedCUs_(activity, rule) {
  let result = '';

  if (rule.entryMode === 'automatic') return '';

  if (rule.calculationType === 'hours') {
    if (activity.paymentStatus === 'contract' &&
        !rule.contractTimeAllowed) {
      return 0;
    }

    const divisor = activity.paymentStatus === 'paid'
      ? rule.paidHoursPerCU
      : rule.unpaidHoursPerCU;

    const hours = activity.sessions && activity.sessions.length
      ? activity.sessions.reduce(function(total, session) {
          return total + session.minutes / 60;
        }, 0)
      : activity.quantity;

    result = divisor ? hours / divisor : '';
  } else if (rule.calculationType === 'count') {
    result = activity.quantity * numberOrZero_(rule.perUnitCUs);
  } else if (rule.calculationType === 'fixed') {
    result = numberOrZero_(rule.fixedCUs);
  } else if (rule.calculationType === 'unit_rate') {
    const rate = Number(rule.unitRates[activity.unit]);
    result = Number.isFinite(rate)
      ? activity.quantity * rate
      : '';
  } else if (rule.calculationType === 'manual') {
    result = '';
  }

  return result === '' ? '' : roundToTwo_(result);
}

function buildSummary_(activities, rules) {
  function balancesFor_(includedActivities) {
    return rules
      .filter(function(rule) { return rule.active; })
      .map(function(rule) {
        const recorded = includedActivities
          .filter(function(item) {
            return item.categoryKey === rule.categoryKey;
          })
          .reduce(function(total, item) {
            return total + numberOrZero_(item.estimatedCUs);
          }, 0);

        const countable = rule.maximumCUs === null
          ? recorded
          : Math.min(recorded, rule.maximumCUs);

        return {
          categoryKey: rule.categoryKey,
          parentCategory: rule.parentCategory,
          category: rule.activityName,
          recorded: roundToTwo_(recorded),
          countable: roundToTwo_(countable),
          overMaximum: rule.maximumCUs === null
            ? 0
            : roundToTwo_(Math.max(0, recorded - rule.maximumCUs)),
          maximum: rule.maximumCUs,
          remaining: rule.maximumCUs === null
            ? null
            : roundToTwo_(Math.max(0, rule.maximumCUs - recorded))
        };
      });
  }

  const estimatedActivities = activities.filter(function(item) {
    return item.status !== 'Denied';
  });

  const approvedActivities = activities.filter(function(item) {
    return item.status === 'Approved';
  });

  const categoryBalances = balancesFor_(estimatedActivities);
  const approvedCategoryBalances = balancesFor_(approvedActivities);

  const rawEstimatedTotal = categoryBalances.reduce(function(total, item) {
    return total + numberOrZero_(item.recorded);
  }, 0);

  const estimatedTotal = categoryBalances.reduce(function(total, item) {
    return total + numberOrZero_(item.countable);
  }, 0);

  const approvedTotal = approvedCategoryBalances.reduce(function(total, item) {
    return total + numberOrZero_(item.countable);
  }, 0);

  return {
    rawEstimatedTotal: roundToTwo_(rawEstimatedTotal),
    estimatedTotal: roundToTwo_(estimatedTotal),
    estimatedRemaining: roundToTwo_(Math.max(0, 225 - estimatedTotal)),
    approvedTotal: roundToTwo_(approvedTotal),
    approvedRemaining: roundToTwo_(Math.max(0, 225 - approvedTotal)),
    goalCUs: 225,
    percent: Math.min(100, Math.round((approvedTotal / 225) * 100)),
    remaining: roundToTwo_(Math.max(0, 225 - approvedTotal)),
    categoryBalances: categoryBalances,
    approvedCategoryBalances: approvedCategoryBalances
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

function ensureCategoryFolder_(rule) {
  const structure = createOrGetFolderStructure_();
  const parent = structure.activityEvidenceFolder;
  const properties = PropertiesService.getUserProperties();
  const propertyKey = categoryFolderPropertyKey_(rule.categoryKey);
  const storedId = properties.getProperty(propertyKey);

  if (storedId) {
    try {
      return DriveApp.getFolderById(storedId);
    } catch (error) {
      properties.deleteProperty(propertyKey);
    }
  }

  const folderName = sanitizeFolderName_(
    rule.parentCategory + ' - ' + rule.activityName
  );
  const matches = parent.getFoldersByName(folderName);
  const folder = matches.hasNext()
    ? matches.next()
    : parent.createFolder(folderName);

  folder.setDescription(
    APP_NAME + ' reusable category folder for ' +
    rule.categoryKey + '. Add all activities in this category here.'
  );
  properties.setProperty(propertyKey, folder.getId());
  return folder;
}

function categoryFolderPropertyKey_(categoryKey) {
  return 'PGS_CATEGORY_FOLDER_' +
    cleanString_(categoryKey).replace(/[^A-Za-z0-9_]/g, '_');
}

function copyOfficialTimeBasedForm_(folder, activity) {
  const fileName = sanitizeFolderName_(
    'Official CCSD CU Approval Form - Time-Based Activities - ' +
    activity.title
  ) + '.pdf';

  const existing = folder.getFilesByName(fileName);
  if (existing.hasNext()) {
    const file = existing.next();
    return {url: file.getUrl(), copied: true};
  }

  try {
    const source = DriveApp.getFileById(OFFICIAL_TIME_FORM_FILE_ID);
    const copy = source.makeCopy(fileName, folder);
    return {url: copy.getUrl(), copied: true};
  } catch (error) {
    return {
      url: OFFICIAL_TIME_FORM_URL,
      copied: false,
      message: 'Open the official CCSD form from the district PGS page.'
    };
  }
}

function createSessionLogPdf_(folder, activity, rule) {
  const baseName = sanitizeFolderName_(
    'FamilyPD Session Log - ' + activity.title
  );
  const pdfName = baseName + '.pdf';

  const existing = folder.getFilesByName(pdfName);
  while (existing.hasNext()) {
    existing.next().setTrashed(true);
  }

  const document = DocumentApp.create(baseName);
  const documentFile = DriveApp.getFileById(document.getId());
  documentFile.moveTo(folder);

  const body = document.getBody();
  body.clear();

  body.appendParagraph('FamilyPD PGS Session Log')
    .setHeading(DocumentApp.ParagraphHeading.TITLE);

  const disclaimer = body.appendParagraph(
    'Attachment generated from the teacher-entered activity record. ' +
    'This is not the official CCSD approval form and does not replace it.'
  );
  disclaimer.editAsText().setBold(true);

  const summary = body.appendTable([
    ['Employee', Session.getActiveUser().getEmail() || 'Authorized CCSD user'],
    ['Activity', activity.title],
    ['Official category', rule.activityName],
    ['Organization / site', activity.organization],
    ['Role', activity.role],
    ['Payment status', paymentLabel_(activity.paymentStatus)],
    ['Activity dates', activity.startDate +
      (activity.endDate && activity.endDate !== activity.startDate
        ? ' through ' + activity.endDate
        : '')],
    ['Calculated hours', String(roundToTwo_(activity.quantity))],
    ['Estimated CUs', activity.estimatedCUs === ''
      ? 'Review required'
      : String(roundToTwo_(activity.estimatedCUs))]
  ]);

  summary.getRow(0).getCell(0).setBackgroundColor('#d9eaf7');
  body.appendParagraph('');

  const rows = [[
    'Date', 'Start', 'End', 'Break (min)', 'Description', 'Hours'
  ]];

  (activity.sessions || []).forEach(function(session) {
    rows.push([
      session.date,
      session.startTime,
      session.endTime,
      String(session.breakMinutes),
      session.description,
      String(roundToTwo_(session.hours))
    ]);
  });

  const table = body.appendTable(rows);
  for (let i = 0; i < table.getRow(0).getNumCells(); i += 1) {
    const headerCell = table.getRow(0).getCell(i);
    headerCell.setBackgroundColor('#17365d');
    headerCell.editAsText().setForegroundColor('#ffffff').setBold(true);
  }

  body.appendParagraph('');
  body.appendParagraph('Teacher review: ________________________________');
  body.appendParagraph('Supervising administrator ink signature: ________________________________');
  body.appendParagraph('Date signed: ____________________');

  body.appendParagraph('');
  body.appendParagraph(
    'Next steps: Review the official CCSD form and this session log for accuracy; ' +
    'print and obtain required ink signatures; scan the signed form; upload the ' +
    'signed scan and all required original documentation to the category folder; ' +
    'set the final file to "Anyone in the Clark County School District with the link can view"; ' +
    'submit that final file link in ELMS; then mark the activity Submitted to ELMS in the assistant.'
  );

  document.saveAndClose();

  const pdfBlob = documentFile.getAs(MimeType.PDF).setName(pdfName);
  const pdfFile = folder.createFile(pdfBlob);
  documentFile.setTrashed(true);

  return {id: pdfFile.getId(), url: pdfFile.getUrl()};
}

function paymentLabel_(value) {
  if (value === 'paid') return 'Paid stipend / supplemental rate';
  if (value === 'contract') return 'Regular contractual rate';
  if (value === 'unpaid') return 'Unpaid';
  return 'Not applicable';
}

function allowedRolesForCategory_(categoryKey) {
  const roles = [];
  const labels = {
    completed_coursework: 'Course Participant',
    district_participant: 'Participant',
    district_instructor: 'Presenter / Instructor',
    district_developer: 'Course Developer',
    rpdp_participant: 'Participant',
    rpdp_instructor: 'Presenter / Instructor',
    rpdp_developer: 'Course Developer',
    ccea_participant: 'Participant',
    ccea_instructor: 'Presenter / Instructor',
    ccea_developer: 'Course Developer',
    vegas_pbs_participant: 'Participant',
    school_pd_participant: 'Participant',
    school_pd_instructor: 'Presenter / Instructor',
    school_pd_developer: 'Course Developer',
    plc_participant: 'PLC Participant',
    parent_community_leader: 'Activity Leader',
    sot_member: 'SOT Member',
    schoolwide_planner: 'Planning Lead / Contributor',
    coach_advisor: 'Coach / Advisor / Coordinator',
    core_tutor: 'Tutor',
    academic_trip_staff: 'Academic Trip Supervisor',
    summer_school_teacher: 'Summer School Instructor',
    iep_writer: 'IEP / MDT Writer',
    iep_team_member: 'IEP / MDT Team Member',
    candidate_host: 'Host / Master Teacher',
    mentor: 'Mentor',
    mentee: 'Mentee',
    live_attendee: 'Conference Participant',
    async_attendee: 'Asynchronous Participant',
    conference_presenter: 'Conference Presenter',
    award_recipient: 'Award Recipient',
    grant_recipient: 'Grant Recipient',
    microcredential_earner: 'Micro-Credential Earner',
    nbpts_candidate: 'National Board Candidate',
    nbpts_certified: 'National Board Certified Educator',
    nbpts_moc: 'National Board MOC Candidate',
    second_endorsement: 'Licensed Educator',
    specialty_ceu: 'CEU Participant'
  };

  (PGS_GUIDED_FINDER.contexts || []).forEach(function(context) {
    (context.roles || []).forEach(function(role) {
      const matches = (role.activities || []).some(function(activity) {
        return activity.categoryKey === categoryKey;
      });

      if (matches) {
        const label = labels[role.id] || role.label;
        if (roles.indexOf(label) === -1) roles.push(label);
      }
    });
  });

  return roles;
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
  sheet.setColumnWidth(25, 420);
  sheet.setColumnWidths(26, 4, 260);
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
