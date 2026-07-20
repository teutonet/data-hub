/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All input for the `createSensorWithProps` mutation. */
export type CreateSensorWithPropsInput = {
  appeui?: string | null | undefined;
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: string | null | undefined;
  datasheet?: string | null | undefined;
  description?: string | null | undefined;
  name?: string | null | undefined;
  outOfOrderSeconds?: number | null | undefined;
  project?: string | null | undefined;
  properties?: Array<PropertyInputRecordInput | null | undefined> | null | undefined;
  public?: boolean | null | undefined;
};

/** All input for the create `Thing` mutation. */
export type CreateThingInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: string | null | undefined;
  /** The `Thing` to be created by this mutation. */
  thing: ThingInput;
};

export enum OffsetType {
  Add = 'ADD',
  Div = 'DIV',
  Mult = 'MULT',
  Sub = 'SUB'
}

/**
 * A condition to be used against `Property` object types. All fields are tested
 * for equality and combined with a logical ‘and.’
 */
export type PropertyCondition = {
  /** Checks for equality with the object’s `description` field. */
  description?: string | null | undefined;
  /** Checks for equality with the object’s `id` field. */
  id?: string | null | undefined;
  /** Checks for equality with the object’s `measure` field. */
  measure?: string | null | undefined;
  /** Checks for equality with the object’s `metricName` field. */
  metricName?: string | null | undefined;
  /** Checks for equality with the object’s `name` field. */
  name?: string | null | undefined;
  /** Checks for equality with the object’s `project` field. */
  project?: string | null | undefined;
};

/** An input for mutations affecting `Property` */
export type PropertyInput = {
  description?: string | null | undefined;
  measure?: string | null | undefined;
  metricName?: string | null | undefined;
  name: string;
  project?: string | null | undefined;
};

/** An input for mutations affecting `PropertyInputRecord` */
export type PropertyInputRecordInput = {
  alias?: string | null | undefined;
  propertyId?: string | null | undefined;
  writeDelta?: boolean | null | undefined;
};

/** Represents an update to a `Property`. Fields that are set will be updated. */
export type PropertyPatch = {
  description?: string | null | undefined;
  measure?: string | null | undefined;
  metricName?: string | null | undefined;
  name?: string | null | undefined;
  project?: string | null | undefined;
};

/** A condition to be used against `Sensor` object types. All fields are tested for equality and combined with a logical ‘and.’ */
export type SensorCondition = {
  /** Checks for equality with the object’s `appeui` field. */
  appeui?: string | null | undefined;
  /** Checks for equality with the object’s `datasheet` field. */
  datasheet?: string | null | undefined;
  /** Checks for equality with the object’s `description` field. */
  description?: string | null | undefined;
  /** Checks for equality with the object’s `id` field. */
  id?: string | null | undefined;
  /** Checks for equality with the object’s `name` field. */
  name?: string | null | undefined;
  /** Checks for equality with the object’s `outOfOrderSeconds` field. */
  outOfOrderSeconds?: number | null | undefined;
  /** Checks for equality with the object’s `project` field. */
  project?: string | null | undefined;
  /** Checks for equality with the object’s `public` field. */
  public?: boolean | null | undefined;
};

/** All input for the `sensorMassCopy` mutation. */
export type SensorMassCopyInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: string | null | undefined;
  findSensortype?: boolean | null | undefined;
  overwriteValues?: boolean | null | undefined;
  targetProjectId?: string | null | undefined;
  thingIds?: Array<string | null | undefined> | null | undefined;
};

/** Represents an update to a `Sensor`. Fields that are set will be updated. */
export type SensorPatch = {
  appeui?: string | null | undefined;
  datasheet?: string | null | undefined;
  description?: string | null | undefined;
  name?: string | null | undefined;
  outOfOrderSeconds?: number | null | undefined;
  project?: string | null | undefined;
  public?: boolean | null | undefined;
};

