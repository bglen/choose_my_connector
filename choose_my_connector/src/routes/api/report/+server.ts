import { db } from "$lib/db";
import { issueReports } from "$lib/drizzle/schema";
import { json } from "@sveltejs/kit";

function clean(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

export async function POST({ request }) {
    let payload: Record<string, unknown>;

    try {
        payload = await request.json();
    } catch (error) {
        console.error("Failed to parse report JSON", error);
        return json({ error: "Invalid request body." }, { status: 400 });
    }

    const details = clean(payload.details);
    const productName = clean(payload.productName);
    const context = clean(payload.context);
    const email = clean(payload.email);

    if (!details || details.length < 10) {
        return json(
            { error: "Please describe what looks wrong so we can investigate." },
            { status: 400 }
        );
    }

    try {
        await db.insert(issueReports).values({
            details: details.slice(0, 2000),
            productName: productName ? productName.slice(0, 200) : undefined,
            context: context ? context.slice(0, 500) : undefined,
            email: email ? email.slice(0, 320) : undefined
        });
    } catch (error) {
        console.error("Failed to store issue report", error);
        return json({ error: "Could not save your report. Please try again." }, { status: 500 });
    }

    return json({ ok: true });
}
