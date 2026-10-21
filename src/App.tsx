import { useEffect, useState } from "react";
import PricesTable from "./components/PricesTable";
import PriceHistory from "./components/PriceHistory";
import type { PriceRecord } from "./types/market";
import { productKey } from "./types/market";
import { getPrices } from "./services/marketService";
import BulletinStatus from "./components/BulletinStatus";

const currencyFormatter = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat("es-CR", {
  style: "percent",
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("es-CR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export default function App() {
  const [records, setRecords] = useState<PriceRecord[]>([]);
  const [selectedProductKey, setSelectedProductKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadPrices() {
      try {
        const prices = await getPrices();

        if (!active) return;

        setRecords(prices);
        setSelectedProductKey(
          prices.length > 0 ? productKey(prices[0]) : ""
        );
      } catch (cause) {
        if (!active) return;

        console.error("Error al cargar los precios:", cause);
        setError(
          "No pudimos cargar los precios. Intenta nuevamente."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadPrices();

    return () => {
      active = false;
    };
  }, []);

  const history = records
    .filter((record) => productKey(record) === selectedProductKey)
    .sort((a, b) => a.date.localeCompare(b.date));

  const first = history[0];
  const latest = history[history.length - 1];

  const variation =
    history.length >= 2 && first && latest && first.mode > 0
      ? (latest.mode - first.mode) / first.mode
      : null;

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <span className="brand-logo" aria-hidden="true">
            RP
          </span>

          <div>
            <p className="brand-name">Rubén Prieto</p>
            <p className="brand-description">
              Precios y estadísticas CENADA
            </p>
          </div>
        </div>

        <span className="status-badge">Demostración</span>
      </header>

      <main className="main">
        <section className="intro" aria-labelledby="page-title">
          <p className="eyebrow">Información de mercado</p>

          <h1 id="page-title">
            Consulta precios. Comprende sus cambios.
          </h1>

          <p>
            Explora los precios por producto y unidad, y compara
            su evolución en el tiempo.
          </p>

          <p className="demo-notice">
            Precios de referencia de los boletines de PIMA/CENADA.
            Cada precio corresponde a la fecha y unidad de comercialización
            indicadas. No representa una cotización en tiempo real.
          </p>
        </section>

        <BulletinStatus />

        {loading ? (
          <section className="panel">
            <p role="status">Cargando precios…</p>
          </section>
        ) : error ? (
          <section className="panel">
            <p role="alert">{error}</p>
          </section>
        ) : records.length === 0 ? (
          <section className="panel">
            <p>No hay precios disponibles.</p>
          </section>
        ) : (
          <>
            {latest && (
              <section aria-labelledby="selection-title">
                <div className="selection-heading">
                  <h2 id="selection-title">
                    {latest.product} · {latest.unit}
                  </h2>

                  <p>
                    Las tarjetas y el gráfico muestran el historial
                    completo del producto seleccionado. El filtro
                    de fecha solo modifica la tabla.
                  </p>
                </div>

                <div className="stats-grid">
                  <article className="stat-card">
                    <h3>Última moda registrada</h3>

                    <p className="stat-value">
                      {currencyFormatter.format(latest.mode)}
                    </p>

                    <p className="stat-description">
                      Por {latest.unit} · {formatDate(latest.date)}
                    </p>
                  </article>

                  <article className="stat-card">
                    <h3>Rango de precios</h3>

                    <p className="stat-value range-value">
                      {currencyFormatter.format(latest.min)}
                      {" – "}
                      {currencyFormatter.format(latest.max)}
                    </p>

                    <p className="stat-description">
                      Mínimo y máximo por {latest.unit}
                      {" · "}
                      {formatDate(latest.date)}
                    </p>
                  </article>

                  <article className="stat-card">
                    <h3>Variación de la moda</h3>

                    <p className="stat-value">
                      {variation === null
                        ? "Sin comparación"
                        : percentFormatter.format(variation)}
                    </p>

                    <p className="stat-description">
                      {variation !== null && first
                        ? `${formatDate(first.date)} al ${formatDate(
                            latest.date
                          )}`
                        : "Se necesitan dos fechas y una moda inicial mayor que cero."}
                    </p>
                  </article>
                </div>
              </section>
            )}

            <PricesTable
              records={records}
              selectedProductKey={selectedProductKey}
              onSelectProduct={setSelectedProductKey}
            />

            <PriceHistory
              records={records}
              selectedProductKey={selectedProductKey}
              onSelectProduct={setSelectedProductKey}
            />
          </>
        )}
      </main>

      <footer className="footer">
        <p>RP · Rubén Prieto</p>
        <p>
          Fuente: boletines de precios de PIMA/CENADA.
        </p>
      </footer>
    </div>
  );
}