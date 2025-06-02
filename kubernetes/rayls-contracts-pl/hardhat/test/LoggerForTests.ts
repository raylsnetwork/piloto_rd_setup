export function LogForTest(message: string) {

    const shouldLog = process.env[`LOG_VERBOSE`] as string;
    if (shouldLog === 'true') {
        console.log(`${new Date().toISOString()} ~>  ${message}`);
    }
}