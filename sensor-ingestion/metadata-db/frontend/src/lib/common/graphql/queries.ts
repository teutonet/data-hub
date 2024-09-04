import { gql } from '@urql/svelte';

export const GET_ALL_SENSORS = gql`
	query getAllSensors {
		sensors {
			id
			name
			project
			datasheet
			description
			sensorProperties {
				alias
				writeDelta
				property {
					measure
					metricName
					name
				}
			}
		}
	}
`;

export const GET_ALL_SENSORS_WITH_PROPERTIES = gql`
	query sensorsWithProperties($project: String!) {
		sensors(condition: { project: $project }) {
			id
			name
			description
			sensorProperties {
				alias
				writeDelta
				property {
					name
					metricName
					measure
				}
			}
		}
	}
`;

export const GET_SENSORS = gql`
	query getSensors($condition: SensorCondition!) {
		sensors(condition: $condition) {
			id
			name
			project
			datasheet
			description
			sensorProperties {
				writeDelta
				property {
					measure
					metricName
					name
				}
			}
		}
	}
`;

export const GET_ALL_THINGS = gql`
	query getAllThings {
		things {
			id
			name
			project
			status
			sensor {
				name
				id
			}
			customLabels
		}
	}
`;

export const GET_THING_BY_ID = gql`
	query getThingById($id: UUID!) {
		thing(id: $id) {
			id
			name
			project
			status
			lat
			locationdesc
			locationname
			long
			nodeId
			install
			ownedby
			public
			altitude
			appid
			deveui
			devid
			geohash
			payload
			sensorId
			sensor {
				name
				id
				nodeId
				datasheet
				appeui
			}
			customLabels
		}
	}
`;

export const GET_SENSOR_BY_ID = gql`
	query getSensorById($id: UUID!) {
		sensor(id: $id) {
			id
			name
			project
			description
			public
			nodeId
			datasheet
			appeui
			things {
				name
				id
				project
				lat
				locationdesc
				locationname
				long
				nodeId
				ownedby
				public
				altitude
				appid
				deveui
				devid
				geohash
				customLabels
			}
			sensorProperties {
				alias
				propertyId
				writeDelta
				property {
					id
					description
					measure
					metricName
					name
				}
			}
		}
	}
`;

export const THING_FRAGMENT = gql`
	fragment Thing on Thing {
		id
		name
		project
		status
		locationname
		locationdesc
		lat
		long
		altitude
		nodeId
		ownedby
		public
		appid
		deveui
		devid
		geohash
		sensor {
			name
			id
			project
			nodeId
			datasheet
			appeui
		}
		customLabels
		payload
	}
`;

export const CREATE_THINGS = gql`
	mutation createThings($mnThing: [ThingInput!]) {
		mnCreateThing(input: { mnThing: $mnThing }) {
			thing {
				id
			}
		}
	}
`;

export const GET_THINGS = gql`
	query getThings($condition: ThingCondition!) {
		things(condition: $condition) {
			...Thing
		}
	}

	${THING_FRAGMENT}
`;

export const UPDATE_THING_BY_ID = gql`
	mutation updateThingById($id: UUID!, $thingPatch: ThingPatch!) {
		updateThing(input: { id: $id, patch: $thingPatch }) {
			clientMutationId
		}
	}
`;

export const GET_ALL_PROPERTIES = gql`
	query getAllProperties {
		properties {
			id
			measure
			name
			project
			metricName
		}
	}
`;

export const GET_PROPERTIES = gql`
	query getProperties($condition: PropertyCondition) {
		properties(condition: $condition) {
			id
			measure
			name
			project
			metricName
		}
	}
`;

export const GET_PROPERTY_BY_ID = gql`
	query getPropertyById($id: UUID!) {
		property(id: $id) {
			description
			id
			measure
			metricName
			name
			project
		}
	}
`;

export const UPDATE_PROPERTY_BY_ID = gql`
	mutation updatePropertyById($id: UUID!, $propertyPatch: PropertyPatch!) {
		updateProperty(input: { id: $id, patch: $propertyPatch }) {
			clientMutationId
		}
	}
`;

export const CREATE_PROPERTY = gql`
	mutation createProperty($propertyInput: PropertyInput!) {
		createProperty(input: { property: $propertyInput }) {
			clientMutationId
			property {
				id
			}
		}
	}
`;

