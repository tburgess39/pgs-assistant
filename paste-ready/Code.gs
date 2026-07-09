const APP_NAME = 'PGS CU Assistant';
const WORKBOOK_NAME = 'PGS CU Assistant Data';
const ROOT_FOLDER_NAME = 'PGS Column Advancement';
const TIME_ZONE = 'America/Los_Angeles';
const MIN_ACTIVITY_DATE = '2024-05-01';

const SHEETS = Object.freeze({
  START_HERE: 'START HERE',
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
  'Rule Version', 'Created At', 'Updated At', 'Sessions JSON', 'Record Type'
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
  'Planning',
  'Needs evidence',
  'Ready for ELMS',
  'Submitted to ELMS',
  'Returned for corrections',
  'Approved in ELMS',
  'Waiting to appear in ELMS',
  'Confirmed in ELMS',
  'Denied'
]);

const RECORD_TYPES = Object.freeze(['self_report', 'automatic_elms']);

const PAYMENT_OPTIONS = Object.freeze(['unpaid', 'paid', 'contract', 'mixed']);

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
    finderData: PGS_GUIDED_FINDER,
    expiredActivityNames: PGS_EXPIRED_ACTIVITY_NAMES,
    libraryCount: rules.filter(function(rule) { return rule.active; }).length,
    ruleAudit: {sourceDocument: '9/1/23 PGS Reference Guide', lastVerified: '2026-07-10', currentOptions: 43},
    warnings: [
      'This assistant and its associated tools apply only to activities occurring on or after May 1, 2024.',
      'Category suggestions are guidance, not final CCSD eligibility decisions.',
      'Estimated CUs are not official approvals.',
      'Review special PGS announcements in addition to the Reference Guide.',
      'Form entries are saved in a teacher-owned Google Sheet in the teacher’s Google Drive.',
      'Evidence files are not uploaded automatically; the teacher places them in the category folder.',
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

  if (activity.recordType === 'self_report') {
    applyEntryCalculations_(activity, rule);
  } else {
    activity.sessions = [];
    activity.quantity = 0;
    activity.unit = '';
    activity.paymentStatus = '';
  }

  const existingRow = activity.id ? findActivityRow_(sheet, activity.id) : 0;
  const existing = existingRow
    ? rowToActivity_(sheet.getRange(existingRow, 1, 1, ACTIVITY_HEADERS.length).getValues()[0])
    : null;

  const estimate = activity.recordType === 'self_report'
    ? calculateEstimatedCUs_(activity, rule)
    : '';

  const now = new Date();
  const id = activity.id || Utilities.getUuid();

  let folderId = existing ? existing.activityFolderId : '';
  let folderUrl = existing ? existing.activityFolderUrl : '';
  const evidenceLink = activity.evidenceLink || (existing ? existing.evidenceLink : '');

  if (activity.recordType === 'self_report' && activity.createFolder && !folderId) {
    const folder = createCategoryFolder_(rule);
    folderId = folder.id;
    folderUrl = folder.url;
  }

  const officialApprovedCUs = shouldStoreOfficialCUs_(activity)
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
    updatedAt: formatDateTime_(now),
    sessions: activity.sessions,
    recordType: activity.recordType
  };

  const rowValues = activityToRow_(record);

  if (existingRow) {
    sheet.getRange(existingRow, 1, 1, ACTIVITY_HEADERS.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }

  applyActivityRowFormatting_(sheet);
  appendChangeLog_(
    spreadsheet,
    existingRow ? 'UPDATED ACTIVITY' : 'CREATED ACTIVITY',
    id,
    activity.recordType + ': ' + activity.title
  );

  const data = getBootstrapData();
  data.savedId = id;
  return data;
}

