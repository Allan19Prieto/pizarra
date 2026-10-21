import argparse
import hashlib
import json
import subprocess
import tempfile
from pathlib import Path

from parse_bulletin import parse_bulletin


def sql_text(value: str) -> str:
    """Escapa un texto para usarlo como literal SQL."""
    return "'" + value.replace("'", "''") + "'"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--source-url", required=True)
    args = parser.parse_args()

    raw = args.pdf.read_bytes()

    if not raw.startswith(b"%PDF-"):
        raise ValueError("El archivo no es un PDF.")

    file_hash = hashlib.sha256(raw).hexdigest()

    # Extraemos nuevamente desde el PDF cuyo hash calculamos.
    with tempfile.TemporaryDirectory() as directory:
        text_path = Path(directory) / "bulletin.txt"

        subprocess.run(
            [
                "pdftotext",
                "-layout",
                str(args.pdf),
                str(text_path),
            ],
            check=True,
        )

        market_date, records = parse_bulletin(
            text_path.read_text(encoding="utf-8")
        )

    date_sql = sql_text(market_date)
    url_sql = sql_text(args.source_url)
    hash_sql = sql_text(file_hash)
    payload_sql = sql_text(
        json.dumps(records, ensure_ascii=False)
    )

    sql = f"""
-- Fecha: {market_date}
-- Registros: {len(records)}
-- SHA-256: {file_hash}

INSERT INTO products (name, unit)
SELECT
    json_extract(value, '$.product'),
    json_extract(value, '$.unit')
FROM json_each({payload_sql})
WHERE 1 = 1
ON CONFLICT (name, unit) DO NOTHING;

INSERT INTO bulletins (
    market_date,
    source_url,
    file_hash
)
VALUES (
    {date_sql},
    {url_sql},
    {hash_sql}
)
ON CONFLICT (market_date) DO NOTHING;

-- Insertar una revision nueva activa el trigger.
-- Un PDF ya registrado no vuelve a aplicarse.
INSERT INTO bulletin_revisions (
    bulletin_id,
    file_hash,
    source_url,
    imported_at,
    payload_json
)
SELECT
    id,
    {hash_sql},
    {url_sql},
    CURRENT_TIMESTAMP,
    {payload_sql}
FROM bulletins
WHERE market_date = {date_sql}
ON CONFLICT (bulletin_id, file_hash) DO NOTHING;

SELECT
    b.market_date,
    COUNT(pr.id) AS saved_records,
    (
        SELECT COUNT(*)
        FROM bulletin_revisions AS r
        WHERE r.bulletin_id = b.id
    ) AS revisions,
    CASE
        WHEN b.file_hash <> {hash_sql}
            THEN 'PDF historico: se conserva la version vigente'
        WHEN COUNT(pr.id) <> {len(records)}
            THEN 'ERROR: cantidad inesperada'
        ELSE 'OK'
    END AS import_status
FROM bulletins AS b
LEFT JOIN prices AS pr
    ON pr.bulletin_id = b.id
WHERE b.market_date = {date_sql}
GROUP BY b.id, b.market_date, b.file_hash;
"""

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(sql.strip() + "\n", encoding="utf-8")

    print(f"Fecha: {market_date}")
    print(f"Registros: {len(records)}")
    print(f"SHA-256: {file_hash}")
    print(f"SQL generado: {args.output}")
    print("Todavía no se ha ejecutado en la base de datos.")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        raise SystemExit(f"Error: {error}")