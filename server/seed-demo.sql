-- Productos de demostración.
INSERT INTO products (name, unit)
VALUES
    ('Tomate', 'kg'),
    ('Papa', 'kg'),
    ('Culantro coyote', 'rollo')
ON CONFLICT (name, unit) DO NOTHING;

-- Boletines ficticios: no representan documentos oficiales.
INSERT INTO bulletins (market_date, source_url, file_hash)
VALUES
    ('2026-10-15', 'demo://2026-10-15', 'demo-2026-10-15'),
    ('2026-10-16', 'demo://2026-10-16', 'demo-2026-10-16')
ON CONFLICT (market_date) DO NOTHING;

-- Precios de demostración.
WITH demo (
    market_date,
    product,
    unit,
    min_price,
    max_price,
    mode_price,
    average_price
) AS (
    VALUES
        ('2026-10-15', 'Tomate', 'kg',
         700, 1100, 900, 920),

        ('2026-10-15', 'Papa', 'kg',
         600, 850, 750, 730),

        ('2026-10-15', 'Culantro coyote', 'rollo',
         150, 250, 200, 195),

        ('2026-10-16', 'Tomate', 'kg',
         800, 1200, 1000, 980),

        ('2026-10-16', 'Papa', 'kg',
         650, 900, 800, 780),

        ('2026-10-16', 'Culantro coyote', 'rollo',
         175, 275, 225, 220)
)
INSERT INTO prices (
    bulletin_id,
    product_id,
    min_price,
    max_price,
    mode_price,
    average_price
)
SELECT
    b.id,
    p.id,
    demo.min_price,
    demo.max_price,
    demo.mode_price,
    demo.average_price
FROM demo
INNER JOIN bulletins AS b
    ON b.market_date = demo.market_date
    AND b.source_url = 'demo://' || demo.market_date
INNER JOIN products AS p
    ON p.name = demo.product
    AND p.unit = demo.unit
WHERE 1 = 1
ON CONFLICT (bulletin_id, product_id) DO NOTHING;