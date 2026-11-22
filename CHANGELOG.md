# Changelog

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
