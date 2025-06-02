import { MessageDispatchedEvent, MessageBatchDispatchedEvent, RaylsMessageStruct } from "../../../../typechain-types/src/rayls-protocol/Endpoint/EndpointV1";
import { ContractTransactionResponse } from "ethers";
import { EndpointV1, ResourceRegistryV1 } from "../../../../typechain-types";
import { TypedContractEvent, TypedEventLog } from "../../../../typechain-types/common";

type RaylsMessageEvent = TypedEventLog<TypedContractEvent<MessageDispatchedEvent.InputTuple, MessageDispatchedEvent.OutputTuple, MessageDispatchedEvent.OutputObject>>;
type RaylsMessageBatchEvent = TypedEventLog<TypedContractEvent<MessageBatchDispatchedEvent.InputTuple, MessageBatchDispatchedEvent.OutputTuple, MessageBatchDispatchedEvent.OutputObject>>;
type EventWithChainId = { event: RaylsMessageEvent, chainIdPlOrigin: string };
type EventBatchWithChainId = { event: RaylsMessageBatchEvent, chainIdPlOrigin: string };
type MockOutput = { tx: ContractTransactionResponse, originChainId: string, destinationChainId: string };

export const mockRelayerEthersLastTransaction = async (
  endpointMappings: { [chainId: string]: EndpointV1 | null },
  messageIdsAlreadyProcessed: { [messageIdConcatWithChainId: string]: boolean | null },
  resourceRegistry: ResourceRegistryV1
) => {
  let events: EventWithChainId[] = [];

  events = events.concat(await getEvents(endpointMappings));

  const endpoints: [string, EndpointV1][] = Object.entries(endpointMappings).filter((entry): entry is [string, EndpointV1] => entry[1] !== null);

  const response: MockOutput[] = [];
  let index = 0;
  while (true) {
    if (index >= events.length) break;
    const event = events[index];
    index++;
    let endpointPLDestinations: [string, EndpointV1][] = [];
    if (event.event.args.toChainId.toString() == "0") { // Means broadcast to all participants
      endpointPLDestinations = [...endpoints].filter((entry) => entry[0] != event.chainIdPlOrigin.toString());
    } else {
      const destination = endpointMappings[event.event.args.toChainId.toString()];
      if (!destination) continue;
      endpointPLDestinations = [[event.event.args.toChainId.toString(), destination]];
    }
    for (let endpointPLDestination of endpointPLDestinations) {
      await processMessageForPLDestination(endpointPLDestination[1], event, messageIdsAlreadyProcessed, endpointMappings, events, resourceRegistry, response);
    }
  }
  return response;
};

export const mockRelayerEthersLastTransactionBatch = async (
  endpointMappings: { [chainId: string]: EndpointV1 | null },
  messageIdsAlreadyProcessed: { [messageIdConcatWithChainId: string]: boolean | null },
  resourceRegistry: ResourceRegistryV1
) => {
  let events: EventBatchWithChainId[] = [];

  events = events.concat(await getEventsBatch(endpointMappings));

  const endpoints: [string, EndpointV1][] = Object.entries(endpointMappings).filter((entry): entry is [string, EndpointV1] => entry[1] !== null);

  const response: MockOutput[] = [];
  let index = 0;
  while (true) {
    if (index >= events.length) break;
    const event = events[index];
    index++;
    let endpointPLDestinations: [string, EndpointV1][] = [];

    event.event.args.messages.forEach((message) => {
      if (message.toChainId.toString() == "0") { // Means broadcast to all participants
        endpointPLDestinations = [...endpoints].filter((entry) => entry[0] != event.chainIdPlOrigin.toString());
      } else {
        const destination = endpointMappings[message.toChainId.toString()];
        if (!destination) return;
        endpointPLDestinations = [[message.toChainId.toString(), destination]];
      }
    });

    for (let endpointPLDestination of endpointPLDestinations) {
      await processMessageBatchForPLDestination(endpointPLDestination[1], event, messageIdsAlreadyProcessed, endpointMappings, events, resourceRegistry, response);
    }
  }
  return response;
};

async function processMessageForPLDestination(
  endpointPLDestination: EndpointV1,
  event: EventWithChainId,
  messageIdsAlreadyProcessed: { [messageIdConcatWithChainId: string]: boolean | null },
  endpointMappings: { [chainId: string]: EndpointV1 | null },
  events: EventWithChainId[],
  resourceRegistry: ResourceRegistryV1,
  response: MockOutput[]) {

  const raylsMessage: RaylsMessageStruct = deepCopyOfLogArgs(event.event.args.data);

  await checkIfResourceIdIsDeployedAndIncludeMetadata(raylsMessage.messageMetadata.resourceId.toString(), endpointPLDestination, resourceRegistry, raylsMessage);

  if (messageIdsAlreadyProcessed[event.event.args.messageId + await endpointPLDestination.chainId()]) return;

  const res = await endpointPLDestination.receivePayload(event.chainIdPlOrigin, event.event.args.from, event.event.args.to, raylsMessage, event.event.args.messageId, { gasLimit: 30000000 });

  await res.wait();
  messageIdsAlreadyProcessed[event.event.args.messageId + await endpointPLDestination.chainId()] = true;
  events.push(...(await getEvents(endpointMappings)));
  response.push({ tx: res, originChainId: event.chainIdPlOrigin, destinationChainId: event.event.args.toChainId.toString() });
}

