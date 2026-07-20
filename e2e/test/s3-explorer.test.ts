import { test, expect } from '@playwright/test';
import { getRandomString, login, RandomTenantManager, selectProject } from './helper/util';
import { existsSync, unlinkSync } from 'fs';
import { MDB_FRONTEND } from './helper/urls';
import { createTestUserViaApi, DATA_HUB_ADMIN_PASSWORD } from './helper/keycloak';
import { checkedResourceApiGraphqlRequest, graphql } from './helper/graphql';

const TENANT_MGR = new RandomTenantManager();

test('s3-explorer', async ({ page }) => {
	const tenant = TENANT_MGR.get();
	const project = 'trainstation';
	const bucketName = `${tenant}.${project}`;
	const fileName = `${getRandomString(10)}.txt`;
	const fileBody = getRandomString(10);
	let downloadName: string;

	await checkedResourceApiGraphqlRequest(
		graphql`
			mutation ($tenant: String!, $project: String!) {
				createTenant(tenant: $tenant) {
					createProject(project: $project) {
						project
					}
				}
			}
		`,
		{
			tenant,
			project
		}
	);

	const user = await createTestUserViaApi([`${tenant}/admin`]);

	await login(page, MDB_FRONTEND, user.username, DATA_HUB_ADMIN_PASSWORD);
	await selectProject(page, bucketName);
	await page.getByRole('link', { name: 'S3-Explorer', exact: true }).click();

	await test.step('create files', async () => {
		await page.getByRole('button', { name: 'Neue Datei erstellen' }).click(); // open upload modal
		await expect(page.getByRole('combobox')).toHaveValue(bucketName);
		await page.getByRole('textbox', { name: 'Name' }).fill(fileName);
		await page.getByRole('textbox', { name: 'Inhalt' }).fill(fileBody);
		await page.getByRole('dialog').getByRole('button', { name: 'Hochladen' }).click(); // upload file
		await expect(page.getByRole('dialog')).not.toBeVisible();

		await page.getByRole('button', { name: 'Neue Datei erstellen' }).click(); // open upload modal
		await page.getByRole('textbox', { name: 'Name' }).fill(`file-${getRandomString(6)}`);
		await page.getByRole('textbox', { name: 'Inhalt' }).fill(getRandomString(100));
		await page.getByRole('dialog').getByRole('button', { name: 'Hochladen' }).click(); // upload file
		await expect(page.getByRole('dialog')).not.toBeVisible();

		await page.getByRole('button', { name: 'Neue Datei erstellen' }).click(); // open upload modal
		await page.getByRole('textbox', { name: 'Name' }).fill(`file-${getRandomString(6)}`);
		await page.getByRole('textbox', { name: 'Inhalt' }).fill(getRandomString(100));
		await page.getByRole('dialog').getByRole('button', { name: 'Hochladen' }).click(); // upload file
		await expect(page.getByRole('dialog')).not.toBeVisible();
	});

	await test.step('download, delete, upload', async () => {
		// download
		const downloadPromise = page.waitForEvent('download');
		await page
			.getByRole('row', {
				name: `${fileName} ${bucketName} txt 10.00 B`
			})
			.getByRole('button', { name: 'Optionen' }) // file context menu
			.click();
		await page.getByRole('button', { name: 'Herunterladen' }).click();
		const download = await downloadPromise;
		downloadName = download.suggestedFilename();

		await download.saveAs(`/tmp/${downloadName}`);
		expect(existsSync(`/tmp/${downloadName}`)).toBeTruthy();

		// delete single file
		await page.getByRole('tooltip').getByRole('button', { name: 'Löschen' }).click();
		await page.getByRole('button', { name: 'Fortfahren' }).click();
		await expect(page.getByRole('row', { name: `${fileName}` })).not.toBeVisible();

		// delete all files
		await page
			.getByRole('row', { name: 'Öffentlich Name Bucket Typ Größe Letzte Änderung' })
			.getByLabel('', { exact: true }) // select all files checkbox
			.click();
		await page.getByRole('button', { name: 'Löschen' }).click();
		await page.getByRole('button', { name: 'Fortfahren' }).click();
		await expect(page.getByRole('cell', { name: '0 Dateien' })).toBeVisible();

		// upload
		await page.getByRole('button', { name: 'Datei(en) hochladen' }).click(); // open upload modal
		await page.getByLabel('Hochzuladende Dateien').setInputFiles(`/tmp/${downloadName}`);
		await page.getByRole('dialog').getByRole('button', { name: 'Hochladen' }).click(); // upload file

		unlinkSync(`/tmp/${downloadName}`);

		await expect(
			page.getByRole('row', {
				name: `${downloadName} ${bucketName} txt 10.00 B`
			})
		).toBeVisible();
	});

	await test.step('rename, overwrite', async () => {
		const newFilename = `${getRandomString(6)}.txt`;

		// rename
		await page
			.getByRole('row', {
				name: `${downloadName} ${bucketName} txt 10.00 B`
			})
			.getByRole('button') // file context menu
			.click();
		await page.getByRole('button', { name: 'Datei umbenennen' }).click();
		await page.getByRole('textbox', { name: 'Neuer Name' }).fill(newFilename);
		await page.getByRole('button', { name: 'Speichern' }).click();

		await expect(
			page.getByRole('row', {
				name: `${newFilename} ${bucketName} txt 10.00 B`
			})
		).toBeVisible();
		await expect(
			page.getByRole('row', {
				name: `${downloadName} ${bucketName} txt 10.00 B`
			})
		).not.toBeVisible();
		await page.getByRole('button', { name: 'Neue Datei erstellen' }).click(); // open upload modal

		// overwrite
		await page.getByRole('textbox', { name: 'Name' }).fill(newFilename);
		await page.getByRole('textbox', { name: 'Inhalt' }).fill(getRandomString(100));
		await page.getByRole('dialog').getByRole('button', { name: 'Hochladen' }).click(); // upload file
		await page.getByRole('button', { name: 'Fortfahren' }).click();

		await expect(
			page.getByRole('row', {
				name: `${newFilename} ${bucketName} txt 100.00 B`
			})
		).toBeVisible();

		await page
			.getByRole('row', { name: 'Öffentlich Name Bucket Typ Größe Letzte Änderung' })
			.getByLabel('', { exact: true }) // select all files checkbox
			.click();
		await page.getByRole('button', { name: 'Löschen' }).click();
		await page.getByRole('button', { name: 'Fortfahren' }).click();
	});

	await test.step('ensure _public/ works correctly', async () => {
		const fileName = `file-${getRandomString(6)}`;
		const newFileName = `file-${getRandomString(6)}`;

		// upload public file
		await page.getByRole('button', { name: 'Neue Datei erstellen' }).click();
		await page.getByRole('alert').filter({ hasText: 'Öffentlich' }).click();
		// the name should only contain '_public/' after uploading if public checkbox is checked
		await expect(page.getByRole('textbox', { name: 'Name' })).toBeEmpty();
		await page.getByRole('textbox', { name: 'Name' }).fill(fileName);
		await page.getByRole('textbox', { name: 'Inhalt' }).fill(getRandomString(100));
		await page.getByRole('dialog').getByRole('button', { name: 'Hochladen' }).click();
		await expect(page.getByRole('dialog')).not.toBeVisible();

		// upload private file
		await page.getByRole('button', { name: 'Neue Datei erstellen' }).click();
		await page.getByRole('textbox', { name: 'Name' }).fill(fileName);
		await page.getByRole('textbox', { name: 'Inhalt' }).fill(getRandomString(100));
		await page.getByRole('dialog').getByRole('button', { name: 'Hochladen' }).click();
		// make sure the overwrite modal doesn't open because the name conflicts with the public file name
		await expect(page.getByRole('dialog')).not.toBeVisible();

		const publicFileNameCell = page.getByRole('cell', { name: `_public/${fileName}` });
		const publicFilePublicIconCell = page
			.locator('tbody')
			.getByRole('cell', { name: 'Öffentlich' });

		const privateFileNameCell = page.getByRole('cell', { name: `${fileName}`, exact: true });
		const privateFilePublicIconCell = page.locator('tbody').getByRole('cell', { name: 'Privat' });

		// public file row should contain name and public-icon
		expect(await publicFileNameCell.evaluate((e) => e.parentElement)).toBe(
			await publicFilePublicIconCell.evaluate((e) => e.parentElement)
		);

		// private file row should contain name and private-icon
		expect(await privateFileNameCell.evaluate((e) => e.parentElement)).toBe(
			await privateFilePublicIconCell.evaluate((e) => e.parentElement)
		);

		// rename
		await page
			.getByRole('row', { name: `_public/${fileName}` })
			.getByRole('button', { name: 'Optionen' })
			.click();
		await page.getByRole('button', { name: 'Datei umbenennen' }).click();
		await expect(page.getByRole('checkbox', { name: 'Öffentlich Öffentliche' })).toBeChecked();
		await expect(page.getByRole('textbox', { name: 'Neuer Name' })).toHaveValue(
			`_public/${fileName}`
		);

		// uncheck public checkbox, the name shouldn't contain '_public/' anymore
		await page.getByRole('checkbox', { name: 'Öffentlich' }).click();
		await expect(page.getByRole('textbox', { name: 'Neuer Name' })).toHaveValue(fileName);

		// check public checkbox, name should contain '_public/' again
		await page.getByRole('checkbox', { name: 'Öffentlich' }).click();
		await expect(page.getByRole('textbox', { name: 'Neuer Name' })).toHaveValue(
			`_public/${fileName}`
		);

		// manually remove '_public/', public checkbox should be unchecked
		await page.getByRole('textbox', { name: 'Neuer Name' }).fill(newFileName);
		await expect(page.getByRole('checkbox', { name: 'Öffentlich Öffentliche' })).not.toBeChecked();

		// manually set the name to '_public/fileName', public checkbox should be checked again
		await page.getByRole('textbox', { name: 'Neuer Name' }).fill(`_public/${newFileName}`);
		await expect(page.getByRole('checkbox', { name: 'Öffentlich Öffentliche' })).toBeChecked();

		await page.getByRole('button', { name: 'Speichern' }).click();

		// ensure the file is correctly renamed and the public-icon is visible
		await expect(
			page
				.getByRole('row', {
					name: `_public/${newFileName} ${bucketName} - 100.00 B`
				})
				.getByRole('cell', { name: 'Öffentlich' })
		).toBeVisible();
	});

	await test.step('test metadata', async () => {
		const fileName = `file-${getRandomString(6)}`;

		await page.getByRole('button', { name: 'Neue Datei erstellen' }).click(); // open upload modal
		await page.getByRole('textbox', { name: 'Name' }).fill(fileName);
		await page.getByRole('dialog').getByRole('button', { name: 'Hochladen' }).click(); // upload file

		// upload metadata
		await page
			.getByRole('row', { name: fileName })
			.getByRole('button', { name: 'Optionen' })
			.click();
		await page.getByRole('button', { name: 'Metadaten' }).click();

		await page.getByRole('textbox', { name: 'Schlüssel' }).fill('key1');
		await page.getByRole('textbox', { name: 'Wert' }).fill('value1');
		await page.getByLabel('Metadaten setzen').click();

		await expect(page.getByRole('row', { name: 'key1 value1' })).toBeVisible();

		// edit metadata
		// edit value
		await page.getByLabel('Metadaten bearbeiten').click();

		await expect(page.getByRole('textbox', { name: 'Schlüssel', exact: true })).not.toBeVisible();
		await expect(page.getByRole('textbox', { name: 'Wert', exact: true })).not.toBeVisible();
		await expect(page.getByLabel('Metadaten setzen')).not.toBeVisible();

		await page.getByRole('textbox', { name: 'Wert bearbeiten' }).fill('value2');
		await page.getByLabel('Änderungen speichern').click();

		await expect(page.getByRole('row', { name: 'key1 value2' })).toBeVisible();

		// edit key
		await page.getByLabel('Metadaten bearbeiten').click();
		await page.getByRole('textbox', { name: 'Schlüssel bearbeiten' }).fill('key2');
		await page.getByLabel('Änderungen speichern').click();
		await expect(page.getByRole('row', { name: 'key2 value2' })).toBeVisible();
		await expect(page.getByRole('row', { name: 'key1 value2' })).not.toBeVisible();

		// delete metadata
		await page.getByLabel('Metadaten löschen').click();
		await expect(page.getByRole('row', { name: 'key2 value2' })).not.toBeVisible();

		// check persistence after reload
		await page.getByRole('textbox', { name: 'Schlüssel' }).fill('key3');
		await page.getByRole('textbox', { name: 'Wert' }).fill('value3');
		await page.getByLabel('Metadaten setzen').click();
		await page.getByRole('button', { name: 'Speichern' }).click();

		await page.waitForTimeout(1000);
		await page.reload();

		await page
			.getByRole('row', { name: fileName })
			.getByRole('button', { name: 'Optionen' })
			.click();
		await page.getByRole('button', { name: 'Metadaten' }).click();

		await expect(page.getByRole('row', { name: 'key3 value3' })).toBeVisible();

		// upload metadata with same name
		await page.getByRole('textbox', { name: 'Schlüssel' }).fill('key3');
		await page.getByRole('textbox', { name: 'Wert' }).fill('value3');
		await page.getByLabel('Metadaten setzen').click();

		await expect(
			page
				.getByRole('alert')
				.filter({ hasText: 'Es existiert bereits ein Schlüssel mit diesem Namen.' })
		).toBeVisible();
	});
});
