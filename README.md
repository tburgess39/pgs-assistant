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


## Milestone 2.6 - Official guided category finder

The Find My Category page no longer combines unrelated independent dropdowns.

The new path is:

1. Where the activity occurred or who provided/assigned it
2. The educator's role
3. Only the official activity descriptions valid for that setting and role
4. Activity date and optional confirming details

All 43 current activity category keys are covered by automated tests. Results
show the official category, description/limitations, calculation, documentation,
submission path, source document, and source page. Current announcement-only
workflows such as LinkedIn Learning for CTE teachers are shown without forcing
an inaccurate self-reported category.


## Milestone 2.7 - Evidence-driven activity inputs

The Add Activity form and Guided Finder now use the official documentation requirement to choose the input model. Categories requiring the Time-Based Activities form or session agendas use exact session start/end times. Categories supported by certificates or transcripts showing duration use documented total hours. Grants, IEPs, awards, assignments, micro-credentials, endorsements, college credits, CEUs, and fixed National Board values no longer display an inappropriate time log.

The evidence guide and finder result both explain how the selected category is measured and what the teacher should enter.
