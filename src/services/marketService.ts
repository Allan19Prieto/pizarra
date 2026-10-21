import type { PriceRecord } from "../types/market";

function isPriceRecord(value: unknown): value is PriceRecord {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  const hasValidText =
    typeof record.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(record.date) &&
    typeof record.product === "string" &&
    record.product.trim().length > 0 &&
    typeof record.unit === "string" &&
    record.unit.trim().length > 0;

  const { min, max, mode, average } = record;

  if (
    !hasValidText ||
    typeof min !== "number" ||
    typeof max !== "number" ||
    typeof mode !== "number" ||
    typeof average !== "number"
  ) {
    return false;
  }

  return (
    [min, max, mode, average].every(Number.isFinite) &&
    min >= 0 &&
    max >= min &&
    mode >= min &&
    mode <= max &&
    average >= min &&
    average <= max
  );
}

export async function getPrices(): Promise<PriceRecord[]> {
  const url = "/api/prices";
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `No se pudieron obtener los precios: HTTP ${response.status}`
    );
  }

  // Leemos la respuesta como texto para revisar su contenido.
  const text = await response.text();

  if (text.trimStart().startsWith("<")) {
    throw new Error(
      "La API devolvió HTML. Revisa que el servidor esté encendido y que el proxy de Vite esté configurado."
    );
  }

  // Convertimos el texto a JSON.
  let data: unknown;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("La API no devolvió un JSON válido.");
  }

  if (!Array.isArray(data)) {
    throw new Error("La API debe devolver una lista de precios.");
  }

  const invalidIndex = data.findIndex(
    (record) => !isPriceRecord(record)
  );

  if (invalidIndex !== -1) {
    console.error("Registro inválido:", data[invalidIndex]);

    throw new Error(
      `El registro número ${invalidIndex + 1} contiene datos inválidos.`
    );
  }

  return data;
}