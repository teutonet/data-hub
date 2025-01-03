export function caseInsensitiveIncludes(s: string, searchString: string): boolean {
	return s.toLowerCase().includes(searchString.toLowerCase());
}

export function emptyToNull(s: string | null): string | null {
	if (s && s.trim()) {
		return s.trim();
	} else {
		return null;
	}
}

export function replaceComma(num: string): string {
	return num.replace(',', '.');
}