/** A condition to be used against `Thing` object types. All fields are tested for equality and combined with a logical ‘and.’ */
export type ThingCondition = {
  /** Checks for equality with the object’s `altitude` field. */
  altitude?: string | null | undefined;
  /** Checks for equality with the object’s `appid` field. */
  appid?: string | null | undefined;
  /** Checks for equality with the object’s `customLabels` field. */
  customLabels?: Array<string | null | undefined> | null | undefined;
  /** Checks for equality with the object’s `deveui` field. */
  deveui?: string | null | undefined;
  /** Checks for equality with the object’s `devid` field. */
  devid?: string | null | undefined;
  /** Checks for equality with the object’s `errorTimestamp` field. */
  errorTimestamp?: string | null | undefined;
  /** Checks for equality with the object’s `geohash` field. */
  geohash?: string | null | undefined;
  /** Checks for equality with the object’s `hasError` field. */
  hasError?: boolean | null | undefined;
  /** Checks for equality with the object’s `id` field. */
  id?: string | null | undefined;
  /** Checks for equality with the object’s `install` field. */
  install?: boolean | null | undefined;
  /** Checks for equality with the object’s `lat` field. */
  lat?: string | null | undefined;
  /** Checks for equality with the object’s `latestError` field. */
  latestError?: string | null | undefined;
  /** Checks for equality with the object’s `locationdesc` field. */
  locationdesc?: string | null | undefined;
  /** Checks for equality with the object’s `locationname` field. */
  locationname?: string | null | undefined;
  /** Checks for equality with the object’s `long` field. */
  long?: string | null | undefined;
  /** Checks for equality with the object’s `name` field. */
  name?: string | null | undefined;
  /** Checks for equality with the object’s `ownedby` field. */
  ownedby?: string | null | undefined;
  /** Checks for equality with the object’s `project` field. */
  project?: string | null | undefined;
  /** Checks for equality with the object’s `public` field. */
  public?: boolean | null | undefined;
  /** Checks for equality with the object’s `sensorId` field. */
  sensorId?: string | null | undefined;
  /** Checks for equality with the object’s `status` field. */
  status?: string | null | undefined;
};

/** An input for mutations affecting `Thing` */
export type ThingInput = {
  altitude?: string | null | undefined;
  appid?: string | null | undefined;
  customLabels?: Array<string | null | undefined> | null | undefined;
  deveui?: string | null | undefined;
  devid?: string | null | undefined;
  errorTimestamp?: string | null | undefined;
  geohash?: string | null | undefined;
  hasError?: boolean | null | undefined;
  install?: boolean | null | undefined;
  lat?: string | null | undefined;
  latestError?: string | null | undefined;
  locationdesc?: string | null | undefined;
  locationname?: string | null | undefined;
  long?: string | null | undefined;
  name: string;
  ownedby?: string | null | undefined;
  project: string;
  public?: boolean | null | undefined;
  sensorId?: string | null | undefined;
  status?: string | null | undefined;
};

/** An input for mutations affecting `ThingOffset` */
export type ThingOffsetInput = {
  metricName: string;
  offsetType: OffsetType;
  offsetValue: string;
  project: string;
  thingId: string;
};

/** Represents an update to a `ThingOffset`. Fields that are set will be updated. */
export type ThingOffsetPatch = {
  metricName?: string | null | undefined;
  offsetType?: OffsetType | null | undefined;
  offsetValue?: string | null | undefined;
  project?: string | null | undefined;
  thingId?: string | null | undefined;
};

/** Represents an update to a `Thing`. Fields that are set will be updated. */
export type ThingPatch = {
  altitude?: string | null | undefined;
  appid?: string | null | undefined;
  customLabels?: Array<string | null | undefined> | null | undefined;
  deveui?: string | null | undefined;
  devid?: string | null | undefined;
  errorTimestamp?: string | null | undefined;
  geohash?: string | null | undefined;
  hasError?: boolean | null | undefined;
  install?: boolean | null | undefined;
  lat?: string | null | undefined;
  latestError?: string | null | undefined;
  locationdesc?: string | null | undefined;
  locationname?: string | null | undefined;
  long?: string | null | undefined;
  name?: string | null | undefined;
  ownedby?: string | null | undefined;
  project?: string | null | undefined;
  public?: boolean | null | undefined;
  sensorId?: string | null | undefined;
  status?: string | null | undefined;
};

