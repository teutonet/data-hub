# Schützen externer Anwendungen mit OAuth

<!-- prettier-ignore -->
!!! warning "Nur für Admins der Plattform"
    Diese Konfiguration kann nur von Admins der Plattform durchgeführt werden, nicht von Admins eines Mandanten

Externe Anwendungen können über OAuth an den Keycloak des DataHubs angeschlossen werden, sodass der Zugriff nur einem Mandanten gewährt wird.

Im ersten Schritt muss ein neuer Client über die Keycloak Adminoberfläche angelegt werden (für viele Anwendungen gibt es bereits Anleitungen, z.B. für den [matrix-authentication-service](https://element-hq.github.io/matrix-authentication-service/setup/sso.html#keycloak)).

<!-- prettier-ignore -->
!!! warning "Warnung"
    Durch das Anlegen der Konfiguration können **alle** Mandanten diesen Client nutzen, die nächsten Schritte **müssen** ausgeführt werden, um den Zugang auf einzelne Mandanten zu beschränken.

Im nächsten Schritt muss im "Advanced" Tab unter "Authentication flow overrides" `tenant-check` als Browser Flow eingestellt werden.

Zum Schluss muss der erlaubte Mandant konfiguriert werden.
Leider gibt es in der Keycloak Oberfläche keine Möglichkeit, Attribute direkt zu editieren.

Daher ist der beste Weg, auf "Save" zu klicken und den resultierenden "POST"-Request in der Browser Console (F12) zu editieren und erneut zu versenden. Es muss das Attribut "tenant": "your-tenant-here" unter "attributes" eingefügt werden.
