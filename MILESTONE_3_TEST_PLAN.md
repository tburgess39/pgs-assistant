# Milestone 3.0 Test Plan

1. Run `runAllPGSTests`.
2. Open the `/dev` test deployment.
3. Confirm the Find My Category starting list is alphabetized.
4. Test IEP Writer:
   - only a count is required on the calculation screen,
   - redaction reminder is visible,
   - no start/end-time session table appears.
5. Test Grant Recipient:
   - only number of grants received is required,
   - no hour fields appear.
6. Test PLC:
   - session dates/start/end times appear,
   - hours calculate automatically.
7. Save a self-reported record:
   - Sheet row is created,
   - category folder is created/reused,
   - evidence link remains blank unless a final file link was entered.
8. Save an automatic ELMS record:
   - no evidence folder is required,
   - official CUs appear in Automatic ELMS totals.
9. Confirm category progress separates estimated, approved, and automatic CUs.
10. Update the existing `/exec` deployment only after `/dev` passes.
