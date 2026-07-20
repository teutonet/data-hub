# Umstellung auf Visualisierungsgruppen

## Motivation

In der bisherigen Implementierung wurde für jede Gruppe eine Organisation in Grafana angelegt. In Projekten konnten dann Berechtigungen definiert werden, damit die Metriken dieser Projekte in den Grafana-Organisationen angezeigt werden konnten.

Allerdings kommt diese relativ einfache Implementierung schnell an ihre Grenzen, da so Benutzergruppen fest mit Grafana Organisationen verknüpft sind, was in der Praxis nicht immer wünschenswert ist.

## Neue Abstraktionsebene: Visualisierungsgruppen

In der Projektabstraktion werden bereits alle Daten verwaltet. Dort finden sich Sensoren und Metriken, aber auch Dateien im S3.

Die neue Visualisierungsgruppenabstraktion ist dazu gedacht, alle Applikationen zu bündeln, die auf diese Daten zugreifen. Aktuell betrifft dies nur das Grafana, allerdings sind weitere Komponenten im Planung.

Damit ist eine Benutzergruppe nicht mehr automatisch einer Grafana Organisation zugeordnet. Dadurch wird ermöglicht, dass auch rein lesende Berechtigungen für Grafana Organisationen vergeben werden können.

Die Umstellung auf Visualisierungsgruppen ist vollautomatisiert und erfordert keinen manuellen Eingriff von Kundenseite, keine Daten und auch keine Grafana Dashboards gehen verloren. Nach der Migration funktioniert alles wie zuvor.

Bei der Migration wurden alle Benutzergruppen als Visualisierungsgruppen mit identischem Zugriff auf Projekte angelegt, außerdem hat die Benutzergruppe Schreibzugriff auf die entsprechende Visualisierungsgruppe. Diese ist eine einmalige Migration, danach müssen Benutzergruppen und Visualisierungsgruppen getrennt voneinander angelegt und berechtigt werden.
