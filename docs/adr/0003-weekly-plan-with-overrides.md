# Weekly Plan with Overrides

**Status**: Accepted (Supersedes ADR-0001)

Instead of a pure calendar-based schedule where every event is a standalone record, we will use a **Weekly Plan** combined with date-specific **Overrides**.

A Weekly Plan defines the standard recurring rhythm of the school week. It implicitly applies to all upcoming weeks indefinitely. When a long-term change is needed, the Admin updates the Weekly Plan. When a one-off change is needed (e.g., a teacher is sick, or a public holiday occurs), the system creates an `Override` for that specific date. 

This gives Admins the ease of data entry (they don't have to copy weeks manually) while still allowing the flexibility of a calendar-based system for one-off exceptions. We will also support copying Weekly Plans to handle drastic trimester changes.
