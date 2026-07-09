# PGS CU Assistant

An unofficial, educator-created prototype designed to help teachers identify,
document, estimate, organize, and prepare Professional Growth System (PGS)
contact unit information.

## Current milestone

This version is a static GitHub Pages website.

It currently:

- Displays the assistant dashboard
- Saves activity records in the current browser
- Estimates CUs using temporary prototype rules
- Tracks category balances
- Separates estimated progress from officially approved progress
- Allows records to be edited or deleted
- Provides evidence, folder, ELMS-preparation, and video guidance sections

## Important limitation

Browser storage is temporary. It does not synchronize between devices or users.

The next major milestone is to replace browser-only storage with a teacher-owned
Google Sheet accessed through a Google Apps Script web application. Teachers
should continue entering each activity only once through the assistant.

## Project structure

```text
PGS-CU-Assistant/
├── index.html
├── .nojekyll
├── README.md
├── PROJECT_PLAN.md
└── assets/
    ├── css/
    │   └── styles.css
    ├── data/
    │   └── pgs-rules.js
    └── js/
        └── app.js
```

## Publish with GitHub Pages

1. Upload the files and folders to the repository.
2. Open **Settings**.
3. Select **Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and `/(root)`.
6. Save.

## Data and privacy

Do not commit teacher records, student information, passwords, API keys,
private Google Drive links, or other sensitive information to this public
repository.

## Official-status disclaimer

This project does not replace official CCSD guidance, ELMS, or district approval.
All category rules and calculations must be verified before production use.

## License

A code and content license still needs to be selected before the project is
formally released as open source.
