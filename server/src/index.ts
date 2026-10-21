import type { D1Database } from "@cloudflare/workers-types";

interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method !== "GET") {
      return Response.json(
        { error: "Método no permitido." },
        {
          status: 405,
          headers: { Allow: "GET" },
        }
      );
    }

    try {
      if (url.pathname === "/api/health") {
        await env.DB.prepare("SELECT 1").first();

        return Response.json({
          status: "ok",
          database: "connected",
        });
      }

      if (url.pathname === "/api/prices") {
        const { results } = await env.DB.prepare(`
          SELECT
            b.market_date AS date,
            p.name AS product,
            p.unit AS unit,
            pr.min_price AS min,
            pr.max_price AS max,
            pr.mode_price AS mode,
            pr.average_price AS average
          FROM prices AS pr
          INNER JOIN products AS p
            ON p.id = pr.product_id
          INNER JOIN bulletins AS b
            ON b.id = pr.bulletin_id
          ORDER BY b.market_date, p.name, p.unit
        `).all();

        return Response.json(results);
      }

      return Response.json(
        { error: "Ruta no encontrada." },
        { status: 404 }
      );
    } catch (error) {
      console.error("Error en la API:", error);

      return Response.json(
        { error: "No se pudo completar la consulta." },
        { status: 500 }
      );
    }
  },
};