export type GetAllSensorsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAllSensorsQuery = { sensors: Array<{ id: string, name: string, project: string, datasheet: string | null, description: string | null, sensorProperties: Array<{ alias: string | null, writeDelta: boolean, property: { measure: string | null, metricName: string | null, name: string } | null }> }> | null };

export type SensorsWithPropertiesQueryVariables = Exact<{
  project: string;
}>;


export type SensorsWithPropertiesQuery = { sensors: Array<{ id: string, name: string, description: string | null, sensorProperties: Array<{ alias: string | null, writeDelta: boolean, property: { name: string, metricName: string | null, measure: string | null } | null }> }> | null };

export type GetSensorsQueryVariables = Exact<{
  condition: SensorCondition;
}>;


export type GetSensorsQuery = { sensors: Array<{ id: string, name: string, project: string, datasheet: string | null, description: string | null, sensorProperties: Array<{ alias: string | null, writeDelta: boolean, property: { measure: string | null, metricName: string | null, name: string } | null }> }> | null };

export type GetAllThingsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAllThingsQuery = { things: Array<{ id: string, name: string, project: string, status: string | null, customLabels: Array<string | null> | null, latestError: string | null, errorTimestamp: string | null, sensor: { name: string, id: string } | null }> | null };

export type GetThingByIdQueryVariables = Exact<{
  id: string;
}>;


export type GetThingByIdQuery = { thing: { id: string, name: string, project: string, status: string | null, lat: string | null, locationdesc: string | null, locationname: string | null, long: string | null, nodeId: string, install: boolean | null, ownedby: string | null, public: boolean | null, altitude: string | null, appid: string | null, deveui: string | null, devid: string | null, geohash: string | null, sensorId: string | null, customLabels: Array<string | null> | null, latestError: string | null, errorTimestamp: string | null, sensor: { name: string, id: string, nodeId: string, datasheet: string | null, appeui: string | null } | null, thingLivedatum: { payload: string | null } | null } | null };

export type GetSensorByIdQueryVariables = Exact<{
  id: string;
}>;


export type GetSensorByIdQuery = { sensor: { id: string, name: string, project: string, description: string | null, public: boolean, nodeId: string, datasheet: string | null, appeui: string | null, outOfOrderSeconds: number | null, things: Array<{ name: string, id: string, project: string, lat: string | null, locationdesc: string | null, locationname: string | null, long: string | null, nodeId: string, ownedby: string | null, public: boolean | null, altitude: string | null, appid: string | null, deveui: string | null, devid: string | null, geohash: string | null, customLabels: Array<string | null> | null }>, sensorProperties: Array<{ alias: string | null, propertyId: string, writeDelta: boolean, property: { id: string, description: string | null, measure: string | null, metricName: string | null, name: string } | null }> } | null };

export type ThingFragment = { id: string, name: string, project: string, status: string | null, locationname: string | null, locationdesc: string | null, lat: string | null, long: string | null, altitude: string | null, nodeId: string, ownedby: string | null, public: boolean | null, appid: string | null, deveui: string | null, devid: string | null, geohash: string | null, customLabels: Array<string | null> | null, latestError: string | null, errorTimestamp: string | null, sensor: { name: string, id: string, project: string, nodeId: string, datasheet: string | null, appeui: string | null } | null, thingLivedatum: { payload: string | null } | null };

export type CreateThingMutationVariables = Exact<{
  input: CreateThingInput;
}>;


export type CreateThingMutation = { createThing: { thing: { id: string } | null } | null };

export type CreateThingsMutationVariables = Exact<{
  things: Array<string> | string;
}>;


export type CreateThingsMutation = { createThings: { clientMutationId: string | null } | null };

export type GetThingsQueryVariables = Exact<{
  condition: ThingCondition;
}>;


