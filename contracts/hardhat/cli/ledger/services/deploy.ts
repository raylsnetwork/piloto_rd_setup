import { RaylsClient } from '../../../utils/cfg/ethers';
import { PrivacyLedgerClient } from '../../../utils/cfg/ethers/pl';
import {
  ContractFactoryResolver,
  TokenContractTypes
} from '../../../utils/cfg/types/_contracts';
import { Logger, Spinner } from '../../utils';

export async function deployToken<T extends TokenContractTypes>(
  web3: RaylsClient,
  params: {
    plName: string;
    tokenName: string;
    submit: boolean;
    contractType: T;

    handler: (
      pl: PrivacyLedgerClient,
      token: ContractFactoryResolver<T>,
      endpointAddress: string
    ) => ReturnType<ContractFactoryResolver<T>['deploy']>;
  }
) {
  const { contractType, handler, plName, submit, tokenName } = params;

  const spinner = await Spinner(
    `Deploying token "${tokenName}" on ${plName}...`
  );

  const pl = web3.Pls.getPl(plName);

  const endpointAddress = pl.deploymentsCfg?.Endpoint;

  if (!endpointAddress) {
    Logger.error('Endpoint not deployed on PL');

    return;
  }

  const token = await pl.getContractFactory(contractType);
  const res = await handler(pl, token, endpointAddress);

  spinner.text = 'Waiting for deployment...';
  spinner.color = 'yellow';

  const tokenPL = await res.waitForDeployment();

  const tokenAddress = await tokenPL.getAddress();

  spinner.succeed(`Token Deployed At Address ${tokenAddress}`);

  await web3.setPlConfig(plName, (plCfg) => {
    if (!plCfg) {
      throw new Error('No PL config found, could not save');
    }

    return {
      ...plCfg,
      tokens: [
        ...plCfg.tokens,
        {
          address: tokenAddress,
          name: tokenName,
          type: contractType
        }
      ]
    };
  });

  Logger.info('Token saved on PL config');

  if (!submit) {
    spinner.succeed();

    return;
  }

  const submitSpinner = await Spinner(
    'Submitting Token Registration to Ven...'
  );

  await (await tokenPL.submitTokenRegistration(0)).wait();

  submitSpinner.succeed('Token Deployed and Registration Submitted');

  Logger.info(
    `Wait until relayer retrieves the generated resourceId from the Subnet after the token approval`
  );
  Logger.info('You can check this with the metadata task');
}
