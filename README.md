# Webseite

Eine kleine Sammlung von Webtools, Dashboards und Experimenten.

## Inhalt

Dieses Repository enthält aktuell folgende Seiten:

| Seite | Beschreibung |
|---|---|
| `index.html` | Startseite mit Navigation zu den einzelnen Tools |
| `llm-archive/` | LLM Model Archiv mit Suche, Filtern, Sortierung, Detailansicht und Tokenrechner |
| `zeit-dashboard.html` | Zeit Dashboard mit mehreren Zeitquellen und lokaler Fallback Anzeige |
| `neural-3d.html` | 3D Visualisierung und Analyseoberfläche für neuronale Netzwerke |
| `nexus-chat.html` | OpenRouter Chat Oberfläche mit plattformunabhängigen Fluent UI Icons |
| `coc-dashboard/` | Clash of Clans Control Room mit Token Speicherung, Diagnose und API Ansichten |
| `opsucht/` | OPSUCHT API Dashboard mit Statuskarten und Detailansichten |

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

### Nexus Chat

Nexus Chat wird über `nexus-chat.html` geöffnet. Die eigentliche Chat App liegt intern in `nexus-chat-core.html`; die öffentliche Startdatei ergänzt plattformunabhängige inline SVG Icons, damit die UI Icons nicht mehr von Windows Schriftarten abhängen.

### Weitere Experimente

Neben den größeren Bereichen liegen weitere einzelne HTML Tools im Repository. Sie sind bewusst leichtgewichtig gehalten und benötigen keine Build Pipeline.

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
├── neural-3d.html
├── nexus-chat.html
├── nexus-chat-core.html
├── coc-dashboard/
├── llm-archive/
└── opsucht/
```

## Lokal starten

Da einzelne Seiten Daten über `fetch(...)` laden, sollte das Projekt über einen lokalen Webserver geöffnet werden.

Beispiel mit Python:

```bash
python -m http.server 8000
```

Danach kann die Seite im Browser geöffnet werden:

```text
http://localhost:8000
```

## Wartung

- Neue Tools sollten über die Startseite verlinkt werden.
- HTML, CSS und JavaScript sollten möglichst getrennt bleiben, wenn ein Tool größer wird.
- Einzelne Experimente dürfen weiterhin als eigenständige HTML Dateien liegen, solange sie übersichtlich bleiben.
- Modelldaten in `llm-archive/models.json` sollten regelmäßig geprüft werden, da sich Preise, Kontextfenster und Verfügbarkeit ändern können.
- Die `.editorconfig` sorgt für einheitliche Formatierung in Editoren.

## Status

Das Projekt ist ein persönliches Webprojekt und wird laufend erweitert.