function shouldStoreOfficialCUs_(activity) {
  if (activity.recordType === 'automatic_elms') {
    return numberOrZero_(activity.officialApprovedCUs) > 0;
  }
  return activity.status === 'Approved in ELMS' &&
    numberOrZero_(activity.officialApprovedCUs) > 0;
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
  const rules = getRules_(spreadsheet);
  const row = findActivityRow_(sheet, String(activityId || ''));

  if (!row) throw new Error('The activity could not be found.');

  const record = rowToActivity_(
    sheet.getRange(row, 1, 1, ACTIVITY_HEADERS.length).getValues()[0]
  );

  if (record.recordType === 'automatic_elms') {
    throw new Error('Automatically entered ELMS records do not require an evidence folder.');
  }

  const rule = rules.find(function(item) {
    return item.categoryKey === record.categoryKey;
  });

  if (!rule) throw new Error('The category rule could not be found.');

  const folder = createCategoryFolder_(rule);
  const map = getHeaderMap_(ACTIVITY_HEADERS);
  sheet.getRange(row, map['Activity Folder ID']).setValue(folder.id);
  sheet.getRange(row, map['Activity Folder URL']).setValue(folder.url);
  sheet.getRange(row, map['Updated At']).setValue(formatDateTime_(new Date()));

  appendChangeLog_(spreadsheet, 'CREATED / VERIFIED CATEGORY FOLDER', record.id, folder.url);
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
  const startHere = spreadsheet.insertSheet(SHEETS.START_HERE, 0);
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

  buildStartHereSheet_(spreadsheet);
  styleWorkbook_(spreadsheet);
  applyValidations_(spreadsheet);
  applyWorkbookGuardrails_(spreadsheet);
  updateSettingsSheet_(spreadsheet);
}

function ensureWorkbookStructure_(spreadsheet) {
  const required = [
    [SHEETS.START_HERE, ['PGS CU Assistant Workbook']],
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
    if (item[0] !== SHEETS.START_HERE) {
      sheet.getRange(1, 1, 1, item[1].length).setValues([item[1]]);
    }
  });

  const rulesSheet = spreadsheet.getSheetByName(SHEETS.RULES);
  rulesSheet.clearContents();
  rulesSheet.getRange(1, 1, 1, RULE_HEADERS.length).setValues([RULE_HEADERS]);
  const rows = PGS_ACTIVITY_LIBRARY.map(activityRuleToRow_);
  rulesSheet.getRange(2, 1, rows.length, RULE_HEADERS.length).setValues(rows);

  buildStartHereSheet_(spreadsheet);
  styleWorkbook_(spreadsheet);
  applyValidations_(spreadsheet);
  applyWorkbookGuardrails_(spreadsheet);
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

function buildStartHereSheet_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(SHEETS.START_HERE);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEETS.START_HERE, 0);

  sheet.showSheet();
  sheet.getDataRange().breakApart();
  sheet.clear();
  sheet.setHiddenGridlines(true);
  sheet.setFrozenRows(0);
  sheet.getRange('A1:F1').merge()
    .setValue('PGS CU Assistant - START HERE')
    .setBackground('#17365d')
    .setFontColor('#ffffff')
    .setFontSize(18)
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  sheet.getRange('A3:F3').merge()
    .setValue('Use the FamilyPD PGS website to add, edit, or delete activity records.')
    .setBackground('#eaf4fb')
    .setFontColor('#17365d')
    .setFontWeight('bold')
    .setWrap(true);

  sheet.getRange('A5:B10').setValues([
    ['Safe to do in this workbook', 'Avoid doing in this workbook'],
    ['View and filter your Activity Log', 'Do not rename or delete sheets'],
    ['Open evidence links and category folders', 'Do not change column headers'],
    ['Review estimated and official CU totals', 'Do not sort only part of the Activity Log'],
    ['Download or print a copy for your records', 'Do not edit Category Rules, Settings, or Change Log'],
    ['Return to the web app for corrections', 'Do not paste a folder URL into the final evidence-link field']
  ]);

  sheet.getRange('A5:B5')
    .setBackground('#dceaf7')
    .setFontColor('#17365d')
    .setFontWeight('bold');
  sheet.getRange('A6:B10').setWrap(true).setVerticalAlignment('top');
  sheet.getRange('A12:F12').merge()
    .setValue('Important: the Sheet stores form entries. Evidence documents are uploaded by the teacher into Google Drive category folders; they are not copied automatically by the website.')
    .setBackground('#fff4d6')
    .setFontColor('#5b4500')
    .setFontWeight('bold')
    .setWrap(true);

  sheet.setColumnWidth(1, 330);
  sheet.setColumnWidth(2, 330);
  sheet.setColumnWidths(3, 4, 100);
  sheet.setRowHeight(1, 38);
  sheet.setTabColor('#4d9b45');

  if (sheet.getIndex() !== 1) {
    spreadsheet.setActiveSheet(sheet);
    spreadsheet.moveActiveSheet(1);
  }
}

