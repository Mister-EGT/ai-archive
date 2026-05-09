# Webseite

Eine kleine Sammlung von Webtools und Dashboards.

## Inhalt

Dieses Repository enthält aktuell folgende Seiten:

| Seite | Beschreibung |
|---|---|
| `index.html` | Startseite mit Navigation zu den einzelnen Tools |
| `llm-archive/` | LLM Model Archiv mit Suche, Filtern, Sortierung, Detailansicht und Tokenrechner |
| `zeit-dashboard.html` | Zeit Dashboard mit mehreren Zeitquellen und lokaler Fallback Anzeige |

## Funktionen

### LLM Model Archiv

Das LLM Archiv bietet eine Übersicht über verschiedene KI Modelle. Die Daten werden aus `llm-archive/models.json` geladen und anschließend im Browser angezeigt.

Funktionen:

- Suche nach Modellnamen, Entwicklern und Tags
- Filter nach Entwickler, Modalität und Status
- Sortierung nach Name, Release Datum und Kosten
- Detailansicht für einzelne Modelle
- Tokenrechner für geschätzte Input und Output Kosten

### Zeit Dashboard

Das Zeit Dashboard zeigt die aktuelle Zeit an und kann verschiedene Zeit APIs verwenden.

Funktionen:

- Anzeige von Uhrzeit, Millisekunden, Datum, Zeitzone und UTC Offset
- Auswahl zwischen mehreren Zeitquellen
- Statusanzeige für aktive und passive Zeitquellen
- Automatischer Fallback auf die lokale Browserzeit, falls eine API nicht erreichbar ist

## Projektstruktur

```text
.
├── .editorconfig
├── .gitignore
├── README.md
├── index.html
├── styles.css
├── zeit-dashboard.html
├── zeit-dashboard.css
├── zeit-dashboard.js
└── llm-archive/
    ├── index.html
    ├── styles.css
    ├── app.js
    ├── models.json
    └── assets/
```

## Lokal starten

Da das LLM Archiv Daten über `fetch("models.json")` lädt, sollte die Seite über einen lokalen Webserver geöffnet werden.

Beispiel mit Python:

```bash
python -m http.server 8000
```

Danach kann die Seite im Browser geöffnet werden:

```text
http://localhost:8000
```

## Wartung

- HTML, CSS und JavaScript sollten möglichst getrennt bleiben.
- Neue Tools sollten über die Startseite verlinkt werden.
- Modelldaten in `llm-archive/models.json` sollten regelmäßig geprüft werden, da sich Preise, Kontextfenster und Verfügbarkeit ändern können.
- Die `.editorconfig` sorgt für einheitliche Formatierung in Editoren.

## Status

Das Projekt ist ein persönliches Webprojekt und wird laufend erweitert.
