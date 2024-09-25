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
const CATCHA_TRADE_MAX_CARDS = 30; // The maximum number of cards per side per trade
const CATCHA_TRADE_COOLDOWN = 0; // 1h. The trade cooldown **in seconds**. 21600 would be 6 hours
const CATCHA_TRADE_MAX_STAR_VALUE_DIFFERENCE = 6; // Block trades that are more unbalanced than this in terms of star value

const CATCHA_TRADE_MAX_KITS = 5;

/**
 * How long one food point should take to regenerate in seconds.
 */
const NURSERY_REGENERATE_FOOD_POINT = 4500; // 4500s is 75min

/**
 * How many moons should a kit age per second.
 */
const NURSERY_KIT_AGE_PER_SECOND = 1 / 10 / 24 / 60 / 60; // 2 real-life months to fully grow up

/**
 * How much hunger should be depleted from a kit each second.
 */
const NURSERY_KIT_HUNGER_PER_SECOND = 1 / 3 / 24 / 60 / 60; // 3 real-life days for the hunger to be completely depleted

/**
 * How much should the health decrease per second if the food/whatever drops to 0.
 */
const NURSERY_KIT_HEALTH_DECREASE = 1 / 24 / 60 / 60; // 24 hours for a kit to die

/**
 * How much health to regenerate per second.
 */
const NURSERY_KIT_HEALTH_REGEN = 1 / 36 / 60 / 60; // 36 hours to regenerate to full health

/**
 * How many food points feeding one kit costs.
 */
const NURSERY_FEED_FOOD_POINTS = 1;

/**
 * How much hunger should feeding replenish.
 */
const NURSERY_FEED_HUNGER_REGEN = 0.4;

/**
 * The feed cooldown in seconds.
 */
const NURSERY_FEED_COOLDOWN = 7200; // 2 hours

/**
 * The breed cooldown in seconds.
 */
const NURSERY_BREED_COOLDOWN = 518400; // 6 days

/**
 * The chance to not get any kits when breeding.
 */
const NURSERY_NO_KITS_BREED_CHANCE = 0.35;

// The nursery breed chances
const NURSERY_1_KIT_CHANCE = 0.15;
const NURSERY_2_KITS_CHANCE = '*';
const NURSERY_3_KITS_CHANCE = 0.25;
const NURSERY_4_KITS_CHANCE = 0.1;

const NURSERY_SEASON_SECONDS = 604800; // 1 week

const NURSERY_PROMOTE_AGE = 6; // 6 moons

const NURSERY_MAX_KIT_EVENTS = 15;

const NURSERY_COOL_TEMPERATURE = 1.5;
const NURSERY_COOL_COOLDOWN = 7200; // 2 hours
const NURSERY_HEATSTROKE_TEMPERATURE = 48.5;
const NURSERY_HYPOTHERMIA_TEMPERATURE = 27;
const NURSERY_KIT_TEMPERATURE_PER_SECOND = 1 / 18 / 60 / 60;
const NURSERY_COMFORT_TEMPERATURE = 1.5;
const NURSERY_GROOM_TEMPERATURE = 1;
const NURSERY_PLAY_TEMPERATURE = 2;

const NURSERY_MAX_ALERTS = 20;
const NURSERY_SHORT_ALERTS = 3;

const NURSERY_BOND_PER_SECOND = 1 / 7 / 24 / 60 / 60; // 1 week
const NURSERY_MEDICINE_BOND_DECREASE = 0.08;
const NURSERY_WANDER_BOND_DECREASE = 0.08;

const NURSERY_SICK_CHANCE = 0.02;
const NURSERY_WANDER_CHANCE = 0.01;

const HISTORY_AGE_PER_SECOND = 1 / 15 / 24 / 60 / 60; // 1 moon is 15 days

const HISTORY_PROMOTE_AGE = 12;

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
	CATCHA_TRADE_MAX_KITS,
	NURSERY_REGENERATE_FOOD_POINT,
	NURSERY_KIT_AGE_PER_SECOND,
	NURSERY_KIT_HUNGER_PER_SECOND,
	NURSERY_KIT_HEALTH_DECREASE,
	NURSERY_KIT_HEALTH_REGEN,
	NURSERY_FEED_FOOD_POINTS,
	NURSERY_FEED_HUNGER_REGEN,
	NURSERY_FEED_COOLDOWN,
	NURSERY_BREED_COOLDOWN,
	NURSERY_NO_KITS_BREED_CHANCE,
	NURSERY_1_KIT_CHANCE,
	NURSERY_2_KITS_CHANCE,
	NURSERY_3_KITS_CHANCE,
	NURSERY_4_KITS_CHANCE,
	NURSERY_SEASON_SECONDS,
	NURSERY_PROMOTE_AGE,
	NURSERY_MAX_KIT_EVENTS,
	NURSERY_COOL_TEMPERATURE,
	NURSERY_COOL_COOLDOWN,
	NURSERY_HEATSTROKE_TEMPERATURE,
	NURSERY_HYPOTHERMIA_TEMPERATURE,
	NURSERY_KIT_TEMPERATURE_PER_SECOND,
	NURSERY_COMFORT_TEMPERATURE,
	NURSERY_GROOM_TEMPERATURE,
	NURSERY_PLAY_TEMPERATURE,
	NURSERY_MAX_ALERTS,
	NURSERY_SHORT_ALERTS,
	NURSERY_BOND_PER_SECOND,
	NURSERY_MEDICINE_BOND_DECREASE,
	NURSERY_WANDER_BOND_DECREASE,
	NURSERY_SICK_CHANCE,
	NURSERY_WANDER_CHANCE,
	HISTORY_AGE_PER_SECOND,
	HISTORY_PROMOTE_AGE,
	DAILY_CRON,
	WEEKLY_CRON,
};
