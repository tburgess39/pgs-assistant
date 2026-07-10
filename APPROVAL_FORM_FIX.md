# PGS Assistant — Latest Approval-Form Fix Recovery Notes

## What was recovered

The final test contract from the failed chat was preserved. It confirms the production build was expected to:

- use the official approval-form family assigned to each PGS category;
- preserve the original form layout instead of generating a differently styled substitute;
- allow **20 rows** per Time-Based Activities page;
- allow **5 rows** per University Student Assignment page;
- allow **5 rows** per Lower-Level College Coursework page;
- create additional pages when a packet exceeds the official form capacity;
- preserve each session description when filling the Time-Based form;
- prevent records already included in a **Signed** packet from appearing in later packets;
- leave categories without an official approval form unassigned;
- retain all existing PGS Assistant calculations, category rules, workbook guardrails, and activity records.

## Recovered form mappings verified by tests

| Example category | Required form type |
|---|---|
| `PLC` | `time_based` |
| `PRACTICUM_ASSIGNMENT` | `university_assignment` |
| `COLLEGE_MULTI_100` | `lower_level_college` |
| `GRANT_RECIPIENT` | no approval form |

## Files expected in the missing final build

The final package from the other chat likely included updated versions of:

- `Code.gs` — server logic, activity library, workbook, Drive, packet generation, and official-form rendering;
- `Index.html` — complete Apps Script dashboard and packet controls;
- `Tests.gs` — recovered in this package;
- a GitHub Markdown update/readme file — not preserved in File Library;
- possibly `appsscript.json` or a GitHub Pages bridge file, depending on the deployment version.

## What is not safe to claim

The missing final `Code.gs`, final `Index.html`, and original GitHub `.md` could not be recovered from this chat, the active sandbox, File Library, the public domain, or indexed GitHub search. The files in this recovery package are therefore labeled clearly and should not be mistaken for the complete final production bundle.

## Integration checklist

1. Keep the official PDFs unchanged as visual references/templates.
2. Merge `ApprovalFormsPatch_RECOVERED.gs` into the current Apps Script server code.
3. Ensure every category rule has an `approvalFormType` value when an official form is required.
4. Use the capacities in `FORM_CAPACITIES` when creating form pages.
5. Copy each original PDF page faithfully, then place data only in the corresponding fields/coordinates.
6. Preserve `session.description` during normalization and packet rendering.
7. Exclude keys returned by `packetLockedKeys_()` from new packets.
8. Run `runAllPGSTests()` before deployment.
9. Compare generated PDFs side-by-side with the three official source forms before uploading changes.
