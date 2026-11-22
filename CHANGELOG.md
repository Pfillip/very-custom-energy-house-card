# Changelog

## v0.5.0

### Neu
- **Eigene Farben für alle Verbraucher**: Wallbox, Wärmepumpe, Klimaanlage, Durchlauferhitzer, jeder Heizstab sowie die Beleuchtung vorn und hinten haben jetzt eine Farbe (`color`). Sie gilt für Leitung, Flussknoten, Chip und Balkensegment. Auch das Segment „Nicht erfasst“ lässt sich einfärben (`untracked_color`).
- **Schrift der Gesamtleistung** neben dem Verbrauchsbalken einstellbar (`total_font_weight`: Leicht, Normal, Mittel, Fett).

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
