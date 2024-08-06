const months = [
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
];

function isDateValid(day: number, month: number) {
	const monthsWith31Days = [1, 3, 5, 7, 8, 10, 12];

	if (month < 1 || month > 12) return false;

	if (month === 2) {
		return day <= 29; // We don't know the year, assume it's a leap one
	} else if (monthsWith31Days.includes(month)) {
		return day <= 31;
	} else {
		return day <= 30;
	}
}

function getLastDateYear(day: number, month: number) {
	if (!isDateValid(day, month)) throw 'Invalid date provided';

	const currentDate = new Date();

	const currentYear = currentDate.getUTCFullYear();
	const currentMonth = currentDate.getUTCMonth();
	const currentDay = currentDate.getUTCDate();

	if (month < currentMonth) {
		return currentYear;
	} else if (month > currentMonth) {
		return currentYear - 1;
	} else {
		if (day <= currentDay) {
			return currentYear;
		} else {
			return currentYear - 1;
		}
	}
}

export { months, isDateValid, getLastDateYear };
