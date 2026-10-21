CREATE TABLE bulletin_revisions (
    id INTEGER PRIMARY KEY,

    bulletin_id INTEGER NOT NULL,
    file_hash TEXT NOT NULL,
    source_url TEXT NOT NULL,
    imported_at TEXT NOT NULL,
    recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    payload_json TEXT NOT NULL
        CHECK (json_valid(payload_json)),

    FOREIGN KEY (bulletin_id)
        REFERENCES bulletins(id),

    UNIQUE (bulletin_id, file_hash)
);

-- Conserva una copia de cada boletín ya importado.
INSERT INTO bulletin_revisions (
    bulletin_id,
    file_hash,
    source_url,
    imported_at,
    payload_json
)
SELECT
    b.id,
    b.file_hash,
    b.source_url,
    b.imported_at,
    (
        SELECT json_group_array(
            json_object(
                'date', b.market_date,
                'product', p.name,
                'unit', p.unit,
                'min', pr.min_price,
                'max', pr.max_price,
                'mode', pr.mode_price,
                'average', pr.average_price
            )
        )
        FROM prices AS pr
        INNER JOIN products AS p
            ON p.id = pr.product_id
        WHERE pr.bulletin_id = b.id
    )
FROM bulletins AS b;