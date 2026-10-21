import hashlib
import json
import subprocess
import tempfile
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from discover_bulletins import INDEX_URL, main as discover
from parse_bulletin import parse_bulletin


ROOT = Path(__file__).resolve().parent
PDF_DIR = ROOT / "pdfs"
OUTPUT_DIR = ROOT / "output"

MAX_BYTES = 8 * 1024 * 1024


def save_report(report):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    target = OUTPUT_DIR / "download-report.json"
    temporary = OUTPUT_DIR / "download-report.json.tmp"

    temporary.write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    temporary.replace(target)


def main():
    PDF_DIR.mkdir(parents=True, exist_ok=True)

    report = {
        "checkedAt": datetime.now(timezone.utc).isoformat(),
        "status": "running",
        "validated": [],
        "errors": [],
    }

    # Descubre nuevamente los enlaces y conserva la sesión.
    try:
        opener, bulletins = discover()
    except (SystemExit, Exception) as error:
        report["status"] = "error"
        report["errors"].append({
            "stage": "discovery",
            "message": str(error),
        })
        save_report(report)
        raise SystemExit("Falló la consulta de boletines. Revisa el reporte.")

    for bulletin in bulletins:
        date = bulletin["date"]
        url = bulletin["url"]

        print(f"Descargando boletín {date}…", flush=True)

        try:
            request = urllib.request.Request(
                url,
                headers={
                    "User-Agent": "Pizarra/0.1",
                    "Accept": "application/pdf",
                    "Referer": INDEX_URL,
                },
            )

            with opener.open(request, timeout=30) as response:
                raw = response.read(MAX_BYTES + 1)

            if len(raw) > MAX_BYTES:
                raise ValueError("El archivo supera el límite de 8 MB.")

            if not raw.startswith(b"%PDF-"):
                raise ValueError(
                    "La respuesta no es un PDF. "
                    "Podría ser una página intermedia o un error."
                )

            digest = hashlib.sha256(raw).hexdigest()

            with tempfile.TemporaryDirectory() as directory:
                pdf_path = Path(directory) / "bulletin.pdf"
                text_path = Path(directory) / "bulletin.txt"

                pdf_path.write_bytes(raw)

                subprocess.run(
                    [
                        "pdftotext",
                        "-layout",
                        str(pdf_path),
                        str(text_path),
                    ],
                    check=True,
                    capture_output=True,
                    timeout=30,
                )

                internal_date, records = parse_bulletin(
                    text_path.read_text(encoding="utf-8")
                )

            if internal_date != date:
                raise ValueError(
                    f"La lista indica {date}, "
                    f"pero el PDF corresponde a {internal_date}."
                )

            # El hash en el nombre conserva archivos diferentes
            # publicados para una misma fecha.
            destination = PDF_DIR / f"boletin-{date}-{digest}.pdf"

            if destination.exists():
                if hashlib.sha256(destination.read_bytes()).hexdigest() != digest:
                    raise ValueError(
                        "El archivo local existente no coincide con su hash."
                    )
                file_status = "already_saved"
            else:
                temporary = destination.with_suffix(".pdf.tmp")
                temporary.write_bytes(raw)
                temporary.replace(destination)
                file_status = "saved"

            report["validated"].append({
                "date": date,
                "url": url,
                "pdfHash": digest,
                "recordCount": len(records),
                "path": str(destination),
                "fileStatus": file_status,
            })

            print(
                f"Validado: {date}, {len(records)} registros "
                f"({file_status}).",
                flush=True,
            )

        except urllib.error.HTTPError as error:
            report["errors"].append({
                "date": date,
                "message": f"HTTP {error.code}",
            })
            print(f"Error en {date}: HTTP {error.code}", flush=True)

            # Detiene las solicitudes ante restricciones o rate limiting.
            if error.code in (401, 403, 429):
                print(
                    "Se detiene la descarga por la respuesta del servidor.",
                    flush=True,
                )
                break

        except (
            OSError,
            ValueError,
            subprocess.SubprocessError,
        ) as error:
            report["errors"].append({
                "date": date,
                "message": str(error),
            })
            print(f"Error en {date}: {error}", flush=True)

    report["status"] = (
        "partial"
        if report["errors"] and report["validated"]
        else "error"
        if report["errors"]
        else "ok"
    )

    save_report(report)

    print(f"\nBoletines validados: {len(report['validated'])}")
    print(f"Errores: {len(report['errors'])}")
    print(f"Reporte: {OUTPUT_DIR / 'download-report.json'}")

    if report["errors"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()