# PGS Rule Library Audit

**Applicability:** Activities occurring on or after May 1, 2024  
**Base source:** 9/1/23 PGS Reference Guide  
**Supporting source:** Documentation Required for CU Submission in ELMS  
**Announcement overlay reviewed:** CCSD and CCEA PGS Announcements  
**Last verified against the official PGS webpage:** July 9, 2026

## Audit controls

- 43 current activity options are loaded.
- 19 removed or absorbed historical category names remain archived but are not selectable.
- Every current option includes a parent category, exact activity name, calculation type,
  maximum, documentation, limitations, source page, approval timing, packet instructions,
  and last-verified date.
- Activities before May 1, 2024 are rejected by both browser and server validation.
- Category maximums are applied to the countable dashboard estimate so raw entries above
  a maximum do not inflate progress.
- Manual-review categories do not receive an unsafe automatic estimate.
- The evidence workflow distinguishes a Drive folder from the required final single-file
  ELMS submission link.

## Automated test file

Run `runAllPGSTests()` from `apps-script/Tests.gs` after installing the Apps Script files.
The test suite checks library count, unique keys, required metadata, cutoff enforcement,
and representative calculations.
