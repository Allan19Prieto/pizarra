import { useState } from "react";
import type { PriceRecord } from "../types/market";
import { productKey } from "../types/market";

type PricesTableProps = {
  records: PriceRecord[];
  selectedProductKey: string;
  onSelectProduct: (key: string) => void;
};

const currencyFormatter = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function PricesTable({
  records,
  selectedProductKey,
  onSelectProduct,
}: PricesTableProps) {
  const dates = [...new Set(records.map((record) => record.date))]
    .sort()
    .reverse();

  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  // Si todavía no se eligió una fecha, usamos la más reciente.
  const activeDate = dates.includes(selectedDate)
    ? selectedDate
    : (dates[0] ?? "");

  const normalizedSearch = normalizeText(search);

  const filteredRecords = records
    .filter((record) => {
      const matchesDate = record.date === activeDate;
      const matchesSearch = normalizeText(record.product).includes(
        normalizedSearch,
      );

      return matchesDate && matchesSearch;
    })
    .sort((a, b) => a.product.localeCompare(b.product, "es"));

  return (
    <section className="panel" aria-labelledby="prices-title">
      <h2 id="prices-title">Precios de productos</h2>

      <p className="demo-notice">
        Datos ficticios de demostración. No usar como referencia comercial.
      </p>

      <div className="filters">
        <div className="filter-field">
          <label htmlFor="product-search">Buscar producto</label>

          <input
            id="product-search"
            type="search"
            placeholder="Ejemplo: culantro"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="filter-field">
          <label htmlFor="bulletin-date">Fecha de muestra</label>

          <select
            id="bulletin-date"
            value={activeDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            disabled={dates.length === 0}
          >
            {dates.length === 0 && (
              <option value="">Sin fechas disponibles</option>
            )}

            {dates.map((date) => (
              <option key={date} value={date}>
                {formatDate(date)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="results-count" role="status">
        {filteredRecords.length} registros encontrados
      </p>

      {filteredRecords.length > 0 ? (
        <div
          className="table-container"
          role="region"
          aria-label="Tabla de precios con desplazamiento horizontal"
          tabIndex={0}
        >
          <table className="prices-table">
            <caption>
              Precios ficticios en colones — {formatDate(activeDate)}
            </caption>

            <thead>
              <tr>
                <th scope="col">Producto</th>
                <th scope="col">Unidad</th>
                <th scope="col" className="numeric">Mínimo</th>
                <th scope="col" className="numeric">Máximo</th>
                <th scope="col" className="numeric">Moda</th>
                <th scope="col" className="numeric">Promedio</th>
              </tr>
            </thead>

            <tbody>
              {filteredRecords.map((record) => (
                <tr
                  key={JSON.stringify([
                    record.date,
                    record.product,
                    record.unit,
                ])}
                className={
                    productKey(record) === selectedProductKey
                    ? "selected-row"
                    : undefined
                }
                >
                  <td>
                    <button
                      type="button"
                      className="product-button"
                      aria-pressed={productKey(record) === selectedProductKey}
                      onClick={() => onSelectProduct(productKey(record))}
                    >
                      {record.product}
                    </button>
                  </td>
                  <td>{record.unit}</td>
                  <td className="numeric">
                    {currencyFormatter.format(record.min)}
                  </td>
                  <td className="numeric">
                    {currencyFormatter.format(record.max)}
                  </td>
                  <td className="numeric mode-price">
                    {currencyFormatter.format(record.mode)}
                  </td>
                  <td className="numeric">
                    {currencyFormatter.format(record.average)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          No hay registros que coincidan con los filtros.
        </div>
      )}
    </section>
  );
}