function applyWorkbookGuardrails_(spreadsheet) {
  const activitySheet = spreadsheet.getSheetByName(SHEETS.ACTIVITIES);
  const internalSheets = [SHEETS.RULES, SHEETS.SETTINGS, SHEETS.CHANGE_LOG];

  spreadsheet.getSheets().forEach(function(sheet) {
    sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET)
      .filter(function(protection) {
        return String(protection.getDescription() || '').indexOf('PGS Guardrail') === 0;
      })
      .forEach(function(protection) { protection.remove(); });

    sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE)
      .filter(function(protection) {
        return String(protection.getDescription() || '').indexOf('PGS Guardrail') === 0;
      })
      .forEach(function(protection) { protection.remove(); });
  });

  if (activitySheet) {
    activitySheet.showSheet();
    activitySheet.setTabColor('#2f75b5');
    activitySheet.getRange(1, 1, 1, ACTIVITY_HEADERS.length)
      .setNote('PGS Guardrail: Do not rename, delete, or reorder these headers. Use the web app to change records.');

    activitySheet.protect()
      .setDescription('PGS Guardrail - Use the web app to edit the Activity Log')
      .setWarningOnly(true);

    [1, 8, 9, 19, 20, 22, 23, 24, 25, 26].forEach(function(column) {
      try { activitySheet.hideColumns(column); } catch (error) {}
    });
  }

  internalSheets.forEach(function(name) {
    const sheet = spreadsheet.getSheetByName(name);
    if (!sheet) return;

    sheet.setTabColor('#9aa7b4');
    sheet.protect()
      .setDescription('PGS Guardrail - Internal app data; do not edit')
      .setWarningOnly(true);

    try { sheet.hideSheet(); } catch (error) {}
  });

  const guide = spreadsheet.getSheetByName(SHEETS.START_HERE);
  if (guide) {
    guide.protect()
      .setDescription('PGS Guardrail - Workbook instructions')
      .setWarningOnly(true);
  }
}

