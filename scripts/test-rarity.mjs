function gaussianRandom() {
	let u = 0;
	let v = 0;

	while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
	while (v === 0) v = Math.random();

	let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
	num = num / 10.0 + 0.5; // Translate to 0 -> 1

	if (num > 1 || num < 0) return gaussianRandom(); // resample between 0 and 1

	return num;
}

const CATCHA_1S_MAX_STDEV = 1;
const CATCHA_2S_MAX_STDEV = 1.7;
const CATCHA_3S_MAX_STDEV = 2.1;
const CATCHA_4S_MAX_STDEV = 2.605;

let oneStars = 0;
let twoStars = 0;
let threeStars = 0;
let fourStars = 0;
let fiveStars = 0;

for (let i = 1; i <= 1000000; i++) {
	const rarity = Math.abs(5 - gaussianRandom() * 10);

	if (rarity <= CATCHA_1S_MAX_STDEV) {
		oneStars++;
	} else if (rarity <= CATCHA_2S_MAX_STDEV) {
		twoStars++;
	} else if (rarity <= CATCHA_3S_MAX_STDEV) {
		threeStars++;
	} else if (rarity <= CATCHA_4S_MAX_STDEV) {
		fourStars++;
	} else {
		fiveStars++;
	}
}

const total = oneStars + twoStars + threeStars + fourStars + fiveStars;

console.log(`Total: ${total}`);
console.log(`1s: ${oneStars} (${(oneStars / total) * 100})`);
console.log(`2s: ${twoStars} (${(twoStars / total) * 100})`);
console.log(`3s: ${threeStars} (${(threeStars / total) * 100})`);
console.log(`4s: ${fourStars} (${(fourStars / total) * 100})`);
console.log(`5s: ${fiveStars} (${(fiveStars / total) * 100})`);

/*
function pickRandomWeighted(values) {
	let pickedValue = values[0].value;
	let randomNumber = Math.random();
	let threshold = 0;
	for (let i = 0; i < values.length; i++) {
		if (values[i].probability === '*') {
			continue;
		}
		threshold += values[i].probability;
		if (threshold > randomNumber) {
			pickedValue = values[i].value;
			break;
		}
		if (!pickedValue) {
			//nothing found based on probability value, so pick element marked with wildcard
			const wildcardValues = values.filter((value) => value.probability === '*');
			const randomElement = wildcardValues[Math.floor(Math.random() * wildcardValues.length)];
			pickedValue = randomElement.value;
		}
	}
	return pickedValue;
}
// 0.9+2.6+5.21+21.73+69.56
const rarities = [
	{ value: 1, probability: 0.6956 },
	{ value: 2, probability: 0.2173 },
	{ value: 3, probability: 0.0521 },
	{ value: 4, probability: 0.0260 },
	{ value: 5, probability: 0.0090 },
];

for (let x = 1; x <= Number.MAX_SAFE_INTEGER; x++) {
	let oneStars = 0;
	let twoStars = 0;
	let threeStars = 0;
	let fourStars = 0;
	let fiveStars = 0;

	for (let i = 1; i <= 10; i++) {
		const rarity = pickRandomWeighted(rarities);
	
		if (rarity === 1) {
			oneStars++;
		} else if (rarity === 2) {
			twoStars++;
		} else if (rarity === 3) {
			threeStars++;
		} else if (rarity === 4) {
			fourStars++;
		} else if (rarity === 5) {
			fiveStars++;
		}
	}

	if (threeStars === 0 && fourStars === 0 && fiveStars === 0) {
		console.log(x);
		break;
	}
}
*/
/*
let oneStars = 0;
let twoStars = 0;
let threeStars = 0;
let fourStars = 0;
let fiveStars = 0;

for (let i = 1; i <= 10000; i++) {
	const rarity = pickRandomWeighted(rarities);

	if (rarity === 1) {
		oneStars++;
	} else if (rarity === 2) {
		twoStars++;
	} else if (rarity === 3) {
		threeStars++;
	} else if (rarity === 4) {
		fourStars++;
	} else if (rarity === 5) {
		fiveStars++;
	}
}

const total = oneStars + twoStars + threeStars + fourStars + fiveStars;

console.log(`Total: ${total}`);
console.log(`1s: ${oneStars} (${(oneStars / total)*100})`);
console.log(`2s: ${twoStars} (${(twoStars / total)*100})`);
console.log(`3s: ${threeStars} (${(threeStars / total)*100})`);
console.log(`4s: ${fourStars} (${(fourStars / total)*100})`);
console.log(`5s: ${fiveStars} (${(fiveStars / total)*100})`);
*/
