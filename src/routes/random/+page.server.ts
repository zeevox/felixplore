// src/routes/random/+page.server.ts
import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import db from '$lib/server/db';

export const load: PageServerLoad = async () => {
    const result = await db.query(
        "SELECT id FROM articles WHERE headline IS NOT NULL AND article_date < NOW() - INTERVAL '10 years' ORDER BY random() LIMIT 1"
    );

    if (result.rows.length === 0 || !result.rows[0]?.id) {
        // No articles found, throw a 404 error
        throw error(404, 'No articles found in the archive to redirect to.');
    }

    const id: string = result.rows[0].id;
    redirect(302, `/article/${id}`);
};