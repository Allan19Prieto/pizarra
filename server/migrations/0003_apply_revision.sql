CREATE TRIGGER apply_bulletin_revision
AFTER INSERT ON bulletin_revisions
BEGIN
    -- Rechaza revisiones vacías o que no sean listas.
    SELECT CASE
        WHEN json_type(NEW.payload_json) <> 'array'
          OR json_array_length(NEW.payload_json) = 0
        THEN RAISE(ABORT, 'La revision debe contener precios')
    END;

    -- Todos los registros deben corresponder al mismo boletín.
    SELECT CASE
        WHEN EXISTS (
            SELECT 1
            FROM json_each(NEW.payload_json)
            WHERE json_extract(value, '$.date') IS NOT (
                SELECT market_date
                FROM bulletins
                WHERE id = NEW.bulletin_id
            )
        )
        THEN RAISE(ABORT, 'Fecha de revision incorrecta')
    END;

    -- Conserva las versiones anteriores en bulletin_revisions.
    -- Sustituye únicamente los precios vigentes de este boletín.
    DELETE FROM prices
    WHERE bulletin_id = NEW.bulletin_id;

    INSERT INTO prices (
        bulletin_id,
        product_id,
        min_price,
        max_price,
        mode_price,
        average_price
    )
    SELECT
        NEW.bulletin_id,
        p.id,
        json_extract(j.value, '$.min'),
        json_extract(j.value, '$.max'),
        json_extract(j.value, '$.mode'),
        json_extract(j.value, '$.average')
    FROM json_each(NEW.payload_json) AS j
    INNER JOIN products AS p
        ON p.name = json_extract(j.value, '$.product')
        AND p.unit = json_extract(j.value, '$.unit');

    -- Si algún producto no pudo guardarse, cancela la operación.
    SELECT CASE
        WHEN (
            SELECT COUNT(*)
            FROM prices
            WHERE bulletin_id = NEW.bulletin_id
        ) <> json_array_length(NEW.payload_json)
        THEN RAISE(ABORT, 'La revision quedaria incompleta')
    END;

    UPDATE bulletins
    SET
        file_hash = NEW.file_hash,
        source_url = NEW.source_url,
        imported_at = NEW.imported_at
    WHERE id = NEW.bulletin_id;
END;