# Milestone 4.0 Test Plan

## Setup

1. Replace the six Apps Script source files and `appsscript.json`.
2. Save the project.
3. Run `runAllPGSTests`.
4. Reauthorize the script when Google requests the new Google Docs permission.
5. Open `/dev`.

## Profile

1. Open My Google Workspace.
2. Enter full name, school/site, supervisor, contract times, and advancement cycle.
3. Save and reload.
4. Confirm the values remain.

## Time-Based Packet

1. Create a PLC record with at least two sessions.
2. Give every session a brief description.
3. Open Evidence and ELMS and select the PLC record.
4. Generate a draft packet.
5. Confirm:
   - the Google Doc and PDF links appear,
   - the files are in `PLC Time/01 Evidence to Combine`,
   - sessions are sorted,
   - payment groups are separated,
   - totals are shown,
   - no page contains more than 20 activity records.

## Multipage Check

Create 21 test sessions in one category. Confirm the generated packet has two pages:
20 records on page 1 and 1 record on page 2.

## Packet Status

1. Mark a packet Signed.
2. Add a new session.
3. Generate another packet.
4. Confirm the signed packet is not overwritten and its existing session keys are not repeated.

## Other Forms

Test a lower-level college coursework record and a practicum/student-teacher record.
Confirm no page contains more than five rows.

## Documentation

Open Assistant Documentation and verify the unofficial-guide notice, privacy note,
Drive explanation, generated-form guidance, and ELMS checklist are visible.
