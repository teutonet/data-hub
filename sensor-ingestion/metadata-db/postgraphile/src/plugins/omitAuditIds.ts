import { jsonPgSmartTags } from 'postgraphile/utils';

export const OmitAuditIdsPlugin = jsonPgSmartTags({
	version: 1,
	config: {
		attribute: {
			pgmemento_audit_id: { tags: { omit: true } },
			txid: { tags: { omit: true } }
		}
	}
});
