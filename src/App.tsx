import { useEffect, useState } from "react";
import PricesTable from "./components/PricesTable";
import PriceHistory from "./components/PriceHistory";
import BulletinStatus from "./components/BulletinStatus";
import type { PriceRecord } from "./types/market";
import { productKey } from "./types/market";
import { getPrices } from "./services/marketService";

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
        setError("No pudimos cargar los precios. Intenta nuevamente.");
      } finally {
        if (active) setLoading(false);
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

  const latestBulletinDate = records.reduce(
    (date, record) => (record.date > date ? record.date : date),
    ""
  );

  const variation =
    history.length >= 2 && first && latest && first.mode > 0
      ? (latest.mode - first.mode) / first.mode
      : null;

  return (
    <div className="app-shell">
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>

      <aside className="sidebar">
        <a
            className="brand"
            href="#panorama"
            aria-label="Pizarra Agro, inicio"
          >
            <span className="brand-logo" aria-hidden="true">
              <svg
                viewBox="0 0 40 40"
                width="34"
                height="34"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="6" y="6" width="28" height="22" rx="3" />
                <path d="M12 13h16M12 19h10" />
                <path d="M15 28l-4 7M25 28l4 7M20 3v3" />
              </svg>
            </span>

            <div>
              <p className="brand-name">Pizarra Agro</p>
              <p className="brand-description">Inteligencia de mercado</p>
            </div>
          </a>

        <p className="nav-label">Mercado mayorista</p>

        <nav className="sidebar-nav" aria-label="Secciones del dashboard">
          <a href="#panorama">
            <span aria-hidden="true">◫</span>
            Panorama del mercado
          </a>
          <a href="#evolucion">
            <span aria-hidden="true">↗</span>
            Evolución de precios
          </a>
          <a href="#precios">
            <span aria-hidden="true">≡</span>
            Precios por producto
          </a>
          <a href="#boletines">
            <span aria-hidden="true">▤</span>
            Boletines y fuentes
          </a>
        </nav>

        <div className="sidebar-note">
          <span className="sidebar-note-icon" aria-hidden="true">
            ↗
          </span>
          <h2>El mercado, más claro.</h2>
          <p>
            Información para conocer el valor de lo que cultivamos.
          </p>
          <span className="location-label">CENADA · COSTA RICA</span>
        </div>

        <div className="sidebar-footer">
          <span className="profile-avatar" aria-hidden="true">
            PA
          </span>

          <div>
            <strong>Pizarra Agro</strong>
            <span>Precios del mercado agrícola</span>
          </div>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <p className="breadcrumb">
            Mercados <span>/</span> <strong>CENADA</strong>
          </p>

          <a
            className="source-link"
            href="https://www.pima.go.cr/boletin/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Consultar fuente oficial <span aria-hidden="true">↗</span>
          </a>
        </header>

        <main id="contenido" className="workspace" tabIndex={-1}>
          <section id="panorama" aria-labelledby="page-title">
            <div className="titlebar">
              <div>
                <p className="eyebrow">Observatorio de precios</p>
                <h1 id="page-title">Panorama del mercado.</h1>
                <p className="intro-description">
                  Precios mayoristas. Una perspectiva más completa.
                </p>
              </div>

              <div className="bulletin-date">
                <span>Último boletín disponible en la base</span>
                <strong>
                  {loading
                    ? "Consultando…"
                    : latestBulletinDate
                      ? formatDate(latestBulletinDate)
                      : "Sin fecha disponible"}
                </strong>
              </div>
            </div>

            <p className="market-notice">
              <span className="notice-dot" aria-hidden="true" />
              Precios de referencia de PIMA/CENADA. Corresponden a la
              fecha y unidad indicadas; no son cotizaciones en tiempo real.
            </p>
          </section>

          {loading ? (
            <section className="panel state-panel">
              <p role="status">Cargando precios del mercado…</p>
            </section>
          ) : error ? (
            <section className="panel state-panel">
              <p role="alert">{error}</p>
              <button
                className="action-button"
                type="button"
                onClick={() => window.location.reload()}
              >
                Volver a intentar
              </button>
            </section>
          ) : records.length === 0 ? (
            <section className="panel state-panel">
              <h2>Aún no hay precios disponibles</h2>
              <p>Los boletines importados aparecerán aquí.</p>
            </section>
          ) : (
            <>
              {latest && (
                <section aria-labelledby="selection-title">
                  <div className="selection-heading">
                    <div>
                      <p className="eyebrow">Producto seleccionado</p>
                      <h2 id="selection-title">{latest.product}</h2>
                    </div>
                    <span className="unit-badge">{latest.unit}</span>
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
                      <h3>Variación en el historial</h3>
                      <p className="stat-value variation-value">
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

              <div className="analysis-grid">
                <section id="evolucion" aria-label="Evolución de precios">
                  <PriceHistory
                    records={records}
                    selectedProductKey={selectedProductKey}
                    onSelectProduct={setSelectedProductKey}
                  />
                </section>

                <aside className="reading-guide">
                  <p className="eyebrow">Una lectura más clara</p>
                  <h2>Comprende los precios</h2>

                  <dl>
                    <div>
                      <dt>Moda</dt>
                      <dd>
                        Es el precio que aparece con mayor frecuencia
                        entre las observaciones del boletín.
                      </dd>
                    </div>
                    <div>
                      <dt>Mínimo y máximo</dt>
                      <dd>
                        Delimitan el rango de precios observado para
                        ese producto, unidad y fecha.
                      </dd>
                    </div>
                    <div>
                      <dt>Unidad de comercialización</dt>
                      <dd>
                        Compara precios de la misma unidad: una caja,
                        un kilo y un rollo no son equivalentes.
                      </dd>
                    </div>
                  </dl>

                  <p className="guide-note">
                    Las tarjetas y el gráfico muestran el historial del
                    producto seleccionado. El filtro de fecha de la
                    tabla modifica únicamente la tabla.
                  </p>
                </aside>
              </div>

              <section id="precios" aria-label="Precios por producto">
                <PricesTable
                  records={records}
                  selectedProductKey={selectedProductKey}
                  onSelectProduct={setSelectedProductKey}
                />
              </section>
            </>
          )}

          <section id="boletines" aria-label="Boletines y fuentes">
            <BulletinStatus />
          </section>

          <footer className="footer">
            <p><strong>Pizarra Agro</strong></p>
            <p>
              Panel independiente · Fuente: boletines de PIMA/CENADA.
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}