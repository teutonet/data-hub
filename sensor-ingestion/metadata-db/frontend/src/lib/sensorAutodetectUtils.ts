import type { OperationResult } from '@urql/svelte';
import type { Exact, GetThingsQuery, ThingCondition } from './common/generated/types';
import { parsePayload } from './common/sensor-ingestion';

export interface ResolvedProperty {
	name: string;
	metricName: string | null | undefined;
	measure: string | null | undefined;
}

export interface SensorShape {
	id: string;
	name: string;
	properties: ResolvedProperty[];
}

/**
 * param id can refer to an ID of a sensortype or a thing!
 */
export interface SensortypeAutodetectionMatch {
	id: string;
	name: string;
	labels: Record<string, string | number>;
	metrics: Record<string, string | number>;
	unusedKeys: string[];
	missingKeys: string[];
	deveui?: string | null | undefined;
}

export function getSensorMatches(
	shape: SensorShape,
	payloadKeys: Set<string>,
	payload: Record<string, string | number>
): SensortypeAutodetectionMatch[] {
	if (shape.properties.some((prop) => payloadKeys.has(prop.name))) {
		const unusedKeys = new Set(payloadKeys);
		const missingKeys = shape.properties
			.filter((prop) => !payloadKeys.has(prop.name))
			.map((prop) => prop.name);
		const labels = {};
		const metrics = {};
		shape.properties.forEach((prop) => {
			if (payloadKeys.has(prop.name)) {
				if (prop.metricName) {
					metrics[prop.metricName] = payload[prop.name];
				} else {
					labels[prop.name] = payload[prop.name];
				}
				unusedKeys.delete(prop.name);
			}
		});
		return [
			{
				id: shape.id,
				name: shape.name,
				labels,
				metrics,
				unusedKeys: [...unusedKeys].sort(),
				missingKeys: missingKeys.sort()
			}
		];
	} else {
		return [];
	}
}

export function getThingMatches(
	shape: SensorShape,
	thingsResult: OperationResult<GetThingsQuery, Exact<{ condition: ThingCondition }>>
) {
	const result: SensortypeAutodetectionMatch[] = [];

	const things = thingsResult.data?.things;

	if (!things) {
		return result;
	}

	for (const thing of things) {
		const payload = thing.payload;
		if (!payload) {
			continue;
		}
		const parsedPayload = parsePayload(payload);
		if (!parsedPayload) {
			continue;
		}
		const parsedPayloadVariables = parsedPayload.variables;
		const payloadKeys = new Set(Object.keys(parsedPayloadVariables));

		if (shape.properties.some((prop) => payloadKeys.has(prop.name))) {
			const unusedKeys = new Set(payloadKeys);
			const missingKeys = shape.properties
				.filter((prop) => !payloadKeys.has(prop.name))
				.map((prop) => prop.name);
			const labels: Record<string, string | number> = {};
			const metrics: Record<string, string | number> = {};
			shape.properties.forEach((prop) => {
				if (payloadKeys.has(prop.name)) {
					if (prop.metricName) {
						metrics[prop.metricName] = parsedPayloadVariables[prop.name];
					} else {
						labels[prop.name] = parsedPayloadVariables[prop.name];
					}
					unusedKeys.delete(prop.name);
				}
			});
			result.push({
				id: thing.id,
				name: thing.name,
				labels,
				metrics,
				unusedKeys: [...unusedKeys].sort(),
				missingKeys: missingKeys.sort(),
				deveui: thing.deveui
			});
		} else {
			continue;
		}
	}

	return result;
}
