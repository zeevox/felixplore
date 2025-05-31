#!/usr/bin/env -S uv run -p python3.13 --with pyarrow --with psycopg2-binary --with pandas

import pyarrow.parquet as pq
import psycopg2
from psycopg2.extras import execute_values
import pandas as pd # Optional, but can simplify data handling after reading parquet

# --- Configuration ---
# Database connection details (from your docker-compose.yaml)
DB_NAME = "felixplore"
DB_USER = "felixplore"
DB_PASS = "postgres"
DB_HOST = "localhost" # Assuming script runs on the host machine or can reach Docker
DB_PORT = "5432"

# Parquet file path and table name
PARQUET_FILE_PATH = "../felixplore-poc/data/dataset.parquet" # <--- !!! UPDATE THIS PATH !!!
TABLE_NAME = "articles" # Choose your desired table name

# --- Script ---

def create_pg_table_and_enable_extension(conn):
    """
    Ensures the pgvector extension is enabled and creates the table
    if it doesn't already exist.
    Adjust column names and types if your actual table schema differs.
    """
    create_table_statement = f"""
    CREATE EXTENSION IF NOT EXISTS vector;

    CREATE TABLE IF NOT EXISTS {TABLE_NAME} (
        publication TEXT,
        issue_no SMALLINT,
        page_no SMALLINT,
        headline TEXT,
        txt TEXT,
        strapline TEXT,
        author TEXT,
        category TEXT,
        vector vector(768), -- Matches your Parquet schema: Array(Float32, shape=(768,))
        article_date DATE   -- Renamed from 'date' to avoid SQL keyword clash, matches Parquet 'date'
    );
    """
    try:
        with conn.cursor() as cur:
            cur.execute(create_table_statement)
        conn.commit()
        print(f"Ensured pgvector extension is enabled and table '{TABLE_NAME}' exists.")
    except psycopg2.Error as e:
        print(f"Error creating table or enabling extension: {e}")
        conn.rollback()
        raise

def load_data(conn, parquet_file_path, table_name):
    """
    Reads data from a Parquet file and loads it into the specified PostgreSQL table.
    """
    print(f"Reading Parquet file: {parquet_file_path}")
    try:
        arrow_table = pq.read_table(parquet_file_path)
        # For easier row-wise iteration and type handling, convert to pandas DataFrame
        df = arrow_table.to_pandas()
    except Exception as e:
        print(f"Error reading Parquet file: {e}")
        return

    print(f"Preparing to insert {len(df)} rows into table '{table_name}'.")

    # Prepare data for execute_values
    # The order of items in each tuple must match the column order in the INSERT statement
    # and the table definition.
    data_to_insert = []
    for _, row in df.iterrows():
        # Convert vector array to string representation: e.g., "[1.0,2.0,3.0]"
        # pgvector expects floats, ensure your Parquet Float32 are handled correctly.
        raw_vector_data = row.get('vector')
        vector_as_string = None
        if raw_vector_data is not None:
            # If raw_vector_data is a NumPy array (common from to_pandas()),
            # .tolist() converts it to a list of native Python floats.
            if hasattr(raw_vector_data, 'tolist'):
                vector_as_string = str(raw_vector_data.tolist())
            # If it's already a Python list but might contain np.float32 objects
            elif isinstance(raw_vector_data, list):
                vector_as_string = str([float(v) for v in raw_vector_data])
            else:
                # Fallback for other iterable types, though less likely here
                try:
                    vector_as_string = str([float(v) for v in list(raw_vector_data)])
                except TypeError:
                    print(f"Warning: Could not convert vector data of type {type(raw_vector_data)} for row.")
        # Convert pandas Timestamp to Python date object if 'date' column exists and is datetime-like
        article_dt = None
        if 'date' in row and pd.notnull(row['date']):
            if hasattr(row['date'], 'date'): # Handles pandas Timestamp
                article_dt = row['date'].date()
            else: # Assumes it might already be a date object or string parsable by DB
                article_dt = row['date']


        data_to_insert.append((
            row.get('publication'),
            row.get('issue_no'),
            row.get('page_no'),
            row.get('headline'),
            row.get('txt'),
            row.get('strapline'),
            row.get('author'),
            row.get('category'),
            vector_as_string,
            article_dt
        ))

    # Define the INSERT query. Column names must match your table.
    # Note: 'vector' is the column for embeddings, 'article_date' for the date.
    insert_query = f"""
    INSERT INTO {table_name} (
        publication, issue_no, page_no, headline, txt,
        strapline, author, category, vector, article_date
    ) VALUES %s;
    """

    try:
        with conn.cursor() as cur:
            execute_values(cur, insert_query, data_to_insert, page_size=500) # Adjust page_size as needed
        conn.commit()
        print(f"Successfully inserted {len(data_to_insert)} rows into '{table_name}'.")
    except psycopg2.Error as e:
        print(f"Error inserting data: {e}")
        conn.rollback()
        raise
    except Exception as e:
        print(f"An unexpected error occurred during insertion: {e}")
        conn.rollback()
        raise

def main():
    """
    Main function to connect to the database and load data.
    """
    conn = None
    try:
        conn_string = f"dbname='{DB_NAME}' user='{DB_USER}' password='{DB_PASS}' host='{DB_HOST}' port='{DB_PORT}'"
        conn = psycopg2.connect(conn_string)
        print("Successfully connected to PostgreSQL.")

        create_pg_table_and_enable_extension(conn)
        load_data(conn, PARQUET_FILE_PATH, TABLE_NAME)

    except psycopg2.Error as e:
        print(f"Database connection error: {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
    finally:
        if conn:
            conn.close()
            print("PostgreSQL connection closed.")

if __name__ == "__main__":
    # --- IMPORTANT ---
    # Update PARQUET_FILE_PATH at the top of the script before running!
    if PARQUET_FILE_PATH == "your_data.parquet":
        print("ERROR: Please update the PARQUET_FILE_PATH variable in the script.")
    else:
        main()