export type GetThingsQuery = { things: Array<{ id: string, name: string, project: string, status: string | null, locationname: string | null, locationdesc: string | null, lat: string | null, long: string | null, altitude: string | null, nodeId: string, ownedby: string | null, public: boolean | null, appid: string | null, deveui: string | null, devid: string | null, geohash: string | null, customLabels: Array<string | null> | null, latestError: string | null, errorTimestamp: string | null, sensor: { name: string, id: string, project: string, nodeId: string, datasheet: string | null, appeui: string | null } | null, thingLivedatum: { payload: string | null } | null }> | null };

export type UpdateThingByIdMutationVariables = Exact<{
  id: string;
  thingPatch: ThingPatch;
}>;


export type UpdateThingByIdMutation = { updateThing: { clientMutationId: string | null } | null };

export type GetAllPropertiesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAllPropertiesQuery = { properties: Array<{ id: string, measure: string | null, name: string, project: string | null, metricName: string | null }> | null };

export type GetPropertiesQueryVariables = Exact<{
  condition?: PropertyCondition | null | undefined;
}>;


export type GetPropertiesQuery = { properties: Array<{ description: string | null, id: string, measure: string | null, name: string, project: string | null, metricName: string | null }> | null };

export type ThingsQueryVariables = Exact<{
  project: string;
}>;


export type ThingsQuery = { properties: Array<{ description: string | null, id: string, measure: string | null, name: string, metricName: string | null }> | null, publicProps: Array<{ description: string | null, id: string, measure: string | null, name: string, metricName: string | null }> | null };

export type GetPropertyByIdQueryVariables = Exact<{
  id: string;
}>;


export type GetPropertyByIdQuery = { property: { description: string | null, id: string, measure: string | null, metricName: string | null, name: string, project: string | null } | null };

export type UpdatePropertyByIdMutationVariables = Exact<{
  id: string;
  propertyPatch: PropertyPatch;
}>;


export type UpdatePropertyByIdMutation = { updateProperty: { clientMutationId: string | null } | null };

export type CreatePropertyMutationVariables = Exact<{
  propertyInput: PropertyInput;
}>;


export type CreatePropertyMutation = { createProperty: { clientMutationId: string | null, property: { id: string } | null } | null };

export type UpdateSensorByIdMutationVariables = Exact<{
  id: string;
  sensorPatch: SensorPatch;
}>;


export type UpdateSensorByIdMutation = { updateSensor: { clientMutationId: string | null } | null };

export type DeleteSensorMutationVariables = Exact<{
  id: string;
}>;


export type DeleteSensorMutation = { deleteSensor: { clientMutationId: string | null } | null };

export type DeletePropertyMutationVariables = Exact<{
  id: string;
}>;


export type DeletePropertyMutation = { deleteProperty: { clientMutationId: string | null } | null };

export type DeleteThingMutationVariables = Exact<{
  id: string;
}>;


export type DeleteThingMutation = { deleteThing: { clientMutationId: string | null } | null };

export type GetSensorPropsQueryVariables = Exact<{
  sensorId: string;
}>;


export type GetSensorPropsQuery = { sensorProperties: Array<{ alias: string | null, propertyId: string, writeDelta: boolean, property: { description: string | null, measure: string | null, metricName: string | null, name: string } | null }> | null };

export type EditSensorPropertyMutationVariables = Exact<{
  propertyId: string;
  sensorId: string;
  writeDelta: boolean;
  alias?: string | null | undefined;
}>;


export type EditSensorPropertyMutation = { updateSensorProperty: { clientMutationId: string | null } | null };

export type CreateSensorPropertyMutationVariables = Exact<{
  project: string;
  sensorId: string;
  propertyId: string;
  writeDelta: boolean;
  alias?: string | null | undefined;
}>;


export type CreateSensorPropertyMutation = { createSensorProperty: { clientMutationId: string | null, sensorProperty: { alias: string | null, propertyId: string, sensorId: string } | null } | null };

export type CreateSensorWithPropsMutationVariables = Exact<{
  input: CreateSensorWithPropsInput;
}>;


export type CreateSensorWithPropsMutation = { createSensorWithProps: { clientMutationId: string | null, sensorId: string | null } | null };

export type DeleteSensorPropertyMutationVariables = Exact<{
  propertyId: string;
  sensorId: string;
}>;


