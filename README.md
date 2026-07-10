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


## Milestone 3.2 - Carryover / Rollover

The ELMS tracking workflow now includes a special `Carryover / Rollover` option.

Carryover:

- is entered as an automatic ELMS tracking record,
- is separate from the 43 current activity categories,
- does not create an evidence folder,
- does not use a category maximum,
- is displayed separately from automatic activity CUs,
- counts toward total confirmed CUs and the remaining amount toward 225.


## Milestone 4.0 - Approval-form packets and Assistant Documentation

The Evidence and ELMS page can now generate assistant-prepared draft packets for:

- Contact Unit Approval Form - Time Based
- Contact Unit Approval Form - University Student Assignment
- Contact Unit Approval Form - Lower-Level College Coursework

The generator groups eligible entries from the same category, separates incompatible
payment/CU-rate groups, enforces the official row capacity, creates additional pages,
and saves both a Google Doc and PDF in the category's `01 Evidence to Combine` folder.

Row capacities:

- Time-Based Activities: 20 activity rows per page
- University Student Assignment: 5 assignment rows per page
- Lower-Level College Coursework: 5 course rows per page

Packet records are stored in the hidden `Generated Packets` sheet. Packets marked
Signed or Included in final ELMS file lock their included entry keys so later packets
do not duplicate them.

The new Assistant Documentation page explains the workflow, unofficial status,
privacy boundaries, generated drafts, Drive folders, and ELMS preparation.


## Milestone 4.1 - Simplified folders and connection guardrails

The assistant no longer creates or uses:

- `03 ELMS Receipt and Decision` inside category folders
- `03 Advancement Receipts and Decisions` at the root level

Each category now contains only:

- `01 Evidence to Combine`
- `02 Final Single File for ELMS`

Existing receipt/decision folders are not deleted automatically because they may
contain user files. The assistant marks their Drive description as legacy/optional.

Connection warnings now appear:

- on the My Google Workspace page,
- on the Assistant Documentation page,
- in the START HERE Sheet,
- in Activity Log header notes,
- in managed Drive folder descriptions.

The warning explains that Sheet tab/header/technical-field changes can break the
assistant, while deleting/moving managed folders can break links and renaming
numbered subfolders can cause duplicates or misfiled generated documents.
