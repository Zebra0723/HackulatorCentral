// Writes the schema used by the app, for people who prefer to run SQL by hand.
import { SCHEMA_SQL } from "../src/lib/server/schema";
process.stdout.write(`-- Hackulator database schema. The app also applies this automatically on start.\n${SCHEMA_SQL}`);
