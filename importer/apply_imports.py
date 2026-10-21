import hashlib
import json
import subprocess
import argparse
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parent
MANIFEST = ROOT / "output" / "prepared-imports.json"

BASE_COMMAND = []


def configure_database(production: bool):
    config_name = (
        "wrangler.production.jsonc"
        if production
        else "wrangler.jsonc"
    )

    config_path = PROJECT / "server" / config_name

    if not config_path.is_file():
        raise ValueError(
            f"No se encontró la configuración: {config_path}"
        )

    BASE_COMMAND[:] = [
        "npx",
        "--no-install",
        "wrangler",
        "d1",
        "execute",
        "DB",
        "--remote" if production else "--local",
        "--config",
        str(config_path),
        "--json",
        "--yes",
    ]

    print(
        "Destino: PRODUCCIÓN"
        if production
        else "Destino: LOCAL",
        flush=True,
    )


def execute(*arguments):
    result = subprocess.run(
        [*BASE_COMMAND, *arguments],
        cwd=PROJECT,
        capture_output=True,
        text=True,
        timeout=120,
    )

    if result.returncode != 0:
        raise RuntimeError(
            result.stderr.strip()
            or result.stdout.strip()
            or "Wrangler no pudo completar la operación."
        )

    try:
        responses = json.loads(result.stdout)
    except json.JSONDecodeError:
        raise RuntimeError(
            "Wrangler no devolvió el JSON esperado:\n"
            + result.stdout[:1500]
        )

    if not isinstance(responses, list):
        raise RuntimeError("Formato de respuesta inesperado.")

    rows = []

    for response in responses:
        if not isinstance(response, dict):
            raise RuntimeError("Respuesta inválida de Wrangler.")

        if response.get("success") is False:
            raise RuntimeError(str(response))

        results = response.get("results")

        if not isinstance(results, list):
            raise RuntimeError("La respuesta no contiene resultados.")

        rows.extend(results)

    return rows


def read_bulletins():
    rows = execute(
        "--command",
        """
        SELECT
            b.market_date AS date,
            b.file_hash AS fileHash,
            COUNT(p.id) AS recordCount
        FROM bulletins AS b
        LEFT JOIN prices AS p
            ON p.bulletin_id = b.id
        GROUP BY b.id, b.market_date, b.file_hash;
        """,
    )

    return {row["date"]: row for row in rows}


def verify_file(item):
    path = Path(item["sqlPath"])

    actual_hash = hashlib.sha256(
        path.read_bytes()
    ).hexdigest()

    if actual_hash != item["sqlHash"]:
        raise ValueError(
            f"El SQL del {item['date']} cambió después de prepararlo. "
            "Ejecuta nuevamente prepare_imports.py."
        )

    return path


def main():
    parser = argparse.ArgumentParser(
        description="Importa los boletines preparados en D1."
    )

    parser.add_argument(
        "--production",
        action="store_true",
        help="Importar en la base remota de producción.",
    )

    args = parser.parse_args()
    configure_database(args.production)

    manifest = json.loads(
        MANIFEST.read_text(encoding="utf-8")
    )

    if manifest.get("status") != "prepared":
        raise ValueError("El listado no está marcado como preparado.")

    items = manifest.get("bulletins")

    if not isinstance(items, list) or not items:
        raise ValueError("No hay importaciones preparadas.")

    dates = [item["date"] for item in items]

    if len(dates) != len(set(dates)):
        raise ValueError("El listado contiene fechas duplicadas.")

    # Comprueba todos los archivos antes de modificar la base.
    for item in items:
        verify_file(item)

    imported = 0
    skipped = 0
    pending = []

    for item in sorted(items, key=lambda entry: entry["date"]):
        date = item["date"]

        # Consulta de nuevo antes de cada importación.
        existing = read_bulletins().get(date)

        if existing:
            if existing["fileHash"] != item["pdfHash"]:
                pending.append(date)
                print(
                    f"PENDIENTE {date}: existe un PDF diferente.",
                    flush=True,
                )
                continue

            if existing["recordCount"] != item["recordCount"]:
                raise RuntimeError(
                    f"{date}: el hash coincide, pero la cantidad "
                    "de precios guardados es diferente. "
                    "Revisa ese boletín antes de continuar."
                )

            skipped += 1
            print(f"YA IMPORTADO {date}", flush=True)
            continue

        sql_path = verify_file(item)

        print(f"IMPORTANDO {date}…", flush=True)
        execute("--file", str(sql_path))

        saved = read_bulletins().get(date)

        if (
            not saved
            or saved["fileHash"] != item["pdfHash"]
            or saved["recordCount"] != item["recordCount"]
        ):
            raise RuntimeError(
                f"No se pudo confirmar la importación de {date}."
            )

        imported += 1

        print(
            f"OK {date}: {saved['recordCount']} precios.",
            flush=True,
        )

    print(f"\nBoletines incorporados: {imported}")
    print(f"Ya importados: {skipped}")
    print(f"Posibles correcciones pendientes: {len(pending)}")

    for date in pending:
        print(f"  - {date}")


if __name__ == "__main__":
    try:
        main()
    except (
        OSError,
        ValueError,
        KeyError,
        TypeError,
        RuntimeError,
        subprocess.SubprocessError,
    ) as error:
        raise SystemExit(
            f"Importación detenida: {error}\n"
            "Los boletines confirmados anteriormente permanecen guardados."
        )