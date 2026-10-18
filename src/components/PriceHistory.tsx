
import { useState } from "react";
import type { PriceRecord } from "../types/market";
import { productKey } from "../types/market";

type PriceHistoryProps = {
  records: PriceRecord[];
  selectedProductKey: string;
  onSelectProduct: (key: string) => void;
};

const money = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  maximumFractionDigits: 0,
});

function dateLabel(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

// UTC mantiene la posición de las fechas independiente
// de la zona horaria del navegador.
function dateValue(date: string) {
  return Date.parse(`${date}T00:00:00Z`);
}

export default function PriceHistory({
  records,
  selectedProductKey,
  onSelectProduct,
}: PriceHistoryProps) {
  const products = [
    ...new Map(
      records.map((record) => [
        productKey(record),
        {
          key: productKey(record),
          name: record.product,
          unit: record.unit,
        },
      ]),
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name, "es"));

const activeProduct =
  products.find((product) => product.key === selectedProductKey) ??
  products[0];

  const history = activeProduct
    ? records
        .filter((record) => productKey(record) === activeProduct.key)
        .sort((a, b) => a.date.localeCompare(b.date))
    : [];

  if (!activeProduct || history.length === 0) {
    return (
      <section className="panel history-panel">
        <h2>Histórico de precios</h2>
        <p>No hay registros disponibles para mostrar.</p>
      </section>
    );
  }

  const first = history[0];
  const last = history[history.length - 1];

  const variation =
    history.length >= 2 && first.mode > 0
      ? ((last.mode - first.mode) / first.mode) * 100
      : null;

  const variationText =
    variation === null
      ? "Sin comparación"
      : `${variation > 0 ? "+" : ""}${variation.toLocaleString("es-CR", {
          maximumFractionDigits: 1,
        })}%`;

  const width = 760;
  const height = 300;
  const margin = { top: 30, right: 70, bottom: 50, left: 90 };

  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const prices = history.map((record) => record.mode);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  // Añadimos espacio vertical incluso si todos los precios son iguales.
  const padding = Math.max((maxPrice - minPrice) * 0.2, maxPrice * 0.05, 1);
  const yMin = Math.max(0, minPrice - padding);
  const yMax = maxPrice + padding;

  const start = dateValue(first.date);
  const end = dateValue(last.date);

  function x(date: string) {
    if (start === end) {
      return margin.left + plotWidth / 2;
    }

    return margin.left + ((dateValue(date) - start) / (end - start)) * plotWidth;
  }

  function y(price: number) {
    return margin.top + ((yMax - price) / (yMax - yMin)) * plotHeight;
  }

  const points = history
    .map((record) => `${x(record.date)},${y(record.mode)}`)
    .join(" ");

  const ticks = Array.from(
    { length: 5 },
    (_, index) => yMin + ((yMax - yMin) * index) / 4,
  );

  return (
    <section className="panel history-panel" aria-labelledby="history-title">
      <h2 id="history-title">Histórico de precios</h2>

      <p className="demo-notice">
        Datos ficticios de demostración. No usar como referencia comercial.
      </p>

      <div className="filter-field history-selector">
        <label htmlFor="history-product">Producto y unidad</label>

        <select
          id="history-product"
          value={activeProduct.key}
          onChange={(event) => onSelectProduct(event.target.value)}
        >
          {products.map((product) => (
            <option key={product.key} value={product.key}>
              {product.name} · {product.unit}
            </option>
          ))}
        </select>
      </div>

      <div className="history-summary">
        <div>
          <p className="card-label">Última moda de la muestra</p>
          <p className="card-value">
            {money.format(last.mode)}
            <span className="price-unit"> / {activeProduct.unit}</span>
          </p>
        </div>

        <div>
          <p className="card-label">Cambio entre primera y última fecha</p>
          <p className="card-value">{variationText}</p>
        </div>
      </div>

      <p className="history-period">
        {dateLabel(first.date)} — {dateLabel(last.date)}
        {" · "}
        {history.length} observaciones
      </p>

      <div className="history-chart">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Precio de moda de ${activeProduct.name} por ${
            activeProduct.unit
          }, desde ${dateLabel(first.date)} hasta ${dateLabel(last.date)}.
          Primer precio: ${money.format(first.mode)}.
          Último precio: ${money.format(last.mode)}.`}
        >
          {ticks.map((tick, index) => (
            <g key={index}>
              <line
                x1={margin.left}
                x2={width - margin.right}
                y1={y(tick)}
                y2={y(tick)}
                stroke="#293950"
                strokeDasharray="4 4"
              />

              <text
                x={margin.left - 12}
                y={y(tick) + 4}
                textAnchor="end"
                fill="#a7b5c8"
                fontSize="12"
              >
                {money.format(tick)}
              </text>
            </g>
          ))}

          {history.length >= 2 && (
            <polyline
              points={points}
              fill="none"
              stroke="#71e2b0"
              strokeWidth="3"
              strokeLinejoin="round"
            />
          )}

          {history.map((record) => (
            <circle
              key={record.date}
              cx={x(record.date)}
              cy={y(record.mode)}
              r="5"
              fill="#71e2b0"
              stroke="#111c2e"
              strokeWidth="2"
            >
              <title>
                {dateLabel(record.date)}: {money.format(record.mode)}
                {" / "}
                {record.unit}
              </title>
            </circle>
          ))}

          <text
            x={x(first.date)}
            y={height - 16}
            textAnchor="middle"
            fill="#a7b5c8"
            fontSize="12"
          >
            {dateLabel(first.date)}
          </text>

          {history.length >= 2 && (
            <text
              x={x(last.date)}
              y={height - 16}
              textAnchor="middle"
              fill="#a7b5c8"
              fontSize="12"
            >
              {dateLabel(last.date)}
            </text>
          )}
        </svg>
      </div>

      <p className="chart-note">
        Cada punto representa una observación disponible. La línea une
        observaciones; no indica precios medidos entre ellas. El eje vertical
        se ajusta al rango mostrado.
      </p>

      {history.length === 1 && (
        <p className="chart-note">
          Necesitamos al menos dos fechas para calcular la variación.
        </p>
      )}
    </section>
  );
}