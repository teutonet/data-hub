export function getRandomString(len: number): string {
	return String.fromCharCode(
		...Array(len)
			.fill(0)
			.map(() => 97 + Math.floor(Math.random() * 26))
	);
}
