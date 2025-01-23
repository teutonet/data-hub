import * as Sentry from '@sentry/sveltekit';
import { getConfig } from '$lib/config';
import type { HandleClientError } from '@sveltejs/kit';

const dsn = getConfig('SENTRY_DSN');

let handleError: HandleClientError | undefined = undefined;

if (dsn) {
	Sentry.init({
		dsn,

		integrations: [
			Sentry.captureConsoleIntegration({
				levels: ['error']
			})
		],

		enableTracing: false,
		autoSessionTracking: false,
		replaysSessionSampleRate: 0,

		debug: true
	});
	handleError = Sentry.handleErrorWithSentry();
}

export default handleError;
