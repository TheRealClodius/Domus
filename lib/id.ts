// ULID generation — lexicographically sortable, Crockford base32.
// No external dependency, uses crypto.getRandomValues.

const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const ENCODING_LEN = ENCODING.length
const TIME_LEN = 10
const RANDOM_LEN = 16

let lastTime = 0
const lastRandom = new Uint8Array(10)

function encodeTime(now: number, len: number): string {
	let str = ''
	let t = now
	for (let i = len; i > 0; i--) {
		const mod = t % ENCODING_LEN
		str = ENCODING[mod] + str
		t = Math.floor(t / ENCODING_LEN)
	}
	return str
}

function encodeRandom(len: number): string {
	const bytes = new Uint8Array(len)
	crypto.getRandomValues(bytes)
	let str = ''
	for (let i = 0; i < len; i++) {
		str += ENCODING[bytes[i] % ENCODING_LEN]
	}
	return str
}

export function ulid(): string {
	const now = Date.now()

	if (now === lastTime) {
		// Same millisecond — increment random portion to maintain monotonicity
		let i = lastRandom.length - 1
		while (i >= 0) {
			lastRandom[i]++
			if (lastRandom[i] < ENCODING_LEN) break
			lastRandom[i] = 0
			i--
		}
		let randomPart = ''
		for (let j = 0; j < RANDOM_LEN; j++) {
			randomPart += ENCODING[lastRandom[j % lastRandom.length] % ENCODING_LEN]
		}
		return encodeTime(now, TIME_LEN) + randomPart
	}

	lastTime = now
	crypto.getRandomValues(lastRandom)

	return encodeTime(now, TIME_LEN) + encodeRandom(RANDOM_LEN)
}
