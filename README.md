# Pizarra de precios CENADA

Aplicación web para consultar y actualizar los precios de productos agrícolas del CENADA a partir de sus boletines.

🌐 **[Ver la página](https://pizarra-api.allanbanilla.workers.dev/)**

## Tecnologías utilizadas

- **Astro:** desarrollo de la página web.
- **Python:** scripts para procesar los boletines y actualizar los precios.
- **GitHub Actions:** ejecución automatizada de los scripts de actualización.
- **Cloudflare:** alojamiento de la aplicación.

## Proceso de actualización

1. Los scripts de Python procesan los boletines del CENADA.
2. Se extraen los datos de los productos y sus precios.
3. Se actualiza la información disponible en la página.

El proceso se ejecuta mediante GitHub Actions para automatizar la actualización de los datos.

## Fuente de información

Los precios publicados provienen de los boletines del **Centro Nacional de Abastecimiento y Distribución de Alimentos (CENADA)**.

Este proyecto es una herramienta independiente de consulta y no representa un sitio oficial del CENADA.