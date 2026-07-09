# FamilyPD PGS CU Assistant - Milestone 3.0

This rebuild simplifies the teacher workflow.

## Major changes

- Nine alphabetized starting choices in Find My Category.
- All 43 current categories remain covered.
- Category-specific calculation is separated from activity details.
- Evidence instructions are reduced to:
  - what to upload,
  - one important category note,
  - the final single-file reminder.
- IEP activities ask for the number of qualifying IEPs/cases and clearly
  remind teachers to redact parent/student information and signatures.
- Grants ask for the number of grants actually received, not grant-writing
  hours.
- Reusable category folders replace a separate folder for every event.
- The final evidence file link is stored separately from the category folder.
- Self-reported and automatically entered ELMS CUs are tracked separately.
- Dashboard totals show:
  - estimated self-reported CUs,
  - approved self-reported CUs,
  - automatic ELMS CUs,
  - total confirmed,
  - remaining to 225.

## Google Drive boundary

All form entries are stored in a teacher-owned Google Sheet created in the
signed-in user's Google Drive.

The application creates category folders, but it does not automatically upload
certificates, IEP signature pages, award notices, agendas, or other evidence.
Teachers upload those files themselves. ELMS requires the link to the final
combined evidence file, not the folder link.


## Milestone 3.0.1 hotfix

Category folder names now preserve readable spaces. For example:

- `Grant Awards`
- `PLC Time`
- `IEPs and MDTs Written`

The previous sanitizer converted spaces into hyphens, which caused the folder-name
test to fail even though the calculation and evidence tests passed.


## Milestone 3.1 - Contextual Help and Workbook Guardrails

- Added keyboard-accessible help icons for unfamiliar form terms.
- Quantity and unit help changes with the selected category.
- Explained the limited Title I paid exception in plain language.
- Fixed the CSS issue that displayed fields before they were needed.
- Added a START HERE worksheet.
- Hid internal Category Rules, Settings, and Change Log tabs.
- Hid technical Activity Log columns such as IDs, JSON, rule version, and record type.
- Added warning-only protections to discourage manual edits without preventing
  the Apps Script web app from maintaining the teacher-owned workbook.
- Added header notes explaining that records should be changed through the web app.

The workbook remains owned by the teacher. These controls prevent accidental
changes; the owner can still override warnings or unhide sheets, so the web app
continues to be the recommended editing interface.
