# Separate Weekly Plan Editor

**Status**: Accepted

To prevent accidental edits to the school's schedule templates and to maximize screen estate for scheduling layout design, we will separate the editing interface of Weekly Plans from the main Admin Dashboard.

## Context

Previously, the Weekly Plan editor was integrated directly into the main `/admin` dashboard alongside user verification. This presented two problems:
1. **Accidental Edits**: Admins could accidentally click or delete activities while browsing or performing other administrative tasks.
2. **Screen Estate Constraints**: Sharing the screen width with the user verification sidebar squeezed the calendar grid, making it difficult to read and manage complex, overlapping schedules.

## Decision

We will split the interface as follows:
1. **Main Admin Dashboard (`/admin`)**:
   - Serve as a read-only viewer for the active Weekly Plan.
   - Serve as the central management hub for all Weekly Plans (creating, deleting, renaming, duplicating, and toggling active status).
   - Display pending user verification requests.
2. **Dedicated Weekly Plan Editor (`/admin/weekly-plans/[id]`)**:
   - Provide a full-width calendar grid layout with editing capabilities (adding/deleting activities) for the specific plan.
   - Include actions to rename, delete, duplicate, or mark the plan as active.

## Consequences

- **Safety**: Separating the editing view reduces the risk of accidental schedule modifications.
- **Usability**: The full-screen layout provides more horizontal and vertical space for displaying overlapping activities.
- **Plan Lifecycle**: By introducing duplicating/cloning, admins can easily draft future weekly schedules (e.g., for upcoming trimesters) by copying an existing plan.
