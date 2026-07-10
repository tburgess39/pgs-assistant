# PGS CU Assistant

An open-source teacher workflow assistant for organizing CCSD Professional Growth System activities, estimating Contact Units, preparing evidence, generating required documentation, and getting ready for ELMS submission.

> **Unofficial resource:** CCSD and the Professional Growth System Department make all final eligibility, documentation, and CU approval decisions.

## Core design rule

Each professional activity is entered once. That activity record is the single source of truth used to:

- estimate CUs;
- track category maximums and balances;
- organize Google Drive evidence;
- populate required approval forms;
- build documentation packets;
- prepare the teacher for official ELMS entry.

Teachers should not have to enter the same activity separately in both the dashboard and a tracker spreadsheet. The spreadsheet functions as the behind-the-scenes database and administrative console.

## Public site

The production custom domain is intended to open the working dashboard directly:

`pgs.familypd.org`

## Google Apps Script project files

A complete deployment normally includes:

- `Code.gs`
- `Index.html`
- `Tests.gs`
- `appsscript.json` when manifest settings are maintained in source control

The recovered `Tests.gs` in this package is the latest preserved file. The missing final `Code.gs` and `Index.html` must be restored from the existing Apps Script project or rebuilt against the recovered tests.

## Latest approval-form requirements

Generated approval forms must match the official documents rather than using a redesigned substitute.

- Time-Based Activities: 20 detail rows per page
- University Student Assignment: 5 detail rows per page
- Lower-Level College Coursework: 5 detail rows per page
- Overflow records create additional official-form pages
- Session descriptions remain attached to their correct rows
- Records in signed packets are locked against duplicate reuse

See `LATEST_FIX_REQUIREMENTS.md` for the recovered acceptance criteria.

## Validation

In Apps Script, run:

```javascript
runAllPGSTests();
```

Do not deploy when any test fails. Also perform a visual comparison of every generated approval form against its official source PDF.

## GitHub workflow

1. Export or copy the current Apps Script project files into the repository.
2. Replace only the files that were actually changed.
3. Run the Apps Script test suite.
4. Commit with a message describing the form-generation fix.
5. Deploy a new Apps Script web-app version if server/client code changed.
6. Confirm the GitHub Pages/custom-domain entry still routes teachers directly to the working dashboard.

Suggested commit message:

```text
Fix generated CU approval forms to match official layouts
```
