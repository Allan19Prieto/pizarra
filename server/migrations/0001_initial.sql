PRAGMA foreign_keys = ON;

CREATE TABLE products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    unit TEXT NOT NULL,

    UNIQUE (name, unit)
);

CREATE TABLE bulletins (
    id INTEGER PRIMARY KEY,
    market_date TEXT NOT NULL UNIQUE,
    source_url TEXT NOT NULL,
    file_hash TEXT NOT NULL,
    imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE prices (
    id INTEGER PRIMARY KEY,
    bulletin_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,

    min_price REAL NOT NULL,
    max_price REAL NOT NULL,
    mode_price REAL NOT NULL,
    average_price REAL NOT NULL,

    FOREIGN KEY (bulletin_id)
        REFERENCES bulletins(id),

    FOREIGN KEY (product_id)
        REFERENCES products(id),

    UNIQUE (bulletin_id, product_id),

    CHECK (min_price >= 0),
    CHECK (max_price >= min_price),
    CHECK (mode_price BETWEEN min_price AND max_price),
    CHECK (average_price BETWEEN min_price AND max_price)
);

CREATE INDEX idx_prices_product
    ON prices(product_id);