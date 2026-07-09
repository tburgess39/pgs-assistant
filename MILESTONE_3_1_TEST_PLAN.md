# Milestone 3.1 Test Plan

1. Run `runAllPGSTests`; all tests should pass.
2. Open the `/dev` deployment and hard-refresh.
3. Before choosing a category, confirm Quantity, Unit, Payment Status, and Title I fields are hidden.
4. Select IEP Writer:
   - Quantity label becomes IEPs/MDTs written.
   - Hover/focus help explains that hours are not entered.
   - Payment and Title I fields stay hidden.
5. Select PLC:
   - Session time fields appear.
   - Title I field appears only because the official rule allows that exception.
   - Hover/focus help explains the exception.
6. Open the tracker Sheet:
   - START HERE is the first visible tab.
   - Activity Log is visible.
   - Category Rules, Settings, and Change Log are hidden.
   - Technical Activity Log columns are hidden.
7. Attempt to edit the Activity Log manually and confirm Google displays a warning.
8. Save a record through the web app and confirm it still writes successfully.
