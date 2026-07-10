const APP_NAME = 'PGS CU Assistant';
const WORKBOOK_NAME = 'PGS CU Assistant Data';
const WORKBOOK_SCHEMA_VERSION = '4.1.3';
const ROOT_FOLDER_NAME = 'PGS Column Advancement';
const TIME_ZONE = 'America/Los_Angeles';
const MIN_ACTIVITY_DATE = '2024-05-01';
const CARRYOVER_CATEGORY_KEY = 'CARRYOVER';

const FORM_CAPACITIES = Object.freeze({
  time_based: 20,
  university_assignment: 5,
  lower_level_college: 5
});

const PACKET_STATUSES = Object.freeze([
  'Draft',
  'Needs signatures',
  'Signed',
  'Included in final ELMS file',
  'Superseded'
]);

const PROFILE_SETTING_KEYS = Object.freeze({
  fullName: 'Profile - Full Name',
  schoolSite: 'Profile - School/Site',
  supervisor: 'Profile - Supervisor',
  contractStart: 'Profile - Contract Start Time',
  contractEnd: 'Profile - Contract End Time',
  advancementCycle: 'Profile - Advancement Cycle'
});

const MANAGED_CATEGORY_SUBFOLDERS = Object.freeze([
  '01 Evidence to Combine',
  '02 Final Single File for ELMS'
]);

const CONNECTION_GUARDRAIL_MESSAGE =
  'Managed by FamilyPD PGS Assistant. Do not rename, move, or delete this folder or its numbered subfolders. Use the assistant to create and locate folders. Renaming may create duplicate folders; deleting or moving folders can break saved links.';

const CARRYOVER_RULE = Object.freeze({
  categoryKey: CARRYOVER_CATEGORY_KEY,
  parentCategory: 'PGS Office / ELMS',
  activityName: 'Carryover / Rollover',
  maximumCUs: null,
  calculationType: 'manual',
  units: [],
  unitRates: {},
  unpaidHoursPerCU: 0,
  paidHoursPerCU: 0,
  perUnitCUs: 0,
  fixedCUs: 0,
  titleIExceptionAllowed: false,
  contractTimeAllowed: true,
  submissionMode: 'automatic',
  active: true,
  effectiveDate: MIN_ACTIVITY_DATE,
  ruleVersion: 'ELMS-CARRYOVER-1.0',
  sourcePage: 'Advancement Status carryover row',
  sourceUrl: '',
  sourceDocument: 'CCSD ELMS Advancement Status',
  documentation: 'No evidence folder is required. Enter the carryover amount exactly as shown in ELMS.',
  limitations: 'Carryover is entered by the PGS office after an approved advancement round. It is not an activity category and has no category maximum.',
  approvalForm: 'None',
  approvalTiming: 'After the prior advancement round is approved',
  packetInstructions: 'No ELMS evidence submission is created for this tracker record.',
  evidenceChecklist: [],
  lastVerified: '2026-07-10',
  entryMode: 'automatic',
  dateLabel: 'Date carryover first appeared in ELMS',
  endDateLabel: 'End date',
  showEndDate: false,
  quantityLabel: 'Official carryover CUs',
  quantityHelp: 'Enter the official amount only after the carryover appears in ELMS.',
  quantityStep: 0.01,
  evidenceInputBasis: 'ELMS Advancement Status carryover row'
});

const SHEETS = Object.freeze({
  START_HERE: 'START HERE',
  ACTIVITIES: 'Activity Log',
  RULES: 'Category Rules',
  SETTINGS: 'Settings',
  CHANGE_LOG: 'Change Log',
  PACKETS: 'Generated Packets'
});

const ACTIVITY_HEADERS = Object.freeze([
  'ID', 'Activity Title', 'Description', 'Start Date', 'End Date',
  'Organization / Site', 'Role', 'Category Key', 'Parent Category',
  'Activity Category', 'Payment Status', 'Quantity', 'Unit',
  'Title I Exception', 'Estimated CUs', 'Status', 'Official Approved CUs',
  'Evidence Link', 'Activity Folder ID', 'Activity Folder URL', 'Notes',
  'Rule Version', 'Created At', 'Updated At', 'Sessions JSON', 'Record Type'
]);

const PACKET_HEADERS = Object.freeze([
  'Packet ID', 'Category Key', 'Category Name', 'Form Type',
  'Included Keys JSON', 'Page Count', 'Total Quantity', 'Estimated CUs',
  'Google Doc ID', 'Google Doc URL', 'PDF File ID', 'PDF URL',
  'Status', 'Profile Snapshot JSON', 'Created At', 'Updated At'
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
  return buildBootstrapData_(getOrCreateWorkbook_());
}

function buildBootstrapData_(spreadsheet) {
  const rules = getRules_(spreadsheet);
  const activities = readActivities_(spreadsheet);
  const folders = getFolderLinks_();

  return {
    appName: APP_NAME,
    workspace: {
      spreadsheetId: spreadsheet.getId(),
      spreadsheetUrl: spreadsheet.getUrl(),
      spreadsheetName: spreadsheet.getName(),
      rootFolderUrl: folders.rootFolderUrl || '',
      activityEvidenceFolderUrl: folders.activityEvidenceFolderUrl || ''
    },
    rules: rules,
    activities: activities,
    profile: getUserProfile_(spreadsheet),
    generatedPackets: readGeneratedPackets_(spreadsheet),
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
      'Carryover/rollover should be entered only from the official amount shown in ELMS.',
      'The assistant prepares records and evidence but does not submit directly into ELMS.'
    ]
  };
}


function saveUserProfile(input) {
  const spreadsheet = getOrCreateWorkbook_();
  const profile = normalizeProfileInput_(input);
  writeSettingValue_(spreadsheet, PROFILE_SETTING_KEYS.fullName, profile.fullName);
  writeSettingValue_(spreadsheet, PROFILE_SETTING_KEYS.schoolSite, profile.schoolSite);
  writeSettingValue_(spreadsheet, PROFILE_SETTING_KEYS.supervisor, profile.supervisor);
  writeSettingValue_(spreadsheet, PROFILE_SETTING_KEYS.contractStart, profile.contractStart);
  writeSettingValue_(spreadsheet, PROFILE_SETTING_KEYS.contractEnd, profile.contractEnd);
  writeSettingValue_(spreadsheet, PROFILE_SETTING_KEYS.advancementCycle, profile.advancementCycle);
  appendChangeLog_(spreadsheet, 'UPDATED PROFILE', '', profile.fullName + ' | ' + profile.schoolSite);
  SpreadsheetApp.flush();
  return buildBootstrapData_(spreadsheet);
}

