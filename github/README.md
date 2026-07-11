# FamilyPD PGS Assistant

A teacher-owned Google Apps Script workspace for organizing Clark County School District Professional Growth System (PGS) Contact Unit records, estimating progress, preparing evidence, and generating working copies of the official CU approval forms.

## What this release does

- Shows **Projected CUs**, **Confirmed CUs**, and both remaining totals toward 225 CUs.
- Calculates category balances using the approved amount when available; otherwise it uses the pending estimate.
- Shows **Categories Currently Tracked** and **CU Progress by Category** on the dashboard.
- Keeps CU records editable after saving.
- Reuses the activity title, short description, organization, role, dates, and times throughout the workflow. The short description is limited to 50 characters to match the official Time-Based form field.
- Separates paid and unpaid session rows into separate official Time-Based form pages.
- Generates completed copies from the original official CCSD/CCEA PDF templates rather than recreating the forms as Google Docs.
- Builds one final evidence PDF from selected PDFs and images.
- Manages the workbook and Drive folder structure, detects trashed items, and provides guarded rebuild/delete actions.
- Includes Understanding PGS, dated official-update notes, help-video placeholders, and official-resource navigation.
- States clearly that the assistant does **not** connect to ELMS.

## Important boundary

This assistant provides organization, calculations, and preparation support. It does not determine final eligibility, approve CUs, submit to ELMS, or manage Nevada educator licensure renewal.

## Project files

### Google Apps Script server files

- `Code.gs`
- `Rules.gs`
- `Summary.gs`
- `Workspace.gs`
- `PdfTemplates.gs`
- `PdfPackets.gs`
- `Tests.gs`

### Google Apps Script HTML files

- `Index.html`
- `Styles.html`
- `Client.html`
- `PdfLib.html`

### Manifest

- `appsscript.json`

### Reference copies

The `official-templates` folder contains the three official source PDFs embedded in `PdfTemplates.gs`:

- CU Approval Form - Time Based Activities
- CU Approval Form - University Student Assignment
- CU Approval Form - Lower-Level College Coursework

## Installation

Follow [INSTALL_APPS_SCRIPT.md](INSTALL_APPS_SCRIPT.md). This is a consolidated replacement release, not another patch. Remove the superseded helper/patch files before testing so duplicate global functions and constants do not remain in the Apps Script project.

## Tests

Run:

```javascript
runAllPGSTests()
```

Expected result:

```text
All 16 PGS tests passed.
```

See [TEST_CHECKLIST.md](TEST_CHECKLIST.md) for the manual `/dev` workflow test.

## Official-source basis

Rules and reminders are based on the official files listed in [OFFICIAL_SOURCE_NOTES.md](OFFICIAL_SOURCE_NOTES.md). Official CCSD/CCEA guidance controls whenever it differs from an estimate or explanation in the assistant.
