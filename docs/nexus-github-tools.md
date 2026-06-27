# Nexus GitHub API Tools

`nexus-chat-github.html` lädt den bestehenden `nexus-chat-glass.html` in einem Iframe und erweitert ihn im Browser um optionale read-only GitHub API Tools.

## Nutzung

1. `nexus-chat-github.html` öffnen.
2. In Nexus die Einstellungen öffnen.
3. Unter **GitHub API** einen GitHub Token speichern.
4. **GitHub API Tools erlauben** aktivieren.
5. Ein toolfähiges Modell auswählen und eine GitHub bezogene Frage stellen.

## Sicherheit

- Der GitHub Token wird nur im Browser gespeichert.
- Der Token wird nicht direkt an OpenRouter gesendet.
- GitHub API Ergebnisse werden als Tool Resultate an das Modell weitergegeben.
- Die eingebauten Tools sind read-only und führen keine Schreibaktionen aus.

## Eingebaute Tools

- `github_get_repo`
- `github_list_repo_contents`
- `github_get_file`
- `github_search_repositories`
- `github_search_code`
- `github_list_issues`
- `github_get_issue`
