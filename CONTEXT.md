# Onboarding School Platform

A platform to manage schedules and modules for students, teachers, and admins at the onboarding school.

## Language

**Group**:
One of the segments of students in the onboarding school (up to 5 total).
_Avoid_: Cohort, track, class

**Activity**:
A scheduled event, lesson, or session within the school day.
_Avoid_: Lesson, class, session, event, slot

**Activity Type**:
A mandatory category assigned to an Activity (e.g., Lesson, Workshop, Break) used for visual color-coding and classification.
_Avoid_: Category, label, tag

**Schedule Horizon**:
A global configuration defining the number of weeks into the future that a student is permitted to view on their calendar.
_Avoid_: Visibility window, lookahead, future weeks

**Student**:
A learner enrolled in the onboarding school who consumes the schedule.
_Avoid_: User, learner, pupil

**Teacher**:
An instructor who leads Activities.
_Avoid_: Instructor, tutor

**Admin**:
A staff member who creates and edits the schedule.
_Avoid_: Manager, coordinator

**Unverified**:
The default state of a new user account after their first OAuth login, before an Admin grants them access.
_Avoid_: Pending, unapproved

**Waiting Room**:
The isolated landing page that Unverified users see after logging in via OAuth, pending Admin approval.
_Avoid_: Pending page, lobby

**Weekly Plan**:
The master template that defines the standard recurring rhythm of the school week. It rolls forward indefinitely until superseded. A Weekly Plan is either **Active** (currently in effect) or a **Draft** (inactive, under editing/preparation).
_Avoid_: Default schedule, master template

**Override**:
A specific alteration (modification, cancellation, or addition) to the Weekly Plan that applies only to a specific calendar date.
_Avoid_: Exception, one-off change