function styleWorkbook_(spreadsheet) {
  const navy = '#17365d';
  spreadsheet.getSheets().forEach(function(sheet) {
    if (sheet.getName() === SHEETS.START_HERE) return;
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
  const categoryKey = displayValue_(row[7]);
  const storedRecordType = displayValue_(row[25]);

  return {
    id: displayValue_(row[0]), title: displayValue_(row[1]),
    description: displayValue_(row[2]), startDate: dateToInput_(row[3]),
    endDate: dateToInput_(row[4]), organization: displayValue_(row[5]),
    role: displayValue_(row[6]), categoryKey: categoryKey,
    parentCategory: displayValue_(row[8]), categoryName: displayValue_(row[9]),
    paymentStatus: displayValue_(row[10]), quantity: numberOrZero_(row[11]),
    unit: displayValue_(row[12]), titleIException: displayValue_(row[13]) || 'no',
    estimatedCUs: row[14] === '' ? '' : numberOrZero_(row[14]),
    status: normalizeStoredStatus_(displayValue_(row[15])),
    officialApprovedCUs: row[16] === '' ? '' : numberOrZero_(row[16]),
    evidenceLink: displayValue_(row[17]), activityFolderId: displayValue_(row[18]),
    activityFolderUrl: displayValue_(row[19]), notes: displayValue_(row[20]),
    ruleVersion: displayValue_(row[21]), createdAt: dateTimeToString_(row[22]),
    updatedAt: dateTimeToString_(row[23]),
    sessions: parseJson_(row[24], []),
    recordType: storedRecordType ||
      (categoryKey === 'DISTRICT_PD' ? 'automatic_elms' : 'self_report')
  };
}


function normalizeStoredStatus_(status) {
  const value = cleanString_(status);
  const map = {
    'In progress': 'Planning',
    'Submitted': 'Submitted to ELMS',
    'Approved — enter only after official CCSD approval': 'Approved in ELMS'
  };
  return map[value] || value || 'Planning';
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
    safeText_(a.createdAt), safeText_(a.updatedAt),
    JSON.stringify(a.sessions || []), safeText_(a.recordType)
  ];
}

function normalizeActivityInput_(input, rule) {
  const a = input || {};
  const recordType = cleanString_(a.recordType) || 'self_report';
  const title = cleanString_(a.title);
  const description = cleanString_(a.description);
  const categoryKey = cleanString_(a.categoryKey);
  const paymentStatus = cleanString_(a.paymentStatus) || 'unpaid';
  const status = cleanString_(a.status) ||
    (recordType === 'automatic_elms' ? 'Waiting to appear in ELMS' : 'Planning');
  const entryMode = rule.entryMode || '';
  const sessions = recordType === 'self_report' && entryMode === 'session_time'
    ? normalizeSessions_(a.sessions)
    : [];

  if (RECORD_TYPES.indexOf(recordType) === -1) {
    throw new Error('Select a valid record type.');
  }

  if (!title) throw new Error('Activity title is required.');
  if (!description) throw new Error('Enter a short activity description.');
  if (!categoryKey) throw new Error('Choose or confirm an activity category.');
  if (STATUS_OPTIONS.indexOf(status) === -1) throw new Error('Select a valid tracking status.');

  if (recordType === 'self_report' &&
      PAYMENT_OPTIONS.indexOf(paymentStatus) === -1) {
    throw new Error('Select a valid payment status.');
  }

  const sessionDates = sessions.map(function(session) { return session.date; }).sort();
  const startDate = sessionDates.length ? sessionDates[0] : cleanString_(a.startDate);
  const endDate = sessionDates.length ? sessionDates[sessionDates.length - 1] : cleanString_(a.endDate);

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

  if (recordType === 'automatic_elms' &&
      status === 'Confirmed in ELMS' &&
      !(numberOrZero_(a.officialApprovedCUs) > 0)) {
    throw new Error('Enter the CUs shown in ELMS for a confirmed automatic record.');
  }

  return {
    id: cleanString_(a.id), title: title, description: description,
    startDate: startDate, endDate: endDate,
    organization: cleanString_(a.organization), role: cleanString_(a.role),
    categoryKey: categoryKey, paymentStatus: paymentStatus,
    quantity: Math.max(0, numberOrZero_(a.quantity)),
    unit: cleanString_(a.unit),
    titleIException: cleanString_(a.titleIException) === 'yes' ? 'yes' : 'no',
    status: status, officialApprovedCUs: a.officialApprovedCUs,
    evidenceLink: validHttpUrlOrBlank_(a.evidenceLink),
    notes: cleanString_(a.notes), createFolder: Boolean(a.createFolder),
    sessions: sessions, recordType: recordType
  };
}


function normalizeSessions_(input) {
  if (!Array.isArray(input)) return [];

  return input
    .filter(function(session) {
      return session && (
        cleanString_(session.date) ||
        cleanString_(session.startTime) ||
        cleanString_(session.endTime)
      );
    })
    .map(function(session, index) {
      const rowNumber = index + 1;
      const date = cleanString_(session.date);
      const startTime = cleanString_(session.startTime);
      const endTime = cleanString_(session.endTime);
      const breakMinutes = Math.max(0, Math.floor(numberOrZero_(session.breakMinutes)));
      const paymentStatus = cleanString_(session.paymentStatus) || 'unpaid';

      if (!date || !startTime || !endTime) {
        throw new Error('Session ' + rowNumber + ' requires a date, start time, and end time.');
      }

      if (date < MIN_ACTIVITY_DATE) {
        throw new Error('Session ' + rowNumber + ' is before May 1, 2024.');
      }

      if (PAYMENT_OPTIONS.indexOf(paymentStatus) === -1 || paymentStatus === 'mixed') {
        throw new Error('Session ' + rowNumber + ' has an invalid payment status.');
      }

      const startMinutes = timeToMinutes_(startTime);
      const endMinutes = timeToMinutes_(endTime);

      if (endMinutes <= startMinutes) {
        throw new Error('Session ' + rowNumber + ' end time must be later than its start time.');
      }

      const grossMinutes = endMinutes - startMinutes;
      if (breakMinutes >= grossMinutes) {
        throw new Error('Session ' + rowNumber + ' break must be shorter than the session.');
      }

      const netMinutes = grossMinutes - breakMinutes;

      return {
        date: date,
        startTime: startTime,
        endTime: endTime,
        breakMinutes: breakMinutes,
        paymentStatus: paymentStatus,
        minutes: netMinutes,
        hours: roundToTwo_(netMinutes / 60)
      };
    });
}

function applyEntryCalculations_(activity, rule) {
  const mode = rule.entryMode || '';

  if (mode === 'session_time') {
    if (!activity.sessions.length) {
      throw new Error('Add at least one dated session with a start time and end time.');
    }

    const totalMinutes = activity.sessions.reduce(function(total, session) {
      return total + session.minutes;
    }, 0);

    const paymentStatuses = activity.sessions
      .map(function(session) { return session.paymentStatus; })
      .filter(function(value, index, array) { return array.indexOf(value) === index; });

    activity.quantity = totalMinutes / 60;
    activity.unit = 'hours';
    activity.paymentStatus = paymentStatuses.length === 1 ? paymentStatuses[0] : 'mixed';

    const dates = activity.sessions.map(function(session) { return session.date; }).sort();
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
      throw new Error(rule.quantityLabel + ' must be greater than zero.');
    }
  }

  if (mode === 'count' && Math.floor(activity.quantity) !== activity.quantity) {
    throw new Error(rule.quantityLabel + ' must be a whole number.');
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
    if (activity.sessions && activity.sessions.length) {
      result = activity.sessions.reduce(function(total, session) {
        if (session.paymentStatus === 'contract' && !rule.contractTimeAllowed) {
          return total;
        }

        const fullRateException = rule.titleIExceptionAllowed &&
          activity.titleIException === 'yes' &&
          session.paymentStatus === 'paid';

        const divisor = session.paymentStatus === 'paid' && !fullRateException
          ? rule.paidHoursPerCU
          : rule.unpaidHoursPerCU;

        return divisor ? total + (session.minutes / 60) / divisor : total;
      }, 0);
    } else {
      if (activity.paymentStatus === 'contract' && !rule.contractTimeAllowed) return 0;
      const fullRateException = rule.titleIExceptionAllowed &&
        activity.titleIException === 'yes' &&
        activity.paymentStatus === 'paid';
      const divisor = activity.paymentStatus === 'paid' && !fullRateException
        ? rule.paidHoursPerCU : rule.unpaidHoursPerCU;
      result = divisor ? activity.quantity / divisor : '';
    }
  } else if (rule.calculationType === 'count') {
    result = activity.quantity * numberOrZero_(rule.perUnitCUs);
  } else if (rule.calculationType === 'fixed') {
    result = numberOrZero_(rule.fixedCUs);
  } else if (rule.calculationType === 'unit_rate') {
    const rate = Number(rule.unitRates[activity.unit]);
    result = Number.isFinite(rate) ? activity.quantity * rate : '';
  } else if (rule.calculationType === 'manual') {
    result = '';
  }

  return result === '' ? '' : roundToTwo_(result);
}

