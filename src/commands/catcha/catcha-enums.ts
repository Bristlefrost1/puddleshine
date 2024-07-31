enum Subcommand {
	Roll = 'roll',
	List = 'list',
	Locate = 'locate',
	Duplicates = 'duplicates',
	Remaining = 'remaining',
	View = 'view',
	Archive = 'archive',
	Stats = 'stats',
	Event = 'event',
	Burn = 'burn',

	Trade = 'trade',
	TradeRequest = 'request',
	TradePending = 'pending',
	TradeAccept = 'accept',
	TradeDecline = 'decline',
	TradeCancel = 'cancel',
	TradeClear = 'clear',
}

enum RarityString {
	OneStar = '1 star',
	TwoStars = '2 stars',
	ThreeStars = '3 stars',
	FourStars = '4 stars',
	FiveStars = '5 stars',
}

enum ListSubcommandOption {
	User = 'user',
	Page = 'page',
	Rarity = 'rarity',
	OnlyInverted = 'only_inverted',
	OnlyVariant = 'only_variant',
}

enum LocateSubcommandOption {
	Card = 'card',
}

export { Subcommand, RarityString, ListSubcommandOption, LocateSubcommandOption };
