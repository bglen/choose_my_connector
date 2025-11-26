import { db } from "$lib/db";
import { connectors } from "$lib/drizzle/schema";
import { eq, and, gte, lte } from "drizzle-orm";


export async function GET({ url }) {
const q = {
type: url.searchParams.get("type"),
waterproof: url.searchParams.get("waterproof"),
panel: url.searchParams.get("panel"),
minContacts: Number(url.searchParams.get("minContacts")),
maxContacts: Number(url.searchParams.get("maxContacts")),
current: Number(url.searchParams.get("current")),
voltage: Number(url.searchParams.get("voltage"))
};


const where = [];


if (q.type) where.push(eq(connectors.connectionType, q.type));
if (q.waterproof) where.push(eq(connectors.waterproof, Number(q.waterproof)));
if (q.panel) where.push(eq(connectors.panelMount, Number(q.panel)));
if (!isNaN(q.minContacts)) where.push(gte(connectors.contacts, q.minContacts));
if (!isNaN(q.maxContacts)) where.push(lte(connectors.contacts, q.maxContacts));
if (!isNaN(q.current)) where.push(gte(connectors.current, q.current));
if (!isNaN(q.voltage)) where.push(gte(connectors.voltage, q.voltage));


const results = await db
.select()
.from(connectors)
.where(where.length ? and(...where) : undefined);


return new Response(JSON.stringify(results), {
headers: { "Content-Type": "application/json" }
});
}