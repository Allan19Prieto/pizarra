import { useState } from "react";
import PricesTable from "./components/PricesTable";
import PriceHistory from "./components/PriceHistory";
import { demoPrices } from "./data/demoPrices";
import { productKey } from "./types/market";

const money = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  maximumFractionDigits: 2,
});

function formatDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

function App() {
  const [selectedProductKey, setSelectedProductKey] = useState(
    demoPrices.length > 0 ? productKey(demoPrices[0]) : "",
  );

  const history = demoPrices
    .filter((record) => productKey(record) === selectedProductKey)
    .sort((a, b) => a.date.localeCompare(b.date));

  const first = history[0];
  const latest = history[history.length - 1];

  const variation =
    first && latest && history.length >= 2 && first.mode > 0
      ? ((latest.mode - first.mode) / first.mode) * 100
      : null;

  const variationText =
    variation === null
      ? "—"
      : `${variation > 0 ? "+" : ""}${variation.toLocaleString("es-CR", {
          maximumFractionDigits: 1,
        })}%`;

  return (
    <main className="dashboard">
      <header className="header">
        <div className="brand">
          <span className="brand-logo">RP</span>

          <div>
            <p className="brand-name">Rubén Prieto</p>
            <p className="brand-description">
              Inteligencia de precios agrícolas
            </p>
          </div>
        </div>

        <span className="status">Demostración</span>
      </header>

      <section className="intro">
        <p className="eyebrow">MERCADO CENADA</p>

        <h1>Entendé cómo cambian los precios.</h1>

        <p className="intro-description">
          Explorá precios por producto y unidad, y compará su evolución
          entre las fechas disponibles.
        </p>

        <p className="demo-notice">
          Esta versión utiliza datos ficticios de prueba. Todavía no está
          conectada a los boletines oficiales.
        </p>
      </section>

      <section
        className="selection-heading"
        aria-label="Producto seleccionado"
      >
        <h2>
          {latest
            ? `${latest.product} · ${latest.unit}`
            : "Sin producto seleccionado"}
        </h2>

        <p>
          Las tarjetas y el gráfico muestran el histórico completo del
          producto. El filtro de fecha afecta únicamente a la tabla.
        </p>
      </section>

      <section className="summary" aria-label="Indicadores del producto">
        <article className="card">
          <p className="card-label">Última moda de la muestra</p>

          <p className="card-value">
            {latest ? money.format(latest.mode) : "—"}
          </p>

          <p className="card-description">
            {latest
              ? `Por ${latest.unit} · ${formatDate(latest.date)}`
              : "Sin observaciones disponibles."}
          </p>
        </article>

        <article className="card">
          <p className="card-label">Rango de la última observación</p>

          <p className="card-value range-value">
            {latest
              ? `${money.format(latest.min)} – ${money.format(latest.max)}`
              : "—"}
          </p>

          <p className="card-description">
            {latest
              ? `Mínimo y máximo por ${latest.unit} · ${formatDate(latest.date)}`
              : "Sin observaciones disponibles."}
          </p>
        </article>

        <article className="card">
          <p className="card-label">Variación de la moda</p>

          <p className="card-value">{variationText}</p>

          <p className="card-description">
            {variation !== null && first && latest
              ? `${formatDate(first.date)} a ${formatDate(latest.date)}`
              : "Se requieren dos fechas y un precio inicial mayor que cero."}
          </p>
        </article>
      </section>

      <PricesTable
        records={demoPrices}
        selectedProductKey={selectedProductKey}
        onSelectProduct={setSelectedProductKey}
      />

      <PriceHistory
        records={demoPrices}
        selectedProductKey={selectedProductKey}
        onSelectProduct={setSelectedProductKey}
      />

      <footer>
        RP · Rubén Prieto — Datos de demostración. Fuente prevista:
        boletines de PIMA/CENADA.
      </footer>
    </main>
  );
}

export default App;