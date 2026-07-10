# Fix: `FORM_CAPACITIES` Has Already Been Declared

Google Apps Script combines every `.gs` file in a project into one shared global scope.

The updated main script already declares:

```javascript
const FORM_CAPACITIES = Object.freeze({
  time_based: 20,
  university_assignment: 5,
  lower_level_college: 5
});
```

Therefore, `ApprovalFormConfig.gs` must not declare the same constant again.

## Correction

Replace the contents of `ApprovalFormConfig.gs` with the corrected file included in this package. Do not add a second `FORM_CAPACITIES` declaration anywhere else.

`ApprovalPacketHelpers.gs` does not need to be changed for this error.
