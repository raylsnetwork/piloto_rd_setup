import { task } from "hardhat/config";
import { getEthers } from "../../../utils/cfg/ethers";
import { Spinner } from "../../../utils/spinner";

type ListParticipantsInteractTaskParams = {
    env: string,                        // Allows targeting a specific environment if multiple configs are present.
}

task("interact:commit-chain:list-participants", "Lists all registered participants in the configured CommitChain, specified by env")
    .addOptionalParam("env", "Specify the env to run the action against, inferring its config.", "local")
    .setAction(
        async (taskArgs: ListParticipantsInteractTaskParams, { ethers }) => {
            const spinner = new Spinner();
            const { env, } = taskArgs;
            const web3 = await getEthers({ env, ethers });
            const { CommitChain } = web3;

            console.log(`Fetching participants from CommitChain ...`);
            spinner.start();
            const participantStorage = await CommitChain.getContract('ParticipantStorage');
            const participants = await participantStorage.getAllParticipants();

            spinner.stop();
            console.log(`\n✅ Registered participants:\n`, participants);
        }
    );
