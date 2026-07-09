# Deploy the Private Google Workspace Assistant

The GitHub Pages site remains the public demo and documentation site.

The files in `apps-script/` create the private working assistant. It is deployed
as a Google Apps Script web app so it can use the authorized teacher's own
Google Sheet and Google Drive without requiring the teacher to maintain a second
tracker.

## Critical deployment setting

Deploy the web app so it **executes as the user accessing the web app**.

That is what allows each authorized teacher to create and use a teacher-owned
workbook and Drive folders rather than placing everyone's records in the
developer's account.

District Google Workspace policy may limit which deployment or access choices
are available. Test the deployment using a district account before distributing
it.

## Create the Apps Script project

1. Open Google Drive with the account that will own the source project.
2. Create a new **Google Apps Script** project.
3. Name it `PGS CU Assistant`.
4. Replace the default `Code.gs` content with `apps-script/Code.gs`, then add a second script file named `CategoryData.gs` and paste `apps-script/CategoryData.gs` into it.
5. Create three HTML files named:
   - `Index`
   - `Styles`
   - `Client`
6. Paste the matching file contents into each.
7. Open **Project Settings** and enable the option to show the
   `appsscript.json` manifest.
8. Replace the manifest with `apps-script/appsscript.json`.
9. Save all files.

## Test before deploying

1. Select **Deploy → Test deployments**.
2. Choose **Web app**.
3. Open the test URL.
4. Authorize the requested Google Sheets and Drive permissions.
5. Confirm that the application creates:
   - `PGS CU Assistant Data`
   - `PGS Column Advancement`

The test `/dev` URL is for project editors and always runs the latest saved
code. It is not the URL to distribute to teachers.

## Create the versioned deployment

1. Select **Deploy → New deployment**.
2. Choose **Web app**.
3. Use a description such as `Milestone 2 private workspace`.
4. Select **Execute as: User accessing the web app**.
5. Choose the narrowest access option that works for the intended district
   users.
6. Deploy and copy the `/exec` URL.
7. Test the `/exec` URL with a separate authorized district account.

## What the first opening creates

The web app automatically creates a teacher-owned spreadsheet with:

- Activity Log
- Category Rules
- Settings
- Change Log

The Drive setup button creates:

- 01 Approved CU Records
- 02 Submitted - Awaiting Review
- 03 Ready for ELMS
- 04 Needs Documentation
- 05 Certificates and Transcripts
- 06 Activity Evidence

## Important project boundary

The Category Rules sheet currently contains prototype seed values from the
original dashboard. They are deliberately labeled for verification. Do not
present calculations as authoritative until every rule has been checked against
the current official PGS Reference Guide.


## Cutoff-date test

Before distributing the app, verify all three behaviors:

1. The persistent applicability notice is visible.
2. The date picker does not allow a date before May 1, 2024.
3. Manually forcing an older date still produces a server-side rejection.

The server-side validation is required because browser controls alone can be
bypassed.
