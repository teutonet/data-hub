import { mkdirSync } from 'fs';
import path from 'path';
import { Locator, Page } from 'playwright';
import sharp from 'sharp';

const SCREENSHOT_DIR = path.join(__dirname, `../../../doc/user/docs/screenshots/`);

interface BoundingBox {
	x: number;
	y: number;
	width: number;
	height: number;
}

function zoomBoundingBox(box: { [key: string]: number }, factor: number): BoundingBox {
	return {
		width: Math.round(box.width * factor),
		height: Math.round(box.height * factor),
		x: Math.round(box.x - (box.width * (factor - 1)) / 2),
		y: Math.round(box.y - (box.height * (factor - 1)) / 2)
	};
}

export async function docsScreenshot(
	name: string,
	pageOrElement: Page | Locator,
	{ crop = true, highlight = true, zoom = 1, scroll = true, highlightRadius = 0, cropZoom = 1 } = {}
) {
	const isElement = 'page' in pageOrElement;
	const page = isElement ? pageOrElement.page() : pageOrElement;

	// only save on Chrome
	if (!(await page.evaluate(() => navigator.userAgent.includes('Chrome')))) return;

	await page.waitForLoadState('load');

	if (zoom != 1)
		await page.evaluate((z) => {
			document.body.style.zoom = `${z}`;
		}, zoom);

	if (isElement && scroll)
		await pageOrElement.evaluate((el) =>
			el.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'center' })
		);

	await page.waitForTimeout(1000); // animations

	let screenshot = sharp(await page.screenshot({ type: 'png' }));

	if (zoom != 1)
		await page.evaluate(() => {
			document.body.style.zoom = '';
		});

	if (isElement) {
		const element = pageOrElement;

		const { x, y, width, height } = zoomBoundingBox(
			Object.fromEntries(
				Object.entries(await element.boundingBox()).map(([k, v]) => [k, Math.round(v)])
			),
			cropZoom
		);

		if (highlight) {
			const [halfWidth, halfHeight] = [width, height].map((n) => Math.round(n / 2));
			const radius =
				highlightRadius || Math.round(Math.min(halfWidth, halfHeight, Math.max(width, height) / 6));
			const circle = Buffer.from(`
                <svg width="${radius * 2}" height="${radius * 2}">
                <circle cx="${radius}" cy="${radius}" r="${radius}" fill="rgba(255,0,0,0.5)" />
                </svg>
            `);
			screenshot = screenshot.composite([
				{ input: circle, left: x + halfWidth - radius, top: y + halfHeight - radius }
			]);
		}

		if (crop) {
			screenshot = sharp(await screenshot.png().toBuffer());
			const margin = width + height;
			const viewport = page.viewportSize();
			const left = Math.max(0, x - margin);
			const top = Math.max(0, y - margin);
			screenshot = screenshot.extract({
				left,
				top,
				width: Math.min(viewport.width, x + width + margin) - left,
				height: Math.min(viewport.height, y + height + margin) - top
			});
		}
	}

	mkdirSync(SCREENSHOT_DIR, { recursive: true });
	await screenshot.webp({ lossless: true }).toFile(path.join(SCREENSHOT_DIR, `${name}.webp`));
}

export async function fixupTenantName(page: Page, tenantName: string) {
	await fixupText(page, tenantName, 'teutonet');
}

export async function fixupText(page: Page, elementRegex: string, replaceStr: string) {
	await page.getByText(RegExp(`${elementRegex}`)).evaluateAll(
		(elements, strings) => {
			elements.forEach((el) => {
				el.textContent = el.textContent.replaceAll(
					RegExp(`${strings[0]}`, 'g'),
					strings[1].toString()
				);
			});
		},
		[elementRegex, replaceStr]
	);
}
