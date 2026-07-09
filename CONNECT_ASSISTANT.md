# Connect the Public Website to the Private Assistant

The public GitHub Pages homepage is already prepared for the private Google Apps
Script deployment.

After the Apps Script web app is deployed:

1. Copy its versioned `/exec` URL.
2. Open `assets/js/site-config.js`.
3. Paste the URL between the quotation marks:

```javascript
window.PGS_SITE_CONFIG = {
  assistantUrl: "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
};
```

4. Commit the change to `main`.

The public website will automatically change:

- `Assistant setup in progress`
- `Private workspace coming next`

to:

- `Open My PGS Assistant`

The URL validator accepts secure Google Apps Script addresses only.
Do not place teacher data, Google Sheet URLs, Drive links, credentials, or tokens
in this public configuration file.
