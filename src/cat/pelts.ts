enum PeltType {
	SolidColor = 'SolidColor',
	Tabby = 'Tabby',
}

enum PeltColor {
	White = 'White',
	Silver = 'Silver',
	Gray = 'Gray',
	PaleGrey = 'Pale Gray',
	Black = 'Black',
	Cream = 'Cream',
	PaleGinger = 'Pale Ginger',
	Ginger = 'Ginger',
	Golden = 'Golden',
	Yellow = 'Yellow',
	Brown = 'Brown',
	GoldenBrown = 'Golden-Brown',
	DarkBrown = 'Dark Brown',
}

type SolidColorPelt = {
	type: PeltType.SolidColor;
	color: PeltColor;
};

type TabbyPelt = {
	type: PeltType.Tabby;
	color: PeltColor;
	tabbyPattern: 'Mackerel' | 'Classic' | 'Spotted' | 'Ticked' | undefined;
};

type Pelt = SolidColorPelt | TabbyPelt;

export { PeltType, PeltColor };
export type { Pelt };
