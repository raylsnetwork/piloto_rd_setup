import { task } from "hardhat/config";
import { getEthers } from "../../../utils/cfg/ethers";
import { Spinner } from "../../../utils/spinner";

type FreezeParticipantInteractTaskParams = {
    env: string,                        // Allows targeting a specific environment if multiple configs are present.
    chainId: string,                    // Specifies the member to be frozen, by chain ID.
    privacyLedger: string,              // Specifies the member to be frozen, by participant ID as set in the config file.
}

task("interact:commit-chain:freeze-participant", "Sets the provided chain id or participant id, as specified in the config, as FROZEN, disabling cross chain messaging.")
    .addOptionalParam("env", "Specify the env to run the action against, inferring its config.", "local")
    .addOptionalParam("chainId", "Specify the chainId of the participant to be set as FROZEN. Ex: 600001", "")
    .addOptionalParam("privacyLedger", "Specify the participant ID from your config file, of the participant to be set as FROZEN. Ex: 600001", "")
    .setAction(
        async (taskArgs: FreezeParticipantInteractTaskParams, { ethers }) => {
            const spinner = new Spinner();
            const { env, chainId: chainIdIn, privacyLedger } = taskArgs;
            const web3 = await getEthers({ env, ethers });
            const { CommitChain, isFullyDeployed, configs } = web3;

            if (!isFullyDeployed) {
                throw new Error(`❌ Make sure your CommitChain is fully deployed before interacting. Use deploy:commit-chain`);
            }

            if (!chainIdIn && !privacyLedger.length) {
                throw new Error(`❌ You must provide either the chainId or privacyLegerId of the member to be frozen!`);
            }

            spinner.start();
            const participantStorage = await CommitChain.getContract('ParticipantStorage');
            const participantConfig = configs.cfg.PLs.find((cfg) => cfg.chainId == Number(chainIdIn) || cfg.id === privacyLedger);
            const { chainId, id } = participantConfig as any;

            console.log(`Freezing participant ${id} with chainId ${chainId}...`);
            await (await participantStorage.updateStatus(chainId, 3)).wait(); // FROZEN is status 3

            spinner.stop();
            console.log(`✅ Participant ${chainId} successfully frozen. They are now unable to exchange messages.`);
            console.log(`Fetching all participants ...`);
            console.log(await participantStorage.getAllParticipants());
        }
    );
