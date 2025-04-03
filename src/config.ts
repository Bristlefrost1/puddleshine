// The bot version
export const VERSION_YEAR = 2025
export const VERSION_MONTH = 2
export const VERSION_DAY = 17
export const VERSION_STRING = '2025.02.17'

// Embed colours
export const ERROR_COLOUR = 0xf72828 // Used for embeds indicating an error
export const INFO_COLOUR = 0x1d19ff // Used for informational embeds like /catcha help
export const SUCCESS_COLOUR = 0x34ff30 // Success
export const INVERTED_COLOUR = 0x00ff04 // Used for inverted cards
export const VARIANT_COLOUR = 0xffd900 // Used for variant cards
export const INVERTED_VARIANT_COLOUR = 0x8c00ff // Used for inverted variants (the rarest)

export const CATCHA_CARD_IMAGE_WIDTH = 400 // Catcha card image max size in pixels

// Catcha configuration
export const CATCHA_CLAIM_COOLDOWN_PERIODS = 2 // How many roll periods should a claim cooldown last for
export const CATCHA_MAX_ROLLS = 10 // How many rolls per roll period

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
export const CATCHA_1S_MAX_STDEV = 1
export const CATCHA_2S_MAX_STDEV = 1.7
export const CATCHA_3S_MAX_STDEV = 2.1
export const CATCHA_4S_MAX_STDEV = 2.605
// No 5s needed, it's a 5s if the stdev is more than the 4s one

// Catcha inverted odds
export const CATCHA_INVERTED_BASE_CHANCE = 0.04 // 4% base chance when you have one of a card in your collection
export const CATCHA_INVERTED_CHANCE_INCREASE = 0.01 // Additional 1% for every dupe of the card you have
export const CATCHA_INVERTED_CHANCE_MAX = 0.14 // Maxes out at 14% (i.e. 10 dupes)

export const CATCHA_VARIANT_CHANCE = 0.05 // 5% chance every time you roll a card that has a variant

export const CATCHA_LIST_PAGE_SIZE = 10 // How many rows should one page contain in e.g. /catcha duplicates

// Catcha trading config
export const CATCHA_TRADE_MAX_CARDS = 30 // The maximum number of cards per side per trade
export const CATCHA_TRADE_COOLDOWN = 0 // 1h. The trade cooldown **in seconds**. 21600 would be 6 hours
export const CATCHA_TRADE_MAX_STAR_VALUE_DIFFERENCE = 6 // Block trades that are more unbalanced than this in terms of star value

export const CATCHA_TRADE_MAX_KITS = 5

// Nursery
/**
 * How long one food point should take to regenerate in seconds.
 */
export const NURSERY_REGENERATE_FOOD_POINT = 4500 // 4500s is 75min

/**
 * How many moons should a kit age per second.
 */
export const NURSERY_KIT_AGE_PER_SECOND = 1 / 10 / 24 / 60 / 60 // 2 real-life months to fully grow up

/**
 * How much hunger should be depleted from a kit each second.
 */
export const NURSERY_KIT_HUNGER_PER_SECOND = 1 / 3 / 24 / 60 / 60 // 3 real-life days for the hunger to be completely depleted

/**
 * How much should the health decrease per second if the food/whatever drops to 0.
 */
export const NURSERY_KIT_HEALTH_DECREASE = 1 / 24 / 60 / 60 // 24 hours for a kit to die

/**
 * How much health to regenerate per second.
 */
export const NURSERY_KIT_HEALTH_REGEN = 1 / 36 / 60 / 60 // 36 hours to regenerate to full health

/**
 * How many food points feeding one kit costs.
 */
export const NURSERY_FEED_FOOD_POINTS = 1

/**
 * How much hunger should feeding replenish.
 */
export const NURSERY_FEED_HUNGER_REGEN = 0.4

/**
 * The feed cooldown in seconds.
 */
export const NURSERY_FEED_COOLDOWN = 7200 // 2 hours

/**
 * The breed cooldown in seconds.
 */
export const NURSERY_BREED_COOLDOWN = 518400 // 6 days

/**
 * The chance to not get any kits when breeding.
 */
export const NURSERY_NO_KITS_BREED_CHANCE = 0.35

// The nursery breed chances
export const NURSERY_1_KIT_CHANCE = 0.15
export const NURSERY_2_KITS_CHANCE = '*'
export const NURSERY_3_KITS_CHANCE = 0.25
export const NURSERY_4_KITS_CHANCE = 0.1

export const NURSERY_SEASON_SECONDS = 604800 // 1 week

export const NURSERY_PROMOTE_AGE = 6 // 6 moons

export const NURSERY_MAX_KIT_EVENTS = 15

export const NURSERY_COOL_TEMPERATURE = 1.5
export const NURSERY_COOL_COOLDOWN = 7200 // 2 hours
export const NURSERY_HEATSTROKE_TEMPERATURE = 48.5
export const NURSERY_HYPOTHERMIA_TEMPERATURE = 27
export const NURSERY_KIT_TEMPERATURE_PER_SECOND = 1 / 26 / 60 / 60
export const NURSERY_COMFORT_TEMPERATURE = 1.5
export const NURSERY_GROOM_TEMPERATURE = 0.5
export const NURSERY_PLAY_TEMPERATURE = 1

export const NURSERY_MAX_ALERTS = 20
export const NURSERY_SHORT_ALERTS = 3

export const NURSERY_BOND_PER_SECOND = 1 / 7 / 24 / 60 / 60 // 1 week
export const NURSERY_MEDICINE_BOND_DECREASE = 0.08
export const NURSERY_WANDER_BOND_DECREASE = 0.08

export const NURSERY_SICK_CHANCE = 0.02
export const NURSERY_WANDER_CHANCE = 0.01

// History
export const HISTORY_AGE_PER_SECOND = 1 / 10 / 24 / 60 / 60 // 2 real-life months is 6 moons
export const HISTORY_PROMOTE_AGE = 12

// Crons - REMEMBER TO KEEP THESE IN SYNC WITH wrangler.jsonc
export const DAILY_CRON = '0 0 * * *' // Every day at midnight UTC
export const WEEKLY_CRON = '0 0 * * MON' // At midnight UTC every Monday
