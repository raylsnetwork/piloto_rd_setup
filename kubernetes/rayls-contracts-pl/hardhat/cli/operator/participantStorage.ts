import hre from 'hardhat';
import { command, option, string, subcommands } from 'cmd-ts';
import { ContractTransactionResponse } from 'ethers';
import {
  ParticipantRole,
  ParticipantStatus,
  mapParticipantData
} from './utils/participantStorage';
import { getEthers } from '../../utils/cfg/ethers';
import { Logger, Spinner, createEnumType } from '../utils';
import { chainIdOption, envOption } from '../params';

/**
 * Params
 */
const roleOption = <T = false>(isOptional?: T) =>
  option({
    type: createEnumType(
      ParticipantRole,
      'role',
      'The participant role',
      isOptional
    ),
    long: 'role'
  });

const statusOption = <T extends boolean>(isOptional: T) =>
  option({
    type: createEnumType(
      ParticipantStatus,
      'status',
      'The participant status',
      isOptional
    ),
    long: 'status'
  });

/**
 * Commands
 */

const listCommand = command({
  name: 'list',
  description: 'Lists all participants registered on the Commit Chain',
  args: {
    env: envOption
  },
  handler: async ({ env }) => {
    const web3 = await getEthers({ env, ethers: hre.ethers });

    const spinner = await Spinner('Fetching participants...');

    const participantStorage =
      await web3.CommitChain.getContract('ParticipantStorage');
    const participants = await participantStorage.getAllParticipants();
    const parsedParticipants = participants.map(mapParticipantData);

    spinner.succeed('Participants fetched');

    Logger.info('Participants:');
    console.table(parsedParticipants);
  }
});

const addCommand = command({
  name: 'add',
  description: 'Adds a participant to the Commit Chain',
  args: {
    env: envOption,
    chainId: chainIdOption,
    role: roleOption(),
    name: option({
      type: string,
      long: 'name',
      description: 'The participant name',
      defaultValue: () => 'Participant'
    })
  },
  handler: async ({ env, chainId, role, name }) => {
    const web3 = await getEthers({ env, ethers: hre.ethers });

    const spinner = await Spinner('Adding participant...');

    const ParticipantStorage =
      await web3.CommitChain.getContract('ParticipantStorage');
    const owner = await web3.CommitChain.signers[0].getAddress();

    const res = await ParticipantStorage.addParticipant({
      chainId,
      role,
      ownerId: owner,
      name
    });

    await res.wait();

    const newParticipant = mapParticipantData(
      await ParticipantStorage.getParticipant(chainId)
    );

    spinner.succeed('Participant added');

    Logger.info('Participant:');
    console.table(newParticipant);
  }
});

const updateCommand = command({
  name: 'update',
  description: 'Updates a participant on the Commit Chain',
  args: {
    env: envOption,
    chainId: chainIdOption,
    status: statusOption(true),
    role: roleOption(true)
  },
  handler: async ({ env, chainId, status, role }) => {
    if (role === undefined && status === undefined) {
      throw new Error(
        'You must provide a role or status to update the participant'
      );
    }

    const web3 = await getEthers({ env, ethers: hre.ethers });

    const spinner = await Spinner('Updating participant...');

    const ParticipantStorage =
      await web3.CommitChain.getContract('ParticipantStorage');
    const pendingReq: ContractTransactionResponse[] = [];

    if (role !== undefined) {
      Logger.info(`Updating role to ${ParticipantRole[role]}`);
      const res = await ParticipantStorage.updateRole(chainId, role);

      pendingReq.push(res);
    }

    if (status !== undefined) {
      Logger.info(`Updating status to ${ParticipantStatus[status]}`);
      const res = await ParticipantStorage.updateStatus(chainId, status);

      pendingReq.push(res);
    }

    if (!pendingReq.length) {
      spinner.fail();
      Logger.error('No updates to be made');

      return;
    }
    try {
      await Promise.all(pendingReq.map((req) => req.wait()));
    } catch (error) {
      spinner.fail();
      Logger.error(error, 'Failed to update participant');

      return;
    }

    const updatedParticipant = mapParticipantData(
      await ParticipantStorage.getParticipant(chainId)
    );

    spinner.stop();
    Logger.info('Participant updated');
    console.table(updatedParticipant);
  }
});

/**
 * --------------------- CLI ---------------------
 */

export const participantsCli = subcommands({
  name: 'participants',
  description: 'Manage the ParticipantStorage in the Commit Chain',
  cmds: {
    list: listCommand,
    add: addCommand,
    update: updateCommand
  }
});
