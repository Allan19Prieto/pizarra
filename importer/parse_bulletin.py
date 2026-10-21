import argparse
import json
import re
from datetime import datetime
from decimal import Decimal
from pathlib import Path


# Formato del boletín: 1,300.00 o 300.00.
AMOUNT = r"(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2}"

PRICE_ROW = re.compile(
    rf"^(?P<label>.+?)\s+"
    rf"(?P<min>{AMOUNT})\s+"
    rf"(?P<max>{AMOUNT})\s+"
    rf"(?P<mode>{AMOUNT})\s+"
    rf"(?P<average>{AMOUNT})\s*$"
)

AMOUNT_TOKEN = re.compile(rf"(?<!\S){AMOUNT}(?!\S)")


def parse_amount(value: str) -> Decimal:
    return Decimal(value.replace(",", ""))


def parse_bulletin(text: str) -> tuple[str, list[dict]]:
    if "CENADA" not in text.upper():
        raise ValueError("El documento no identifica a CENADA.")

    matches = re.findall(
        r"Fecha de Plaza:\s*(\d{1,2}/\d{1,2}/\d{4})",
        text,
    )

    if not matches:
        raise ValueError("No se encontró la fecha de plaza.")

    dates = {
        datetime.strptime(value, "%d/%m/%Y").date().isoformat()
        for value in matches
    }

    if len(dates) != 1:
        raise ValueError(
            f"El documento contiene fechas de plaza diferentes: {dates}"
        )

    market_date = dates.pop()

    # Comprueba que estén presentes todas las páginas numeradas.
    page_matches = re.findall(
        r"Pag\.\s*(\d+)\s+de\s+(\d+)",
        text,
        flags=re.IGNORECASE,
    )

    if not page_matches:
        raise ValueError("No se pudo verificar la numeración de páginas.")

    totals = {int(total) for _, total in page_matches}

    if len(totals) != 1:
        raise ValueError("La numeración de páginas es inconsistente.")

    total_pages = totals.pop()
    found_pages = {int(page) for page, _ in page_matches}

    if found_pages != set(range(1, total_pages + 1)):
        raise ValueError("Faltan páginas del boletín.")

    records = []
    seen = set()

    for line_number, line in enumerate(text.splitlines(), start=1):
        line = line.strip()

        if not line:
            continue

        match = PRICE_ROW.fullmatch(line)

        if not match:
            # Detiene la extracción ante una posible fila mal formada.
            if AMOUNT_TOKEN.search(line):
                raise ValueError(
                    f"Línea {line_number}: contiene precios "
                    f"pero no se pudo interpretar:\n{line}"
                )
            continue

        # pdftotext -layout separa producto y unidad con varios espacios.
        label = match.group("label").strip()
        columns = re.split(r"\s{2,}", label)

        if len(columns) != 2:
            raise ValueError(
                f"Línea {line_number}: no se pudo separar "
                f"el producto de la unidad:\n{line}"
            )

        product, unit = columns
        product = " ".join(product.split())
        unit = " ".join(unit.split())

        values = {
            field: parse_amount(match.group(field))
            for field in ("min", "max", "mode", "average")
        }

        minimum = values["min"]
        maximum = values["max"]

        if not (
            0 <= minimum <= maximum
            and minimum <= values["mode"] <= maximum
            and minimum <= values["average"] <= maximum
        ):
            raise ValueError(
                f"Línea {line_number}: precios fuera de rango "
                f"para {product}."
            )

        key = (product, unit)

        if key in seen:
            raise ValueError(
                f"Producto duplicado: {product} / {unit}"
            )

        seen.add(key)

        records.append({
            "date": market_date,
            "product": product,
            "unit": unit,
            **{
                field: float(value)
                for field, value in values.items()
            },
        })

    if not records:
        raise ValueError("No se encontraron registros de precios.")

    return market_date, records


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    try:
        text = args.input.read_text(encoding="utf-8")
        market_date, records = parse_bulletin(text)

        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(
            json.dumps(records, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    except (OSError, ValueError) as error:
        raise SystemExit(f"Error: {error}")

    print(f"Fecha de plaza: {market_date}")
    print(f"Registros extraídos: {len(records)}")
    print(f"JSON generado: {args.output}")


if __name__ == "__main__":
    main()