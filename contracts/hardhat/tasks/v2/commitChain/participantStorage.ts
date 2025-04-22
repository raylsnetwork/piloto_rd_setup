import type { ContractTransactionResponse } from 'ethers';
import { CcParticipantStorageScope } from '../config';
import { enumToList, envParamArgs } from '../../../utils/params';
import { Spinner } from '../../../utils/spinner';
import { getEthers } from '../../../utils/cfg/ethers';
import { types } from 'hardhat/config';
import {
  ParticipantRole,
  ParticipantStatus,
  mapParticipantData,
} from '../../../script/commit-chain/participant-storage';

type ListParams = {
  env: string;
};

CcParticipantStorageScope.task(
  'list',
  'Lists all participants registered on the Commit Chain',
)
  .addParam(...envParamArgs)
  .setAction(async (taskArgs: ListParams, { ethers }) => {
    const spinner = new Spinner();
    spinner.start();

    const web3 = await getEthers({ env: taskArgs.env, ethers });

    const participantStorage = await web3.CommitChain.getContract(
      'ParticipantStorage',
    );

    const participants = await participantStorage.getAllParticipants();

    const parsedParticipants = participants.map(mapParticipantData);
    spinner.stop();

    console.log('Participants:');
    console.table(parsedParticipants);
  });

type AddParticipantParams = {
  env: string;
  chainId: string;
  role: number;
  name: string;
};

CcParticipantStorageScope.task('add', 'Adds a participant to the Commit Chain')
  .addParam(...envParamArgs)
  .addParam('chainId', 'The participant chainId', undefined, types.int)
  .addParam(
    'role',
    `The participant role (${enumToList(ParticipantRole)})`,
    undefined,
    types.int,
  )
  .addParam('name', 'The participant name', 'Participant', types.string)
  .setAction(async (taskArgs: AddParticipantParams, { ethers }) => {
    const spinner = new Spinner();
    spinner.start();

    const web3 = await getEthers({ env: taskArgs.env, ethers });

    const ParticipantStorage = await web3.CommitChain.getContract(
      'ParticipantStorage',
    );

    const role = ParticipantRole[taskArgs.role];

    if (!role) {
      throw new Error(
        `Invalid role (${
          taskArgs.role
        }), skipping update!\nConsider using the following roles: ${enumToList(
          ParticipantRole,
        )}`,
      );
    }

    const owner = await web3.CommitChain.signers[0].getAddress();

    const res = await ParticipantStorage.addParticipant({
      chainId: taskArgs.chainId,
      role: taskArgs.role,
      ownerId: owner,
      name: taskArgs.name,
    });

    await res.wait();

    const newParticipant = mapParticipantData(
      await ParticipantStorage.getParticipant(taskArgs.chainId),
    );

    spinner.stop();
    console.log('Participant added');
    console.table(newParticipant);
  });

type UpdateParams = {
  env: string;
  chainId: string;
  status?: number;
  role?: number;
};

CcParticipantStorageScope.task(
  'update',
  'Updates a participant on the Commit Chain',
)
  .addParam(...envParamArgs)

  .addParam('chainId', 'The participant chainId', undefined, types.string)
  .addOptionalParam(
    'status',
    `The participant status (${enumToList(ParticipantStatus)})`,
    undefined,
    types.int,
  )
  .addOptionalParam(
    'role',
    `The participant role (${enumToList(ParticipantRole)})`,
    undefined,
    types.int,
  )
  .setAction(async (taskArgs: UpdateParams, { ethers }) => {
    if (taskArgs.role === undefined && taskArgs.status === undefined) {
      throw new Error(
        'You must provide a role or status to update the participant',
      );
    }

    const spinner = new Spinner();
    spinner.start();

    const web3 = await getEthers({ env: taskArgs.env, ethers });

    const ParticipantStorage = await web3.CommitChain.getContract(
      'ParticipantStorage',
    );

    const pendingReq: ContractTransactionResponse[] = [];

    if (taskArgs.role !== undefined) {
      const role = ParticipantRole[taskArgs.role];

      if (role === undefined) {
        console.error(
          `Invalid role (${
            taskArgs.role
          }), skipping update!\nConsider using the following roles: ${enumToList(
            ParticipantRole,
          )}`,
        );
      } else {
        const res = await ParticipantStorage.updateRole(
          taskArgs.chainId,
          taskArgs.role,
        );

        pendingReq.push(res);
      }
    }

    if (typeof taskArgs.status !== 'undefined') {
      const status = ParticipantStatus[taskArgs.status];

      if (typeof status === 'undefined') {
        console.error(
          `Invalid status (${
            taskArgs.status
          }), skipping update!\nConsider using the following statuses: ${enumToList(
            ParticipantStatus,
          )}`,
        );
      } else {
        const res = await ParticipantStorage.updateStatus(
          taskArgs.chainId,
          taskArgs.status,
        );

        pendingReq.push(res);
      }
    }

    if (!pendingReq.length) {
      spinner.stop();
      console.error('No updates to be made');
      return;
    }

    await Promise.all(pendingReq.map((req) => req.wait()));

    const updatedParticipant = mapParticipantData(
      await ParticipantStorage.getParticipant(taskArgs.chainId),
    );

    spinner.stop();
    console.log('Participant updated');
    console.table(updatedParticipant);
  });
