# Milestone 3.2 Test Plan

1. Run `runAllPGSTests`.
2. Open `/dev` and choose **Add CUs Already in ELMS**.
3. Confirm the category dropdown includes:
   **Carryover / Rollover from a Prior Approved Round**.
4. Select carryover and confirm:
   - no calculation fields appear,
   - no evidence folder is requested,
   - the title and description are prefilled,
   - the form asks for the date shown in ELMS,
   - the user enters the official CU amount from ELMS.
5. Save a carryover record.
6. Confirm:
   - Carryover / Rollover has its own dashboard card,
   - it appears as a separate row in CU Progress,
   - it increases Total Confirmed,
   - it reduces Remaining to 225,
   - it is not added to an activity-category maximum.
7. Confirm ordinary automatic ELMS activity CUs remain in their separate total.
