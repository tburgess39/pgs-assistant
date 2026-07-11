# Test Checklist

## Automated tests

Run `runAllPGSTests()` from Apps Script.

Expected: **All 16 PGS tests passed.**

## Dashboard

- Add an unpaid coaching record estimated at 1 CU.
- Confirm Projected CUs increases by 1.
- Confirm Confirmed CUs does not increase until an approved amount is entered.
- Confirm Projected Remaining to 225 decreases by 1.
- Confirm the coaching category shows Maximum 50 and Remaining 49.
- Record an approved value for the same activity and confirm it replaces—not adds to—the estimate.
- Confirm Categories Currently Tracked counts unique categories, not individual rows.

## Add and edit a CU record

- Enter a title, short description, organization, role, and dates.
- Confirm role uses a dropdown.
- Confirm time and date fields use selectors.
- Add paid and unpaid time rows without choosing payment on every session row.
- Save, reopen with Edit, change a session, and save again.
- Confirm the original record updates rather than duplicating.
- Start typing and navigate away; confirm the unsaved-change warning appears.

## Evidence

- Save the approval-form profile.
- Generate each official form type.
- Confirm Time-Based paid and unpaid sessions appear on separate official pages.
- Confirm additional pages are created after 20 Time-Based rows or 5 University/College rows.
- Regenerate after adding a time row and confirm the current form is replaced.
- Delete the generated form using the typed confirmation.
- Build one final PDF with at least two source files, reorder them, and save it.
- Confirm Copy Final PDF Link copies the individual PDF URL—not a folder URL.

## Workspace

- Open the workbook and managed folders from the Workspace page.
- Run the health check.
- Move a generated file to Google Trash and rerun the health check; confirm the stale connection disappears.
- Rebuild folders for a record with a missing folder.
- Move a test Drive file through the app into the correct Working Evidence folder.
- Test Create New Workbook with copied records.
- Verify destructive actions require the exact typed phrases.

## Guidance and navigation

- Confirm Understanding PGS appears in navigation.
- Confirm Assistant Documentation contains video placeholders.
- Confirm PGS Resources appears in navigation.
- Search/select LinkedIn Learning and confirm the CTE-only dated notice appears.
- Confirm the app repeatedly states that it does not connect to ELMS.
