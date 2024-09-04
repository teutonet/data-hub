export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** A floating point number that requires more precision than IEEE 754 binary 64 */
  BigFloat: { input: any; output: any; }
  /** A JavaScript object encoded in the JSON format as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf). */
  JSON: { input: string; output: string; }
  /** A universally unique identifier as defined by [RFC 4122](https://tools.ietf.org/html/rfc4122). */
  UUID: { input: string; output: string; }
};

/** All input for the `assignSensortypeToNewDevices` mutation. */
export type AssignSensortypeToNewDevicesInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  deviceIds?: InputMaybe<Array<InputMaybe<Scalars['UUID']['input']>>>;
  sensorId?: InputMaybe<Scalars['UUID']['input']>;
};

/** The output of our `assignSensortypeToNewDevices` mutation. */
export type AssignSensortypeToNewDevicesPayload = {
  /**
   * The exact same `clientMutationId` that was provided in the mutation input,
   * unchanged and unused. May be used by a client to track mutations.
   */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  /** Our root query field type. Allows us to run any query from our mutation payload. */
  query?: Maybe<Query>;
};

/** All input for the create `Property` mutation. */
export type CreatePropertyInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The `Property` to be created by this mutation. */
  property: PropertyInput;
};

/** The output of our create `Property` mutation. */
export type CreatePropertyPayload = {
  /**
   * The exact same `clientMutationId` that was provided in the mutation input,
   * unchanged and unused. May be used by a client to track mutations.
   */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  /** The `Property` that was created by this mutation. */
  property?: Maybe<Property>;
  /** Our root query field type. Allows us to run any query from our mutation payload. */
  query?: Maybe<Query>;
};

/** All input for the create `PublicQuery` mutation. */
export type CreatePublicQueryInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The `PublicQuery` to be created by this mutation. */
  publicQuery: PublicQueryInput;
};

/** The output of our create `PublicQuery` mutation. */
export type CreatePublicQueryPayload = {
  /**
   * The exact same `clientMutationId` that was provided in the mutation input,
   * unchanged and unused. May be used by a client to track mutations.
   */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  /** The `PublicQuery` that was created by this mutation. */
  publicQuery?: Maybe<PublicQuery>;
  /** Our root query field type. Allows us to run any query from our mutation payload. */
  query?: Maybe<Query>;
};

/** All input for the create `Sensor` mutation. */
export type CreateSensorInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The `Sensor` to be created by this mutation. */
  sensor: SensorInput;
};

/** The output of our create `Sensor` mutation. */
export type CreateSensorPayload = {
  /**
   * The exact same `clientMutationId` that was provided in the mutation input,
   * unchanged and unused. May be used by a client to track mutations.
   */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  /** Our root query field type. Allows us to run any query from our mutation payload. */
  query?: Maybe<Query>;
  /** The `Sensor` that was created by this mutation. */
  sensor?: Maybe<Sensor>;
};

/** All input for the create `SensorProperty` mutation. */
export type CreateSensorPropertyInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The `SensorProperty` to be created by this mutation. */
  sensorProperty: SensorPropertyInput;
};

/** The output of our create `SensorProperty` mutation. */
export type CreateSensorPropertyPayload = {
  /**
   * The exact same `clientMutationId` that was provided in the mutation input,
   * unchanged and unused. May be used by a client to track mutations.
   */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  /** Reads a single `Property` that is related to this `SensorProperty`. */
  property?: Maybe<Property>;
  /** Our root query field type. Allows us to run any query from our mutation payload. */
  query?: Maybe<Query>;
  /** Reads a single `Sensor` that is related to this `SensorProperty`. */
  sensor?: Maybe<Sensor>;
  /** The `SensorProperty` that was created by this mutation. */
  sensorProperty?: Maybe<SensorProperty>;
};

/** All input for the `createSensorWithProps` mutation. */
export type CreateSensorWithPropsInput = {
  appeui?: InputMaybe<Scalars['String']['input']>;
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  datasheet?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  project?: InputMaybe<Scalars['String']['input']>;
  properties?: InputMaybe<Array<InputMaybe<PropertyInputRecordInput>>>;
  public?: InputMaybe<Scalars['Boolean']['input']>;
};

/** The output of our `createSensorWithProps` mutation. */
export type CreateSensorWithPropsPayload = {
  /**
   * The exact same `clientMutationId` that was provided in the mutation input,
   * unchanged and unused. May be used by a client to track mutations.
   */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  /** Our root query field type. Allows us to run any query from our mutation payload. */
  query?: Maybe<Query>;
  sensorId?: Maybe<Scalars['UUID']['output']>;
};

/** All input for the create `Thing` mutation. */
export type CreateThingInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The `Thing` to be created by this mutation. */
  thing: ThingInput;
};

/** All input for the create `ThingOffset` mutation. */
export type CreateThingOffsetInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The `ThingOffset` to be created by this mutation. */
  thingOffset: ThingOffsetInput;
};

/** The output of our create `ThingOffset` mutation. */
export type CreateThingOffsetPayload = {
  /**
   * The exact same `clientMutationId` that was provided in the mutation input,
   * unchanged and unused. May be used by a client to track mutations.
   */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  /** Our root query field type. Allows us to run any query from our mutation payload. */
  query?: Maybe<Query>;
  /** Reads a single `Thing` that is related to this `ThingOffset`. */
  thing?: Maybe<Thing>;
  /** The `ThingOffset` that was created by this mutation. */
  thingOffset?: Maybe<ThingOffset>;
};

/** The output of our create `Thing` mutation. */
export type CreateThingPayload = {
  /**
   * The exact same `clientMutationId` that was provided in the mutation input,
   * unchanged and unused. May be used by a client to track mutations.
   */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  /** Our root query field type. Allows us to run any query from our mutation payload. */
  query?: Maybe<Query>;
  /** Reads a single `Sensor` that is related to this `Thing`. */
  sensor?: Maybe<Sensor>;
  /** The `Thing` that was created by this mutation. */
  thing?: Maybe<Thing>;
};

/** All input for the `deletePropertyByNodeId` mutation. */
export type DeletePropertyByNodeIdInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The globally unique `ID` which will identify a single `Property` to be deleted. */
  nodeId: Scalars['ID']['input'];
};

/** All input for the `deleteProperty` mutation. */
export type DeletePropertyInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['UUID']['input'];
};

/** The output of our delete `Property` mutation. */
export type DeletePropertyPayload = {
  /**
   * The exact same `clientMutationId` that was provided in the mutation input,
   * unchanged and unused. May be used by a client to track mutations.
   */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  deletedPropertyNodeId?: Maybe<Scalars['ID']['output']>;
  /** The `Property` that was deleted by this mutation. */
  property?: Maybe<Property>;
  /** Our root query field type. Allows us to run any query from our mutation payload. */
  query?: Maybe<Query>;
};

/** All input for the `deletePublicQueryByNodeId` mutation. */
export type DeletePublicQueryByNodeIdInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The globally unique `ID` which will identify a single `PublicQuery` to be deleted. */
  nodeId: Scalars['ID']['input'];
};

/** All input for the `deletePublicQuery` mutation. */
export type DeletePublicQueryInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  project: Scalars['String']['input'];
};

/** The output of our delete `PublicQuery` mutation. */
export type DeletePublicQueryPayload = {
  /**
   * The exact same `clientMutationId` that was provided in the mutation input,
   * unchanged and unused. May be used by a client to track mutations.
   */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  deletedPublicQueryNodeId?: Maybe<Scalars['ID']['output']>;
  /** The `PublicQuery` that was deleted by this mutation. */
  publicQuery?: Maybe<PublicQuery>;
  /** Our root query field type. Allows us to run any query from our mutation payload. */
  query?: Maybe<Query>;
};

/** All input for the `deleteSensorByNodeId` mutation. */
export type DeleteSensorByNodeIdInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The globally unique `ID` which will identify a single `Sensor` to be deleted. */
  nodeId: Scalars['ID']['input'];
};

/** All input for the `deleteSensorByProjectAndName` mutation. */
export type DeleteSensorByProjectAndNameInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  project: Scalars['String']['input'];
};

/** All input for the `deleteSensor` mutation. */
export type DeleteSensorInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['UUID']['input'];
};

/** The output of our delete `Sensor` mutation. */
export type DeleteSensorPayload = {
  /**
   * The exact same `clientMutationId` that was provided in the mutation input,
   * unchanged and unused. May be used by a client to track mutations.
   */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  deletedSensorNodeId?: Maybe<Scalars['ID']['output']>;
  /** Our root query field type. Allows us to run any query from our mutation payload. */
  query?: Maybe<Query>;
  /** The `Sensor` that was deleted by this mutation. */
  sensor?: Maybe<Sensor>;
};

/** All input for the `deleteSensorPropertyByNodeId` mutation. */
export type DeleteSensorPropertyByNodeIdInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The globally unique `ID` which will identify a single `SensorProperty` to be deleted. */
  nodeId: Scalars['ID']['input'];
};

/** All input for the `deleteSensorProperty` mutation. */
export type DeleteSensorPropertyInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  propertyId: Scalars['UUID']['input'];
  sensorId: Scalars['UUID']['input'];
};

