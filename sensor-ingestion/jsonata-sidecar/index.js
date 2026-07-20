import express from 'express';
import jsonata from 'jsonata';

const app = express();

const DEBUG = process.env.DEBUG === 'true';

function debug(...args) {
	if (DEBUG) {
		console.log('[DEBUG]', ...args);
	}
}

app.use(express.json({ limit: '1mb' }));

app.get('/readyz', (_req, res) => {
	res.json({ status: 'ok' });
});

app.post('/transform', async (req, res) => {
	const startedAt = Date.now();

	try {
		debug('Incoming request');

		const { expression, input } = req.body;

		debug('Expression:', expression);
		debug('Input:', JSON.stringify(input, null, 2));

		if (typeof expression !== 'string') {
			debug('Validation failed: expression missing');
			return res.status(400).json({ error: 'expression required' });
		}

		if (expression.length > 4000) {
			debug('Validation failed: expression too long');
			return res.status(400).json({ error: 'expression too long' });
		}

		debug('Compiling JSONata expression');
		const expr = jsonata(expression);

		debug('Evaluating expression');
		const out = await expr.evaluate(input);

		debug('Evaluation result:', JSON.stringify(out, null, 2));
		debug(`Request finished in ${Date.now() - startedAt}ms`);

		return res.json(out ?? {});
	} catch (e) {
		debug('Error occurred:', e);

		return res.status(400).json({
			error: String(e?.message || e)
		});
	}
});

app.listen(3001, () => {
	console.log('jsonata-sidecar listening on :3001');

	if (DEBUG) {
		console.log('[DEBUG] Debug logging enabled');
	}
});
