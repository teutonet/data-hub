# Anzeigename

## Was sind Anzeigenamen?

Mit einem `Displayname` (Anzeigename) können Sie einer Ressource einen beliebigen Namen geben, ganz unabhängig von der URL der Ressource, da dieser separat gespeichert wird.  
Der Anzeigename wird anstelle des technischen Namens der Ressource angezeigt. Dies ermöglicht es, aussagekräftige Namen mit beliebigen Zeichen zu verwenden, ohne dadurch die URL der Ressource anpassen zu müssen.

## Erstellen von Anzeigenamen

Unter `Berechtigungsverwaltung` können Sie Tenants, Gruppen, Projekte und deren Berechtigungen verwalten und erstellen.  
Bei der Erstellung von Tenants, Gruppen, Visualisierungsgruppen und Projekten kommen die Anzeigenamen zum Einsatz.

### Beispiel Gruppenerstellung

<figure>
   <img src="/screenshots/permission-ui-groups-create-modal-empty.webp">
</figure>

Den gewünschten Gruppen-Anzeigenamen geben Sie im Eingabefeld `Gruppenname` an.

<!-- prettier-ignore -->
!!! info "Information"
      Anzeigenamen können aus beliebigen Zeichen, auch Leerzeichen, bestehen.  
      Es muss jedoch mindestens ein Zeichen verwendet werden, was kein Leerzeichen ist.

<figure>
   <img src="/screenshots/display-names-groups-create-modal-filled.webp">
</figure>

Die Ressourcen-URL wird automatisch aus dem Anzeigenamen abgeleitet. Dabei wird sie so optimiert, dass sie die Eingabebeschränkungen erfüllt:

- Großbuchstaben werden zu Kleinbuchstaben
- Leerzeichen werden durch Bindestriche ersetzt
- Umlaute werden aufgelöst (z.B. wird "Ü" zu "ue")
- Sonderzeichen werden entfernt
- Die Länge wird automatisch auf 36 Zeichen begrenzt

<figure>
   <img src="/screenshots/display-names-groups-create-modal-filled-special-chars.webp">
</figure>

Sie haben die Möglichkeit, die URL der Ressource bei Bedarf unabhängig vom Anzeigenamen zu verändern. Es müssen jedoch die oben genannten Kriterien eingehalten werden.

<figure>
   <img src="/screenshots/display-names-groups-create-modal-filled-custom-url.webp">
</figure>

## Ressourcennamen für Bucket Storage und Grafana

### Bucket-Name

Um den Bucket-Namen des jeweiligen Projektes für den Bucket-Storage einzusehen, öffnen Sie unter `Berechtigungsverwaltung` den Tenant, unter dem das Projekt angelegt wurde und wählen Sie das jeweilige Projekt aus.  
Der Bucket-Name ist in dem Text-Feld mit der Überschrift `S3-Bucket-Name` einsehbar.

<figure>
   <img src="/screenshots/display-names-bucket-name.webp">
</figure>

### Grafana Organization Name

Um den Grafana-Org (Organization) Namen des jeweiligen Projektes für die Grafana Visualisierung einzusehen, öffnen Sie unter `Berechtigungsverwaltung` den Tenant, unter dem das Projekt angelegt wurde und wählen die jeweilige `Visualisierungsgruppe` aus.  
Der Grafana-Org Name ist in dem Text-Feld mit der Überschrift `Grafana-Org-Id` einsehbar.

<figure>
   <img src="/screenshots/display-names-grafana-org-name.webp">
</figure>

## Bearbeiten der Anzeigenamen

Falls Sie den Anzeigenamen einer Ressource bearbeiten möchten, können Sie dies in der jeweiligen Ressourcenübersicht unter `Anzeigename ändern` tun.

<figure>
   <img src="/screenshots/display-names-edit-button.webp">
</figure>
