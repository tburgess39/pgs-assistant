# PGS Assistant — Files for the Latest Approval-Form Fix

## Add as new Google Apps Script files

- `ApprovalFormConfig.gs`
- `ApprovalPacketHelpers.gs`

## Replace the existing Google Apps Script test file

- `Tests.gs`

## Update in the GitHub repository

- `README.md`
- `APPROVAL_FORM_FIX.md`

## Important recovery status

The original attachments generated in the failed dashboard chat were not retained in the accessible project files. This package uses the latest preserved `Tests.gs` as the contract for the recovered helper scripts.

The missing final production versions of `Code.gs` and `Index.html` are **not** included. Do not replace either file with one of these helper scripts. Add the two new `.gs` files beside the existing project files, then merge the corresponding packet-generation calls into the current production code.

## Required behavior confirmed by the preserved tests

- Time-Based Activities form capacity: 20 rows per page
- University Student Assignment form capacity: 5 rows per page
- Lower-Level College Coursework form capacity: 5 rows per page
- Overflow creates additional official-form pages
- Session descriptions remain attached to their rows
- Signed packet records are excluded from later packets
- Categories map to the correct official approval-form family
