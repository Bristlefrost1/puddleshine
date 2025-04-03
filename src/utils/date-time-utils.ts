export const months = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
]

export function isDateValid(day: number, month: number) {
	const monthsWith31Days = [1, 3, 5, 7, 8, 10, 12]

	if (month < 1 || month > 12) return false

	if (month === 2) {
		return day <= 29 // We don't know the year, assume it's a leap one
	} else if (monthsWith31Days.includes(month)) {
		return day <= 31
	} else {
		return day <= 30
	}
}

export function getLastDateYear(day: number, month: number) {
	if (!isDateValid(day, month)) throw 'Invalid date provided'

	const currentDate = new Date()

	const currentYear = currentDate.getUTCFullYear()
	const currentMonth = currentDate.getUTCMonth() + 1
	const currentDay = currentDate.getUTCDate()

	if (month < currentMonth) {
		return currentYear
	} else if (month > currentMonth) {
		return currentYear - 1
	} else {
		if (day <= currentDay) {
			return currentYear
		} else {
			return currentYear - 1
		}
	}
}

export function formatSeconds(sec: number) {
	if (sec < 60) return `${sec}s`

	const seconds = sec % 60
	let minutes = Math.floor(sec / 60)

	if (minutes < 60) return `${minutes}min${seconds > 0 ? ` ${seconds}s` : ''}`

	let hours = Math.floor(minutes / 60)
	minutes = minutes % 60

	if (hours < 24) return `${hours}h${minutes > 0 ? ` ${minutes}min` : ''}`

	let days = Math.floor(hours / 24)
	hours = hours % 24

	if (days < 7) return `${days}d${hours > 0 ? ` ${hours}h` : ''}${minutes > 0 ? ` ${minutes}min` : ''}`
	if (days < 30) {
		const weeks = Math.floor(days / 7)
		days = days % 7

		return `${weeks}w${days > 0 ? ` ${days}d` : ''}${hours > 0 ? ` ${hours}h` : ''}${minutes > 0 ? ` ${minutes}min` : ''}`
	}

	let months = Math.floor(days / 30)
	days = days % 30

	if (months < 12)
		return `${months}mo${days > 0 ? ` ${days}d` : ''}${hours > 0 ? ` ${hours}h` : ''}${minutes > 0 ? ` ${minutes}min` : ''}`

	const years = Math.floor(months / 12)
	months = months % 12

	return `${years}y${months > 0 ? ` ${months}mo` : ''}${days > 0 ? ` ${days}d` : ''}${hours > 0 ? ` ${hours}h` : ''}${minutes > 0 ? ` ${minutes}min` : ''}`
}
