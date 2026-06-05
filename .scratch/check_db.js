const { PrismaClient } = require('../app/generated/prisma');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is missing!");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  try {
    const users = await prisma.user.findMany();
    console.log("Database connection successful. Total users:", users.length);
    console.log("Users:", users);
  } catch (err) {
    console.error("Error reading database:", err);
  } finally {
    await pool.end();
  }
}
run();
