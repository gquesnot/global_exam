import * as readline from "readline";

export async function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms)
    })
}


export function readInput(question) {
    const interface_ = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => interface_.question(question, answer => {
        interface_.close();
        resolve(answer);
    }))
}
