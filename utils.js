const dotenv = require("dotenv");
const OpenAI = require("openai");
const fs = require('fs');

const { exec } = require("child_process");
const { auditResult } = require("./config/result");
const { issues } = require("./config/issue");
const util = require('util');

dotenv.config();
const API_KEY = process.env.OPENAI_API_KEY;
const AI_MODEL = process.env.OPENAI_MODEL;
const wordsToRemove = ['solc', 'Slither'];

console.log("AI_MODEL", AI_MODEL);
const placeholderRegex = /svg width="(\d+)pt"/;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function executeCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr, stdio) => {
            if (error) {
                resolve(stderr.trim());
                return;
            }

            if (stdout.trim() != "")
                resolve(stdout.trim());
            else
                resolve(stderr.trim());
        });
    });
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getDotFileList(dirName) {
    return new Promise((resolve, reject) => {
        fs.readdir(dirName, (err, files) => {
            if (err) {
                console.error(`Error reading folder: ${err}`);
                return null;
            }
            resolve(files);
        });
    });
}


function strToHmtl(str) {
    const lines = str.split('\n');

    const filteredLines = lines.filter(line => {
        return !wordsToRemove.some(word => line.includes(word));
    });

    var filteredContent = filteredLines.join('\n');
    filteredContent = filteredContent.replaceAll(/\t/g, "&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp");
    filteredContent = filteredContent.replaceAll(/\n/g, "<br>");
    filteredContent = filteredContent.replaceAll(/\u001b\[\d+m/g, ' ');
    filteredContent = filteredContent.replaceAll(" ", "&nbsp");

    return filteredContent;
}

function estimateError(errorStr) {
    var idx;
    var estimatedValue = 4;

    for (idx = 0; idx < issues.length; idx++) {
        if (issues[idx][2].indexOf(errorStr) == -1)
            continue;


        switch (issues[idx][3]) {
            case "High":
                estimatedValue = 0;
                break;
            case "Medium":
                estimatedValue = 1;
                break;
            case "Low":
                estimatedValue = 2;
                break;
            case "Informational":
                estimatedValue = 3;
                break;
            default:
                estimatedValue = 4;
                break;
        }
        break;
    }
    return estimatedValue;
}

function inspectError(slitherAuditResult) {
    var errorArray = [0, 0, 0, 0, 0];

    var detectors = slitherAuditResult.split("INFO:Detectors:");
    var idx = 0;

    for (idx = 0; idx < detectors.length; idx++) {

        if (detectors[idx].indexOf("Reference:") == -1) {
            errorArray[4] += detectors[idx].split("\n").length;
            continue;
        }

        var errors = detectors[idx].split(")\n");

        var error = errors[errors.length - 1];
        error = error.replaceAll("Reference: ", "");
        error = error.replaceAll(/\n/g, "");
        errorArray[estimateError(error)] += errors.length - 1;
    }

    return errorArray;
}

async function audit(userMessage) {
    // Creating file name from current timestamp
    const currentDate = new Date();
    const currentDateString = currentDate.toISOString();
    const dirName = "audit/" + currentDateString;
    const fileName = dirName + "/" + getRandomInt(1, 10000) + ".sol";
    var mainMsg, humanMsg, contractSummary, functionSummary, files, svgItemMsg = "", response = "";
    var errArray;
    var svgArray = [];

    try {
        const mkdir = util.promisify(fs.mkdir);
        await mkdir(dirName, { recursive: true });
        console.log(`Directory ${dirName} has been created.`);
        await fs.writeFileSync(fileName, userMessage);
        console.log(`File ${fileName} has been created.`);
    } catch {
        (err) => {
            console.log("err", err);
            return "Internal Server Error, Can't create solidity file from your code" + err;
        }
    }

    // Staring to Audit
    try {
        const command = `slither ${fileName}`;
        mainMsg = await executeCommand(command);

        errArray = inspectError(mainMsg);
        mainMsg = mainMsg.replaceAll("INFO:Detectors:", "\n\nINFO -> Detectors:");

        const printGraph = `slither ${fileName} --print call-graph`;
        await executeCommand(printGraph);

        const printDotPng = `slither ${fileName} --print cfg`;
        await executeCommand(printDotPng);

        files = await getDotFileList(dirName);

        for (var idx = 0; idx < files.length; idx++) {

            if (files[idx].indexOf("dot") == -1)
                continue;

            const command = `dot '${dirName}/${files[idx]}' -Tsvg`;
            var svgItem = await executeCommand(command);
            const match = svgItem.match(/svg width="(\d+)pt"/);
            if (match) {
                const widthValue = match[1];
                if (widthValue == 8)
                    continue;
            }
            svgItemMsg += "<tr><td><h3>" + files[idx] + "</h3>" + svgItem + "</td></tr>";
            svgArray.push(svgItem);
        }

        const printContractSummary = `slither ${fileName} --print contract-summary`;
        contractSummary = await executeCommand(printContractSummary);

        const printFunctionSummary = `slither ${fileName} --print function-summary`;
        functionSummary = await executeCommand(printFunctionSummary);

        const printHumanSummary = `slither ${fileName} --print human-summary`;
        humanMsg = await executeCommand(printHumanSummary);

    } catch {
        (err) => {
            console.log("err", err);
            return "Internal Server Error, Can't audit solidity file from your code" + err;
        }
    }

    try {
        const rmdir = util.promisify(fs.rmdir);
        await rmdir(dirName, { recursive: true });
        console.log(`File has been successfully removed.`);

    } catch {
        (err) => {
            console.log("err", err);
            return "Internal Server Error, Can't remove temp file" + err;
        }
    }

    try {
        const openai = new OpenAI({
            apiKey: API_KEY,
        });

        response = await openai.chat.completions.create({
            model: AI_MODEL,
            messages: [
                {
                    role: "user",
                    content: userMessage + "\n please audit this smart contract",
                },
            ],
            temperature: 0.76,
            max_tokens: 1067,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
        });
    } catch {
        (err) => {
            console.log("Internal Server Error, Can't remove temp file" + err);
        }
    }


    gptComment = response.choices &&
        response.choices[0] &&
        response.choices[0].message.content
        ? response.choices[0].message.content.trim()
        : "You can't find answer";

    mainMsg = strToHmtl(mainMsg);
    humanMsg = strToHmtl(humanMsg);
    contractSummary = strToHmtl(contractSummary);
    functionSummary = strToHmtl(functionSummary);
    gptComment = gptComment.replaceAll(/\n/g, "<br>");

    resultMsg = util.format(auditResult, currentDateString, errArray[0], errArray[1], errArray[2], errArray[3], errArray[4], gptComment, mainMsg, svgItemMsg.replaceAll(/"/g, "'"), humanMsg, contractSummary, functionSummary);
    return resultMsg.replaceAll(/\n/g, "");
}

async function auditAddress(userMessage) {
    // Creating file name from current timestamp
    const currentDate = new Date();
    const currentDateString = currentDate.toISOString();
    const dirName = "audit/" + currentDateString;
    var mainMsg, humanMsg, contractSummary, functionSummary, files, svgItemMsg = "", response = "";
    var errArray;
    var svgArray = [];
    var contractAddress = userMessage;

    try {
        const mkdir = util.promisify(fs.mkdir);
        await mkdir(dirName, { recursive: true });
        console.log(`Directory ${dirName} has been created address.`);
    } catch {
        (err) => {
            console.log("err", err);
            return "Internal Server Error, Can't create solidity file from your code" + err;
        }
    }

    // Staring to Audit
    try {
        const cdDommand = `cd ${dirName}/\n`;
        var result = await executeCommand(cdDommand);

        const command = cdDommand + `slither mainet:${contractAddress}\n`;
        mainMsg = await executeCommand(command);
        sleep(1000);

        errArray = inspectError(mainMsg);
        mainMsg = mainMsg.replaceAll("INFO:Detectors:", "\n\nINFO -> Detectors:");

        const printGraph = cdDommand + `slither mainet:${contractAddress} --print call-graph\n`;
        var res1 = await executeCommand(printGraph);
        sleep(1000);

        const printDotPng = cdDommand + `slither mainet:${contractAddress} --print cfg --etherscan-apikey K1QT6DGERPY6E7GJ74KXEDBBHP3G5JNQQU\n`;
        var res2 = await executeCommand(printDotPng);
 
        files = await getDotFileList(dirName);

        for (var idx = 0; idx < files.length; idx++) {

            if (files[idx].indexOf("dot") == -1)
                continue;

            const command = `dot '${dirName}/${files[idx]}' -Tsvg`;
            var svgItem = await executeCommand(command);
            const match = svgItem.match(/svg width="(\d+)pt"/);
            if (match) {
                const widthValue = match[1];
                if (widthValue == 8)
                    continue;
            }
            svgItemMsg += "<tr><td><h3>" + files[idx] + "</h3>" + svgItem + "</td></tr>";
            svgArray.push(svgItem);
        }

        const printContractSummary = `slither mainet:${contractAddress} --print contract-summary`;
        contractSummary = await executeCommand(printContractSummary);

        const printFunctionSummary = `slither mainet:${contractAddress} --print function-summary`;
        functionSummary = await executeCommand(printFunctionSummary);

        const printHumanSummary = `slither mainet:${contractAddress} --print human-summary`;
        humanMsg = await executeCommand(printHumanSummary);

    } catch {
        (err) => {
            console.log("err", err);
            return "Internal Server Error, Can't audit solidity file from your code" + err;
        }
    }

    try {
        const rmdir = util.promisify(fs.rmdir);
        await rmdir(dirName, { recursive: true });
        console.log(`File has been successfully removed.`);

    } catch {
        (err) => {
            console.log("err", err);
            return "Internal Server Error, Can't remove temp file" + err;
        }
    }

    try {
        const openai = new OpenAI({
            apiKey: API_KEY,
        });

        response = await openai.chat.completions.create({
            model: AI_MODEL,
            messages: [
                {
                    role: "user",
                    content: userMessage + "\n please audit this smart contract",
                },
            ],
            temperature: 0.76,
            max_tokens: 1067,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
        });
    } catch {
        (err) => {
            console.log("Internal Server Error, Can't remove temp file" + err);
        }
    }


    gptComment = response.choices &&
        response.choices[0] &&
        response.choices[0].message.content
        ? response.choices[0].message.content.trim()
        : "You can't find answer";

    mainMsg = strToHmtl(mainMsg);
    humanMsg = strToHmtl(humanMsg);
    contractSummary = strToHmtl(contractSummary);
    functionSummary = strToHmtl(functionSummary);
    gptComment = gptComment.replaceAll(/\n/g, "<br>");

    resultMsg = util.format(auditResult, currentDateString, errArray[0], errArray[1], errArray[2], errArray[3], errArray[4], gptComment, mainMsg, svgItemMsg.replaceAll(/"/g, "'"), humanMsg, contractSummary, functionSummary);
    return resultMsg.replaceAll(/\n/g, "");
}
module.exports = {
    audit,
    auditAddress,
    inspectError
};
