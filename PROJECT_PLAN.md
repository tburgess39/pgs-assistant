# PGS CU Assistant - Build Plan

## Completed

### Milestone 1
Static GitHub dashboard and browser-storage prototype.

### Milestone 2
Teacher-owned Google Sheet, Drive folders, Activity Log, rules, settings, and
change tracking.

### Milestone 2.1
Complete current category library and guided activity matcher.

## Category architecture

1. **Current activity library**
   Exact current activity choices from the 9/1/23 PGS Reference Guide.

2. **Announcement overlays**
   Date-, provider-, role-, or department-specific changes that modify
   eligibility or submission workflow.

3. **Historical archive**
   Categories removed or absorbed into other categories. These remain
   documented but are not shown as current choices.

4. **Human confirmation**
   The matcher recommends; the teacher confirms. Ambiguous activities display
   multiple options and the differences between them.

## Next milestone

- Verify each library row against the official documents line by line
- Add more conditional questions for ambiguous pairs
- Add rule tests for every calculation type
- Generate the category-specific evidence checklist
- Generate an ELMS-ready description from the saved Activity Log record


## Applicability safeguard

- Persistent May 1, 2024 notice on public and private interfaces
- Required activity start date
- Minimum date enforced in HTML inputs
- Client-side rejection of earlier dates
- Server-side rejection of earlier dates
- Clear direction that older activities require historical-rule review
