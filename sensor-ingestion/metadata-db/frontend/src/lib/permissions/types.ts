export type UdhPrincipal = TenantPrincipal | GroupPrincipal;

export interface TenantPrincipal {
	type: 'tenant';
	tenant: string;
}

export interface GroupPrincipal {
	type: 'group';
	tenant: string;
	group: string;
}

export type PermissionItem = {
	name: string;
	principals: UdhPrincipal[];
	scopes: string[];
};
