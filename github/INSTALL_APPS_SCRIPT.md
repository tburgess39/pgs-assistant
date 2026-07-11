# Install the Consolidated Apps Script Build

## 1. Back up the current project

Before replacing files, create an Apps Script project copy or download the current project as an archive.

## 2. Remove superseded patch files

This release consolidates prior fixes. Delete old patch/helper files that duplicate these functions or constants, including files with names such as:

- `ApprovalFormConfig.gs`
- `ApprovalPacketHelpers.gs`
- `SummaryBalanceHelpers.gs`
- `DashboardSummaryHelpers.gs`
- `DashboardSummaryTests.gs`
- `ActivityEntryHelpers.gs`
- `ClickFirstWorkflowTests.gs`
- `DashboardProgressUX.html`
- `ClickFirstActivityUX.html`

Keep only the files listed in `FILES_TO_UPLOAD.md` plus any unrelated project files you intentionally maintain. Google Apps Script combines all `.gs` files into one global scope; leaving old patches can cause duplicate-identifier or duplicate-function behavior.

## 3. Replace server files

Create or replace these exact script files:

1. `Code.gs`
2. `Rules.gs`
3. `Summary.gs`
4. `Workspace.gs`
5. `PdfTemplates.gs`
6. `PdfPackets.gs`
7. `Tests.gs`

Paste the complete contents of each matching file from this release.

## 4. Replace HTML files

Create or replace:

1. `Index.html`
2. `Styles.html`
3. `Client.html`
4. `PdfLib.html`

`PdfLib.html` contains the local PDF library used in the browser. Do not replace it with an external CDN reference.

## 5. Replace the manifest

In Apps Script Project Settings, enable **Show "appsscript.json" manifest file in editor**, then replace its contents with this release's `appsscript.json`.

## 6. Save and authorize

Save all files. Run:

```javascript
runAllPGSTests()
```

The first run may request Google Sheets and Google Drive authorization.

Expected log:

```text
All 16 PGS tests passed.
```

## 7. Test the development URL

Open the test deployment (`/dev`) while signed in as a project editor. Hard-refresh the page after saving.

Complete the manual tests in `TEST_CHECKLIST.md` before creating a new production deployment version.

## 8. Update the deployed web app

After `/dev` passes:

1. Open **Deploy > Manage deployments**.
2. Edit the existing web-app deployment.
3. Select a new version containing this release.
4. Keep the intended execution/access settings for your CCSD use case.
5. Deploy and test the `/exec` URL separately.

The custom domain should continue pointing to the working dashboard URL after the deployment is updated.
