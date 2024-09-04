export interface SensorIngestionPayload {
	resultTime: string;
	sourcePath: {
		appid: string;
		devid: string;
		deveui: string;
	};
	variables: Record<string, string | number>;
	setLocation?: {
		latitude: string;
		longitude: string;
	};
	gateways?: number;
}

export function parsePayload(text: string | null | undefined): SensorIngestionPayload | undefined {
	if (!text) {
		return undefined;
	}
	try {
		return JSON.parse(text) as SensorIngestionPayload;
	} catch {
		return undefined;
	}
}
