import { SignatureStorage } from "../../../typechain-types";
import { PrivacyLedgerClient } from "../../utils/cfg/ethers/pl";

/**
 * Deploys the Atomic Protocol contract and retrieves the deployed contract instance.
 */
export async function deployExampleToken(client: PrivacyLedgerClient): Promise<SignatureStorage> {
    const [owner] = client.signers;
    const factory = await client.getContractFactory("SignatureStorage", owner);
    const deployed = await factory.deploy();
    await deployed.waitForDeployment();
    return deployed;
}