function buildSummary_(activities, rules) {
  const selfReported = activities.filter(function(item) {
    return item.recordType !== 'automatic_elms';
  });

  const automatic = activities.filter(function(item) {
    return item.recordType === 'automatic_elms';
  });

  const approvedSelfReported = selfReported.reduce(function(total, item) {
    return total + numberOrZero_(item.officialApprovedCUs);
  }, 0);

  const automaticElmsTotal = automatic.reduce(function(total, item) {
    return total + numberOrZero_(item.officialApprovedCUs);
  }, 0);

  const categoryBalances = rules
    .filter(function(rule) { return rule.active; })
    .map(function(rule) {
      const categorySelf = selfReported.filter(function(item) {
        return item.categoryKey === rule.categoryKey;
      });

      const categoryAutomatic = automatic.filter(function(item) {
        return item.categoryKey === rule.categoryKey;
      });

      const estimated = categorySelf.reduce(function(total, item) {
        return total + numberOrZero_(item.estimatedCUs);
      }, 0);

      const approved = categorySelf.reduce(function(total, item) {
        return total + numberOrZero_(item.officialApprovedCUs);
      }, 0);

      const automaticCUs = categoryAutomatic.reduce(function(total, item) {
        return total + numberOrZero_(item.officialApprovedCUs);
      }, 0);

      const confirmed = approved + automaticCUs;
      const countableEstimated = rule.maximumCUs === null
        ? estimated
        : Math.min(estimated, rule.maximumCUs);

      return {
        categoryKey: rule.categoryKey,
        parentCategory: rule.parentCategory,
        category: rule.activityName,
        estimated: roundToTwo_(estimated),
        countableEstimated: roundToTwo_(countableEstimated),
        approvedSelfReported: roundToTwo_(approved),
        automaticElms: roundToTwo_(automaticCUs),
        confirmedTotal: roundToTwo_(confirmed),
        maximum: rule.maximumCUs,
        remaining: rule.maximumCUs === null
          ? null
          : roundToTwo_(Math.max(0, rule.maximumCUs - confirmed))
      };
    });

  const estimatedSelfReported = categoryBalances.reduce(function(total, item) {
    return total + numberOrZero_(item.countableEstimated);
  }, 0);

  const confirmedTotal = approvedSelfReported + automaticElmsTotal;

  return {
    estimatedSelfReported: roundToTwo_(estimatedSelfReported),
    approvedSelfReported: roundToTwo_(approvedSelfReported),
    automaticElmsTotal: roundToTwo_(automaticElmsTotal),
    confirmedTotal: roundToTwo_(confirmedTotal),
    goalCUs: 225,
    percent: Math.min(100, Math.round((confirmedTotal / 225) * 100)),
    remaining: roundToTwo_(Math.max(0, 225 - confirmedTotal)),
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

  const categoryEvidence = ensureChildFolder_(root, '01 Category Evidence');
  const automaticRecords = ensureChildFolder_(root, '02 Automatic ELMS Records');
  const receipts = ensureChildFolder_(root, '03 Advancement Receipts and Decisions');
  const references = ensureChildFolder_(root, '04 Reference and Forms');

  properties.setProperty('PGS_ACTIVITY_FOLDER_ID', categoryEvidence.getId());

  return {
    rootFolder: root,
    activityEvidenceFolder: categoryEvidence,
    automaticRecordsFolder: automaticRecords,
    receiptsFolder: receipts,
    referenceFolder: references
  };
}

function createCategoryFolder_(rule) {
  const parent = createOrGetFolderStructure_().activityEvidenceFolder;
  const propertyName = 'PGS_CATEGORY_FOLDER_' + rule.categoryKey;
  let folder = getFolderByStoredId_(propertyName);

  if (!folder) {
    const folderName = categoryFolderName_(rule);
    folder = ensureChildFolder_(parent, folderName);
    PropertiesService.getUserProperties().setProperty(propertyName, folder.getId());
  }

  [
    '01 Evidence to Combine',
    '02 Final Single File for ELMS',
    '03 ELMS Receipt and Decision'
  ].forEach(function(name) {
    ensureChildFolder_(folder, name);
  });

  folder.setDescription(
    APP_NAME + ' category folder: ' + rule.activityName +
    ' (' + rule.categoryKey + ')'
  );

  return {id: folder.getId(), url: folder.getUrl()};
}

function categoryFolderName_(rule) {
  const names = {
    ACADEMIC_TRIP: 'Academic Trips',
    ASYNC_CONFERENCE_WEBINAR: 'Asynchronous Conferences and Webinars',
    CCEA_COLLAB_PD: 'CCEA and Nevada Collaboratory',
    COMMUNITY_AWARD: 'Community-Based Awards',
    CONFERENCE_PRESENTATION: 'Conference Presentations',
    CORE_TUTORING: 'Core-Content Tutoring',
    DISTRICT_PD: 'District Professional Development',
    EXTRACURRICULAR: 'Extracurricular Coaching and Advising',
    FOS_ASSIGNMENT: 'Field Observation Students',
    GRANT_RECIPIENT: 'Grant Awards',
    IEP_MDT_TEAM: 'IEP and MDT Team Participation',
    MENTEE: 'Mentee Hours',
    MENTOR: 'Mentoring Hours',
    MICRO_CREDENTIAL: 'Micro-Credentials',
    NATIONAL_AWARD: 'National Awards',
    PARENT_COMMUNITY_LEADERSHIP: 'Family and Community Engagement',
    PLC: 'PLC Time',
    PRACTICUM_ASSIGNMENT: 'Practicum Students',
    RPDP_PD: 'RPDP Professional Development',
    SCHOOLWIDE_PLANNING: 'Schoolwide Planning',
    SECOND_ENDORSEMENT: 'Secondary Endorsement',
    SPECIALTY_CEU: 'Professional and Specialty License CEUs',
    STATE_AWARD: 'State Awards',
    STUDENT_TEACHER_ASSIGNMENT: 'Student Teachers',
    SUMMER_SCHOOL: 'Summer School',
    SYNC_CONFERENCE: 'Live and Synchronous Conferences',
    VEGAS_PBS_PD: 'Vegas PBS',
    WRITE_IEP_MDT: 'IEPs and MDTs Written'
  };

  return sanitizeFolderName_(names[rule.categoryKey] || rule.activityName);
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
    'Category Evidence Folder URL': folders.activityEvidenceFolderUrl,
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
  sheet.setColumnWidth(26, 130);
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
  return cleanString_(value)
    .replace(/[\\/:*?"<>|#%{}~&]/g, ' - ')
    .replace(/\s+/g, ' ')
    .replace(/(?:\s*-\s*)+/g, ' - ')
    .trim()
    .slice(0, 120) || 'PGS Activity';
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
