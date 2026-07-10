# PGS Dashboard Progress Fix — v3

This update fixes three connected dashboard issues:

1. Estimated self-reported CUs are displayed separately from confirmed/approved CUs.
2. **CU Progress by Category** is restored to the Dashboard; activity records remain on their own Activity Records screen.
3. Category **Remaining** uses the approved value when available and otherwise uses the current estimate.

## Files

- `DashboardSummaryHelpers.gs` — add as a new Apps Script file.
- `DashboardProgressUX.html` — paste after the main application script and before `</body>` in `Index.html`.
- `DashboardSummaryTests.gs` — add as a new Apps Script test file.

## Required one-line Code.gs change

In `getBootstrapData()`, locate the line/property that builds the summary. It may currently resemble:

```javascript
summary: buildSummary_(activities, rules)
```

Change it to:

```javascript
summary: buildDashboardSummary_(activities, rules)
```

Do not delete the older `buildSummary_` function yet. The new helper uses a different function name, so there is no duplicate global declaration.

## Dashboard totals

- **Estimated Self-Reported**: sum of the teacher's saved CU estimates.
- **Confirmed / Approved**: approved self-reported CUs + automatic ELMS CUs + carryover.
- **Projected Total**: automatic/carryover CUs + approved self-reported values; when an activity is not approved yet, its estimate is used.
- **Confirmed Remaining**: `225 - confirmed total`.

## Category Remaining rule

For every activity:

```text
approved CU value, when present
otherwise estimated CU value
```

The approved and estimated values are never added together for the same activity.

Example:

```text
Coaching category maximum: 50
Pending estimate:            1
Remaining:                  49
```

After an official value of 0.5 is entered:

```text
Coaching category maximum: 50
Official approved value:   0.5
Remaining:                49.5
```

## Test

Run:

```javascript
runDashboardSummaryTests()
```

Expected result:

```text
All dashboard summary tests passed.
```

Then reload the `/dev` test deployment. A new deployment is not required for `/dev`, but the browser may need a hard refresh.