async function processMessageBatchForPLDestination(
  endpointPLDestination: EndpointV1,
  event: EventBatchWithChainId,
  messageIdsAlreadyProcessed: { [messageIdConcatWithChainId: string]: boolean | null },
  endpointMappings: { [chainId: string]: EndpointV1 | null },
  events: EventBatchWithChainId[],
  resourceRegistry: ResourceRegistryV1,
  response: MockOutput[]) {
    await Promise.all(event.event.args.messages.map(async (message) => {
      const raylsMessage: RaylsMessageStruct = deepCopyOfLogArgs(message.data);

      await checkIfResourceIdIsDeployedAndIncludeMetadata(raylsMessage.messageMetadata.resourceId.toString(), endpointPLDestination, resourceRegistry, raylsMessage);

      if (messageIdsAlreadyProcessed[message.messageId + await endpointPLDestination.chainId()]) return;
      const res = await endpointPLDestination.receivePayload(event.chainIdPlOrigin, event.event.args.from, message.to, raylsMessage, message.messageId, { gasLimit: 30000000 });
      await res.wait();
      messageIdsAlreadyProcessed[message.messageId + await endpointPLDestination.chainId()] = true;
      events.push(...(await getEventsBatch(endpointMappings)));
      response.push({ tx: res, originChainId: event.chainIdPlOrigin, destinationChainId: message.toChainId.toString() });
    }));
}

async function getEvents(endpointMappings: { [chainId: string]: EndpointV1 | null }): Promise<EventWithChainId[]> {
  const events: EventWithChainId[] = []
  for (let [chainId, endpoint] of Object.entries(endpointMappings)) {
    if (!endpoint) continue;

    const latestBlock = (await endpoint.runner?.provider?.getBlockNumber() as number);
    // get from latest 20 blocks
    const fromBlock = latestBlock >= 20 ? latestBlock - 20 : 0;
    const newEvents = await endpoint.queryFilter(
      endpoint.filters.MessageDispatched, 
      fromBlock, 
      'latest'
    );

    for (let event of newEvents) {
      events.push({ event, chainIdPlOrigin: chainId });
    }
  }
  return events;
}

async function getEventsBatch(endpointMappings: { [chainId: string]: EndpointV1 | null }): Promise<EventBatchWithChainId[]> {
  const events: EventBatchWithChainId[] = []
  for (let [chainId, endpoint] of Object.entries(endpointMappings)) {
    if (!endpoint) continue;

    const latestBlock = (await endpoint.runner?.provider?.getBlockNumber() as number);
    // get from latest 20 blocks
    const fromBlock = latestBlock >= 20 ? latestBlock - 20 : 0;
    const newEvents = await endpoint.queryFilter(
      endpoint.filters.MessageBatchDispatched,
      fromBlock, 
      'latest'
    );
    
    for (let event of newEvents) {
      events.push({ event, chainIdPlOrigin: chainId });
    }
  }
  return events;
}

// do not use this in any thing different of the event.args

function deepCopyOfLogArgs(src: any) {
  let target = {} as any;
  target = { ...(src as any).toObject() }
  for (let prop in target) {
    let value = target[prop];
    if (value && typeof value === 'object') {
      target[prop] = deepCopyOfLogArgs(value);
    }
  }
  return target;
}

async function checkIfResourceIdIsDeployedAndIncludeMetadata(resourceId: string, endpointPLDestination: EndpointV1, resourceRegistry: ResourceRegistryV1, raylsMessage: RaylsMessageStruct) {
  if (resourceId == "0x0000000000000000000000000000000000000000000000000000000000000000") return;

  const isResourceIdImplemented = (await endpointPLDestination.resourceIdToContractAddress(resourceId)) != "0x0000000000000000000000000000000000000000";

  if (!isResourceIdImplemented) {
    const resource = await resourceRegistry.getResourceById(resourceId);

    raylsMessage.messageMetadata.newResourceMetadata.valid = true;
    raylsMessage.messageMetadata.newResourceMetadata.resourceDeployType = 0;
    raylsMessage.messageMetadata.newResourceMetadata.bytecode = resource.bytecode;
    raylsMessage.messageMetadata.newResourceMetadata.initializerParams = resource.initializerParams;
  }

}