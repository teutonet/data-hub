export function caseInsensitiveIncludes(s: string, searchString: string): boolean {
	return s.toLowerCase().includes(searchString.toLowerCase());
}

export function emptyToNull(s: string): string | null {
	if (s.trim()) {
		return s.trim();
	} else {
		return null;
	}
}
