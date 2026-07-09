# Master Activity Data Model

The `Activity Log` is the single source of truth. Teachers use the assistant
form; they do not manually maintain a second tracker.

| Field | Purpose |
|---|---|
| ID | Stable unique identifier used by the app and Drive folders |
| Activity Title | Human-readable name |
| Description | Professional work completed |
| Start / End Date | Activity period |
| Organization / Site | School, district, conference, provider, or organization |
| Role | Participant, facilitator, advisor, mentor, presenter, etc. |
| Category | Current likely PGS category |
| Payment Status | Unpaid, stipend/supplemental, or contractual |
| Qualifying Hours | Hours used by the calculation rule |
| Title I Exception | Whether the relevant exception is being claimed |
| Estimated CUs | Server-calculated estimate |
| Status | Evidence and submission workflow status |
| Official Approved CUs | Entered only after official approval |
| Evidence Link | Primary Drive folder or evidence URL |
| Activity Folder ID / URL | Drive automation references |
| Notes | Private corrections and follow-up |
| Rule Version | Exact rule version used for the estimate |
| Created / Updated | Audit timestamps |

## Why this prevents duplicate entry

The same record will eventually support:

- Dashboard totals
- Category maximums
- Evidence checklists
- Google Drive folder creation
- Official-form preparation
- ELMS-ready descriptions
- Submission tracking
- Official approval tracking
- Reports and exports

The Google Sheet is the backend database and optional administrative console.
The assistant is the normal teacher-facing interface.
