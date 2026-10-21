import { useEffect, useState } from "react";

type Bulletin = {
  date: string;
  sourceUrl: string;
  importedAt: string;
  recordCount: number;
  revisionCount: number;
};

function isBulletin(value: unknown): value is Bulletin {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    typeof item.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(item.date) &&
    Number.isFinite(Date.parse(item.date)) &&
    typeof item.sourceUrl === "string" &&
    typeof item.importedAt === "string" &&
    typeof item.recordCount === "number" &&
    Number.isInteger(item.recordCount) &&
    item.recordCount >= 0 &&
    typeof item.revisionCount === "number" &&
    Number.isInteger(item.revisionCount) &&
    item.revisionCount >= 0
  );
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("es-CR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export default function BulletinStatus() {
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadBulletins() {
      try {
        const response = await fetch("/api/bulletins");

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data: unknown = await response.json();

        if (!Array.isArray(data) || !data.every(isBulletin)) {
          throw new Error("Respuesta de boletines inválida.");
        }

        if (active) {
          setBulletins(
            [...data].sort((a, b) => b.date.localeCompare(a.date))
          );
        }
      } catch (cause) {
        console.error("Error al consultar los boletines:", cause);

        if (active) {
          setError("No se pudo consultar el estado de los boletines.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadBulletins();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <p role="status">Consultando boletines…</p>;
  }

  if (error) {
    return <p role="alert">{error}</p>;
  }

  const latest = bulletins[0];

  if (!latest) {
    return <p>Todavía no hay boletines importados.</p>;
  }

  const sourceUrl = /^https?:\/\//i.test(latest.sourceUrl)
    ? latest.sourceUrl
    : null;

  return (
    <section className="bulletin-status" aria-labelledby="bulletin-title">
      <h2 id="bulletin-title">Datos disponibles</h2>

      <p>
        Último boletín importado:{" "}
        <strong>{formatDate(latest.date)}</strong>
      </p>

      <p>
        {latest.recordCount} precios en ese boletín ·{" "}
        {bulletins.length} boletines en el histórico ·{" "}
        {latest.revisionCount} versiones guardadas del último boletín
      </p>

      {sourceUrl && (
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
          Consultar fuente
        </a>
      )}

      <p className="bulletin-note">
        Esta fecha corresponde al último boletín guardado.
        La descarga automática todavía no está configurada en este proyecto.
      </p>
    </section>
  );
}