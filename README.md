# FamilyPD PGS Assistant

Public site: `https://pgs.familypd.org`

An unofficial, educator-created, open-source guidance project intended to make
CCSD Professional Growth System organization easier for licensed educators.

## Current build

### Public GitHub Pages homepage

The root `index.html` is now the actual public project entrance. It includes:

- May 1, 2024 applicability notice
- Current annual deadline overview
- One-entry workflow explanation
- Major PGS activity families
- Official source links
- FamilyPD video roadmap
- Private-assistant connection status

### Private Google Workspace assistant

The `apps-script/` folder contains the teacher-facing private application with:

- Guided category matching
- Complete current activity library
- Teacher-owned Google Sheet
- Google Drive evidence workspace
- Category-specific evidence guidance
- CU estimates and category maximums
- ELMS-readiness review
- Automated rule tests

## Connect the two sites

See `CONNECT_ASSISTANT.md`.

The public site reads the Apps Script URL from:

```text
assets/js/site-config.js
```

Until that URL is added, the public buttons show that private setup is still in
progress.

## Applicability

The assistant and associated tools apply only to activities occurring on or
after May 1, 2024. Older activities require historical-rule review.

## Important disclaimer

This project does not replace official CCSD or CCEA guidance, ELMS, the PGS
Reference Guide, Human Resources direction, or final PGS approval.


## Milestone 2.5 - Automatic session hours

Hour-based activities now use a session log instead of asking teachers to
calculate decimal hours.

Each session records:

- Date
- Start time
- End time
- Break minutes
- Payment status
- Automatically calculated net hours

The app totals all sessions, derives the activity start/end dates, supports
mixed paid and unpaid sessions, and recalculates the result again on the server
before saving. Count-, credit-, fixed-value, and manual-review activities keep
their category-specific inputs.
