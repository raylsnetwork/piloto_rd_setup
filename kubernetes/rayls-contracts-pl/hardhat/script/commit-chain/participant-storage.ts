import { ParticipantStorage } from '../../../typechain-types';

export enum ParticipantStatus {
  NEW,
  ACTIVE,
  INACTIVE,
  FREEZED,
}

export enum ParticipantRole {
  PARTICIPANT,
  ISSUER,
  AUDITOR,
}

export function mapParticipantData(
  participant: ParticipantStorage.ParticipantStructOutput,
) {
  const { chainId, role, status, ownerId, name, createdAt, updatedAt } =
    participant;

  return {
    name,
    chainId,
    role: ParticipantRole[parseInt(role.toString())],
    status: ParticipantStatus[parseInt(status.toString())],
    ownerId,
    createdAt: new Date(parseInt(createdAt.toString()) * 1000).toISOString(),
    updatedAt: new Date(parseInt(updatedAt.toString()) * 1000).toISOString(),
  };
}
