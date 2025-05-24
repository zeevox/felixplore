#!/usr/bin/env -S uv run -p python3.13 --with psycopg2-binary
import argparse
import os
import sys
import psycopg2
import json

def fetch_articles(db_params, publication_name: str, issue_number: int, table_name: str = "articles"):
    """
    Fetches articles from the database for a given publication and issue number.

    Args:
        db_params (dict): Database connection parameters.
        publication_name (str): The name of the publication.
        issue_number (int): The issue number.
        table_name (str): The name of the table containing articles.

    Returns:
        list: A list of tuples, where each tuple represents an article
              (id, page_no, headline, strapline, txt).
              Returns an empty list if no articles are found or on error.
    """
    conn = None
    try:
        conn = psycopg2.connect(**db_params)
        with conn.cursor() as cur:
            query = f"""
            SELECT id, page_no, headline, strapline, txt
            FROM {table_name}
            WHERE publication = %s AND issue_no = %s
            ORDER BY page_no;
            """
            cur.execute(query, (publication_name, issue_number))
            articles = cur.fetchall()
            return articles
    except psycopg2.Error as e:
        print(f"Database error: {e}", file=sys.stderr)
        return []
    finally:
        if conn:
            conn.close()

def format_article_markdown(article) -> str:
    """Formats a single article as Markdown."""
    article_id, page_no, headline, strapline, txt = article
    meta: dict = {
        k:v for k, v in {"id": article_id,
        "page_no": page_no,
        "headline": headline,
        "strapline": strapline,}.items() if v
    }
    return "\n\n".join([json.dumps(meta), txt])

def main():
    parser = argparse.ArgumentParser(
        description="Fetch articles from PostgreSQL and format as Markdown."
    )
    parser.add_argument("publication", help="Name of the publication")
    parser.add_argument("issue", type=int, help="Issue number")
    parser.add_argument(
        "--table",
        default="articles",
        help="Database table name for articles (default: articles)"
    )

    args = parser.parse_args()

    db_params = {
        "user": os.getenv("POSTGRES_USER", "felixplore"),
        "password": os.getenv("POSTGRES_PASSWORD", "postgres"),
        "host": os.getenv("POSTGRES_HOST", "localhost"),
        "port": int(os.getenv("POSTGRES_PORT", 5432)),
        "database": os.getenv("POSTGRES_DB", "felixplore"),
    }

    articles_data = fetch_articles(
        db_params, args.publication, args.issue, args.table
    )

    if not articles_data:
        print(
            f"No articles found for publication '{args.publication}', issue {args.issue}.",
            file=sys.stderr
        )
        return

    markdown_output = []
    for article_tuple in articles_data:
        markdown_output.append(format_article_markdown(article_tuple))

    print("\n#########################\n\n".join(markdown_output))

if __name__ == "__main__":
    main()
