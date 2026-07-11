# Files to Upload

## Replace or create in Google Apps Script

| Apps Script file | Type | Purpose |
|---|---|---|
| `Code.gs` | Script | Record CRUD, editing, calculations, profile, and shared helpers |
| `Rules.gs` | Script | Current 43-category library and dated special announcements |
| `Summary.gs` | Script | Projected/confirmed totals and category progress |
| `Workspace.gs` | Script | Workbook, Drive folders, Trash checks, recovery, and safe file moves |
| `PdfTemplates.gs` | Script | Embedded exact official source PDFs |
| `PdfPackets.gs` | Script | Approval-form and final-PDF Drive storage actions |
| `Tests.gs` | Script | Consolidated automated tests |
| `Index.html` | HTML | Complete app interface |
| `Styles.html` | HTML | App styling |
| `Client.html` | HTML | Browser-side workflow and PDF generation |
| `PdfLib.html` | HTML | Local PDF processing library |
| `appsscript.json` | Manifest | Runtime and Drive/Sheets scopes |

## Do not upload as Apps Script source files

The PDFs in `official-templates/` are archival/reference copies. Their exact bytes are already embedded in `PdfTemplates.gs`.

## GitHub documentation

Commit these Markdown files:

- `README.md`
- `INSTALL_APPS_SCRIPT.md`
- `FILES_TO_UPLOAD.md`
- `CHANGELOG.md`
- `OFFICIAL_SOURCE_NOTES.md`
- `TEST_CHECKLIST.md`
- `GITHUB_UPDATE.md`
