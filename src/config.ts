/**
 * config.ts
 *
 * Contains the configuration options for the bot.
 */

// Embed colors
const ERROR_COLOR = 0xf72828; // Used for embeds indicating an error
const INFO_COLOR = 0x1d19ff; // Used for informational embeds like /catcha help
const SUCCESS_COLOR = 0x34ff30; // Success
const INVERTED_COLOR = 0x00ff04; // Used for inverted cards
const VARIANT_COLOR = 0xffd900; // Used for variant cards
const INVERTED_VARIANT_COLOR = 0x8c00ff; // Used for inverted variants (the rarest)

const CATCHA_CARD_IMAGE_WIDTH = 300; // Catcha card image max size in pixels

// Catcha configuration
const CATCHA_CLAIM_COOLDOWN_PERIODS = 2; // How many roll periods should a claim cooldown last for
const CATCHA_MAX_ROLLS = 10; // How many rolls per roll period

/*
Catcha rarity standard deviations

Tests from the test-rarity script:

Total: 1000000
1s: 682613 (68.2613)
2s: 229072 (22.9072)
3s: 52743 (5.2743)
4s: 26815 (2.6814999999999998)
5s: 8757 (0.8756999999999999)
*/
const CATCHA_1S_MAX_STDEV = 1;
const CATCHA_2S_MAX_STDEV = 1.7;
const CATCHA_3S_MAX_STDEV = 2.1;
const CATCHA_4S_MAX_STDEV = 2.605;
// No 5s needed, it's a 5s if the stdev is more than the 4s one

// Catcha inverted odds
const CATCHA_INVERTED_BASE_CHANCE = 0.04; // 4% base chance when you have one of a card in your collection
const CATCHA_INVERTED_CHANCE_INCREASE = 0.01; // Additional 1% for every dupe of the card you have
const CATCHA_INVERTED_CHANCE_MAX = 0.14; // Maxes out at 14% (i.e. 10 dupes)

const CATCHA_VARIANT_CHANCE = 0.05; // 5% chance every time you roll a card that has a variant

// How many rows should one page contain in e.g. /catcha duplicates
const CATCHA_LIST_PAGE_SIZE = 10;

// Catcha trading config
const CATCHA_TRADE_MAX_CARDS = 50; // The maximum number of cards per side per trade
const CATCHA_TRADE_COOLDOWN = 0; // 1h. The trade cooldown **in seconds**. 21600 would be 6 hours
const CATCHA_TRADE_MAX_STAR_VALUE_DIFFERENCE = 6; // Block trades that are more unbalanced than this in terms of star value

/**
 * How long one food point should take to regenerate in seconds.
 */
const NURSERY_REGENERATE_FOOD_POINT = 4500; // 4500s is 75min

// Crons
const DAILY_CRON = '0 0 * * *'; // Every day at midnight UTC
const WEEKLY_CRON = '0 0 * * MON'; // At midnight UTC every Monday

export {
	ERROR_COLOR,
	INFO_COLOR,
	SUCCESS_COLOR,
	INVERTED_COLOR,
	VARIANT_COLOR,
	INVERTED_VARIANT_COLOR,
	CATCHA_CARD_IMAGE_WIDTH,
	CATCHA_CLAIM_COOLDOWN_PERIODS,
	CATCHA_MAX_ROLLS,
	CATCHA_1S_MAX_STDEV,
	CATCHA_2S_MAX_STDEV,
	CATCHA_3S_MAX_STDEV,
	CATCHA_4S_MAX_STDEV,
	CATCHA_INVERTED_BASE_CHANCE,
	CATCHA_INVERTED_CHANCE_INCREASE,
	CATCHA_INVERTED_CHANCE_MAX,
	CATCHA_VARIANT_CHANCE,
	CATCHA_LIST_PAGE_SIZE,
	CATCHA_TRADE_MAX_CARDS,
	CATCHA_TRADE_COOLDOWN,
	CATCHA_TRADE_MAX_STAR_VALUE_DIFFERENCE,
	NURSERY_REGENERATE_FOOD_POINT,
	DAILY_CRON,
	WEEKLY_CRON,
};
