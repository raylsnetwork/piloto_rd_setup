import { task } from "hardhat/config";
import { getEthers } from "../../../utils/cfg/ethers";
import { Spinner } from "../../../utils/spinner";

type AddParticipantsInteractTaskParams = {
    env: string,                        // Allows targeting a specific environment if multiple configs are present.
    privacyLedgers: string,             // Selects the PLs to register. "A" || "A,B"
}

task("interact:commit-chain:add-participants", "Registers a participant into the Commit-Chain")
    .addOptionalParam("env", "Specify the env to run the action against, inferring its config.", "local")
    .addParam("privacyLedgers", "Choose the participant(s) to register. Ex: `A` | `A,B,...`", "")
    .setAction(
        async (taskArgs: AddParticipantsInteractTaskParams, { ethers }) => {
            const spinner = new Spinner();
            const { env, privacyLedgers: participantsIn } = taskArgs;
            const web3 = await getEthers({ env, ethers });
            const { CommitChain } = web3;
            const [defaultSigner] = CommitChain.signers;
            const participants = participantsIn.split(',') || [participantsIn] || null;

            if (!participants.length) {
                throw new Error(`❌ Invalid privacy ledger identifiers provided. Specify either one('A') or multiple ('A,B') participants to register.`);
            }

            console.log(`Registering ${participants.length} participants ...`);
            spinner.start();
            const participantStorage = await CommitChain.getContract('ParticipantStorage');

            const plConfigs = web3.configs.cfg.PLs.filter(
                (cfg) => participants.includes(cfg.id)
            );

            for (const { id, chainId } of plConfigs) {
                await participantStorage.addParticipant({
                    chainId: chainId,
                    role: 1,
                    ownerId: await defaultSigner.getAddress(),
                    name: `PL ${id}`
                });
            }
            spinner.stop();

            console.log(`✅ All participants registered successfully!`);
        }
    );