export type DeleteSensorPropertyMutation = { deleteSensorProperty: { clientMutationId: string | null } | null };

export type AssignSensortypeToNewDevicesMutationVariables = Exact<{
  sensortypeId: string;
  deviceIds: Array<string | null | undefined> | string;
}>;


export type AssignSensortypeToNewDevicesMutation = { assignSensortypeToNewDevices: { clientMutationId: string | null } | null };

export type GetOffsetsAndMetricNamesQueryVariables = Exact<{
  thingId: string;
  sensorTypeId: string;
}>;


export type GetOffsetsAndMetricNamesQuery = { thingOffsets: Array<{ id: string, metricName: string, offsetType: OffsetType, offsetValue: string, thingId: string }> | null, sensorProperties: Array<{ property: { metricName: string | null } | null }> | null };

export type DeleteOffsetMutationVariables = Exact<{
  offsetId: string;
}>;


export type DeleteOffsetMutation = { deleteThingOffset: { clientMutationId: string | null } | null };

export type CreateOffsetMutationVariables = Exact<{
  input: ThingOffsetInput;
}>;


export type CreateOffsetMutation = { createThingOffset: { clientMutationId: string | null } | null };

export type UpdateOffsetMutationVariables = Exact<{
  patch: ThingOffsetPatch;
  id: string;
}>;


export type UpdateOffsetMutation = { updateThingOffset: { clientMutationId: string | null } | null };

export type ThingChangesQueryVariables = Exact<{
  id: string;
}>;


export type ThingChangesQuery = { changes: Array<{ auditId: string | null, auditUserName: string | null, eventKey: string | null, id: string | null, sessionInfo: string | null, stmtDate: string | null, valuesAfter: string | null, valuesBefore: string | null, transactionId: number | null } | null> | null };

export type SensorChangesQueryVariables = Exact<{
  id: string;
}>;


export type SensorChangesQuery = { changes: Array<{ auditId: string | null, auditUserName: string | null, eventKey: string | null, id: string | null, sessionInfo: string | null, stmtDate: string | null, valuesAfter: string | null, valuesBefore: string | null, transactionId: number | null } | null> | null };

export type SensorPropertyChangesQueryVariables = Exact<{
  id: string;
}>;


export type SensorPropertyChangesQuery = { changes: Array<{ auditId: string | null, auditUserName: string | null, eventKey: string | null, id: string | null, sessionInfo: string | null, stmtDate: string | null, valuesAfter: string | null, valuesBefore: string | null, transactionId: number | null } | null> | null };

export type PropertyChangesQueryVariables = Exact<{
  id: string;
}>;


export type PropertyChangesQuery = { changes: Array<{ auditId: string | null, auditUserName: string | null, eventKey: string | null, id: string | null, sessionInfo: string | null, stmtDate: string | null, valuesAfter: string | null, valuesBefore: string | null, transactionId: number | null } | null> | null };

export type ImportSensortypeMutationVariables = Exact<{
  currentProject: string;
  data: string;
}>;


export type ImportSensortypeMutation = { sensortypeImport: { uuid: string | null } | null };

export type GetSensortypeAndSensorpropsQueryVariables = Exact<{
  uuid: string;
}>;


export type GetSensortypeAndSensorpropsQuery = { sensor: { name: string, project: string, description: string | null, datasheet: string | null, appeui: string | null, public: boolean, outOfOrderSeconds: number | null, sensorProperties: Array<{ writeDelta: boolean, alias: string | null, property: { name: string, metricName: string | null, measure: string | null, description: string | null, project: string | null } | null }> } | null };

export type SensorMassCopyMutationVariables = Exact<{
  input: SensorMassCopyInput;
}>;


export type SensorMassCopyMutation = { sensorMassCopy: { count: number | null } | null };

export type GetThingsLatestErrorsQueryVariables = Exact<{
  condition: ThingCondition;
}>;


export type GetThingsLatestErrorsQuery = { things: Array<{ latestError: string | null, errorTimestamp: string | null, id: string, name: string, project: string }> | null };
