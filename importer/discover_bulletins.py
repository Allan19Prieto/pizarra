import html
import http.cookiejar
import json
import re
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path


INDEX_URL = "https://bpm.pima.go.cr/cm.aspx?id=4"


class LinkParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() != "a":
            return

        href = dict(attrs).get("href")

        if href:
            self.links.append(href)


def extract_bulletins(body: str) -> list[dict[str, str]]:
    decoded = html.unescape(body)

    headings = list(
        re.finditer(
            r"Boletín\s+Diario[^<]*?"
            r"Plaza\s+[^<]*?(\d{2}-\d{2}-\d{4})",
            decoded,
            flags=re.IGNORECASE,
        )
    )

    if not headings:
        raise ValueError(
            "No se encontraron encabezados de boletines diarios."
        )

    entries = {}

    for index, heading in enumerate(headings):
        end = (
            headings[index + 1].start()
            if index + 1 < len(headings)
            else len(decoded)
        )

        block = decoded[heading.end():end]

        parser = LinkParser()
        parser.feed(block)

        candidates = set()

        for href in parser.links:
            url = urllib.parse.urljoin(INDEX_URL, href)
            parsed = urllib.parse.urlparse(url)

            if (
                parsed.scheme == "https"
                and parsed.netloc.lower() == "bpm.pima.go.cr"
                and parsed.path.lower() == "/accessdoc.aspx"
            ):
                candidates.add(url)

        published_date = heading.group(1)

        if len(candidates) != 1:
            raise ValueError(
                f"El boletín {published_date} tiene "
                f"{len(candidates)} enlaces candidatos. "
                "Hay que revisar ese bloque antes de descargar."
            )

        market_date = datetime.strptime(
            published_date, "%d-%m-%Y"
        ).date().isoformat()

        url = candidates.pop()

        if market_date in entries and entries[market_date] != url:
            raise ValueError(
                f"Hay enlaces distintos para la fecha {market_date}."
            )

        entries[market_date] = url

    return [
        {"date": date, "url": url}
        for date, url in sorted(entries.items(), reverse=True)
    ]


def read_page(opener, request):
    with opener.open(request, timeout=30) as response:
        final_url = response.geturl()
        charset = response.headers.get_content_charset() or "utf-8"
        body = response.read().decode(charset, errors="replace")

    return final_url, body


def main():
    cookies = http.cookiejar.CookieJar()

    opener = urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(cookies)
    )

    request = urllib.request.Request(
        INDEX_URL,
        headers={
            "User-Agent": "Pizarra/0.1",
            "Accept": "text/html",
        },
    )

    try:
        final_url, body = read_page(opener, request)

        if urllib.parse.urlparse(final_url).path.endswith(
            "/ScreenResolution.aspx"
        ):
            print("Inicializando la consulta pública de PIMA…")

            screen_request = urllib.request.Request(
                "https://bpm.pima.go.cr/ScreenResolution.ashx",
                data=b'{"width":1440,"height":900}',
                headers={
                    "User-Agent": "Pizarra/0.1",
                    "Content-Type": "application/json; charset=UTF-8",
                    "X-Requested-With": "XMLHttpRequest",
                    "Referer": final_url,
                },
                method="POST",
            )

            with opener.open(screen_request, timeout=30) as response:
                response.read()

            final_url, body = read_page(opener, request)

            if urllib.parse.urlparse(final_url).path.endswith(
                "/ScreenResolution.aspx"
            ):
                raise SystemExit(
                    "PIMA continúa mostrando la página intermedia. "
                    "No se generó una lista nueva."
                )

    except urllib.error.HTTPError as error:
        raise SystemExit(
            f"La consulta respondió HTTP {error.code}. "
            "No se generó una lista nueva."
        )
    except urllib.error.URLError as error:
        raise SystemExit(
            f"No se pudo consultar PIMA: {error.reason}"
        )
    except TimeoutError:
        raise SystemExit(
            "PIMA tardó demasiado en responder. "
            "No se generó una lista nueva."
        )

    output = Path(__file__).resolve().parent / "output"
    output.mkdir(parents=True, exist_ok=True)

    html_path = output / "pima-index.html"
    html_path.write_text(body, encoding="utf-8")

    try:
        bulletins = extract_bulletins(body)
    except ValueError as error:
        raise SystemExit(
            f"No se pudo completar la identificación: {error}\n"
            f"Puedes revisar el HTML en: {html_path}\n"
            "Si existe un bulletins.json anterior, no fue actualizado."
        )

    manifest_path = output / "bulletins.json"
    temporary_path = output / "bulletins.json.tmp"

    temporary_path.write_text(
        json.dumps(bulletins, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    temporary_path.replace(manifest_path)

    print(f"URL final: {final_url}")
    print(f"HTML guardado: {html_path}")
    print(f"Boletines identificados: {len(bulletins)}")
    print(f"Listado guardado: {manifest_path}")

    for bulletin in bulletins:
        print(f"{bulletin['date']} -> {bulletin['url']}")

    return opener, bulletins
    


    
if __name__ == "__main__":
    main()