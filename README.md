# Station Saver VR

Ein immersives VR-Spiel, entwickelt mit Three.js und WebXR.
Ziel des Spiels ist es, Lecks in einem futuristischen Wartungskorridor zu reparieren, bevor der Sauerstoffgehalt der Station kritische Werte erreicht.

## 📋 Projektbeschreibung

Der Spieler befindet sich in einem Wartungstunnel einer Raumstation. Die Aufgabe besteht darin, das Lebenserhaltungssystem zu schützen: Rohre platzen zufällig und müssen schnell identifiziert und repariert werden. Gelingt dies nicht rechtzeitig, sinkt der Sauerstoffgehalt auf 0%, was zum Scheitern der Mission führt.

**Features:**
* **Rohrsystem:** Ein fest definiertes, verwinkeltes "Zick-Zack"-Layout sorgt für Variation und erhöht den Schwierigkeitsgrad.
* **Interaktive Mechanik:** Greifen von Ersatzteilen und physisches Platzieren an den Lecks.
* **Atmosphäre:** Steriles Sci-Fi-Setting mit dynamischer Beleuchtung und prozeduralen Texturen.
* **Game Loop:** Zeitdruck und Sauerstoff-Management mit Sieg/Niederlage-Bedingungen.

## 🚀 Installation & Start (Entwicklungsumgebung)

Das Projekt nutzt native ES6-Module. Zum Ausführen wird die Live Server Extension in VS Code benötigt. Um das Spiel auf der VR-Brille zu testen, wird **ADB Port Forwarding** verwendet.

### Voraussetzungen
1.  **Visual Studio Code** mit der Extension **"Live Server"**.
2.  **Android Debug Bridge (ADB)** (enthalten in den Android Platform-Tools).
3.  VR-Headset im **Entwicklermodus** und per USB verbunden.

### Schritt-für-Schritt Anleitung

**1. Lokalen Server starten**
* Öffnen Sie den Projektordner in Visual Studio Code.
* Machen Sie einen Rechtsklick auf die Datei `index.html`.
* Wählen Sie **"Open with Live Server"**.
* Der Browser öffnet sich (meistens unter Port `:5500`). Merken Sie sich diesen Port.

**2. Verbindung zur VR-Brille (ADB Reverse)**
Da WebXR eine sichere Verbindung (HTTPS) oder Localhost benötigt, muss der Port des PCs an die Brille weitergeleitet werden.

* Öffnen Sie die Eingabeaufforderung (CMD) oder das Terminal.
* **Wichtig:** Navigieren Sie zu dem Ordner, in dem Ihre `platform-tools` liegen (dort wo die `adb.exe` ist), falls der Befehl nicht global verfügbar ist.
  * *Beispiel:* `cd C:\Users\Name\AppData\Local\Android\Sdk\platform-tools`

Geben Sie dann folgende Befehle ein:

```bash
# 1. Prüfen, ob die Brille erkannt wird
adb devices

# 2. Port 5500 von der Brille auf den PC umleiten
# (Ersetzen Sie 5500, falls Live Server einen anderen Port nutzt)
adb reverse tcp:5500 tcp:5500