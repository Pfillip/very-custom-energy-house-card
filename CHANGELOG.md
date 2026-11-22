# Changelog

## v0.6.0 (in Arbeit)

### Neu
- **Zweites Hausmotiv: Reihenendhaus** (`house_style: terraced`): Flachdach mit PV, dunkler Vorbau, eingeschossiger Anbau mit Haustür, angedeutetes Nachbarhaus, zwei Garagen mit PV und roter Einfahrt, Garten hinter dem Haus. Wechselrichter, Akku und Klimaanlage hängen an der Giebelseite, die Wärmepumpe steht vor dem Haus, die Wallbox an der Garage. Licht im Haus, Beleuchtung vorn und Gartenbeleuchtung funktionieren wie beim bisherigen Haus. Im Editor unter „Hausmotiv“ wählbar.
- **Jacuzzi** als neuer Großverbraucher (`devices.jacuzzi`). Im Reihenendhaus-Motiv erscheint er im Garten, solange er läuft, mit dezent animierten Blasen und Dampf. Wie alle Großverbraucher steht er auch im Verbrauchsbalken und in der Flussansicht.
- **Balken-Karte** (`custom:very-custom-energy-bar-card`): eine zweite Karte im selben Paket mit nur dem Verbrauchsbalken – Gesamtleistung, Balken, Legende, optional Kennzahlen (`show_kpis`, an) und Chips (`show_chips`, aus). Sie nutzt dieselbe Konfiguration wie die Hauskarte und hat einen eigenen, schlankeren Editor. Im Layout-Tab ist sie ab 4 Spalten × 2 Reihen nutzbar.

## v0.5.0

### Neu
- **Eigene Farben für alle Verbraucher**: Wallbox, Wärmepumpe, Klimaanlage, Durchlauferhitzer, jeder Heizstab sowie die Beleuchtung vorn und hinten haben jetzt eine Farbe (`color`). Sie gilt für Leitung, Flussknoten, Chip und Balkensegment. Auch das Segment „Nicht erfasst“ lässt sich einfärben (`untracked_color`).
- **Schrift der Gesamtleistung** neben dem Verbrauchsbalken einstellbar (`total_font_weight`: Leicht, Normal, Mittel, Fett).
- **Licht im Haus** (`devices.indoor_lighting`): Ist die Entität an, leuchten Fenster und Türglas. Die Helligkeit folgt dem Helligkeitswert des Lichts oder optional einer eigenen Entität (`brightness`: number, input_number oder Sensor, 0–100 % oder 0–255). Ein Chip zeigt „an · 70 %“, optional mit Leistungssensor für den Verbrauchsbalken.
- **Kartengröße im Layout-Tab**: Im Sections-Dashboard lässt sich jetzt auch die Höhe einstellen. Bei fester Höhe passt sich die Grafik an, Balken und Kennzahlen scrollen notfalls. Mindestgröße: 6 Spalten × 5 Reihen.
- **Breites Layout**: Ab etwa 720 px Breite stehen Chips, Verbrauchsbalken und Kennzahlen neben dem Haus statt darunter.
- **Mitwachsende Schrift**: Gesamtleistung, Legende und Kennzahlen skalieren mit der Kartenbreite.

### Geändert
- Die GitHub-Workflows nutzen Actions-Versionen für Node 24.
- Neue Live-Demo auf GitHub Pages und überarbeitete README.

## v0.4.1

### Behoben
- **Visueller Editor aufgeräumt**: Großverbraucher haben jetzt je einen eigenen aufklappbaren Abschnitt (Wallbox, Wärmepumpe, Klimaanlage, Durchlauferhitzer, Beleuchtung Vorgarten, Beleuchtung Garten hinten) mit untereinander angeordneten Feldern und kurzen Beschriftungen. Bereits konfigurierte Geräte sind aufgeklappt.
- Felder waren gegeneinander verschoben, weil Entitätsauswahl und Textfeld nebeneinander standen. Das betraf auch die Kennzahlen sowie die Zeilen für Verbraucher und Heizstäbe. Dort stehen die Felder jetzt ebenfalls untereinander.

## v0.4.0

### Neu
- **Garten hinter dem Haus** mit Rasen, Baum, Hecke und eigener **Gartenbeleuchtung** (`devices.garden_lighting`): drei Poller, die einer eigenen Licht- oder Schalter-Entität folgen. Wie beim Vorgarten gibt es einen Chip „an/aus“ und optional einen Leistungssensor für den Verbrauchsbalken.

### Geändert
- **Kennzahlen komplett ausblendbar**: Der Schalter „Kennzahlen anzeigen“ steht jetzt oben im Bereich „Kennzahlen“. Ist er aus, verschwinden die Kennzahlenzeile und die Felder für die drei Plätze.
- Solarmodule liegen enger beieinander.
- Die Beschriftung der Wärmepumpe ist etwas nach rechts gerückt, damit sie nicht über dem Garten liegt.
- Editor: Die Beleuchtungsfelder heißen jetzt „Beleuchtung Vorgarten“ und „Beleuchtung Garten hinten“.

## v0.3.0

### Neu
- **Außenbeleuchtung** (`devices.lighting`): Licht, Schalter oder `input_boolean`. Ist sie an, leuchten eine Wandleuchte über der Haustür und drei Poller entlang des Wegs. Ein Chip unter dem Haus zeigt „an/aus“ und öffnet per Klick den More-Info-Dialog. Mit optionalem Leistungssensor (`power`) erscheint sie im Verbrauchsbalken und in der Flussansicht.
- **Haus mit Fenstern, Haustür und Weg**: zwei Fenster an der Vorderwand, ein Giebelfenster, Haustür mit Vordach und Stufe sowie ein Plattenweg in den Garten.
- **Geräte als 3D-Körper**: Akku, Wechselrichter, Zählerkasten, Wallbox, Klimaanlage und Wärmepumpe ragen jetzt räumlich aus der Wand, mit Details wie Ladestandsfenster, Status-LEDs, Lüftern und Ladekabel.

### Geändert
- Vorderwand neu aufgeteilt: Klimaanlage, Fenster, Tür, Zählerkasten, Wallbox, Fenster. Die Beschriftung der Wallbox steht jetzt unten neben „Zuhause“.
- Editor: Die Schalter „Vorzeichen umkehren“ stehen unter dem Netz- bzw. Akku-Sensor, damit die Entitätsnamen nicht mehr abgeschnitten werden.

## v0.2.0

### Neu
- **Klimaanlage** als Großverbraucher (`devices.air_conditioner`).
- **Kennzahlen frei belegbar** (`kpis`): drei Plätze mit eigener Entität und eigenem Namen. Ohne Entität zeigen die ersten beiden die live berechnete Autarkie und den Eigenverbrauch.

### Geändert
- `entities.pv_energy_today` ist veraltet und wird weiter als Rückfall für `kpis.pv_today` gelesen.

## v0.1.0

- Erste Version: Haus- und Flussansicht, Wallbox, Wärmepumpe, Durchlauferhitzer, Heizstäbe, Verbrauchsbalken, Kennzahlen, visueller Editor, Deutsch und Englisch.
