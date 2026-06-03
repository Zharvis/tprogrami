# Calendar-based Scheduling

**Status:** Superseded by ADR-0003
We will store the schedule as specific calendar events (tied to dates) rather than weekly recurring templates.

While the onboarding school generally follows a weekly pattern, the schedule sees drastic changes between trimesters and occasional incremental changes every few weeks. A template-based system (like RRULEs or weekly master templates) would be too rigid and make it difficult to accommodate these localized changes without breaking the pattern. To make data entry easier for admins, the system will support duplicating or importing weeks, but the underlying data model will remain strictly calendar-based.
