export type Breadcrumb = {
	text: string;
	link?: string;
	values?: Record<string, string>;
};

export const generateCrumbs = (
	home: string,
	pathName: string,
	startIndex: number,
	listParts: {
		part: string;
		partName: string;
		index: number;
		specialCase?: Record<string, string>;
	}[]
): Breadcrumb[] => {
	const pageParts = pathName.split('/').slice(1);
	const subPageParts = pageParts.slice(startIndex);

	return subPageParts.map((part, i) => {
		let values: Record<string, string> | undefined = undefined;
		let text = `shared.breadcrumbs.${part}`;
		const useLink = i < subPageParts.length - 1;
		const prevIndex = i - 1;
		const prevPart = i > 0 ? subPageParts[prevIndex] : undefined;
		let link = useLink ? `/${home}` : undefined;

		if (useLink) {
			const middlePart = subPageParts.slice(0, i).join('/');
			link += `${home ? '/' : ''}${middlePart}${middlePart ? '/' : ''}${part}`;
		}

		const listPart = prevPart
			? listParts.find((elem) => elem.index === prevIndex && elem.part === prevPart)
			: undefined;

		if (listPart) {
			const specialCase = listPart.specialCase?.[part];
			if (specialCase) {
				text = `shared.breadcrumbs.${specialCase}`;
			} else {
				const partName = listPart.partName;
				text = `shared.breadcrumbs.${partName}`;
				values = {};
				values[partName] = part;
			}
		}

		return { text, link, values } as Breadcrumb;
	});
};