/** The output of our delete `SensorProperty` mutation. */
export type DeleteSensorPropertyPayload = {
  /**
   * The exact same `clientMutationId` that was provided in the mutation input,
   * unchanged and unused. May be used by a client to track mutations.
   */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  deletedSensorPropertyNodeId?: Maybe<Scalars['ID']['output']>;
  /** Reads a single `Property` that is related to this `SensorProperty`. */
  property?: Maybe<Property>;
  /** Our root query field type. Allows us to run any query from our mutation payload. */
  query?: Maybe<Query>;
  /** Reads a single `Sensor` that is related to this `SensorProperty`. */
  sensor?: Maybe<Sensor>;
  /** The `SensorProperty` that was deleted by this mutation. */
  sensorProperty?: Maybe<SensorProperty>;
};

/** All input for the `deleteThingByNodeId` mutation. */
export type DeleteThingByNodeIdInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The globally unique `ID` which will identify a single `Thing` to be deleted. */
  nodeId: Scalars['ID']['input'];
};

/** All input for the `deleteThingByProjectAndName` mutation. */
export type DeleteThingByProjectAndNameInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  project: Scalars['String']['input'];
};

/** All input for the `deleteThing` mutation. */
export type DeleteThingInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['UUID']['input'];
};

/** All input for the `deleteThingOffsetByNodeId` mutation. */
export type DeleteThingOffsetByNodeIdInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The globally unique `ID` which will identify a single `ThingOffset` to be deleted. */
  nodeId: Scalars['ID']['input'];
};

/** All input for the `deleteThingOffsetByThingIdAndMetricName` mutation. */
export type DeleteThingOffsetByThingIdAndMetricNameInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  metricName: Scalars['String']['input'];
  thingId: Scalars['UUID']['input'];
};

/** All input for the `deleteThingOffset` mutation. */
export type DeleteThingOffsetInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['UUID']['input'];
};

/** The output of our delete `ThingOffset` mutation. */
export type DeleteThingOffsetPayload = {
  /**
   * The exact same `clientMutationId` that was provided in the mutation input,
   * unchanged and unused. May be used by a client to track mutations.
   */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  deletedThingOffsetNodeId?: Maybe<Scalars['ID']['output']>;
  /** Our root query field type. Allows us to run any query from our mutation payload. */
  query?: Maybe<Query>;
  /** Reads a single `Thing` that is related to this `ThingOffset`. */
  thing?: Maybe<Thing>;
  /** The `ThingOffset` that was deleted by this mutation. */
  thingOffset?: Maybe<ThingOffset>;
};

/** The output of our delete `Thing` mutation. */
export type DeleteThingPayload = {
  /**
   * The exact same `clientMutationId` that was provided in the mutation input,
   * unchanged and unused. May be used by a client to track mutations.
   */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  deletedThingNodeId?: Maybe<Scalars['ID']['output']>;
  /** Our root query field type. Allows us to run any query from our mutation payload. */
  query?: Maybe<Query>;
  /** Reads a single `Sensor` that is related to this `Thing`. */
  sensor?: Maybe<Sensor>;
  /** The `Thing` that was deleted by this mutation. */
  thing?: Maybe<Thing>;
};