function generateApprovalPacket(input) {
  const activityId = cleanString_(input && input.activityId);
  if (!activityId) throw new Error('Choose a saved activity first.');

  const spreadsheet = getOrCreateWorkbook_();
  const activities = readActivities_(spreadsheet);
  const rules = getRules_(spreadsheet);
  const packets = readGeneratedPackets_(spreadsheet);
  const selected = activities.find(function(item) { return item.id === activityId; });

  if (!selected) throw new Error('The selected activity could not be found.');
  if (selected.recordType === 'automatic_elms') {
    throw new Error('Automatic ELMS and carryover records do not need an approval-form packet.');
  }

  const rule = rules.find(function(item) {
    return item.categoryKey === selected.categoryKey;
  });

  if (!rule) throw new Error('The category rule could not be found.');

  const formType = approvalFormType_(rule);
  if (!formType) {
    throw new Error('The official evidence table does not list one of the supported approval forms for this category.');
  }

  const profile = getUserProfile_(spreadsheet);
  validateProfileForPacket_(profile, formType);

  const lockedKeys = packetLockedKeys_(packets, rule.categoryKey);
  const packetData = buildApprovalPacketData_(
    activities,
    rule,
    profile,
    lockedKeys
  );

  if (!packetData.pages.length) {
    throw new Error(
      'No new eligible entries are available. Entries already included in a Signed or final ELMS packet are not repeated.'
    );
  }

  markDraftPacketsSuperseded_(spreadsheet, rule.categoryKey);

  const folder = createCategoryFolder_(rule);
  const evidenceFolder = ensureChildFolder_(
    DriveApp.getFolderById(folder.id),
    '01 Evidence to Combine'
  );

  const timestamp = Utilities.formatDate(new Date(), TIME_ZONE, 'yyyyMMdd-HHmm');
  const baseName = sanitizeFolderName_(
    'DRAFT - ' + rule.activityName + ' - Approval Form Packet - ' + timestamp
  );

  const document = createApprovalPacketDocument_(
    baseName,
    profile,
    rule,
    packetData
  );

  const documentFile = DriveApp.getFileById(document.getId());
  documentFile.moveTo(evidenceFolder);

  Utilities.sleep(500);

  const pdfBlob = documentFile.getBlob()
    .getAs(MimeType.PDF)
    .setName(baseName + '.pdf');
  const pdfFile = evidenceFolder.createFile(pdfBlob);

  const packetId = Utilities.getUuid();
  const now = formatDateTime_(new Date());
  const packetRecord = {
    packetId: packetId,
    categoryKey: rule.categoryKey,
    categoryName: rule.activityName,
    formType: formType,
    includedKeys: packetData.includedKeys,
    pageCount: packetData.pages.length,
    totalQuantity: packetData.totalQuantity,
    estimatedCUs: packetData.estimatedCUs,
    docId: document.getId(),
    docUrl: document.getUrl(),
    pdfId: pdfFile.getId(),
    pdfUrl: pdfFile.getUrl(),
    status: 'Draft',
    profileSnapshot: profile,
    createdAt: now,
    updatedAt: now
  };

  appendGeneratedPacket_(spreadsheet, packetRecord);
  appendChangeLog_(
    spreadsheet,
    'GENERATED APPROVAL PACKET',
    activityId,
    rule.categoryKey + ' | ' + packetData.pages.length + ' page(s)'
  );

  SpreadsheetApp.flush();
  const data = buildBootstrapData_(spreadsheet);
  data.generatedPacketId = packetId;
  return data;
}

function updateGeneratedPacketStatus(input) {
  const packetId = cleanString_(input && input.packetId);
  const status = cleanString_(input && input.status);

  if (!packetId) throw new Error('Packet ID is required.');
  if (PACKET_STATUSES.indexOf(status) === -1) {
    throw new Error('Select a valid packet status.');
  }

  const spreadsheet = getOrCreateWorkbook_();
  const sheet = spreadsheet.getSheetByName(SHEETS.PACKETS);
  const row = findPacketRow_(sheet, packetId);

  if (!row) throw new Error('The generated packet could not be found.');

  sheet.getRange(row, 13).setValue(status);
  sheet.getRange(row, 16).setValue(formatDateTime_(new Date()));

  appendChangeLog_(spreadsheet, 'UPDATED PACKET STATUS', packetId, status);
  SpreadsheetApp.flush();
  return buildBootstrapData_(spreadsheet);
}

