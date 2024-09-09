export type TableHeadItem = {
	name: string | null;
	key: string | null;
	sortable: boolean;
	cellClasses?: string;
};

export type PaginationOptions = {
	first: number;
	offset: number;
};

export function filterDateFromTo(
	date: string | null | undefined,
	dateFrom: string | null | undefined,
	dateTo: string | null | undefined
): boolean {
	if (!date) {
		return true;
	}
	if (dateFrom && new Date(date) < new Date(dateFrom)) {
		return false;
	}
	if (dateTo && new Date(date) > new Date(dateTo)) {
		return false;
	}
	return true;
}
