import * as Sentry from '@sentry/sveltekit';
import { getConfig } from '$lib/config';
import type { HandleClientError } from '@sveltejs/kit';
import { VERSION } from '$lib/version';

const dsn = getConfig('SENTRY_DSN');

let handleError: HandleClientError | undefined = undefined;

if (dsn) {
	Sentry.init({
		dsn,
		release: VERSION,

		integrations: [
			Sentry.captureConsoleIntegration({
				levels: ['error']
			})
		],

		replaysSessionSampleRate: 0,

		debug: true
	});
	handleError = Sentry.handleErrorWithSentry();
}

export default handleError;
