# Milestone 4.1.3 - Workbook Connection Hotfix

The activity row was written successfully. The server then reopened the
tracker to rebuild the dashboard. The previous workbook-opening function
treated any workbook setup/refresh error as though the saved spreadsheet no
longer existed. It could clear the saved spreadsheet ID and silently create a
second blank tracker. Verification then searched the blank tracker.

Fixes:
- All server actions refresh from the exact workbook object they updated.
- Workbook migration errors no longer clear a valid workbook connection.
- A second blank tracker is not silently created after a setup error.
- Workbook setup runs once per schema version instead of every request.
- Added inspectPGSWorkbookCandidates() for duplicate tracker diagnostics.
- Added repairPGSWorkbookConnection() to reconnect to the candidate with the
  most saved activity rows, then the most recently updated file.

Replace:
- Code.gs
- Tests.gs
