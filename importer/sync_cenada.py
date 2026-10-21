import subprocess
import sys
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parent

STEPS = [
    ("Descargar y validar boletines", "download_bulletins.py"),
    ("Preparar importaciones", "prepare_imports.py"),
    ("Importar en D1 local", "apply_imports.py"),
]


def main():
    started_at = datetime.now().astimezone()
    print(
        f"Inicio: {started_at.isoformat(timespec='seconds')}",
        flush=True,
    )

    for number, (description, filename) in enumerate(STEPS, start=1):
        print(
            f"\n[{number}/{len(STEPS)}] {description}",
            flush=True,
        )

        result = subprocess.run(
            [
                sys.executable,
                "-u",
                str(ROOT / filename),
            ],
            cwd=PROJECT,
        )

        if result.returncode != 0:
            print(
                f"\nProceso detenido en: {description}.",
                flush=True,
            )
            print(
                "Revisa el error anterior. "
                "Las etapas posteriores no se ejecutaron.",
                flush=True,
            )
            return 1

    elapsed = datetime.now().astimezone() - started_at

    print(
        f"\nProceso finalizado en {elapsed.total_seconds():.1f} segundos.",
        flush=True,
    )
    print(
        "Revisa el resumen de importación: las posibles "
        "correcciones pendientes requieren revisión.",
        flush=True,
    )

    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\nProceso interrumpido por el usuario.", flush=True)
        sys.exit(130)
    except OSError as error:
        print(f"\nNo se pudo iniciar una etapa: {error}", flush=True)
        sys.exit(1)