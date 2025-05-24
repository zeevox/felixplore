SELECT id, headline, strapline, txt, page_no FROM articles WHERE publication = 'felix' AND issue_no = 1;

SELECT json_agg(json_build_object(
    'id', id,
    'page_no', page_no,
    'headline', headline,
    'strapline', strapline,
    'txt', txt
)) AS articles_json
FROM articles
WHERE publication = 'felix' AND issue_no = 1
GROUP BY page_no
ORDER BY page_no;