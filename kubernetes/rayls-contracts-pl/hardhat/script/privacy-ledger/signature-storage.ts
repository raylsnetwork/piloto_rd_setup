import { SignatureStorage } from "../../../typechain-types";
import { PrivacyLedgerClient } from "../../utils/cfg/ethers/pl";

/**
 * Deploys the Atomic Protocol contract and retrieves the deployed contract instance.
 */
export async function deploySignatureStorage(client: PrivacyLedgerClient): Promise<SignatureStorage> {
    const factory = await client.getContractFactory("SignatureStorage");
    const deployed = await factory.deploy();
    await deployed.waitForDeployment();
    return deployed;
}
