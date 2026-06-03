# Infrastructure: Supabase and Prisma

We will use **Supabase** for our database (PostgreSQL) and Authentication (Google OAuth), paired with **Prisma** as our ORM.

**Why:**
1. **Supabase** provides a unified, production-ready solution for both authentication (which we need for Google OAuth and our custom Unverified/Waiting Room workflow) and a robust PostgreSQL database.
2. **Prisma** allows us to define our database structure entirely in code via a schema file. It handles database migrations automatically and generates a fully type-safe TypeScript client.

This combination gives us a highly productive, code-first foundation that is well-equipped to handle the relational complexity of our domain (Weekly Plans, Overrides, User Groups, and Auth States).
