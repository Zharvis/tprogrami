# OAuth with Manual Verification

We will use Google OAuth for authentication, but new accounts will not be auto-provisioned with platform access. 

To prevent unauthorized individuals from accessing the onboarding platform simply by logging in with a Google account, newly authenticated users are placed in an `Unverified` state. They are redirected to a safe `Waiting Room` page and have no access to the rest of the system. An Admin must manually review the pending account, approve it, and explicitly assign a Role (and a Group, if applicable) before the user can proceed.
