# PGS CU Assistant — Build Plan

## Product principle

Teachers enter each activity once.

The assistant is the teacher-facing interface. A spreadsheet may be used as the
backend database and administrative console, but teachers should not manually
maintain a duplicate tracker.

## Milestone 1 — Static GitHub prototype

- Split HTML, CSS, JavaScript, and rule data into separate files
- Publish through GitHub Pages
- Keep the dashboard usable on desktop and mobile
- Save temporary test records in browser storage
- Add edit and delete controls

## Milestone 2 — Complete data model

Each activity record should eventually include:

- Unique activity ID
- Teacher account
- Activity title and description
- Start and end dates
- Hours
- Payment and contract-time status
- Category and rule version
- Estimated CUs
- Evidence folder and document links
- Approval form requirements
- ELMS-ready description
- Submission status and date
- Officially approved CUs
- Reviewer notes
- Created and updated timestamps

## Milestone 3 — Google Sheets backend

- Create one teacher-owned workbook
- Use an Activity Log tab as the single source of truth
- Store rules on a separate protected tab
- Let the app read and write records automatically
- Keep manual spreadsheet editing optional

## Milestone 4 — Google Drive automation

- Create a main PGS folder
- Create one folder per activity
- Apply consistent file names
- Track missing evidence
- Preserve original documents

## Milestone 5 — Document preparation

- Generate activity summaries
- Populate permitted fields in official forms
- Track signatures and approval requirements
- Produce an ELMS-ready copy-and-paste packet

## Milestone 6 — Production safeguards

- Version every calculation rule
- Display source and last-verified date
- Separate estimates from official approvals
- Warn about duplicate or overlapping hours
- Add accessibility testing
- Add privacy and security review
- Add backups and export tools
