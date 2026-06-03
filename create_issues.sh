mkdir -p .scratch/issues

# Issue 1
cat << 'EOF' > .scratch/issues/1.md
## Parent
https://github.com/Zharvis/tprogrami/issues/1

## What to build
Set up Supabase, Prisma, and Next.js App Router. Implement Google OAuth login. Create the base User model in the database defaulting to an `Unverified` state. Build the safe "Waiting Room" page that Unverified users are locked into.

## Acceptance criteria
- [ ] Next.js app is configured with Prisma and Supabase.
- [ ] Users can authenticate via Google OAuth.
- [ ] New users are stored in the database with an `Unverified` status.
- [ ] Unverified users are forcefully redirected to a Waiting Room page and cannot access any other routes.

## Blocked by
None - can start immediately
EOF
ISSUE1_URL=$(gh issue create --title "Supabase Auth & Waiting Room Foundation" --body-file .scratch/issues/1.md --label "ready-for-agent")
ISSUE1_ID=$(basename $ISSUE1_URL)
echo "Created $ISSUE1_URL"

# Issue 2
cat << EOF > .scratch/issues/2.md
## Parent
https://github.com/Zharvis/tprogrami/issues/1

## What to build
Extend the Prisma schema with Roles (Admin, Teacher, Student) and Groups (up to 5 cohorts). Build the Admin dashboard view that lists Unverified users, and the server action that allows Admins to verify a user by assigning them a Role and a Group.

## Acceptance criteria
- [ ] Prisma schema includes Role and Group enums/tables.
- [ ] Admin dashboard lists all users currently in the \`Unverified\` state.
- [ ] Admins can select a Role and Group and submit a form to verify a user.
- [ ] Verified users no longer see the Waiting Room upon login.

## Blocked by
#$ISSUE1_ID
EOF
ISSUE2_URL=$(gh issue create --title "Admin Verification & Group Assignment Workflow" --body-file .scratch/issues/2.md --label "ready-for-agent")
ISSUE2_ID=$(basename $ISSUE2_URL)
echo "Created $ISSUE2_URL"

# Issue 3
cat << EOF > .scratch/issues/3.md
## Parent
https://github.com/Zharvis/tprogrami/issues/1

## What to build
Create the Prisma schema for Weekly Plans, Activities, Activity Types, and Target Groups. Build the foundational Admin Weekly Calendar grid UI and the server actions to create and edit Activities on the master Weekly Plan. Activities must support Title, Time, Activity Type, Target Groups, and optional Teachers.

## Acceptance criteria
- [ ] Prisma schema supports Weekly Plans and Activities with all required fields.
- [ ] Admin UI displays a weekly calendar grid.
- [ ] Admins can create new Activities on the grid.
- [ ] Overlapping Activities are visually supported and do not throw validation errors.

## Blocked by
#$ISSUE2_ID
EOF
ISSUE3_URL=$(gh issue create --title "Weekly Plan Core Data Model & Admin Weekly Grid" --body-file .scratch/issues/3.md --label "ready-for-agent")
ISSUE3_ID=$(basename $ISSUE3_URL)
echo "Created $ISSUE3_URL"

# Issue 4
cat << EOF > .scratch/issues/4.md
## Parent
https://github.com/Zharvis/tprogrami/issues/1

## What to build
Implement the core logic that projects the recurring Weekly Plan into actual calendar dates. Build the Student Agenda/List view with a prominent "Happening Now / Up Next" banner. Enforce the global Schedule Horizon limit so students cannot see past a configured number of weeks.

## Acceptance criteria
- [ ] Server action successfully resolves the Weekly Plan into chronological calendar dates.
- [ ] Student default view is a mobile-friendly Agenda (List).
- [ ] "Happening Now / Up Next" section correctly identifies the current or next immediate activity based on the current time.
- [ ] Students cannot view activities beyond the global Schedule Horizon.

## Blocked by
#$ISSUE3_ID
EOF
ISSUE4_URL=$(gh issue create --title "Student Agenda View & Schedule Horizon" --body-file .scratch/issues/4.md --label "ready-for-agent")
ISSUE4_ID=$(basename $ISSUE4_URL)
echo "Created $ISSUE4_URL"

# Issue 5
cat << EOF > .scratch/issues/5.md
## Parent
https://github.com/Zharvis/tprogrami/issues/1

## What to build
Implement the Teacher's unlimited, cross-Group calendar view (defaulted to their assigned activities). Add a toggle for Students to view their schedule as a Weekly Grid rather than the Agenda list, while still respecting the horizon limit.

## Acceptance criteria
- [ ] Teachers can view the schedule with an unlimited horizon.
- [ ] Teachers see Activities spanning all Groups, with filtering applied for their assigned Activities.
- [ ] Students have a toggle to switch from Agenda View to Weekly Grid View.

## Blocked by
#$ISSUE4_ID
EOF
ISSUE5_URL=$(gh issue create --title "Student & Teacher Weekly Grid View" --body-file .scratch/issues/5.md --label "ready-for-agent")
ISSUE5_ID=$(basename $ISSUE5_URL)
echo "Created $ISSUE5_URL"

# Issue 6
cat << EOF > .scratch/issues/6.md
## Parent
https://github.com/Zharvis/tprogrami/issues/1

## What to build
Extend the Prisma schema for Overrides (modifications, cancellations, additions tied to specific dates). Update the Admin UI so interacting with an Activity on a specific calendar date creates an Override instead of modifying the master Weekly Plan. Update the projection logic to merge Overrides into the agenda.

## Acceptance criteria
- [ ] Prisma schema supports Override records.
- [ ] Admin UI distinguishes between editing the Weekly Plan vs editing a specific date's Override.
- [ ] Schedule resolution logic seamlessly replaces Weekly Plan activities with Overrides on specific dates.

## Blocked by
#$ISSUE3_ID
#$ISSUE4_ID
EOF
ISSUE6_URL=$(gh issue create --title "Admin Overrides (Date-Specific Modifications)" --body-file .scratch/issues/6.md --label "ready-for-agent")
ISSUE6_ID=$(basename $ISSUE6_URL)
echo "Created $ISSUE6_URL"

# Issue 7
cat << EOF > .scratch/issues/7.md
## Parent
https://github.com/Zharvis/tprogrami/issues/1

## What to build
Add an Admin action to copy an entire Weekly Plan to establish a new baseline schedule. This is crucial for drastic schedule changes between trimesters.

## Acceptance criteria
- [ ] Admins have a UI action to "Duplicate Weekly Plan".
- [ ] The duplicated plan correctly carries over all base Activities into a new Weekly Plan record with a new Effective Date.

## Blocked by
#$ISSUE3_ID
EOF
ISSUE7_URL=$(gh issue create --title "Weekly Plan Duplication (Trimester Baseline)" --body-file .scratch/issues/7.md --label "ready-for-agent")
ISSUE7_ID=$(basename $ISSUE7_URL)
echo "Created $ISSUE7_URL"
