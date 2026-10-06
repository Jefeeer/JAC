/**
 * Runs every migration + seed.sql inside PGlite (Postgres compiled to WASM)
 * on top of a minimal Supabase stub (auth/storage schemas, roles), then
 * executes the RLS behaviour suite. No Docker required.
 *
 *   npm run db:test
 */
import { PGlite } from "@electric-sql/pglite"
import { citext } from "@electric-sql/pglite/contrib/citext"
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm"
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import rlsSuite from "./rls.test.mjs"

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, "..")
const db = await PGlite.create({ extensions: { citext, pg_trgm, pgcrypto } })

const run = async (label, sql) => {
  try {
    await db.exec(sql)
    console.log("OK  ", label)
  } catch (e) {
    console.error("FAIL", label, "\n    ", e.message)
    process.exit(1)
  }
}

await run("supabase stub", fs.readFileSync(path.join(here, "supabase-stub.sql"), "utf8"))
for (const f of fs.readdirSync(path.join(root, "migrations")).sort()) {
  await run(f, fs.readFileSync(path.join(root, "migrations", f), "utf8"))
}
await run("seed.sql", fs.readFileSync(path.join(root, "seed.sql"), "utf8"))

const q = async (sql) => (await db.query(sql)).rows
const failed = await rlsSuite(db, q)
process.exit(failed ? 1 : 0)
