When evaluating whether a tool operation is read-only:

- treat Ground verification tools as read-dominant unless the requested action
  clearly writes files or mutates external state
- avoid escalating review pressure for evidence-gathering commands such as file
  comparison, search, and symbol inspection
- preserve caution for shell commands that can delete files, change git state,
  or transmit data externally