/** The root mutation type which contains root level fields which mutate data. */
export type Mutation = {
  assignSensortypeToNewDevices?: Maybe<AssignSensortypeToNewDevicesPayload>;
  /** Creates a single `Property`. */
  createProperty?: Maybe<CreatePropertyPayload>;
  /** Creates a single `PublicQuery`. */
  createPublicQuery?: Maybe<CreatePublicQueryPayload>;
  /** Creates a single `Sensor`. */
  createSensor?: Maybe<CreateSensorPayload>;
  /** Creates a single `SensorProperty`. */
  createSensorProperty?: Maybe<CreateSensorPropertyPayload>;
  createSensorWithProps?: Maybe<CreateSensorWithPropsPayload>;
  /** Creates a single `Thing`. */
  createThing?: Maybe<CreateThingPayload>;
  /** Creates a single `ThingOffset`. */
  createThingOffset?: Maybe<CreateThingOffsetPayload>;
  /** Deletes a single `Property` using a unique key. */
  deleteProperty?: Maybe<DeletePropertyPayload>;
  /** Deletes a single `Property` using its globally unique id. */
  deletePropertyByNodeId?: Maybe<DeletePropertyPayload>;
  /** Deletes a single `PublicQuery` using a unique key. */
  deletePublicQuery?: Maybe<DeletePublicQueryPayload>;
  /** Deletes a single `PublicQuery` using its globally unique id. */
  deletePublicQueryByNodeId?: Maybe<DeletePublicQueryPayload>;
  /** Deletes a single `Sensor` using a unique key. */
  deleteSensor?: Maybe<DeleteSensorPayload>;
  /** Deletes a single `Sensor` using its globally unique id. */
  deleteSensorByNodeId?: Maybe<DeleteSensorPayload>;
  /** Deletes a single `Sensor` using a unique key. */
  deleteSensorByProjectAndName?: Maybe<DeleteSensorPayload>;
  /** Deletes a single `SensorProperty` using a unique key. */
  deleteSensorProperty?: Maybe<DeleteSensorPropertyPayload>;
  /** Deletes a single `SensorProperty` using its globally unique id. */
  deleteSensorPropertyByNodeId?: Maybe<DeleteSensorPropertyPayload>;
  /** Deletes a single `Thing` using a unique key. */
  deleteThing?: Maybe<DeleteThingPayload>;
  /** Deletes a single `Thing` using its globally unique id. */
  deleteThingByNodeId?: Maybe<DeleteThingPayload>;
  /** Deletes a single `Thing` using a unique key. */
  deleteThingByProjectAndName?: Maybe<DeleteThingPayload>;
  /** Deletes a single `ThingOffset` using a unique key. */
  deleteThingOffset?: Maybe<DeleteThingOffsetPayload>;
  /** Deletes a single `ThingOffset` using its globally unique id. */
  deleteThingOffsetByNodeId?: Maybe<DeleteThingOffsetPayload>;
  /** Deletes a single `ThingOffset` using a unique key. */
  deleteThingOffsetByThingIdAndMetricName?: Maybe<DeleteThingOffsetPayload>;
  /** Creates one or many `Property`. */
  mnCreateProperty?: Maybe<MnCreatePropertyPayload>;
  /** Creates one or many `SensorProperty`. */
  mnCreateSensorProperty?: Maybe<MnCreateSensorPropertyPayload>;
  /** Creates one or many `Thing`. */
  mnCreateThing?: Maybe<MnCreateThingPayload>;
  /** Deletes one or many `Property` a unique key via a patch. */
  mnDeleteProperty?: Maybe<MnDeletePropertyPayload>;
  /** Deletes one or many `SensorProperty` a unique key via a patch. */
  mnDeleteSensorProperty?: Maybe<MnDeleteSensorPropertyPayload>;
  /** Deletes one or many `Thing` a unique key via a patch. */
  mnDeleteThing?: Maybe<MnDeleteThingPayload>;
  /** Updates one or many `Property` using a unique key and a patch. */
  mnUpdateProperty?: Maybe<MnUpdatePropertyPayload>;
  /** Updates one or many `SensorProperty` using a unique key and a patch. */
  mnUpdateSensorProperty?: Maybe<MnUpdateSensorPropertyPayload>;
  /** Updates one or many `Thing` using a unique key and a patch. */
  mnUpdateThing?: Maybe<MnUpdateThingPayload>;
  /** Updates a single `Property` using a unique key and a patch. */
  updateProperty?: Maybe<UpdatePropertyPayload>;
  /** Updates a single `Property` using its globally unique id and a patch. */
  updatePropertyByNodeId?: Maybe<UpdatePropertyPayload>;
  /** Updates a single `PublicQuery` using a unique key and a patch. */
  updatePublicQuery?: Maybe<UpdatePublicQueryPayload>;
  /** Updates a single `PublicQuery` using its globally unique id and a patch. */
  updatePublicQueryByNodeId?: Maybe<UpdatePublicQueryPayload>;
  /** Updates a single `Sensor` using a unique key and a patch. */
  updateSensor?: Maybe<UpdateSensorPayload>;
  /** Updates a single `Sensor` using its globally unique id and a patch. */
  updateSensorByNodeId?: Maybe<UpdateSensorPayload>;
  /** Updates a single `Sensor` using a unique key and a patch. */
  updateSensorByProjectAndName?: Maybe<UpdateSensorPayload>;
  /** Updates a single `SensorProperty` using a unique key and a patch. */
  updateSensorProperty?: Maybe<UpdateSensorPropertyPayload>;
  /** Updates a single `SensorProperty` using its globally unique id and a patch. */
  updateSensorPropertyByNodeId?: Maybe<UpdateSensorPropertyPayload>;
  /** Updates a single `Thing` using a unique key and a patch. */
  updateThing?: Maybe<UpdateThingPayload>;
  /** Updates a single `Thing` using its globally unique id and a patch. */
  updateThingByNodeId?: Maybe<UpdateThingPayload>;
  /** Updates a single `Thing` using a unique key and a patch. */
  updateThingByProjectAndName?: Maybe<UpdateThingPayload>;
  /** Updates a single `ThingOffset` using a unique key and a patch. */
  updateThingOffset?: Maybe<UpdateThingOffsetPayload>;
  /** Updates a single `ThingOffset` using its globally unique id and a patch. */
  updateThingOffsetByNodeId?: Maybe<UpdateThingOffsetPayload>;
  /** Updates a single `ThingOffset` using a unique key and a patch. */
  updateThingOffsetByThingIdAndMetricName?: Maybe<UpdateThingOffsetPayload>;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationAssignSensortypeToNewDevicesArgs = {
  input: AssignSensortypeToNewDevicesInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreatePropertyArgs = {
  input: CreatePropertyInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreatePublicQueryArgs = {
  input: CreatePublicQueryInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateSensorArgs = {
  input: CreateSensorInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateSensorPropertyArgs = {
  input: CreateSensorPropertyInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateSensorWithPropsArgs = {
  input: CreateSensorWithPropsInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateThingArgs = {
  input: CreateThingInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationCreateThingOffsetArgs = {
  input: CreateThingOffsetInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeletePropertyArgs = {
  input: DeletePropertyInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeletePropertyByNodeIdArgs = {
  input: DeletePropertyByNodeIdInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeletePublicQueryArgs = {
  input: DeletePublicQueryInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeletePublicQueryByNodeIdArgs = {
  input: DeletePublicQueryByNodeIdInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteSensorArgs = {
  input: DeleteSensorInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteSensorByNodeIdArgs = {
  input: DeleteSensorByNodeIdInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteSensorByProjectAndNameArgs = {
  input: DeleteSensorByProjectAndNameInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteSensorPropertyArgs = {
  input: DeleteSensorPropertyInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteSensorPropertyByNodeIdArgs = {
  input: DeleteSensorPropertyByNodeIdInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteThingArgs = {
  input: DeleteThingInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteThingByNodeIdArgs = {
  input: DeleteThingByNodeIdInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteThingByProjectAndNameArgs = {
  input: DeleteThingByProjectAndNameInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteThingOffsetArgs = {
  input: DeleteThingOffsetInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteThingOffsetByNodeIdArgs = {
  input: DeleteThingOffsetByNodeIdInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationDeleteThingOffsetByThingIdAndMetricNameArgs = {
  input: DeleteThingOffsetByThingIdAndMetricNameInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationMnCreatePropertyArgs = {
  input: MnCreatePropertyInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationMnCreateSensorPropertyArgs = {
  input: MnCreateSensorPropertyInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationMnCreateThingArgs = {
  input: MnCreateThingInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationMnDeletePropertyArgs = {
  input: MnDeletePropertyInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationMnDeleteSensorPropertyArgs = {
  input: MnDeleteSensorPropertyInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationMnDeleteThingArgs = {
  input: MnDeleteThingInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationMnUpdatePropertyArgs = {
  input: MnUpdatePropertyInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationMnUpdateSensorPropertyArgs = {
  input: MnUpdateSensorPropertyInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationMnUpdateThingArgs = {
  input: MnUpdateThingInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdatePropertyArgs = {
  input: UpdatePropertyInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdatePropertyByNodeIdArgs = {
  input: UpdatePropertyByNodeIdInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdatePublicQueryArgs = {
  input: UpdatePublicQueryInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdatePublicQueryByNodeIdArgs = {
  input: UpdatePublicQueryByNodeIdInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateSensorArgs = {
  input: UpdateSensorInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateSensorByNodeIdArgs = {
  input: UpdateSensorByNodeIdInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateSensorByProjectAndNameArgs = {
  input: UpdateSensorByProjectAndNameInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateSensorPropertyArgs = {
  input: UpdateSensorPropertyInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateSensorPropertyByNodeIdArgs = {
  input: UpdateSensorPropertyByNodeIdInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateThingArgs = {
  input: UpdateThingInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateThingByNodeIdArgs = {
  input: UpdateThingByNodeIdInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateThingByProjectAndNameArgs = {
  input: UpdateThingByProjectAndNameInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateThingOffsetArgs = {
  input: UpdateThingOffsetInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateThingOffsetByNodeIdArgs = {
  input: UpdateThingOffsetByNodeIdInput;
};


/** The root mutation type which contains root level fields which mutate data. */
export type MutationUpdateThingOffsetByThingIdAndMetricNameArgs = {
  input: UpdateThingOffsetByThingIdAndMetricNameInput;
};

/** An object with a globally unique `ID`. */
export type Node = {
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
};

export enum OffsetType {
  Add = 'ADD',
  Div = 'DIV',
  Mult = 'MULT',
  Sub = 'SUB'
}

/** Methods to use when ordering `Property`. */
export enum PropertiesOrderBy {
  DescriptionAsc = 'DESCRIPTION_ASC',
  DescriptionDesc = 'DESCRIPTION_DESC',
  IdAsc = 'ID_ASC',
  IdDesc = 'ID_DESC',
  MeasureAsc = 'MEASURE_ASC',
  MeasureDesc = 'MEASURE_DESC',
  MetricNameAsc = 'METRIC_NAME_ASC',
  MetricNameDesc = 'METRIC_NAME_DESC',
  NameAsc = 'NAME_ASC',
  NameDesc = 'NAME_DESC',
  Natural = 'NATURAL',
  PrimaryKeyAsc = 'PRIMARY_KEY_ASC',
  PrimaryKeyDesc = 'PRIMARY_KEY_DESC',
  ProjectAsc = 'PROJECT_ASC',
  ProjectDesc = 'PROJECT_DESC'
}

export type Property = Node & {
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['UUID']['output'];
  measure?: Maybe<Scalars['String']['output']>;
  metricName?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
  project?: Maybe<Scalars['String']['output']>;
  /** Reads and enables pagination through a set of `SensorProperty`. */
  sensorProperties: Array<SensorProperty>;
};


export type PropertySensorPropertiesArgs = {
  condition?: InputMaybe<SensorPropertyCondition>;
  first?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<SensorPropertiesOrderBy>>;
};

/**
 * A condition to be used against `Property` object types. All fields are tested
 * for equality and combined with a logical ‘and.’
 */
export type PropertyCondition = {
  /** Checks for equality with the object’s `description` field. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `id` field. */
  id?: InputMaybe<Scalars['UUID']['input']>;
  /** Checks for equality with the object’s `measure` field. */
  measure?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `metricName` field. */
  metricName?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `name` field. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `project` field. */
  project?: InputMaybe<Scalars['String']['input']>;
};

/** An input for mutations affecting `Property` */
export type PropertyInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  measure?: InputMaybe<Scalars['String']['input']>;
  metricName?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  project?: InputMaybe<Scalars['String']['input']>;
};

/** An input for mutations affecting `PropertyInputRecord` */
export type PropertyInputRecordInput = {
  alias?: InputMaybe<Scalars['String']['input']>;
  propertyId?: InputMaybe<Scalars['UUID']['input']>;
  writeDelta?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Represents an update to a `Property`. Fields that are set will be updated. */
export type PropertyPatch = {
  description?: InputMaybe<Scalars['String']['input']>;
  measure?: InputMaybe<Scalars['String']['input']>;
  metricName?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  project?: InputMaybe<Scalars['String']['input']>;
};

/** Methods to use when ordering `PublicQuery`. */
export enum PublicQueriesOrderBy {
  NameAsc = 'NAME_ASC',
  NameDesc = 'NAME_DESC',
  Natural = 'NATURAL',
  PrimaryKeyAsc = 'PRIMARY_KEY_ASC',
  PrimaryKeyDesc = 'PRIMARY_KEY_DESC',
  ProjectAsc = 'PROJECT_ASC',
  ProjectDesc = 'PROJECT_DESC',
  QueryAsc = 'QUERY_ASC',
  QueryDesc = 'QUERY_DESC'
}

export type PublicQuery = Node & {
  name: Scalars['String']['output'];
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
  project: Scalars['String']['output'];
  query: Scalars['String']['output'];
};

/**
 * A condition to be used against `PublicQuery` object types. All fields are tested
 * for equality and combined with a logical ‘and.’
 */
export type PublicQueryCondition = {
  /** Checks for equality with the object’s `name` field. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `project` field. */
  project?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `query` field. */
  query?: InputMaybe<Scalars['String']['input']>;
};

/** An input for mutations affecting `PublicQuery` */
export type PublicQueryInput = {
  name: Scalars['String']['input'];
  project: Scalars['String']['input'];
  query: Scalars['String']['input'];
};

/** Represents an update to a `PublicQuery`. Fields that are set will be updated. */
export type PublicQueryPatch = {
  name?: InputMaybe<Scalars['String']['input']>;
  project?: InputMaybe<Scalars['String']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
};

/** The root query type which gives access points into the data universe. */
export type Query = Node & {
  accessToProject?: Maybe<Scalars['Boolean']['output']>;
  accessToProjects?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  checkCustomLabelsFormat?: Maybe<Scalars['Boolean']['output']>;
  findForPropertySuperset?: Maybe<Array<Maybe<Scalars['UUID']['output']>>>;
  findWithIdenticalProperties?: Maybe<Array<Maybe<Scalars['UUID']['output']>>>;
  /** Fetches an object given its globally unique `ID`. */
  node?: Maybe<Node>;
  /** The root query type must be a `Node` to work well with Relay 1 mutations. This just resolves to `query`. */
  nodeId: Scalars['ID']['output'];
  /** Reads a set of `Property`. */
  properties?: Maybe<Array<Property>>;
  property?: Maybe<Property>;
  /** Reads a single `Property` using its globally unique `ID`. */
  propertyByNodeId?: Maybe<Property>;
  /** Reads a set of `PublicQuery`. */
  publicQueries?: Maybe<Array<PublicQuery>>;
  publicQuery?: Maybe<PublicQuery>;
  /** Reads a single `PublicQuery` using its globally unique `ID`. */
  publicQueryByNodeId?: Maybe<PublicQuery>;
  /**
   * Exposes the root query type nested one level down. This is helpful for Relay 1
   * which can only query top level fields if they are in a particular form.
   */
  query: Query;
  sensor?: Maybe<Sensor>;
  /** Reads a single `Sensor` using its globally unique `ID`. */
  sensorByNodeId?: Maybe<Sensor>;
  sensorByProjectAndName?: Maybe<Sensor>;
  /** Reads a set of `SensorProperty`. */
  sensorProperties?: Maybe<Array<SensorProperty>>;
  sensorProperty?: Maybe<SensorProperty>;
  /** Reads a single `SensorProperty` using its globally unique `ID`. */
  sensorPropertyByNodeId?: Maybe<SensorProperty>;
  /** Reads a set of `Sensor`. */
  sensors?: Maybe<Array<Sensor>>;
  thing?: Maybe<Thing>;
  /** Reads a single `Thing` using its globally unique `ID`. */
  thingByNodeId?: Maybe<Thing>;
  thingByProjectAndName?: Maybe<Thing>;
  thingOffset?: Maybe<ThingOffset>;
  /** Reads a single `ThingOffset` using its globally unique `ID`. */
  thingOffsetByNodeId?: Maybe<ThingOffset>;
  thingOffsetByThingIdAndMetricName?: Maybe<ThingOffset>;
  /** Reads a set of `ThingOffset`. */
  thingOffsets?: Maybe<Array<ThingOffset>>;
  /** Reads a set of `Thing`. */
  things?: Maybe<Array<Thing>>;
};


/** The root query type which gives access points into the data universe. */
export type QueryAccessToProjectArgs = {
  project?: InputMaybe<Scalars['String']['input']>;
};


/** The root query type which gives access points into the data universe. */
export type QueryAccessToProjectsArgs = {
  first?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


/** The root query type which gives access points into the data universe. */
export type QueryCheckCustomLabelsFormatArgs = {
  arr?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


/** The root query type which gives access points into the data universe. */
export type QueryFindForPropertySupersetArgs = {
  first?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  propertyNames?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


/** The root query type which gives access points into the data universe. */
export type QueryFindWithIdenticalPropertiesArgs = {
  first?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  propertyNames?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


/** The root query type which gives access points into the data universe. */
export type QueryNodeArgs = {
  nodeId: Scalars['ID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryPropertiesArgs = {
  condition?: InputMaybe<PropertyCondition>;
  first?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<PropertiesOrderBy>>;
};


/** The root query type which gives access points into the data universe. */
export type QueryPropertyArgs = {
  id: Scalars['UUID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryPropertyByNodeIdArgs = {
  nodeId: Scalars['ID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryPublicQueriesArgs = {
  condition?: InputMaybe<PublicQueryCondition>;
  first?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<PublicQueriesOrderBy>>;
};


/** The root query type which gives access points into the data universe. */
export type QueryPublicQueryArgs = {
  name: Scalars['String']['input'];
  project: Scalars['String']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryPublicQueryByNodeIdArgs = {
  nodeId: Scalars['ID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QuerySensorArgs = {
  id: Scalars['UUID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QuerySensorByNodeIdArgs = {
  nodeId: Scalars['ID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QuerySensorByProjectAndNameArgs = {
  name: Scalars['String']['input'];
  project: Scalars['String']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QuerySensorPropertiesArgs = {
  condition?: InputMaybe<SensorPropertyCondition>;
  first?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<SensorPropertiesOrderBy>>;
};


/** The root query type which gives access points into the data universe. */
export type QuerySensorPropertyArgs = {
  propertyId: Scalars['UUID']['input'];
  sensorId: Scalars['UUID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QuerySensorPropertyByNodeIdArgs = {
  nodeId: Scalars['ID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QuerySensorsArgs = {
  condition?: InputMaybe<SensorCondition>;
  first?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<SensorsOrderBy>>;
};


/** The root query type which gives access points into the data universe. */
export type QueryThingArgs = {
  id: Scalars['UUID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryThingByNodeIdArgs = {
  nodeId: Scalars['ID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryThingByProjectAndNameArgs = {
  name: Scalars['String']['input'];
  project: Scalars['String']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryThingOffsetArgs = {
  id: Scalars['UUID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryThingOffsetByNodeIdArgs = {
  nodeId: Scalars['ID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryThingOffsetByThingIdAndMetricNameArgs = {
  metricName: Scalars['String']['input'];
  thingId: Scalars['UUID']['input'];
};


/** The root query type which gives access points into the data universe. */
export type QueryThingOffsetsArgs = {
  condition?: InputMaybe<ThingOffsetCondition>;
  first?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ThingOffsetsOrderBy>>;
};


/** The root query type which gives access points into the data universe. */
export type QueryThingsArgs = {
  condition?: InputMaybe<ThingCondition>;
  first?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ThingsOrderBy>>;
};

export type Sensor = Node & {
  appeui?: Maybe<Scalars['String']['output']>;
  datasheet?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['UUID']['output'];
  name: Scalars['String']['output'];
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
  project: Scalars['String']['output'];
  public: Scalars['Boolean']['output'];
  /** Reads and enables pagination through a set of `SensorProperty`. */
  sensorProperties: Array<SensorProperty>;
  /** Reads and enables pagination through a set of `Thing`. */
  things: Array<Thing>;
};


export type SensorSensorPropertiesArgs = {
  condition?: InputMaybe<SensorPropertyCondition>;
  first?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<SensorPropertiesOrderBy>>;
};


export type SensorThingsArgs = {
  condition?: InputMaybe<ThingCondition>;
  first?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ThingsOrderBy>>;
};

/** A condition to be used against `Sensor` object types. All fields are tested for equality and combined with a logical ‘and.’ */
export type SensorCondition = {
  /** Checks for equality with the object’s `appeui` field. */
  appeui?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `datasheet` field. */
  datasheet?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `description` field. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `id` field. */
  id?: InputMaybe<Scalars['UUID']['input']>;
  /** Checks for equality with the object’s `name` field. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `project` field. */
  project?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `public` field. */
  public?: InputMaybe<Scalars['Boolean']['input']>;
};

/** An input for mutations affecting `Sensor` */
export type SensorInput = {
  appeui?: InputMaybe<Scalars['String']['input']>;
  datasheet?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  project: Scalars['String']['input'];
  public?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Represents an update to a `Sensor`. Fields that are set will be updated. */
export type SensorPatch = {
  appeui?: InputMaybe<Scalars['String']['input']>;
  datasheet?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  project?: InputMaybe<Scalars['String']['input']>;
  public?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Methods to use when ordering `SensorProperty`. */
export enum SensorPropertiesOrderBy {
  AliasAsc = 'ALIAS_ASC',
  AliasDesc = 'ALIAS_DESC',
  Natural = 'NATURAL',
  PrimaryKeyAsc = 'PRIMARY_KEY_ASC',
  PrimaryKeyDesc = 'PRIMARY_KEY_DESC',
  ProjectAsc = 'PROJECT_ASC',
  ProjectDesc = 'PROJECT_DESC',
  PropertyIdAsc = 'PROPERTY_ID_ASC',
  PropertyIdDesc = 'PROPERTY_ID_DESC',
  PublicAsc = 'PUBLIC_ASC',
  PublicDesc = 'PUBLIC_DESC',
  SensorIdAsc = 'SENSOR_ID_ASC',
  SensorIdDesc = 'SENSOR_ID_DESC',
  WriteDeltaAsc = 'WRITE_DELTA_ASC',
  WriteDeltaDesc = 'WRITE_DELTA_DESC'
}

export type SensorProperty = Node & {
  alias?: Maybe<Scalars['String']['output']>;
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
  project: Scalars['String']['output'];
  /** Reads a single `Property` that is related to this `SensorProperty`. */
  property?: Maybe<Property>;
  propertyId: Scalars['UUID']['output'];
  public?: Maybe<Scalars['Boolean']['output']>;
  /** Reads a single `Sensor` that is related to this `SensorProperty`. */
  sensor?: Maybe<Sensor>;
  sensorId: Scalars['UUID']['output'];
  writeDelta: Scalars['Boolean']['output'];
};

/**
 * A condition to be used against `SensorProperty` object types. All fields are
 * tested for equality and combined with a logical ‘and.’
 */
export type SensorPropertyCondition = {
  /** Checks for equality with the object’s `alias` field. */
  alias?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `project` field. */
  project?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `propertyId` field. */
  propertyId?: InputMaybe<Scalars['UUID']['input']>;
  /** Checks for equality with the object’s `public` field. */
  public?: InputMaybe<Scalars['Boolean']['input']>;
  /** Checks for equality with the object’s `sensorId` field. */
  sensorId?: InputMaybe<Scalars['UUID']['input']>;
  /** Checks for equality with the object’s `writeDelta` field. */
  writeDelta?: InputMaybe<Scalars['Boolean']['input']>;
};

/** An input for mutations affecting `SensorProperty` */
export type SensorPropertyInput = {
  alias?: InputMaybe<Scalars['String']['input']>;
  project: Scalars['String']['input'];
  propertyId: Scalars['UUID']['input'];
  public?: InputMaybe<Scalars['Boolean']['input']>;
  sensorId: Scalars['UUID']['input'];
  writeDelta?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Represents an update to a `SensorProperty`. Fields that are set will be updated. */
export type SensorPropertyPatch = {
  alias?: InputMaybe<Scalars['String']['input']>;
  project?: InputMaybe<Scalars['String']['input']>;
  propertyId?: InputMaybe<Scalars['UUID']['input']>;
  public?: InputMaybe<Scalars['Boolean']['input']>;
  sensorId?: InputMaybe<Scalars['UUID']['input']>;
  writeDelta?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Methods to use when ordering `Sensor`. */
export enum SensorsOrderBy {
  AppeuiAsc = 'APPEUI_ASC',
  AppeuiDesc = 'APPEUI_DESC',
  DatasheetAsc = 'DATASHEET_ASC',
  DatasheetDesc = 'DATASHEET_DESC',
  DescriptionAsc = 'DESCRIPTION_ASC',
  DescriptionDesc = 'DESCRIPTION_DESC',
  IdAsc = 'ID_ASC',
  IdDesc = 'ID_DESC',
  NameAsc = 'NAME_ASC',
  NameDesc = 'NAME_DESC',
  Natural = 'NATURAL',
  PrimaryKeyAsc = 'PRIMARY_KEY_ASC',
  PrimaryKeyDesc = 'PRIMARY_KEY_DESC',
  ProjectAsc = 'PROJECT_ASC',
  ProjectDesc = 'PROJECT_DESC',
  PublicAsc = 'PUBLIC_ASC',
  PublicDesc = 'PUBLIC_DESC'
}

export type Thing = Node & {
  altitude?: Maybe<Scalars['String']['output']>;
  appid?: Maybe<Scalars['String']['output']>;
  customLabels?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  deveui?: Maybe<Scalars['String']['output']>;
  devid?: Maybe<Scalars['String']['output']>;
  geohash?: Maybe<Scalars['String']['output']>;
  id: Scalars['UUID']['output'];
  install?: Maybe<Scalars['Boolean']['output']>;
  lastValues?: Maybe<Scalars['JSON']['output']>;
  lat?: Maybe<Scalars['BigFloat']['output']>;
  locationdesc?: Maybe<Scalars['String']['output']>;
  locationname?: Maybe<Scalars['String']['output']>;
  long?: Maybe<Scalars['BigFloat']['output']>;
  name: Scalars['String']['output'];
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
  ownedby?: Maybe<Scalars['String']['output']>;
  payload?: Maybe<Scalars['JSON']['output']>;
  project: Scalars['String']['output'];
  public?: Maybe<Scalars['Boolean']['output']>;
  /** Reads a single `Sensor` that is related to this `Thing`. */
  sensor?: Maybe<Sensor>;
  sensorId?: Maybe<Scalars['UUID']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  /** Reads and enables pagination through a set of `ThingOffset`. */
  thingOffsets: Array<ThingOffset>;
};


export type ThingThingOffsetsArgs = {
  condition?: InputMaybe<ThingOffsetCondition>;
  first?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ThingOffsetsOrderBy>>;
};

/** A condition to be used against `Thing` object types. All fields are tested for equality and combined with a logical ‘and.’ */
export type ThingCondition = {
  /** Checks for equality with the object’s `altitude` field. */
  altitude?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `appid` field. */
  appid?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `customLabels` field. */
  customLabels?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  /** Checks for equality with the object’s `deveui` field. */
  deveui?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `devid` field. */
  devid?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `geohash` field. */
  geohash?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `id` field. */
  id?: InputMaybe<Scalars['UUID']['input']>;
  /** Checks for equality with the object’s `install` field. */
  install?: InputMaybe<Scalars['Boolean']['input']>;
  /** Checks for equality with the object’s `lastValues` field. */
  lastValues?: InputMaybe<Scalars['JSON']['input']>;
  /** Checks for equality with the object’s `lat` field. */
  lat?: InputMaybe<Scalars['BigFloat']['input']>;
  /** Checks for equality with the object’s `locationdesc` field. */
  locationdesc?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `locationname` field. */
  locationname?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `long` field. */
  long?: InputMaybe<Scalars['BigFloat']['input']>;
  /** Checks for equality with the object’s `name` field. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `ownedby` field. */
  ownedby?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `payload` field. */
  payload?: InputMaybe<Scalars['JSON']['input']>;
  /** Checks for equality with the object’s `project` field. */
  project?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `public` field. */
  public?: InputMaybe<Scalars['Boolean']['input']>;
  /** Checks for equality with the object’s `sensorId` field. */
  sensorId?: InputMaybe<Scalars['UUID']['input']>;
  /** Checks for equality with the object’s `status` field. */
  status?: InputMaybe<Scalars['String']['input']>;
};

/** An input for mutations affecting `Thing` */
export type ThingInput = {
  altitude?: InputMaybe<Scalars['String']['input']>;
  appid?: InputMaybe<Scalars['String']['input']>;
  customLabels?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  deveui?: InputMaybe<Scalars['String']['input']>;
  devid?: InputMaybe<Scalars['String']['input']>;
  geohash?: InputMaybe<Scalars['String']['input']>;
  install?: InputMaybe<Scalars['Boolean']['input']>;
  lastValues?: InputMaybe<Scalars['JSON']['input']>;
  lat?: InputMaybe<Scalars['BigFloat']['input']>;
  locationdesc?: InputMaybe<Scalars['String']['input']>;
  locationname?: InputMaybe<Scalars['String']['input']>;
  long?: InputMaybe<Scalars['BigFloat']['input']>;
  name: Scalars['String']['input'];
  ownedby?: InputMaybe<Scalars['String']['input']>;
  payload?: InputMaybe<Scalars['JSON']['input']>;
  project: Scalars['String']['input'];
  public?: InputMaybe<Scalars['Boolean']['input']>;
  sensorId?: InputMaybe<Scalars['UUID']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};

export type ThingOffset = Node & {
  id: Scalars['UUID']['output'];
  metricName: Scalars['String']['output'];
  /** A globally unique identifier. Can be used in various places throughout the system to identify this single value. */
  nodeId: Scalars['ID']['output'];
  offsetType: OffsetType;
  offsetValue: Scalars['BigFloat']['output'];
  project: Scalars['String']['output'];
  /** Reads a single `Thing` that is related to this `ThingOffset`. */
  thing?: Maybe<Thing>;
  thingId: Scalars['UUID']['output'];
};

/**
 * A condition to be used against `ThingOffset` object types. All fields are tested
 * for equality and combined with a logical ‘and.’
 */
export type ThingOffsetCondition = {
  /** Checks for equality with the object’s `id` field. */
  id?: InputMaybe<Scalars['UUID']['input']>;
  /** Checks for equality with the object’s `metricName` field. */
  metricName?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `offsetType` field. */
  offsetType?: InputMaybe<OffsetType>;
  /** Checks for equality with the object’s `offsetValue` field. */
  offsetValue?: InputMaybe<Scalars['BigFloat']['input']>;
  /** Checks for equality with the object’s `project` field. */
  project?: InputMaybe<Scalars['String']['input']>;
  /** Checks for equality with the object’s `thingId` field. */
  thingId?: InputMaybe<Scalars['UUID']['input']>;
};

/** An input for mutations affecting `ThingOffset` */
export type ThingOffsetInput = {
  metricName: Scalars['String']['input'];
  offsetType: OffsetType;
  offsetValue: Scalars['BigFloat']['input'];
  project: Scalars['String']['input'];
  thingId: Scalars['UUID']['input'];
};

/** Represents an update to a `ThingOffset`. Fields that are set will be updated. */
export type ThingOffsetPatch = {
  metricName?: InputMaybe<Scalars['String']['input']>;
  offsetType?: InputMaybe<OffsetType>;
  offsetValue?: InputMaybe<Scalars['BigFloat']['input']>;
  project?: InputMaybe<Scalars['String']['input']>;
  thingId?: InputMaybe<Scalars['UUID']['input']>;
};

/** Methods to use when ordering `ThingOffset`. */
export enum ThingOffsetsOrderBy {
  IdAsc = 'ID_ASC',
  IdDesc = 'ID_DESC',
  MetricNameAsc = 'METRIC_NAME_ASC',
  MetricNameDesc = 'METRIC_NAME_DESC',
  Natural = 'NATURAL',
  OffsetTypeAsc = 'OFFSET_TYPE_ASC',
  OffsetTypeDesc = 'OFFSET_TYPE_DESC',
  OffsetValueAsc = 'OFFSET_VALUE_ASC',
  OffsetValueDesc = 'OFFSET_VALUE_DESC',
  PrimaryKeyAsc = 'PRIMARY_KEY_ASC',
  PrimaryKeyDesc = 'PRIMARY_KEY_DESC',
  ProjectAsc = 'PROJECT_ASC',
  ProjectDesc = 'PROJECT_DESC',
  ThingIdAsc = 'THING_ID_ASC',
  ThingIdDesc = 'THING_ID_DESC'
}

/** Represents an update to a `Thing`. Fields that are set will be updated. */
export type ThingPatch = {
  altitude?: InputMaybe<Scalars['String']['input']>;
  appid?: InputMaybe<Scalars['String']['input']>;
  customLabels?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  deveui?: InputMaybe<Scalars['String']['input']>;
  devid?: InputMaybe<Scalars['String']['input']>;
  geohash?: InputMaybe<Scalars['String']['input']>;
  install?: InputMaybe<Scalars['Boolean']['input']>;
  lastValues?: InputMaybe<Scalars['JSON']['input']>;
  lat?: InputMaybe<Scalars['BigFloat']['input']>;
  locationdesc?: InputMaybe<Scalars['String']['input']>;
  locationname?: InputMaybe<Scalars['String']['input']>;
  long?: InputMaybe<Scalars['BigFloat']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  ownedby?: InputMaybe<Scalars['String']['input']>;
  payload?: InputMaybe<Scalars['JSON']['input']>;
  project?: InputMaybe<Scalars['String']['input']>;
  public?: InputMaybe<Scalars['Boolean']['input']>;
  sensorId?: InputMaybe<Scalars['UUID']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};

/** Methods to use when ordering `Thing`. */
export enum ThingsOrderBy {
  AltitudeAsc = 'ALTITUDE_ASC',
  AltitudeDesc = 'ALTITUDE_DESC',
  AppidAsc = 'APPID_ASC',
  AppidDesc = 'APPID_DESC',
  CustomLabelsAsc = 'CUSTOM_LABELS_ASC',
  CustomLabelsDesc = 'CUSTOM_LABELS_DESC',
  DeveuiAsc = 'DEVEUI_ASC',
  DeveuiDesc = 'DEVEUI_DESC',
  DevidAsc = 'DEVID_ASC',
  DevidDesc = 'DEVID_DESC',
  GeohashAsc = 'GEOHASH_ASC',
  GeohashDesc = 'GEOHASH_DESC',
  IdAsc = 'ID_ASC',
  IdDesc = 'ID_DESC',
  InstallAsc = 'INSTALL_ASC',
  InstallDesc = 'INSTALL_DESC',
  LastValuesAsc = 'LAST_VALUES_ASC',
  LastValuesDesc = 'LAST_VALUES_DESC',
  LatAsc = 'LAT_ASC',
  LatDesc = 'LAT_DESC',
  LocationdescAsc = 'LOCATIONDESC_ASC',
  LocationdescDesc = 'LOCATIONDESC_DESC',
  LocationnameAsc = 'LOCATIONNAME_ASC',
  LocationnameDesc = 'LOCATIONNAME_DESC',
  LongAsc = 'LONG_ASC',
  LongDesc = 'LONG_DESC',
  NameAsc = 'NAME_ASC',
  NameDesc = 'NAME_DESC',
  Natural = 'NATURAL',
  OwnedbyAsc = 'OWNEDBY_ASC',
  OwnedbyDesc = 'OWNEDBY_DESC',
  PayloadAsc = 'PAYLOAD_ASC',
  PayloadDesc = 'PAYLOAD_DESC',
  PrimaryKeyAsc = 'PRIMARY_KEY_ASC',
  PrimaryKeyDesc = 'PRIMARY_KEY_DESC',
  ProjectAsc = 'PROJECT_ASC',
  ProjectDesc = 'PROJECT_DESC',
  PublicAsc = 'PUBLIC_ASC',
  PublicDesc = 'PUBLIC_DESC',
  SensorIdAsc = 'SENSOR_ID_ASC',
  SensorIdDesc = 'SENSOR_ID_DESC',
  StatusAsc = 'STATUS_ASC',
  StatusDesc = 'STATUS_DESC'
}

/** All input for the `updatePropertyByNodeId` mutation. */
export type UpdatePropertyByNodeIdInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The globally unique `ID` which will identify a single `Property` to be updated. */
  nodeId: Scalars['ID']['input'];
  /** An object where the defined keys will be set on the `Property` being updated. */
  patch: PropertyPatch;
};

/** All input for the `updateProperty` mutation. */
export type UpdatePropertyInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['UUID']['input'];
  /** An object where the defined keys will be set on the `Property` being updated. */
  patch: PropertyPatch;
};

/** The output of our update `Property` mutation. */
export type UpdatePropertyPayload = {
  /**
   * The exact same `clientMutationId` that was provided in the mutation input,
   * unchanged and unused. May be used by a client to track mutations.
   */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  /** The `Property` that was updated by this mutation. */
  property?: Maybe<Property>;
  /** Our root query field type. Allows us to run any query from our mutation payload. */
  query?: Maybe<Query>;
};

/** All input for the `updatePublicQueryByNodeId` mutation. */
export type UpdatePublicQueryByNodeIdInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The globally unique `ID` which will identify a single `PublicQuery` to be updated. */
  nodeId: Scalars['ID']['input'];
  /** An object where the defined keys will be set on the `PublicQuery` being updated. */
  patch: PublicQueryPatch;
};

/** All input for the `updatePublicQuery` mutation. */
export type UpdatePublicQueryInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  /** An object where the defined keys will be set on the `PublicQuery` being updated. */
  patch: PublicQueryPatch;
  project: Scalars['String']['input'];
};

/** The output of our update `PublicQuery` mutation. */
export type UpdatePublicQueryPayload = {
  /**
   * The exact same `clientMutationId` that was provided in the mutation input,
   * unchanged and unused. May be used by a client to track mutations.
   */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  /** The `PublicQuery` that was updated by this mutation. */
  publicQuery?: Maybe<PublicQuery>;
  /** Our root query field type. Allows us to run any query from our mutation payload. */
  query?: Maybe<Query>;
};

/** All input for the `updateSensorByNodeId` mutation. */
export type UpdateSensorByNodeIdInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The globally unique `ID` which will identify a single `Sensor` to be updated. */
  nodeId: Scalars['ID']['input'];
  /** An object where the defined keys will be set on the `Sensor` being updated. */
  patch: SensorPatch;
};

/** All input for the `updateSensorByProjectAndName` mutation. */
export type UpdateSensorByProjectAndNameInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  /** An object where the defined keys will be set on the `Sensor` being updated. */
  patch: SensorPatch;
  project: Scalars['String']['input'];
};

/** All input for the `updateSensor` mutation. */
export type UpdateSensorInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['UUID']['input'];
  /** An object where the defined keys will be set on the `Sensor` being updated. */
  patch: SensorPatch;
};

/** The output of our update `Sensor` mutation. */
export type UpdateSensorPayload = {
  /**
   * The exact same `clientMutationId` that was provided in the mutation input,
   * unchanged and unused. May be used by a client to track mutations.
   */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  /** Our root query field type. Allows us to run any query from our mutation payload. */
  query?: Maybe<Query>;
  /** The `Sensor` that was updated by this mutation. */
  sensor?: Maybe<Sensor>;
};

/** All input for the `updateSensorPropertyByNodeId` mutation. */
export type UpdateSensorPropertyByNodeIdInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The globally unique `ID` which will identify a single `SensorProperty` to be updated. */
  nodeId: Scalars['ID']['input'];
  /** An object where the defined keys will be set on the `SensorProperty` being updated. */
  patch: SensorPropertyPatch;
};

/** All input for the `updateSensorProperty` mutation. */
export type UpdateSensorPropertyInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** An object where the defined keys will be set on the `SensorProperty` being updated. */
  patch: SensorPropertyPatch;
  propertyId: Scalars['UUID']['input'];
  sensorId: Scalars['UUID']['input'];
};

/** The output of our update `SensorProperty` mutation. */
export type UpdateSensorPropertyPayload = {
  /**
   * The exact same `clientMutationId` that was provided in the mutation input,
   * unchanged and unused. May be used by a client to track mutations.
   */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  /** Reads a single `Property` that is related to this `SensorProperty`. */
  property?: Maybe<Property>;
  /** Our root query field type. Allows us to run any query from our mutation payload. */
  query?: Maybe<Query>;
  /** Reads a single `Sensor` that is related to this `SensorProperty`. */
  sensor?: Maybe<Sensor>;
  /** The `SensorProperty` that was updated by this mutation. */
  sensorProperty?: Maybe<SensorProperty>;
};

/** All input for the `updateThingByNodeId` mutation. */
export type UpdateThingByNodeIdInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The globally unique `ID` which will identify a single `Thing` to be updated. */
  nodeId: Scalars['ID']['input'];
  /** An object where the defined keys will be set on the `Thing` being updated. */
  patch: ThingPatch;
};

/** All input for the `updateThingByProjectAndName` mutation. */
export type UpdateThingByProjectAndNameInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  /** An object where the defined keys will be set on the `Thing` being updated. */
  patch: ThingPatch;
  project: Scalars['String']['input'];
};

/** All input for the `updateThing` mutation. */
export type UpdateThingInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['UUID']['input'];
  /** An object where the defined keys will be set on the `Thing` being updated. */
  patch: ThingPatch;
};

/** All input for the `updateThingOffsetByNodeId` mutation. */
export type UpdateThingOffsetByNodeIdInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The globally unique `ID` which will identify a single `ThingOffset` to be updated. */
  nodeId: Scalars['ID']['input'];
  /** An object where the defined keys will be set on the `ThingOffset` being updated. */
  patch: ThingOffsetPatch;
};

/** All input for the `updateThingOffsetByThingIdAndMetricName` mutation. */
export type UpdateThingOffsetByThingIdAndMetricNameInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  metricName: Scalars['String']['input'];
  /** An object where the defined keys will be set on the `ThingOffset` being updated. */
  patch: ThingOffsetPatch;
  thingId: Scalars['UUID']['input'];
};

/** All input for the `updateThingOffset` mutation. */
export type UpdateThingOffsetInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['UUID']['input'];
  /** An object where the defined keys will be set on the `ThingOffset` being updated. */
  patch: ThingOffsetPatch;
};

/** The output of our update `ThingOffset` mutation. */
export type UpdateThingOffsetPayload = {
  /**
   * The exact same `clientMutationId` that was provided in the mutation input,
   * unchanged and unused. May be used by a client to track mutations.
   */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  /** Our root query field type. Allows us to run any query from our mutation payload. */
  query?: Maybe<Query>;
  /** Reads a single `Thing` that is related to this `ThingOffset`. */
  thing?: Maybe<Thing>;
  /** The `ThingOffset` that was updated by this mutation. */
  thingOffset?: Maybe<ThingOffset>;
};

/** The output of our update `Thing` mutation. */
export type UpdateThingPayload = {
  /**
   * The exact same `clientMutationId` that was provided in the mutation input,
   * unchanged and unused. May be used by a client to track mutations.
   */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  /** Our root query field type. Allows us to run any query from our mutation payload. */
  query?: Maybe<Query>;
  /** Reads a single `Sensor` that is related to this `Thing`. */
  sensor?: Maybe<Sensor>;
  /** The `Thing` that was updated by this mutation. */
  thing?: Maybe<Thing>;
};

/** All input for the create mn`Property` mutation. */
export type MnCreatePropertyInput = {
  /** An arbitrary string value with no semantic meaning. Will be included in the payload verbatim. May be used to track mutations by the client. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The one or many `Property` to be created by this mutation. */
  mnProperty?: InputMaybe<Array<PropertyInput>>;
};

/** The output of our many create `Property` mutation. */
export type MnCreatePropertyPayload = {
  /** The exact same `clientMutationId` that was provided in the mutation input, unchanged and unused. May be used by a client to track mutations. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  /** The `Property` that was created by this mutation. */
  property?: Maybe<Property>;
  /** Our root query field type. Allows us to run any query from our mutation payload. */
  query?: Maybe<Query>;
};

/** All input for the create mn`SensorProperty` mutation. */
export type MnCreateSensorPropertyInput = {
  /** An arbitrary string value with no semantic meaning. Will be included in the payload verbatim. May be used to track mutations by the client. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The one or many `SensorProperty` to be created by this mutation. */
  mnSensorProperty?: InputMaybe<Array<SensorPropertyInput>>;
};

/** The output of our many create `SensorProperty` mutation. */
export type MnCreateSensorPropertyPayload = {
  /** The exact same `clientMutationId` that was provided in the mutation input, unchanged and unused. May be used by a client to track mutations. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  /** Reads a single `Property` that is related to this `SensorProperty`. */
  property?: Maybe<Property>;
  /** Our root query field type. Allows us to run any query from our mutation payload. */
  query?: Maybe<Query>;
  /** Reads a single `Sensor` that is related to this `SensorProperty`. */
  sensor?: Maybe<Sensor>;
  /** The `SensorProperty` that was created by this mutation. */
  sensorProperty?: Maybe<SensorProperty>;
};

/** All input for the create mn`Thing` mutation. */
export type MnCreateThingInput = {
  /** An arbitrary string value with no semantic meaning. Will be included in the payload verbatim. May be used to track mutations by the client. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The one or many `Thing` to be created by this mutation. */
  mnThing?: InputMaybe<Array<ThingInput>>;
};

/** The output of our many create `Thing` mutation. */
export type MnCreateThingPayload = {
  /** The exact same `clientMutationId` that was provided in the mutation input, unchanged and unused. May be used by a client to track mutations. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  /** Our root query field type. Allows us to run any query from our mutation payload. */
  query?: Maybe<Query>;
  /** Reads a single `Sensor` that is related to this `Thing`. */
  sensor?: Maybe<Sensor>;
  /** The `Thing` that was created by this mutation. */
  thing?: Maybe<Thing>;
};

/** All input for the delete `mnDeleteProperty` mutation. */
export type MnDeletePropertyInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The one or many `Property` to be deleted. You must provide the PK values! */
  mnPatch?: InputMaybe<Array<PropertyPatch>>;
};

/** The output of our delete mn `Property` mutation. */
export type MnDeletePropertyPayload = {
  /** The exact same `clientMutationId` that was provided in the mutation input, unchanged and unused. May be used by a client to track mutations. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  deletedPropertyNodeId?: Maybe<Scalars['ID']['output']>;
  /** The `Property` that was deleted by this mutation. */
  property?: Maybe<Property>;
  /** Our root query field type. Allows us to run any query from our mutation payload. */
  query?: Maybe<Query>;
};

/** All input for the delete `mnDeleteSensorProperty` mutation. */
export type MnDeleteSensorPropertyInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The one or many `SensorProperty` to be deleted. You must provide the PK values! */
  mnPatch?: InputMaybe<Array<SensorPropertyPatch>>;
};

/** The output of our delete mn `SensorProperty` mutation. */
export type MnDeleteSensorPropertyPayload = {
  /** The exact same `clientMutationId` that was provided in the mutation input, unchanged and unused. May be used by a client to track mutations. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  deletedSensorPropertyNodeId?: Maybe<Scalars['ID']['output']>;
  /** Reads a single `Property` that is related to this `SensorProperty`. */
  property?: Maybe<Property>;
  /** Our root query field type. Allows us to run any query from our mutation payload. */
  query?: Maybe<Query>;
  /** Reads a single `Sensor` that is related to this `SensorProperty`. */
  sensor?: Maybe<Sensor>;
  /** The `SensorProperty` that was deleted by this mutation. */
  sensorProperty?: Maybe<SensorProperty>;
};

/** All input for the delete `mnDeleteThing` mutation. */
export type MnDeleteThingInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The one or many `Thing` to be deleted. You must provide the PK values! */
  mnPatch?: InputMaybe<Array<ThingPatch>>;
};

/** The output of our delete mn `Thing` mutation. */
export type MnDeleteThingPayload = {
  /** The exact same `clientMutationId` that was provided in the mutation input, unchanged and unused. May be used by a client to track mutations. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  deletedThingNodeId?: Maybe<Scalars['ID']['output']>;
  /** Our root query field type. Allows us to run any query from our mutation payload. */
  query?: Maybe<Query>;
  /** Reads a single `Sensor` that is related to this `Thing`. */
  sensor?: Maybe<Sensor>;
  /** The `Thing` that was deleted by this mutation. */
  thing?: Maybe<Thing>;
};

/** All input for the update `mnUpdateProperty` mutation. */
export type MnUpdatePropertyInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The one or many `Property` to be updated. */
  mnPatch?: InputMaybe<Array<PropertyPatch>>;
};

/** The output of our update mn `Property` mutation. */
export type MnUpdatePropertyPayload = {
  /** The exact same `clientMutationId` that was provided in the mutation input,                 unchanged and unused. May be used by a client to track mutations. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  /** The `Property` that was updated by this mutation. */
  property?: Maybe<Property>;
  /** Our root query field type. Allows us to run any query from our mutation payload. */
  query?: Maybe<Query>;
};

/** All input for the update `mnUpdateSensorProperty` mutation. */
export type MnUpdateSensorPropertyInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The one or many `SensorProperty` to be updated. */
  mnPatch?: InputMaybe<Array<SensorPropertyPatch>>;
};

/** The output of our update mn `SensorProperty` mutation. */
export type MnUpdateSensorPropertyPayload = {
  /** The exact same `clientMutationId` that was provided in the mutation input,                 unchanged and unused. May be used by a client to track mutations. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  /** Reads a single `Property` that is related to this `SensorProperty`. */
  property?: Maybe<Property>;
  /** Our root query field type. Allows us to run any query from our mutation payload. */
  query?: Maybe<Query>;
  /** Reads a single `Sensor` that is related to this `SensorProperty`. */
  sensor?: Maybe<Sensor>;
  /** The `SensorProperty` that was updated by this mutation. */
  sensorProperty?: Maybe<SensorProperty>;
};

/** All input for the update `mnUpdateThing` mutation. */
export type MnUpdateThingInput = {
  /**
   * An arbitrary string value with no semantic meaning. Will be included in the
   * payload verbatim. May be used to track mutations by the client.
   */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The one or many `Thing` to be updated. */
  mnPatch?: InputMaybe<Array<ThingPatch>>;
};

/** The output of our update mn `Thing` mutation. */
export type MnUpdateThingPayload = {
  /** The exact same `clientMutationId` that was provided in the mutation input,                 unchanged and unused. May be used by a client to track mutations. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  /** Our root query field type. Allows us to run any query from our mutation payload. */
  query?: Maybe<Query>;
  /** Reads a single `Sensor` that is related to this `Thing`. */
  sensor?: Maybe<Sensor>;
  /** The `Thing` that was updated by this mutation. */
  thing?: Maybe<Thing>;
};

export type GetAllSensorsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAllSensorsQuery = { sensors?: Array<{ id: string, name: string, project: string, datasheet?: string | null, description?: string | null, sensorProperties: Array<{ alias?: string | null, writeDelta: boolean, property?: { measure?: string | null, metricName?: string | null, name: string } | null }> }> | null };

export type SensorsWithPropertiesQueryVariables = Exact<{
  project: Scalars['String']['input'];
}>;


export type SensorsWithPropertiesQuery = { sensors?: Array<{ id: string, name: string, description?: string | null, sensorProperties: Array<{ alias?: string | null, writeDelta: boolean, property?: { name: string, metricName?: string | null, measure?: string | null } | null }> }> | null };

export type GetSensorsQueryVariables = Exact<{
  condition: SensorCondition;
}>;


export type GetSensorsQuery = { sensors?: Array<{ id: string, name: string, project: string, datasheet?: string | null, description?: string | null, sensorProperties: Array<{ writeDelta: boolean, property?: { measure?: string | null, metricName?: string | null, name: string } | null }> }> | null };

export type GetAllThingsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAllThingsQuery = { things?: Array<{ id: string, name: string, project: string, status?: string | null, customLabels?: Array<string | null> | null, sensor?: { name: string, id: string } | null }> | null };

export type GetThingByIdQueryVariables = Exact<{
  id: Scalars['UUID']['input'];
}>;


export type GetThingByIdQuery = { thing?: { id: string, name: string, project: string, status?: string | null, lat?: any | null, locationdesc?: string | null, locationname?: string | null, long?: any | null, nodeId: string, install?: boolean | null, ownedby?: string | null, public?: boolean | null, altitude?: string | null, appid?: string | null, deveui?: string | null, devid?: string | null, geohash?: string | null, payload?: string | null, sensorId?: string | null, customLabels?: Array<string | null> | null, sensor?: { name: string, id: string, nodeId: string, datasheet?: string | null, appeui?: string | null } | null } | null };

export type GetSensorByIdQueryVariables = Exact<{
  id: Scalars['UUID']['input'];
}>;


export type GetSensorByIdQuery = { sensor?: { id: string, name: string, project: string, description?: string | null, public: boolean, nodeId: string, datasheet?: string | null, appeui?: string | null, things: Array<{ name: string, id: string, project: string, lat?: any | null, locationdesc?: string | null, locationname?: string | null, long?: any | null, nodeId: string, ownedby?: string | null, public?: boolean | null, altitude?: string | null, appid?: string | null, deveui?: string | null, devid?: string | null, geohash?: string | null, customLabels?: Array<string | null> | null }>, sensorProperties: Array<{ alias?: string | null, propertyId: string, writeDelta: boolean, property?: { id: string, description?: string | null, measure?: string | null, metricName?: string | null, name: string } | null }> } | null };

export type ThingFragment = { id: string, name: string, project: string, status?: string | null, locationname?: string | null, locationdesc?: string | null, lat?: any | null, long?: any | null, altitude?: string | null, nodeId: string, ownedby?: string | null, public?: boolean | null, appid?: string | null, deveui?: string | null, devid?: string | null, geohash?: string | null, customLabels?: Array<string | null> | null, payload?: string | null, sensor?: { name: string, id: string, project: string, nodeId: string, datasheet?: string | null, appeui?: string | null } | null };

export type CreateThingsMutationVariables = Exact<{
  mnThing?: InputMaybe<Array<ThingInput> | ThingInput>;
}>;


export type CreateThingsMutation = { mnCreateThing?: { thing?: { id: string } | null } | null };

export type GetThingsQueryVariables = Exact<{
  condition: ThingCondition;
}>;


export type GetThingsQuery = { things?: Array<{ id: string, name: string, project: string, status?: string | null, locationname?: string | null, locationdesc?: string | null, lat?: any | null, long?: any | null, altitude?: string | null, nodeId: string, ownedby?: string | null, public?: boolean | null, appid?: string | null, deveui?: string | null, devid?: string | null, geohash?: string | null, customLabels?: Array<string | null> | null, payload?: string | null, sensor?: { name: string, id: string, project: string, nodeId: string, datasheet?: string | null, appeui?: string | null } | null }> | null };

export type UpdateThingByIdMutationVariables = Exact<{
  id: Scalars['UUID']['input'];
  thingPatch: ThingPatch;
}>;


export type UpdateThingByIdMutation = { updateThing?: { clientMutationId?: string | null } | null };

export type GetAllPropertiesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAllPropertiesQuery = { properties?: Array<{ id: string, measure?: string | null, name: string, project?: string | null, metricName?: string | null }> | null };

export type GetPropertiesQueryVariables = Exact<{
  condition?: InputMaybe<PropertyCondition>;
}>;


export type GetPropertiesQuery = { properties?: Array<{ id: string, measure?: string | null, name: string, project?: string | null, metricName?: string | null }> | null };

export type GetPropertyByIdQueryVariables = Exact<{
  id: Scalars['UUID']['input'];
}>;


export type GetPropertyByIdQuery = { property?: { description?: string | null, id: string, measure?: string | null, metricName?: string | null, name: string, project?: string | null } | null };

export type UpdatePropertyByIdMutationVariables = Exact<{
  id: Scalars['UUID']['input'];
  propertyPatch: PropertyPatch;
}>;


export type UpdatePropertyByIdMutation = { updateProperty?: { clientMutationId?: string | null } | null };

export type CreatePropertyMutationVariables = Exact<{
  propertyInput: PropertyInput;
}>;


export type CreatePropertyMutation = { createProperty?: { clientMutationId?: string | null, property?: { id: string } | null } | null };

export type UpdateSensorByIdMutationVariables = Exact<{
  id: Scalars['UUID']['input'];
  sensorPatch: SensorPatch;
}>;


export type UpdateSensorByIdMutation = { updateSensor?: { clientMutationId?: string | null } | null };

export type DeleteSensorMutationVariables = Exact<{
  id: Scalars['UUID']['input'];
}>;


export type DeleteSensorMutation = { deleteSensor?: { clientMutationId?: string | null } | null };

export type DeletePropertyMutationVariables = Exact<{
  id: Scalars['UUID']['input'];
}>;


export type DeletePropertyMutation = { deleteProperty?: { clientMutationId?: string | null } | null };

export type DeleteThingMutationVariables = Exact<{
  id: Scalars['UUID']['input'];
}>;


export type DeleteThingMutation = { deleteThing?: { clientMutationId?: string | null } | null };

export type GetSensorPropsQueryVariables = Exact<{
  sensorId: Scalars['UUID']['input'];
}>;


export type GetSensorPropsQuery = { sensorProperties?: Array<{ alias?: string | null, propertyId: string, writeDelta: boolean, property?: { description?: string | null, measure?: string | null, metricName?: string | null, name: string } | null }> | null };

export type EditSensorPropertyMutationVariables = Exact<{
  propertyId: Scalars['UUID']['input'];
  sensorId: Scalars['UUID']['input'];
  writeDelta: Scalars['Boolean']['input'];
  alias?: InputMaybe<Scalars['String']['input']>;
}>;


export type EditSensorPropertyMutation = { updateSensorProperty?: { clientMutationId?: string | null } | null };

export type CreateSensorPropertyMutationVariables = Exact<{
  project: Scalars['String']['input'];
  sensorId: Scalars['UUID']['input'];
  propertyId: Scalars['UUID']['input'];
  writeDelta: Scalars['Boolean']['input'];
  alias?: InputMaybe<Scalars['String']['input']>;
}>;


export type CreateSensorPropertyMutation = { createSensorProperty?: { clientMutationId?: string | null, sensorProperty?: { alias?: string | null, propertyId: string, sensorId: string } | null } | null };

export type CreateSensorWithPropsMutationVariables = Exact<{
  input: CreateSensorWithPropsInput;
}>;


export type CreateSensorWithPropsMutation = { createSensorWithProps?: { clientMutationId?: string | null, sensorId?: string | null } | null };

export type DeleteSensorPropertyMutationVariables = Exact<{
  propertyId: Scalars['UUID']['input'];
  sensorId: Scalars['UUID']['input'];
}>;


export type DeleteSensorPropertyMutation = { deleteSensorProperty?: { clientMutationId?: string | null } | null };

export type AssignSensortypeToNewDevicesMutationVariables = Exact<{
  sensortypeId: Scalars['UUID']['input'];
  deviceIds: Array<InputMaybe<Scalars['UUID']['input']>> | InputMaybe<Scalars['UUID']['input']>;
}>;


export type AssignSensortypeToNewDevicesMutation = { assignSensortypeToNewDevices?: { clientMutationId?: string | null } | null };

export type GetOffsetsAndMetricNamesQueryVariables = Exact<{
  thingId: Scalars['UUID']['input'];
  sensorTypeId: Scalars['UUID']['input'];
}>;


export type GetOffsetsAndMetricNamesQuery = { thingOffsets?: Array<{ id: string, metricName: string, offsetType: OffsetType, offsetValue: any, thingId: string }> | null, sensorProperties?: Array<{ property?: { metricName?: string | null } | null }> | null };

export type DeleteOffsetMutationVariables = Exact<{
  offsetId: Scalars['UUID']['input'];
}>;


export type DeleteOffsetMutation = { deleteThingOffset?: { clientMutationId?: string | null } | null };

export type CreateOffsetMutationVariables = Exact<{
  input: ThingOffsetInput;
}>;


export type CreateOffsetMutation = { createThingOffset?: { clientMutationId?: string | null } | null };

export type UpdateOffsetMutationVariables = Exact<{
  patch: ThingOffsetPatch;
  id: Scalars['UUID']['input'];
}>;


export type UpdateOffsetMutation = { updateThingOffset?: { clientMutationId?: string | null } | null };
