# PGS CU Assistant

## Milestone 2.1 - Complete Category Matcher

This revision should be used instead of Milestone 2.

It adds:

- A guided **Find My Category** workflow
- A searchable directory containing **43 current activity options**
- Category-specific calculations, maximums, documentation, and limitations
- Plain-language matching by activity type, role, context, and description
- Best-match and alternative recommendations
- Special announcement alerts for LinkedIn Learning, Mental Health Academy,
  and identified self-designed transcript exclusions
- A historical archive of categories removed from the current guide
- Dynamic inputs for hours, credits, IEPs, students, weeks, awards, grants,
  micro-credentials, certifications, and endorsements
- The same single Activity Log backend from Milestone 2

## Important distinction

A **parent category** is not always the actual ELMS activity choice. The library
stores both:

- Parent category, such as `School & Community Activities`
- Exact activity option, such as `Schoolwide Planning`

The teacher confirms the exact activity option before saving.

## Accuracy boundary

The 9/1/23 Reference Guide remains the current base guide listed on the official
CCSD PGS page. Current PGS announcements can modify eligibility or workflow
without creating a new base category. The app therefore keeps announcements as
separate rule overlays.

The matcher is decision support. It does not guarantee CCSD approval.


## Applicability date

The assistant, category matcher, CU calculator, evidence guidance, Drive-folder
tools, and ELMS-preparation features apply only to activities occurring on or
after **May 1, 2024**.

The interface displays this notice persistently, the date fields use
`2024-05-01` as their minimum date, and both client-side and server-side
validation reject activities before the cutoff. Historical activities must be
reviewed under the rules that applied at the time they occurred.
