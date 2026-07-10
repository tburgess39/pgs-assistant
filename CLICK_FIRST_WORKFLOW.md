# PGS Assistant — Click-First Activity Workflow

## Final field behavior

| Field | Behavior |
|---|---|
| Activity name / title | Teacher-entered. Never automatically replaced with the official category name. |
| Short description | Reuses the description entered in the category matcher. If none was entered, it defaults to the official PGS activity/category name. |
| Organization | Teacher enters it once. Previous organizations appear as browser selections through a datalist. |
| Role | Optional dropdown; the selected category suggests a likely role. |
| Date and time | Continue using date/time selectors. |
| Session descriptions | Default to the saved activity short description. A teacher can edit only the session that needs different wording. |
| PDF/approval-form fields | Reuse activity title, short description, organization, role, and session date/time from the single activity record. |

## Files

### Add to Apps Script

1. `ActivityEntryHelpers.gs`
2. `ClickFirstWorkflowTests.gs` — optional test file

### Add to `Index.html`

Copy the contents of `ClickFirstActivityUX.html` near the end of `Index.html`, after the main application script and before `</body>`.

## Required `Code.gs` integration

### Normalize the activity once

Inside `normalizeActivityInput_`, after the base activity object has been created:

```javascript
const reusable = pgsReusableActivityContext_(normalized, rule);
normalized.title = reusable.title;
normalized.description = reusable.description;
normalized.organization = reusable.organization;
normalized.role = reusable.role;
```

Before calling `normalizeSessions_`, inherit the activity description:

```javascript
const sessionInput = pgsApplyActivityDefaultsToSessions_(
  normalized,
  input.sessions,
  rule
);
normalized.sessions = normalizeSessions_(sessionInput);
```

This keeps the existing rule that every generated time-based row must have a description, but the teacher does not have to type it repeatedly.

### Generate the approval form/PDF

Where the form generator currently inserts `rule.activityName` as the activity name, replace it with:

```javascript
const display = pgsApprovalFormDisplayValues_(activity, session, rule);
```

Use:

```javascript
display.activityName       // teacher-entered activity title
display.shortDescription   // session description or activity description
display.organization
display.role
display.date
display.startTime
display.endTime
```

The official category name remains available through `rule.activityName` for category identification, but it should not replace the teacher's activity title.

## Reusing values on later HTML screens

The UX patch automatically recognizes common PDF/packet field names. For any additional field, add one of these attributes:

```html
<input data-reuse="title">
<textarea data-reuse="description"></textarea>
<input data-reuse="organization">
<select data-reuse="role"></select>
```

The saved values will fill blank fields automatically.

## Test

Run:

```javascript
runClickFirstWorkflowTests()
```

Expected log:

```text
All click-first workflow tests passed.
```
