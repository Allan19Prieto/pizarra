import hashlib
import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
REPORT_PATH = ROOT / "output" / "download-report.json"
SQL_DIR = ROOT / "output" / "imports"
MANIFEST_PATH = ROOT / "output" / "prepared-imports.json"


def main():
    report = json.loads(REPORT_PATH.read_text(encoding="utf-8"))

    if report.get("status") != "ok":
        raise ValueError(
            "La descarga no terminó completamente bien. "
            "Revisa download-report.json antes de continuar."
        )

    bulletins = report.get("validated")

    if not isinstance(bulletins, list) or not bulletins:
        raise ValueError("El reporte no contiene boletines validados.")

    SQL_DIR.mkdir(parents=True, exist_ok=True)

    prepared = []
    seen_dates = set()

    for bulletin in sorted(bulletins, key=lambda item: item["date"]):
        date = bulletin["date"]
        expected_hash = bulletin["pdfHash"]
        pdf_path = Path(bulletin["path"])

        if date in seen_dates:
            raise ValueError(f"El reporte repite la fecha {date}.")

        seen_dates.add(date)

        actual_hash = hashlib.sha256(
            pdf_path.read_bytes()
        ).hexdigest()

        if actual_hash != expected_hash:
            raise ValueError(
                f"El PDF del {date} cambió después de validarlo. "
                "Ejecuta nuevamente download_bulletins.py."
            )

        sql_path = SQL_DIR / f"import-{date}-{actual_hash}.sql"

        print(f"Preparando {date}…", flush=True)

        subprocess.run(
            [
                sys.executable,
                str(ROOT / "build_import_sql.py"),
                str(pdf_path),
                str(sql_path),
                "--source-url",
                bulletin["url"],
            ],
            check=True,
        )

        prepared.append({
            "date": date,
            "pdfHash": actual_hash,
            "recordCount": bulletin["recordCount"],
            "sqlPath": str(sql_path),
            "sqlHash": hashlib.sha256(
                sql_path.read_bytes()
            ).hexdigest(),
        })

    manifest = {
        "downloadCheckedAt": report["checkedAt"],
        "status": "prepared",
        "bulletins": prepared,
    }

    temporary = MANIFEST_PATH.with_suffix(".json.tmp")
    temporary.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    temporary.replace(MANIFEST_PATH)

    print(f"\nImportaciones preparadas: {len(prepared)}")
    print(f"Listado: {MANIFEST_PATH}")
    print("La base de datos todavía no fue modificada.")


if __name__ == "__main__":
    try:
        main()
    except (
        OSError,
        ValueError,
        KeyError,
        TypeError,
        subprocess.CalledProcessError,
    ) as error:
        raise SystemExit(
            f"Preparación detenida: {error}\n"
            "No ejecutes archivos de una preparación incompleta."
        )