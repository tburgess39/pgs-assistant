# GitHub Update Instructions

## Recommended commit message

```text
Release consolidated PGS Assistant v4 workflow rebuild
```

## Replace application source

Commit the complete source set from this release rather than committing another patch layer:

- `Code.gs`
- `Rules.gs`
- `Summary.gs`
- `Workspace.gs`
- `PdfTemplates.gs`
- `PdfPackets.gs`
- `Tests.gs`
- `Index.html`
- `Styles.html`
- `Client.html`
- `PdfLib.html`
- `appsscript.json`

Remove obsolete patch files listed in `INSTALL_APPS_SCRIPT.md` from the repository.

## Commit documentation

- `README.md`
- `INSTALL_APPS_SCRIPT.md`
- `FILES_TO_UPLOAD.md`
- `CHANGELOG.md`
- `OFFICIAL_SOURCE_NOTES.md`
- `TEST_CHECKLIST.md`

## Do not expose teacher data

Do not commit:

- Workbook IDs
- Drive folder IDs
- Teacher names, sites, supervisors, or record data
- Generated evidence PDFs
- Shareable evidence links
- Apps Script deployment credentials or secrets

The embedded official blank templates contain no teacher data.
