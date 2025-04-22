import { task } from 'hardhat/config';

// import file in hardhard/tasks/index.ts
// npx hardhat stressTest --pl-origin A --pl-dest B --token Y --destination-address 0xF9F18B3989f9d6e60c3c32C0208B6807868ae95d --amount 1

task('stressTest', 'Stress test')
  .addParam('token', 'The token symbol')
  .addParam('plOrigin', 'The origin PL (ex: A, B, C, D, BACEN, TREASURY)')
  .addParam('plDest', 'The destination PL (ex: A, B, C, D, BACEN, TREASURY)')
  .addParam('destinationAddress', 'The destination Address')
  .addParam('amount', 'The amount to be transfered')
  .setAction(async (taskArgs, hre) => {
    for (let i = 0; i < 96; i++) {
      console.log('Stress test: ' + (i + 1) + '\n');
      await hre.run('sendToken', {
        token: taskArgs.token,
        plOrigin: taskArgs.plOrigin,
        plDest: taskArgs.plDest,
        destinationAddress: taskArgs.destinationAddress,
        amount: taskArgs.amount,
      });
      console.log('Finished stress test: ' + (i + 1) + '\n');
    }
  });

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
