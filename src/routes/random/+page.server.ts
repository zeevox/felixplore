// src/routes/random/+page.server.ts
import db from "$lib/server/db";
import { error, redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  const sampleResult = await db.query<{ id: string }>(
    `
    WITH sample AS (
      SELECT id FROM articles TABLESAMPLE SYSTEM (1)
      WHERE headline IS NOT NULL
        AND article_date < NOW() - INTERVAL '10 years'
    )
    SELECT id FROM sample LIMIT 1;
    `,
  );
  let id = sampleResult.rows[0]?.id;
  if (!id) {
    const fallback = await db.query<{ id: string }>(
      `
      SELECT id
      FROM articles
      WHERE headline IS NOT NULL
        AND article_date < NOW() - INTERVAL '10 years'
      ORDER BY random()
      LIMIT 1;
      `,
    );
    id = fallback.rows[0]?.id;
  }
  if (!id) {
    throw error(404, "No articles found in the archive to redirect to.");
  }
  redirect(302, `/article/${id}`);
};
