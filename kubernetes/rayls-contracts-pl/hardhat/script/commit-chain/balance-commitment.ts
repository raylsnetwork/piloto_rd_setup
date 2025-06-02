import { BalanceCommitment } from '../../../typechain-types';
import { CommitChainClient } from '../../utils/cfg/ethers/commitChain';

/**
 * Deploys the Balance Commitment contract;
 */
export async function deployBalanceCommitment(client: CommitChainClient): Promise<BalanceCommitment> {
    const factory = await client.getContractFactory("BalanceCommitment");
    const deployed = await factory.deploy();
    await deployed.waitForDeployment();
    return deployed;
}
