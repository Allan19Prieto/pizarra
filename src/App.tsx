import PricesTable from "./components/PricesTable";
import { demoPrices } from "./data/demoPrices";
import PriceHistory from "./components/PriceHistory";

function App() {
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

        <span className="status">En desarrollo</span>
      </header>

      <section className="intro">
        <p className="eyebrow">MERCADO CENADA</p>

        <h1>Entendé cómo cambian los precios.</h1>

        <p className="intro-description">
          Consultá los precios publicados en los boletines de
          PIMA/CENADA y explorá su evolución en el tiempo.
        </p>
      </section>

      <section className="summary" aria-label="Estado de los datos">
        <article className="card">
          <p className="card-label">Último boletín importado</p>
          <p className="card-value">Pendiente</p>
          <p className="card-description">
            Todavía no conectamos la fuente oficial.
          </p>
        </article>

        <article className="card">
          <p className="card-label">Productos disponibles</p>
          <p className="card-value">—</p>
          <p className="card-description">
            Se mostrarán cuando importemos datos.
          </p>
        </article>

        <article className="card">
          <p className="card-label">Histórico de precios</p>
          <p className="card-value">—</p>
          <p className="card-description">
            Conservaremos los registros por fecha y unidad.
          </p>
        </article>
      </section>

      <PricesTable records={demoPrices} />

      <PriceHistory records={demoPrices} />

      <footer>
        RP · Rubén Prieto — Fuente prevista: boletines de PIMA/CENADA.
      </footer>
    </main>
  );
}

export default App;