export const UPDATE_SENSOR_BY_ID = gql`
	mutation updateSensorById($id: UUID!, $sensorPatch: SensorPatch!) {
		updateSensor(input: { id: $id, patch: $sensorPatch }) {
			clientMutationId
		}
	}
`;

export const DELETE_SENSOR = gql`
	mutation deleteSensor($id: UUID!) {
		deleteSensor(input: { id: $id }) {
			clientMutationId
		}
	}
`;

export const DELETE_PROPERTY = gql`
	mutation deleteProperty($id: UUID!) {
		deleteProperty(input: { id: $id }) {
			clientMutationId
		}
	}
`;

export const DELETE_THING = gql`
	mutation deleteThing($id: UUID!) {
		deleteThing(input: { id: $id }) {
			clientMutationId
		}
	}
`;

export const GET_SENSOR_PROPERTIES = gql`
	query getSensorProps($sensorId: UUID!) {
		sensorProperties(condition: { sensorId: $sensorId }) {
			alias
			propertyId
			writeDelta
			property {
				description
				measure
				metricName
				name
			}
		}
	}
`;

export const EDIT_SENSOR_PROPERTY = gql`
	mutation editSensorProperty(
		$propertyId: UUID!
		$sensorId: UUID!
		$writeDelta: Boolean!
		$alias: String
	) {
		updateSensorProperty(
			input: {
				propertyId: $propertyId
				sensorId: $sensorId
				patch: { alias: $alias, writeDelta: $writeDelta }
			}
		) {
			clientMutationId
		}
	}
`;

export const CREATE_SENSOR_PROPERTY = gql`
	mutation createSensorProperty(
		$project: String!
		$sensorId: UUID!
		$propertyId: UUID!
		$writeDelta: Boolean!
		$alias: String
	) {
		createSensorProperty(
			input: {
				sensorProperty: {
					project: $project
					sensorId: $sensorId
					propertyId: $propertyId
					alias: $alias
					writeDelta: $writeDelta
				}
			}
		) {
			clientMutationId
			sensorProperty {
				alias
				propertyId
				sensorId
			}
		}
	}
`;

export const CREATE_SENSOR_WITH_PROPERTIES = gql`
	mutation createSensorWithProps($input: CreateSensorWithPropsInput!) {
		createSensorWithProps(input: $input) {
			clientMutationId
			sensorId
		}
	}
`;

export const DELETE_SENSOR_PROPERTY = gql`
	mutation deleteSensorProperty($propertyId: UUID!, $sensorId: UUID!) {
		deleteSensorProperty(input: { sensorId: $sensorId, propertyId: $propertyId }) {
			clientMutationId
		}
	}
`;

export const ASSIGN_SENSORTYPE_TO_NEW_DEVICES = gql`
	mutation assignSensortypeToNewDevices($sensortypeId: UUID!, $deviceIds: [UUID]!) {
		assignSensortypeToNewDevices(input: { sensorId: $sensortypeId, deviceIds: $deviceIds }) {
			clientMutationId
		}
	}
`;

export const GET_OFFSETS_AND_METRIC_NAMES = gql`
	query getOffsetsAndMetricNames($thingId: UUID!, $sensorTypeId: UUID!) {
		thingOffsets(condition: { thingId: $thingId }) {
			id
			metricName
			offsetType
			offsetValue
			thingId
		}
		sensorProperties(condition: { sensorId: $sensorTypeId }) {
			property {
				metricName
			}
		}
	}
`;

export const DELETE_THING_OFFSET = gql`
	mutation deleteOffset($offsetId: UUID!) {
		deleteThingOffset(input: { id: $offsetId }) {
			clientMutationId
		}
	}
`;

export const CREATE_THING_OFFSET = gql`
	mutation createOffset($input: ThingOffsetInput!) {
		createThingOffset(input: { thingOffset: $input }) {
			clientMutationId
		}
	}
`;

export const UPDATE_THING_OFFSET = gql`
	mutation updateOffset($patch: ThingOffsetPatch!, $id: UUID!) {
		updateThingOffset(input: { id: $id, patch: $patch }) {
			clientMutationId
		}
	}
`;
