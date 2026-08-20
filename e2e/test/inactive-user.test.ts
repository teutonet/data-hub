import test, { expect } from 'playwright/test';
import {
	ADMIN_USER,
	createTestUserViaApi,
	DATA_HUB_ADMIN_PASSWORD,
	getUserAttributes,
	updateUserAttributes
} from './helper/keycloak';
import { login } from './helper/util';
import { KEYCLOAK, MDB_FRONTEND } from './helper/urls';
import axios from 'axios';
import { getEmailById, searchByEmailAndSubject } from './helper/mail';

test('sets and updates last login time', async ({ browser }) => {
	const user = await createTestUserViaApi([]);
	await expect(getUserAttributes(user.id)).resolves.toEqual({});
	const page1 = await browser.newPage();
	await login(page1, MDB_FRONTEND, user.username, DATA_HUB_ADMIN_PASSWORD);
	await page1.close();
	const loginTimeStr1 = (await getUserAttributes(user.id))['lastLoginTime'][0];
	expect(loginTimeStr1).toEqual(expect.any(String));
	const page2 = await browser.newPage();
	await login(page2, MDB_FRONTEND, user.username, DATA_HUB_ADMIN_PASSWORD);
	await page2.close();
	const loginTimeStr2 = (await getUserAttributes(user.id))['lastLoginTime'][0];
	expect(loginTimeStr2).toEqual(expect.any(String));
	expect(new Date(loginTimeStr1) < new Date(loginTimeStr2)).toBeTruthy();
});

async function triggerHandleInactiveUsers() {
	await axios.post(
		`${KEYCLOAK}realms/udh/data-hub/_handle_inactive_users`,
		{},
		{
			headers: { Authorization: `Bearer ${await ADMIN_USER.token()}` }
		}
	);
}

[
	{
		reminder: 'first',
		attributeSetup: () => {
			const lastLoginTime = new Date();
			lastLoginTime.setFullYear(lastLoginTime.getFullYear() - 1);
			return {
				lastLoginTime: lastLoginTime.toISOString()
			};
		},
		deletionInDays: 28,
		expectedAttributes: expect.objectContaining({
			lastLoginTime: [expect.any(String)],
			firstInactiveEmailSentTime: [expect.any(String)]
		})
	},
	{
		reminder: 'second',
		attributeSetup: () => {
			const lastLoginTime = new Date();
			lastLoginTime.setFullYear(lastLoginTime.getFullYear() - 1);
			lastLoginTime.setDate(lastLoginTime.getDate() - 21);
			const firstInactiveEmailSentTime = new Date();
			firstInactiveEmailSentTime.setDate(firstInactiveEmailSentTime.getDate() - 21);
			return {
				lastLoginTime: lastLoginTime.toISOString(),
				firstInactiveEmailSentTime: firstInactiveEmailSentTime.toISOString()
			};
		},
		deletionInDays: 7,
		expectedAttributes: expect.objectContaining({
			lastLoginTime: [expect.any(String)],
			firstInactiveEmailSentTime: [expect.any(String)],
			secondInactiveEmailSentTime: [expect.any(String)]
		})
	}
].forEach((entry) => {
	test(`sends ${entry.reminder} inactive mail after a year`, async ({ page }) => {
		const user = await createTestUserViaApi([]);
		await triggerHandleInactiveUsers();
		expect(
			(await searchByEmailAndSubject(user.email, '[teuto DataHub] Bevorstehende')).messages
		).toHaveLength(0);
		// set user last login time to over a year ago
		const now = new Date();
		now.setFullYear(now.getFullYear() - 1);
		await updateUserAttributes(user.id, entry.attributeSetup());
		await triggerHandleInactiveUsers();
		// got mail
		const messages = await searchByEmailAndSubject(user.email, '[teuto DataHub] Bevorstehende');
		expect(messages.messages).toHaveLength(1);
		const message = await getEmailById(messages.messages[0].ID);
		const LINK_RE = /(https:\/\/[^ "]+)( |")/g;
		const loginLinkText = LINK_RE.exec(message.Text)[1];
		const loginLinkHtml = LINK_RE.exec(message.HTML)[1];
		expect(loginLinkText).toEqual(loginLinkHtml);
		expect(message.Text).toContain(`${entry.deletionInDays} Tage`);
		expect(message.HTML).toContain(`${entry.deletionInDays} Tage`);
		// mail send attribute set
		await expect(getUserAttributes(user.id)).resolves.toEqual(entry.expectedAttributes);
		await login(page, loginLinkText, user.username, DATA_HUB_ADMIN_PASSWORD);
		await triggerHandleInactiveUsers();
		// no new mail
		expect(
			(await searchByEmailAndSubject(user.email, '[teuto DataHub] Bevorstehende')).messages
		).toHaveLength(1);
		// mail send attributes not set
		await expect(getUserAttributes(user.id)).resolves.toEqual(
			expect.objectContaining({
				lastLoginTime: [expect.any(String)]
			})
		);
	});
});

test('deletes user after inactivity', async () => {
	const user = await createTestUserViaApi([]);
	// set last login to 1 year ago
	// set inactive mail to 29 days ago
	const now = new Date();
	const lastLoginTime = new Date(now);
	lastLoginTime.setFullYear(lastLoginTime.getFullYear() - 1);
	const firstInactiveEmailSentTime = new Date(now);
	firstInactiveEmailSentTime.setDate(firstInactiveEmailSentTime.getDate() - 29);
	const secondInactiveEmailSentTime = new Date(now);
	secondInactiveEmailSentTime.setDate(secondInactiveEmailSentTime.getDate() - 8);
	await updateUserAttributes(user.id, {
		lastLoginTime: lastLoginTime.toISOString(),
		firstInactiveEmailSentTime: firstInactiveEmailSentTime.toISOString(),
		secondInactiveEmailSentTime: secondInactiveEmailSentTime.toISOString()
	});
	await triggerHandleInactiveUsers();
	// mail that user is deleted
	expect(
		(await searchByEmailAndSubject(user.email, '[teuto DataHub] Ihr Account wurde')).messages
	).toHaveLength(1);
	// check user is deleted
	await expect(getUserAttributes(user.id)).rejects.toThrow('Request failed with status code 404');
});
