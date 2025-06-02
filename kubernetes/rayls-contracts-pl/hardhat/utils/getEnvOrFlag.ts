export function getEnvVariableOrFlag(name: string, envName: string, taskArg: string, flag: string, taskArgs: any){

    const value = process.env[envName] ?? taskArgs.taskArg;
    if(!value){
        console.log(`⛔ No ${name} given via env var "${envName}" or argument "${flag}".`);
        throw new Error("No given variable");
    }
    return value;
}