function saveActivity(input) {
  const spreadsheet = getOrCreateWorkbook_();
  const sheet = spreadsheet.getSheetByName(SHEETS.ACTIVITIES);
  const rules = getRules_(spreadsheet);
  const requestedCategoryKey = cleanString_(input && input.categoryKey);
  const requestedRecordType = cleanString_(input && input.recordType) || 'self_report';
  const rule = requestedRecordType === 'automatic_elms' &&
      requestedCategoryKey === CARRYOVER_CATEGORY_KEY
    ? CARRYOVER_RULE
    : rules.find(function(item) {
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

  // Force all pending Sheet writes to complete before reporting success.
  SpreadsheetApp.flush();

  const verifiedRow = findActivityRow_(sheet, id);
  if (!verifiedRow) {
    throw new Error(
      'The activity could not be verified in the tracker Sheet. Please check My CU Records before trying again.'
    );
  }

  const data = buildBootstrapData_(spreadsheet);
  const verifiedActivity = (data.activities || []).find(function(item) {
    return item.id === id;
  });

  if (!verifiedActivity) {
    throw new Error(
      'The activity row was written, but the refreshed tracker data did not include it. Refresh the app before trying again.'
    );
  }

  data.savedId = id;
  data.savedActivity = verifiedActivity;
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
  SpreadsheetApp.flush();
  return buildBootstrapData_(spreadsheet);
}

function createWorkspaceFolders() {
  createOrGetFolderStructure_();
  const spreadsheet = getOrCreateWorkbook_();
  const sheet = spreadsheet.getSheetByName(SHEETS.ACTIVITIES);
  const rules = getRules_(spreadsheet);
  const activities = readActivities_(spreadsheet);
  const map = getHeaderMap_(ACTIVITY_HEADERS);
  const verified = {};

  activities
    .filter(function(activity) {
      return activity.recordType !== 'automatic_elms';
    })
    .forEach(function(activity) {
      if (!verified[activity.categoryKey]) {
        const rule = rules.find(function(item) {
          return item.categoryKey === activity.categoryKey && item.active;
        });

        if (rule) verified[activity.categoryKey] = createCategoryFolder_(rule);
      }

      const folder = verified[activity.categoryKey];
      if (!folder) return;

      const row = findActivityRow_(sheet, activity.id);
      if (!row) return;

      sheet.getRange(row, map['Activity Folder ID']).setValue(folder.id);
      sheet.getRange(row, map['Activity Folder URL']).setValue(folder.url);
      sheet.getRange(row, map['Updated At']).setValue(formatDateTime_(new Date()));
    });

  SpreadsheetApp.flush();
  updateSettingsSheet_(spreadsheet);
  appendChangeLog_(
    spreadsheet,
    'CREATED / VERIFIED FOLDER STRUCTURE',
    '',
    ROOT_FOLDER_NAME + ' | categories verified: ' + Object.keys(verified).length
  );

  const data = buildBootstrapData_(spreadsheet);
  data.folderRepairSummary = {
    categoriesVerified: Object.keys(verified).length,
    filesRecreated: 0
  };
  return data;
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
  SpreadsheetApp.flush();
  return buildBootstrapData_(spreadsheet);
}

function getOrCreateWorkbook_() {
  const properties = PropertiesService.getUserProperties();
  const storedId = properties.getProperty('PGS_SPREADSHEET_ID');
  let spreadsheet = null;

  if (storedId) {
    try {
      spreadsheet = SpreadsheetApp.openById(storedId);
    } catch (error) {
      console.error(
        'Unable to open stored PGS workbook ' + storedId + ': ' + error.message
      );
      properties.deleteProperty('PGS_SPREADSHEET_ID');
      properties.deleteProperty('PGS_WORKBOOK_SCHEMA_VERSION');
    }
  }

  if (!spreadsheet) {
    spreadsheet = SpreadsheetApp.create(WORKBOOK_NAME);
    setupWorkbook_(spreadsheet);
    properties.setProperty('PGS_SPREADSHEET_ID', spreadsheet.getId());
    properties.setProperty(
      'PGS_WORKBOOK_SCHEMA_VERSION',
      WORKBOOK_SCHEMA_VERSION
    );
    return spreadsheet;
  }

  const appliedSchema =
    properties.getProperty('PGS_WORKBOOK_SCHEMA_VERSION');

  if (appliedSchema !== WORKBOOK_SCHEMA_VERSION) {
    ensureWorkbookStructure_(spreadsheet);
    properties.setProperty(
      'PGS_WORKBOOK_SCHEMA_VERSION',
      WORKBOOK_SCHEMA_VERSION
    );
  }

  return spreadsheet;
}

function inspectPGSWorkbookCandidates() {
  const candidates = getPGSWorkbookCandidates_();
  console.log(JSON.stringify(candidates, null, 2));
  return candidates;
}

function repairPGSWorkbookConnection() {
  const candidates = getPGSWorkbookCandidates_();

  if (!candidates.length) {
    throw new Error('No existing "' + WORKBOOK_NAME + '" spreadsheet was found.');
  }

  candidates.sort(function(a, b) {
    if (b.activityCount !== a.activityCount) {
      return b.activityCount - a.activityCount;
    }
    return b.lastUpdatedMillis - a.lastUpdatedMillis;
  });

  const selected = candidates[0];
  const properties = PropertiesService.getUserProperties();
  properties.setProperty('PGS_SPREADSHEET_ID', selected.id);
  properties.deleteProperty('PGS_WORKBOOK_SCHEMA_VERSION');

  const spreadsheet = SpreadsheetApp.openById(selected.id);
  ensureWorkbookStructure_(spreadsheet);
  properties.setProperty(
    'PGS_WORKBOOK_SCHEMA_VERSION',
    WORKBOOK_SCHEMA_VERSION
  );

  console.log(
    'Connected to ' + selected.url +
    ' with ' + selected.activityCount + ' saved activity record(s).'
  );

  const data = buildBootstrapData_(spreadsheet);
  data.workbookRepair = selected;
  return data;
}

function getPGSWorkbookCandidates_() {
  const files = DriveApp.getFilesByName(WORKBOOK_NAME);
  const candidates = [];

  while (files.hasNext()) {
    const file = files.next();
    if (file.isTrashed() || file.getMimeType() !== MimeType.GOOGLE_SHEETS) {
      continue;
    }

    try {
      const spreadsheet = SpreadsheetApp.openById(file.getId());
      const sheet = spreadsheet.getSheetByName(SHEETS.ACTIVITIES);
      let activityCount = 0;

      if (sheet && sheet.getLastRow() >= 2) {
        activityCount = sheet
          .getRange(2, 1, sheet.getLastRow() - 1, 1)
          .getDisplayValues()
          .filter(function(row) {
            return cleanString_(row[0]) !== '';
          }).length;
      }

      candidates.push({
        id: file.getId(),
        url: file.getUrl(),
        name: file.getName(),
        activityCount: activityCount,
        lastUpdated: formatDateTime_(file.getLastUpdated()),
        lastUpdatedMillis: file.getLastUpdated().getTime()
      });
    } catch (error) {
      candidates.push({
        id: file.getId(),
        url: file.getUrl(),
        name: file.getName(),
        activityCount: -1,
        lastUpdated: '',
        lastUpdatedMillis: 0,
        error: error.message
      });
    }
  }

  return candidates;
}


function setupWorkbook_(spreadsheet) {
  const activities = spreadsheet.getSheets()[0];
  activities.setName(SHEETS.ACTIVITIES);
  const startHere = spreadsheet.insertSheet(SHEETS.START_HERE, 0);
  const rules = spreadsheet.insertSheet(SHEETS.RULES);
  const settings = spreadsheet.insertSheet(SHEETS.SETTINGS);
  const changeLog = spreadsheet.insertSheet(SHEETS.CHANGE_LOG);
  const packets = spreadsheet.insertSheet(SHEETS.PACKETS);

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
  packets.getRange(1, 1, 1, PACKET_HEADERS.length).setValues([PACKET_HEADERS]);

  ensureProfileSettings_(spreadsheet);
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
    [SHEETS.CHANGE_LOG, ['Timestamp', 'Action', 'Activity ID', 'Details', 'User']],
    [SHEETS.PACKETS, PACKET_HEADERS]
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

  ensureProfileSettings_(spreadsheet);
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
    ['Safe to do in this workbook', 'Connection guardrails - do not change'],
    ['View and filter your Activity Log', 'Do not rename, delete, or move Sheet tabs'],
    ['Open evidence links and managed category folders', 'Do not rename, delete, reorder, or insert column headers'],
    ['Review estimated and official CU totals', 'Do not sort only part of the Activity Log'],
    ['Download or print a copy for your records', 'Do not edit hidden/internal tabs or technical fields'],
    ['Return to the web app for all corrections', 'Do not rename, move, or delete numbered Drive folders']
  ]);

  sheet.getRange('A5:B5')
    .setBackground('#dceaf7')
    .setFontColor('#17365d')
    .setFontWeight('bold');
  sheet.getRange('A6:B10').setWrap(true).setVerticalAlignment('top');
  sheet.getRange('A12:F12').merge()
    .setValue('IMPORTANT CONNECTION NOTICE: Use the website to add, edit, or delete records. Changing Sheet tab names, column headers, hidden fields, or technical columns can break the assistant. Deleting or moving managed Drive folders can break saved links; renaming numbered folders can cause duplicates. Evidence files may be uploaded inside the provided folders, but the managed folder structure should remain unchanged.')
    .setBackground('#fde2e2')
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
  const internalSheets = [SHEETS.RULES, SHEETS.SETTINGS, SHEETS.CHANGE_LOG, SHEETS.PACKETS];

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
      .setNote('PGS CONNECTION GUARDRAIL: Do not rename, delete, reorder, or insert headers. Use the web app to add, edit, or delete records. Changing this structure can break the assistant connection.');

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

  const packets = spreadsheet.getSheetByName(SHEETS.PACKETS);
  if (packets) {
    packets.setColumnWidth(1, 230);
    packets.setColumnWidth(3, 320);
    packets.setColumnWidth(10, 320);
    packets.setColumnWidth(12, 320);
    packets.setColumnWidth(14, 420);
  }

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
  const categoryKey = cleanString_(a.categoryKey);
  const isCarryover = recordType === 'automatic_elms' &&
    categoryKey === CARRYOVER_CATEGORY_KEY;

  const title = cleanString_(a.title) ||
    (isCarryover ? 'Carryover / Rollover' : '');
  const description = cleanString_(a.description) ||
    (isCarryover ? 'CUs carried over from a prior approved advancement round.' : '');
  const paymentStatus = cleanString_(a.paymentStatus) || 'unpaid';
  const status = isCarryover
    ? 'Confirmed in ELMS'
    : (cleanString_(a.status) ||
      (recordType === 'automatic_elms' ? 'Waiting to appear in ELMS' : 'Planning'));
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
    throw new Error(isCarryover
      ? 'Enter the date the carryover first appeared in ELMS. Do not enter an expected date.'
      : 'Enter the activity start date. This assistant applies only to activities occurring on or after May 1, 2024.');
  }

  // Carryover is an administrative ELMS entry, not a new activity date.
  if (!isCarryover && startDate < MIN_ACTIVITY_DATE) {
    throw new Error('This assistant applies only to activities occurring on or after May 1, 2024.');
  }

  if (!isCarryover && endDate && endDate < MIN_ACTIVITY_DATE) {
    throw new Error('This assistant applies only to activities occurring on or after May 1, 2024.');
  }

  if (endDate && endDate < startDate) {
    throw new Error('The activity end date cannot be earlier than the start date.');
  }

  if (isCarryover && !(numberOrZero_(a.officialApprovedCUs) > 0)) {
    throw new Error('Enter the official carryover CUs exactly as shown in ELMS.');
  }

  if (!isCarryover &&
      recordType === 'automatic_elms' &&
      status === 'Confirmed in ELMS' &&
      !(numberOrZero_(a.officialApprovedCUs) > 0)) {
    throw new Error('Enter the CUs shown in ELMS for a confirmed automatic record.');
  }

  return {
    id: cleanString_(a.id),
    title: title,
    description: description,
    startDate: startDate,
    endDate: endDate,
    organization: cleanString_(a.organization) ||
      (isCarryover ? 'PGS Office / ELMS' : ''),
    role: cleanString_(a.role) || (isCarryover ? 'Carryover' : ''),
    categoryKey: categoryKey,
    paymentStatus: paymentStatus,
    quantity: Math.max(0, numberOrZero_(a.quantity)),
    unit: cleanString_(a.unit),
    titleIException: cleanString_(a.titleIException) === 'yes' ? 'yes' : 'no',
    status: status,
    officialApprovedCUs: a.officialApprovedCUs,
    evidenceLink: validHttpUrlOrBlank_(a.evidenceLink),
    notes: cleanString_(a.notes),
    createFolder: Boolean(a.createFolder),
    sessions: sessions,
    recordType: recordType
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
      const description = cleanString_(session.description);

      if (!date || !startTime || !endTime) {
        throw new Error('Session ' + rowNumber + ' requires a date, start time, and end time.');
      }

      if (date < MIN_ACTIVITY_DATE) {
        throw new Error('Session ' + rowNumber + ' is before May 1, 2024.');
      }

      if (PAYMENT_OPTIONS.indexOf(paymentStatus) === -1 || paymentStatus === 'mixed') {
        throw new Error('Session ' + rowNumber + ' has an invalid payment status.');
      }

      if (!description) {
        throw new Error('Session ' + rowNumber + ' requires a brief description.');
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
    return item.recordType === 'automatic_elms' &&
      item.categoryKey !== CARRYOVER_CATEGORY_KEY;
  });

  const carryover = activities.filter(function(item) {
    return item.recordType === 'automatic_elms' &&
      item.categoryKey === CARRYOVER_CATEGORY_KEY;
  });

  const approvedSelfReported = selfReported.reduce(function(total, item) {
    return total + numberOrZero_(item.officialApprovedCUs);
  }, 0);

  const automaticElmsTotal = automatic.reduce(function(total, item) {
    return total + numberOrZero_(item.officialApprovedCUs);
  }, 0);

  const carryoverTotal = carryover.reduce(function(total, item) {
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

  const confirmedTotal = approvedSelfReported + automaticElmsTotal + carryoverTotal;

  return {
    estimatedSelfReported: roundToTwo_(estimatedSelfReported),
    approvedSelfReported: roundToTwo_(approvedSelfReported),
    automaticElmsTotal: roundToTwo_(automaticElmsTotal),
    carryoverTotal: roundToTwo_(carryoverTotal),
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
  const references = ensureRenamedChildFolder_(
    root,
    '04 Reference and Forms',
    '03 Reference and Forms'
  );

  root.setDescription(CONNECTION_GUARDRAIL_MESSAGE);
  categoryEvidence.setDescription(
    CONNECTION_GUARDRAIL_MESSAGE +
    ' This folder contains the reusable evidence folders for each PGS category.'
  );
  automaticRecords.setDescription(
    CONNECTION_GUARDRAIL_MESSAGE +
    ' This folder is optional storage for records that ELMS enters automatically.'
  );
  references.setDescription(
    CONNECTION_GUARDRAIL_MESSAGE +
    ' Store reference copies and blank forms here.'
  );

  markLegacyReceiptFolder_(root);

  properties.setProperty('PGS_ACTIVITY_FOLDER_ID', categoryEvidence.getId());

  return {
    rootFolder: root,
    activityEvidenceFolder: categoryEvidence,
    automaticRecordsFolder: automaticRecords,
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

  MANAGED_CATEGORY_SUBFOLDERS.forEach(function(name) {
    const child = ensureChildFolder_(folder, name);
    child.setDescription(
      CONNECTION_GUARDRAIL_MESSAGE +
      (name === '01 Evidence to Combine'
        ? ' Upload supporting evidence and generated unsigned drafts here.'
        : ' Place the one final combined evidence file for ELMS here.')
    );
  });

  folder.setDescription(
    CONNECTION_GUARDRAIL_MESSAGE + ' Category: ' +
    rule.activityName + ' (' + rule.categoryKey + ').'
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


function ensureRenamedChildFolder_(parent, oldName, newName) {
  const newFolders = parent.getFoldersByName(newName);
  while (newFolders.hasNext()) {
    const folder = newFolders.next();
    if (!folder.isTrashed()) return folder;
  }

  const oldFolders = parent.getFoldersByName(oldName);
  while (oldFolders.hasNext()) {
    const folder = oldFolders.next();
    if (!folder.isTrashed()) {
      folder.setName(newName);
      return folder;
    }
  }

  return parent.createFolder(newName);
}

function markLegacyReceiptFolder_(root) {
  [
    '03 Advancement Receipts and Decisions',
    '03 ELMS Receipt and Decision'
  ].forEach(function(name) {
    const folders = root.getFoldersByName(name);
    while (folders.hasNext()) {
      folders.next().setDescription(
        'LEGACY OPTIONAL FOLDER: The FamilyPD PGS Assistant no longer creates or uses this folder. It was not deleted automatically because it may contain user files. You may keep it or remove it after confirming it is empty or no longer needed.'
      );
    }
  });
}

function ensureChildFolder_(parent, name) {
  const matches = parent.getFoldersByName(name);

  while (matches.hasNext()) {
    const folder = matches.next();
    if (!folder.isTrashed()) return folder;
  }

  return parent.createFolder(name);
}

function getFolderByStoredId_(propertyName) {
  const properties = PropertiesService.getUserProperties();
  const id = properties.getProperty(propertyName);
  if (!id) return null;

  try {
    const folder = DriveApp.getFolderById(id);
    if (folder.isTrashed()) {
      properties.deleteProperty(propertyName);
      return null;
    }
    return folder;
  } catch (error) {
    properties.deleteProperty(propertyName);
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


function ensureProfileSettings_(spreadsheet) {
  const rows = [
    [PROFILE_SETTING_KEYS.fullName, '', 'Used on generated approval-form drafts.'],
    [PROFILE_SETTING_KEYS.schoolSite, '', 'Used on generated approval-form drafts.'],
    [PROFILE_SETTING_KEYS.supervisor, '', 'Used on generated approval-form drafts.'],
    [PROFILE_SETTING_KEYS.contractStart, '', 'Used on time-based approval-form drafts.'],
    [PROFILE_SETTING_KEYS.contractEnd, '', 'Used on time-based approval-form drafts.'],
    [PROFILE_SETTING_KEYS.advancementCycle, '', 'Optional label such as 2026-2027 Round 1.']
  ];

  rows.forEach(function(row) {
    ensureSettingRow_(spreadsheet, row[0], row[1], row[2]);
  });
}

function ensureSettingRow_(spreadsheet, key, value, purpose) {
  const sheet = spreadsheet.getSheetByName(SHEETS.SETTINGS);
  const values = sheet.getDataRange().getValues();
  const exists = values.some(function(row) {
    return cleanString_(row[0]) === key;
  });

  if (!exists) sheet.appendRow([key, value, purpose]);
}

function writeSettingValue_(spreadsheet, key, value) {
  ensureSettingRow_(spreadsheet, key, '', '');
  const sheet = spreadsheet.getSheetByName(SHEETS.SETTINGS);
  const values = sheet.getDataRange().getValues();

  for (let index = 0; index < values.length; index += 1) {
    if (cleanString_(values[index][0]) === key) {
      sheet.getRange(index + 1, 2).setValue(value);
      return;
    }
  }
}

function readSettingValue_(spreadsheet, key) {
  const sheet = spreadsheet.getSheetByName(SHEETS.SETTINGS);
  const values = sheet.getDataRange().getValues();

  for (let index = 0; index < values.length; index += 1) {
    if (cleanString_(values[index][0]) === key) {
      return cleanString_(values[index][1]);
    }
  }

  return '';
}

function getUserProfile_(spreadsheet) {
  ensureProfileSettings_(spreadsheet);

  return {
    fullName: readSettingValue_(spreadsheet, PROFILE_SETTING_KEYS.fullName),
    schoolSite: readSettingValue_(spreadsheet, PROFILE_SETTING_KEYS.schoolSite),
    supervisor: readSettingValue_(spreadsheet, PROFILE_SETTING_KEYS.supervisor),
    contractStart: readSettingValue_(spreadsheet, PROFILE_SETTING_KEYS.contractStart),
    contractEnd: readSettingValue_(spreadsheet, PROFILE_SETTING_KEYS.contractEnd),
    advancementCycle: readSettingValue_(spreadsheet, PROFILE_SETTING_KEYS.advancementCycle)
  };
}

function normalizeProfileInput_(input) {
  const profile = input || {};

  return {
    fullName: cleanString_(profile.fullName),
    schoolSite: cleanString_(profile.schoolSite),
    supervisor: cleanString_(profile.supervisor),
    contractStart: cleanString_(profile.contractStart),
    contractEnd: cleanString_(profile.contractEnd),
    advancementCycle: cleanString_(profile.advancementCycle)
  };
}

function validateProfileForPacket_(profile, formType) {
  const missing = [];

  if (!profile.fullName) missing.push('full name');
  if (!profile.schoolSite) missing.push('school/site');
  if (!profile.supervisor) missing.push('supervisor');

  if (formType === 'time_based') {
    if (!profile.contractStart) missing.push('contract start time');
    if (!profile.contractEnd) missing.push('contract end time');
  }

  if (missing.length) {
    throw new Error(
      'Complete My Google Workspace profile before generating the form: ' +
      missing.join(', ') + '.'
    );
  }
}

function readGeneratedPackets_(spreadsheet) {
  const sheet = spreadsheet.getSheetByName(SHEETS.PACKETS);
  if (!sheet || sheet.getLastRow() < 2) return [];

  return sheet.getRange(2, 1, sheet.getLastRow() - 1, PACKET_HEADERS.length)
    .getValues()
    .filter(function(row) { return cleanString_(row[0]) !== ''; })
    .map(function(row) {
      return {
        packetId: displayValue_(row[0]),
        categoryKey: displayValue_(row[1]),
        categoryName: displayValue_(row[2]),
        formType: displayValue_(row[3]),
        includedKeys: parseJson_(row[4], []),
        pageCount: numberOrZero_(row[5]),
        totalQuantity: numberOrZero_(row[6]),
        estimatedCUs: row[7] === '' ? '' : numberOrZero_(row[7]),
        docId: displayValue_(row[8]),
        docUrl: displayValue_(row[9]),
        pdfId: displayValue_(row[10]),
        pdfUrl: displayValue_(row[11]),
        status: displayValue_(row[12]) || 'Draft',
        profileSnapshot: parseJson_(row[13], {}),
        createdAt: dateTimeToString_(row[14]),
        updatedAt: dateTimeToString_(row[15])
      };
    })
    .sort(function(a, b) {
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });
}

function appendGeneratedPacket_(spreadsheet, packet) {
  const sheet = spreadsheet.getSheetByName(SHEETS.PACKETS);
  sheet.appendRow([
    packet.packetId,
    packet.categoryKey,
    packet.categoryName,
    packet.formType,
    JSON.stringify(packet.includedKeys || []),
    packet.pageCount,
    packet.totalQuantity,
    packet.estimatedCUs,
    packet.docId,
    packet.docUrl,
    packet.pdfId,
    packet.pdfUrl,
    packet.status,
    JSON.stringify(packet.profileSnapshot || {}),
    packet.createdAt,
    packet.updatedAt
  ]);
}

function findPacketRow_(sheet, packetId) {
  if (!sheet || !packetId || sheet.getLastRow() < 2) return 0;

  const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1)
    .getDisplayValues()
    .map(function(row) { return row[0]; });

  const index = ids.indexOf(packetId);
  return index === -1 ? 0 : index + 2;
}

function markDraftPacketsSuperseded_(spreadsheet, categoryKey) {
  const sheet = spreadsheet.getSheetByName(SHEETS.PACKETS);
  if (!sheet || sheet.getLastRow() < 2) return;

  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, PACKET_HEADERS.length)
    .getValues();

  values.forEach(function(row, index) {
    if (cleanString_(row[1]) === categoryKey &&
        ['Draft', 'Needs signatures'].indexOf(cleanString_(row[12])) >= 0) {
      sheet.getRange(index + 2, 13).setValue('Superseded');
      sheet.getRange(index + 2, 16).setValue(formatDateTime_(new Date()));
    }
  });
}

function packetLockedKeys_(packets, categoryKey) {
  const lockedStatuses = ['Signed', 'Included in final ELMS file'];
  const keys = [];

  (packets || []).forEach(function(packet) {
    if (packet.categoryKey !== categoryKey ||
        lockedStatuses.indexOf(packet.status) === -1) {
      return;
    }

    (packet.includedKeys || []).forEach(function(key) {
      if (keys.indexOf(key) === -1) keys.push(key);
    });
  });

  return keys;
}

function approvalFormType_(rule) {
  const approvalForm = cleanString_(rule.approvalForm).toLowerCase();

  if (approvalForm.indexOf('time-based') >= 0) return 'time_based';
  if (approvalForm.indexOf('university student assignment') >= 0) {
    return 'university_assignment';
  }
  if (approvalForm.indexOf('lower-level college coursework') >= 0) {
    return 'lower_level_college';
  }

  return '';
}

function buildApprovalPacketData_(activities, rule, profile, lockedKeys) {
  const formType = approvalFormType_(rule);

  if (formType === 'time_based') {
    return buildTimeBasedPacketData_(activities, rule, lockedKeys);
  }

  if (formType === 'university_assignment') {
    return buildUniversityAssignmentPacketData_(activities, rule, lockedKeys);
  }

  if (formType === 'lower_level_college') {
    return buildLowerLevelCollegePacketData_(activities, rule, lockedKeys);
  }

  throw new Error('Unsupported approval-form type.');
}

function eligibleCategoryActivities_(activities, categoryKey) {
  return activities.filter(function(activity) {
    return activity.recordType === 'self_report' &&
      activity.categoryKey === categoryKey &&
      activity.status !== 'Denied';
  });
}

function buildTimeBasedPacketData_(activities, rule, lockedKeys) {
  const entries = [];
  const excluded = [];

  eligibleCategoryActivities_(activities, rule.categoryKey)
    .forEach(function(activity) {
      (activity.sessions || []).forEach(function(session, index) {
        const key = timeSessionKey_(activity, session, index);

        if (lockedKeys.indexOf(key) >= 0) return;

        const group = timePaymentGroup_(activity, session, rule);
        if (!group) {
          excluded.push(key);
          return;
        }

        entries.push({
          key: key,
          activityId: activity.id,
          date: session.date,
          startTime: session.startTime,
          endTime: session.endTime,
          breakMinutes: numberOrZero_(session.breakMinutes),
          minutes: numberOrZero_(session.minutes),
          hours: numberOrZero_(session.hours),
          description: cleanString_(session.description) || activity.description,
          paymentStatus: session.paymentStatus,
          groupKey: group.key,
          groupLabel: group.label,
          payLabel: group.payLabel,
          divisor: group.divisor
        });
      });
    });

  entries.sort(function(a, b) {
    return (a.date + ' ' + a.startTime).localeCompare(b.date + ' ' + b.startTime);
  });

  const grouped = {};
  entries.forEach(function(entry) {
    (grouped[entry.groupKey] = grouped[entry.groupKey] || []).push(entry);
  });

  const pages = [];
  Object.keys(grouped).sort().forEach(function(groupKey) {
    const groupEntries = grouped[groupKey];
    const chunks = chunkArray_(groupEntries, FORM_CAPACITIES.time_based);

    chunks.forEach(function(chunk, index) {
      const totalHours = roundToTwo_(chunk.reduce(function(total, entry) {
        return total + entry.hours;
      }, 0));

      const divisor = chunk[0].divisor;
      const totalCUs = divisor ? roundToTwo_(totalHours / divisor) : 0;

      pages.push({
        formType: 'time_based',
        groupKey: groupKey,
        groupLabel: chunk[0].groupLabel,
        payLabel: chunk[0].payLabel,
        pageWithinGroup: index + 1,
        rows: chunk,
        totalHours: totalHours,
        totalCUs: totalCUs
      });
    });
  });

  return {
    formType: 'time_based',
    pages: pages,
    includedKeys: entries.map(function(entry) { return entry.key; }),
    totalQuantity: roundToTwo_(entries.reduce(function(total, entry) {
      return total + entry.hours;
    }, 0)),
    estimatedCUs: roundToTwo_(pages.reduce(function(total, page) {
      return total + page.totalCUs;
    }, 0)),
    excludedKeys: excluded
  };
}

function timeSessionKey_(activity, session, index) {
  return [
    'session',
    activity.id,
    index,
    session.date,
    session.startTime,
    session.endTime
  ].join(':');
}

function timePaymentGroup_(activity, session, rule) {
  const paymentStatus = cleanString_(session.paymentStatus);

  if (paymentStatus === 'contract' && !rule.contractTimeAllowed) return null;

  if (paymentStatus === 'paid') {
    const titleIFullRate = rule.titleIExceptionAllowed &&
      activity.titleIException === 'yes';

    return titleIFullRate
      ? {
          key: 'paid-title-i-full-rate',
          label: 'Paid - Title I full CU rate',
          payLabel: 'paid',
          divisor: rule.unpaidHoursPerCU
        }
      : {
          key: 'paid-supplemental-rate',
          label: 'Paid stipend / supplemental rate',
          payLabel: 'paid',
          divisor: rule.paidHoursPerCU
        };
  }

  if (paymentStatus === 'contract') {
    return {
      key: 'contract-allowed',
      label: 'Regular contractual rate - allowed by category',
      payLabel: 'paid',
      divisor: rule.unpaidHoursPerCU
    };
  }

  return {
    key: 'unpaid',
    label: 'Unpaid qualifying time',
    payLabel: 'unpaid',
    divisor: rule.unpaidHoursPerCU
  };
}

function buildUniversityAssignmentPacketData_(activities, rule, lockedKeys) {
  const entries = eligibleCategoryActivities_(activities, rule.categoryKey)
    .filter(function(activity) {
      return lockedKeys.indexOf('activity:' + activity.id) === -1;
    })
    .map(function(activity) {
      return {
        key: 'activity:' + activity.id,
        university: activity.organization || 'University not entered',
        startDate: activity.startDate,
        endDate: activity.endDate,
        weeks: activity.unit === 'week'
          ? activity.quantity
          : weeksBetweenDates_(activity.startDate, activity.endDate),
        category: activity.categoryName,
        estimatedCUs: numberOrZero_(activity.estimatedCUs)
      };
    })
    .sort(function(a, b) {
      return String(a.startDate).localeCompare(String(b.startDate));
    });

  const pages = chunkArray_(entries, FORM_CAPACITIES.university_assignment)
    .map(function(chunk) {
      return {
        formType: 'university_assignment',
        rows: chunk,
        totalWeeks: roundToTwo_(chunk.reduce(function(total, row) {
          return total + numberOrZero_(row.weeks);
        }, 0)),
        totalCUs: roundToTwo_(chunk.reduce(function(total, row) {
          return total + numberOrZero_(row.estimatedCUs);
        }, 0))
      };
    });

  return {
    formType: 'university_assignment',
    pages: pages,
    includedKeys: entries.map(function(entry) { return entry.key; }),
    totalQuantity: roundToTwo_(entries.reduce(function(total, row) {
      return total + numberOrZero_(row.weeks);
    }, 0)),
    estimatedCUs: roundToTwo_(entries.reduce(function(total, row) {
      return total + numberOrZero_(row.estimatedCUs);
    }, 0))
  };
}

function buildLowerLevelCollegePacketData_(activities, rule, lockedKeys) {
  const entries = eligibleCategoryActivities_(activities, rule.categoryKey)
    .filter(function(activity) {
      return lockedKeys.indexOf('activity:' + activity.id) === -1;
    })
    .map(function(activity) {
      return {
        key: 'activity:' + activity.id,
        university: activity.organization || 'University not entered',
        course: activity.title,
        credits: activity.quantity,
        creditType: activity.unit === 'quarter_credit' ? 'Quarter' : 'Semester',
        justification: activity.description,
        estimatedCUs: numberOrZero_(activity.estimatedCUs)
      };
    })
    .sort(function(a, b) {
      return a.course.localeCompare(b.course);
    });

  const pages = chunkArray_(entries, FORM_CAPACITIES.lower_level_college)
    .map(function(chunk) {
      return {
        formType: 'lower_level_college',
        rows: chunk,
        totalCredits: roundToTwo_(chunk.reduce(function(total, row) {
          return total + numberOrZero_(row.credits);
        }, 0)),
        totalCUs: roundToTwo_(chunk.reduce(function(total, row) {
          return total + numberOrZero_(row.estimatedCUs);
        }, 0))
      };
    });

  return {
    formType: 'lower_level_college',
    pages: pages,
    includedKeys: entries.map(function(entry) { return entry.key; }),
    totalQuantity: roundToTwo_(entries.reduce(function(total, row) {
      return total + numberOrZero_(row.credits);
    }, 0)),
    estimatedCUs: roundToTwo_(entries.reduce(function(total, row) {
      return total + numberOrZero_(row.estimatedCUs);
    }, 0))
  };
}

function chunkArray_(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function weeksBetweenDates_(startDate, endDate) {
  if (!startDate || !endDate) return 0;

  const start = inputToDate_(startDate);
  const end = inputToDate_(endDate);

  if (!(start instanceof Date) || !(end instanceof Date)) return 0;

  const days = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));
  return Math.max(1, roundToTwo_((days + 1) / 7));
}

function createApprovalPacketDocument_(name, profile, rule, packetData) {
  const document = DocumentApp.create(name);
  const body = document.getBody();

  body.setMarginTop(24);
  body.setMarginBottom(24);
  body.setMarginLeft(24);
  body.setMarginRight(24);
  body.setPageWidth(612);
  body.setPageHeight(792);

  packetData.pages.forEach(function(page, index) {
    if (index > 0) body.appendPageBreak();

    if (page.formType === 'time_based') {
      appendTimeBasedFormPage_(body, profile, rule, page, index + 1, packetData.pages.length);
    } else if (page.formType === 'university_assignment') {
      appendUniversityAssignmentFormPage_(body, profile, rule, page, index + 1, packetData.pages.length);
    } else if (page.formType === 'lower_level_college') {
      appendLowerLevelCollegeFormPage_(body, profile, rule, page, index + 1, packetData.pages.length);
    }
  });

  document.saveAndClose();
  return DocumentApp.openById(document.getId());
}

function appendPacketHeader_(body, title, profile, pageNumber, pageCount) {
  const warning = body.appendParagraph(
    'ASSISTANT-PREPARED DRAFT - UNOFFICIAL GUIDE - VERIFY AGAINST CURRENT CCSD REQUIREMENTS'
  );
  styleParagraph_(warning, 7, true, '#8a2c2c', DocumentApp.HorizontalAlignment.CENTER);

  const heading = body.appendParagraph(title);
  styleParagraph_(heading, 15, true, '#17365d', DocumentApp.HorizontalAlignment.CENTER);

  const subheading = body.appendParagraph(
    (profile.advancementCycle ? profile.advancementCycle + ' | ' : '') +
    'Page ' + pageNumber + ' of ' + pageCount
  );
  styleParagraph_(subheading, 8, false, '#5b6573', DocumentApp.HorizontalAlignment.CENTER);

  const profileTable = body.appendTable([
    ['Name of Educator/Licensed Professional', profile.fullName],
    ['School/Site Location', profile.schoolSite],
    ['Name of Supervisor', profile.supervisor]
  ]);

  styleDocumentTable_(profileTable, [190, 350], 8, 18);
}

function appendTimeBasedFormPage_(body, profile, rule, page, pageNumber, pageCount) {
  appendPacketHeader_(
    body,
    'Contact Unit Approval Form - Time Based',
    profile,
    pageNumber,
    pageCount
  );

  const activityTable = body.appendTable([
    ['Professional Learning Activity as stated in the PGS Reference Guide', rule.activityName],
    ['Payment group', page.groupLabel + ' (' + page.payLabel + ')']
  ]);
  styleDocumentTable_(activityTable, [265, 275], 7.5, 18);

  const rows = [
    ['DATE', 'FROM', 'TO', 'TOTAL HOURS', 'DESCRIPTION'],
    ['Example', '9:00 AM', '3:30 PM', '6.50', 'Brief description for the date indicated.']
  ];

  page.rows.forEach(function(row) {
    rows.push([
      formatDisplayDate_(row.date),
      formatDisplayTime_(row.startTime),
      formatDisplayTime_(row.endTime),
      numberFormat_(row.hours),
      truncateForForm_(row.description, 115)
    ]);
  });

  while (rows.length < FORM_CAPACITIES.time_based + 2) {
    rows.push(['', '', '', '', '']);
  }

  const table = body.appendTable(rows);
  styleDocumentTable_(table, [62, 62, 62, 72, 282], 6.8, 16);
  styleHeaderRow_(table, 0);
  styleExampleRow_(table, 1);

  const totals = body.appendTable([
    ['Total Number of Hours', numberFormat_(page.totalHours), 'Total Number of CUs', numberFormat_(page.totalCUs)]
  ]);
  styleDocumentTable_(totals, [150, 90, 150, 90], 8, 18);

  const signatures = body.appendTable([
    ['Employee Signature', '', 'Date', ''],
    ['Employee Contract Start Time', profile.contractStart, 'Contract End Time', profile.contractEnd],
    ['Administrator Signature', '', 'Date', '']
  ]);
  styleDocumentTable_(signatures, [150, 180, 105, 105], 7.5, 18);
}

function appendUniversityAssignmentFormPage_(body, profile, rule, page, pageNumber, pageCount) {
  appendPacketHeader_(
    body,
    'Contact Unit Approval Form - University Student Assignment',
    profile,
    pageNumber,
    pageCount
  );

  const rows = [['UNIVERSITY', 'START DATE', 'END DATE', 'NUMBER OF WEEKS', 'CATEGORY']];

  page.rows.forEach(function(row) {
    rows.push([
      truncateForForm_(row.university, 45),
      formatDisplayDate_(row.startDate),
      formatDisplayDate_(row.endDate),
      numberFormat_(row.weeks),
      truncateForForm_(row.category, 65)
    ]);
  });

  while (rows.length < FORM_CAPACITIES.university_assignment + 1) {
    rows.push(['', '', '', '', '']);
  }

  const table = body.appendTable(rows);
  styleDocumentTable_(table, [130, 80, 80, 80, 170], 7, 64);
  styleHeaderRow_(table, 0);

  const totals = body.appendTable([
    ['Total Number of Weeks', numberFormat_(page.totalWeeks), 'Total Number of CUs', numberFormat_(page.totalCUs)]
  ]);
  styleDocumentTable_(totals, [150, 90, 150, 90], 8, 18);

  appendSignatureTable_(body);
}

function appendLowerLevelCollegeFormPage_(body, profile, rule, page, pageNumber, pageCount) {
  appendPacketHeader_(
    body,
    'Contact Unit Approval Form - Lower-Level College Coursework',
    profile,
    pageNumber,
    pageCount
  );

  const categoryTable = body.appendTable([
    ['College coursework category as stated in the PGS Reference Guide', rule.activityName]
  ]);
  styleDocumentTable_(categoryTable, [280, 260], 7.5, 22);

  const rows = [['UNIVERSITY', 'COURSE NUMBER AND NAME', 'CREDITS', 'JUSTIFICATION']];

  page.rows.forEach(function(row) {
    rows.push([
      truncateForForm_(row.university, 40),
      truncateForForm_(row.course, 48),
      numberFormat_(row.credits) + ' ' + row.creditType,
      truncateForForm_(row.justification, 105)
    ]);
  });

  while (rows.length < FORM_CAPACITIES.lower_level_college + 1) {
    rows.push(['', '', '', '']);
  }

  const table = body.appendTable(rows);
  styleDocumentTable_(table, [130, 150, 105, 155], 7, 64);
  styleHeaderRow_(table, 0);

  const totals = body.appendTable([
    ['Total Number of Credits', numberFormat_(page.totalCredits), 'Total Number of CUs', numberFormat_(page.totalCUs)]
  ]);
  styleDocumentTable_(totals, [150, 90, 150, 90], 8, 18);

  appendSignatureTable_(body);
}

function appendSignatureTable_(body) {
  const signatures = body.appendTable([
    ['Employee Signature', '', 'Date', ''],
    ['Administrator Signature', '', 'Date', '']
  ]);
  styleDocumentTable_(signatures, [150, 180, 105, 105], 7.5, 20);
}

function styleDocumentTable_(table, widths, fontSize, minimumHeight) {
  table.setBorderColor('#222222');
  table.setBorderWidth(0.75);

  widths.forEach(function(width, index) {
    try { table.setColumnWidth(index, width); } catch (error) {}
  });

  for (let rowIndex = 0; rowIndex < table.getNumRows(); rowIndex += 1) {
    const row = table.getRow(rowIndex);
    try { row.setMinimumHeight(minimumHeight); } catch (error) {}

    for (let cellIndex = 0; cellIndex < row.getNumCells(); cellIndex += 1) {
      const cell = row.getCell(cellIndex);
      cell.setVerticalAlignment(DocumentApp.VerticalAlignment.CENTER);

      for (let childIndex = 0; childIndex < cell.getNumChildren(); childIndex += 1) {
        const child = cell.getChild(childIndex);
        if (child.getType() === DocumentApp.ElementType.PARAGRAPH) {
          const paragraph = child.asParagraph();
          paragraph.setSpacingBefore(0);
          paragraph.setSpacingAfter(0);
          paragraph.setLineSpacing(1);
          paragraph.editAsText()
            .setFontFamily('Arial')
            .setFontSize(fontSize);
        }
      }
    }
  }
}

function styleHeaderRow_(table, rowIndex) {
  const row = table.getRow(rowIndex);

  for (let index = 0; index < row.getNumCells(); index += 1) {
    const cell = row.getCell(index);
    cell.setBackgroundColor('#d9e8f5');

    const paragraph = cell.getChild(0).asParagraph();
    paragraph.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    paragraph.editAsText().setBold(true).setForegroundColor('#17365d');
  }
}

function styleExampleRow_(table, rowIndex) {
  const row = table.getRow(rowIndex);

  for (let index = 0; index < row.getNumCells(); index += 1) {
    row.getCell(index).setBackgroundColor('#f3f5f7');
    row.getCell(index).getChild(0).asParagraph().editAsText()
      .setForegroundColor('#5c6673')
      .setItalic(true);
  }
}

function styleParagraph_(paragraph, fontSize, bold, color, alignment) {
  paragraph.setAlignment(alignment);
  paragraph.setSpacingBefore(0);
  paragraph.setSpacingAfter(3);
  paragraph.editAsText()
    .setFontFamily('Arial')
    .setFontSize(fontSize)
    .setBold(bold)
    .setForegroundColor(color);
}

function formatDisplayDate_(value) {
  const date = inputToDate_(value);
  return date instanceof Date && !isNaN(date.getTime())
    ? Utilities.formatDate(date, TIME_ZONE, 'M/d/yyyy')
    : cleanString_(value);
}

function formatDisplayTime_(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(cleanString_(value));
  if (!match) return cleanString_(value);

  let hour = Number(match[1]);
  const minute = match[2];
  const period = hour >= 12 ? 'PM' : 'AM';

  hour = hour % 12;
  if (hour === 0) hour = 12;

  return hour + ':' + minute + ' ' + period;
}

function truncateForForm_(value, maximumLength) {
  const text = cleanString_(value);
  return text.length <= maximumLength
    ? text
    : text.slice(0, maximumLength - 3) + '...';
}

function numberFormat_(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return roundToTwo_(number).toFixed(2);
}

function appendChangeLog_(spreadsheet, action, activityId, details) {
  spreadsheet.getSheetByName(SHEETS.CHANGE_LOG).appendRow([
    formatDateTime_(new Date()), safeText_(action), safeText_(activityId),
    safeText_(details), safeText_('Authorized workspace user')
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
