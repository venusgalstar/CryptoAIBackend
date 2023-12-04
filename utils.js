const dotenv = require("dotenv");
const OpenAI = require("openai");
const fs = require('fs');

const { exec } = require("child_process");
const { auditResult } = require("./config/result");
const util = require('util');

dotenv.config();
const API_KEY = dotenv.API_KEY;

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

const wordsToRemove = ['solc'];

function strToHmtl(str) {
    const lines = str.split('\n');

    const filteredLines = lines.filter(line => {
        return !wordsToRemove.some(word => line.includes(word));
    });

    var filteredContent = filteredLines.join('\n');
    filteredContent = filteredContent.replace(/\n/g, "<br>");
    filteredContent = filteredContent.replace(/\u001b\[\d+m/g, ' ');
    filteredContent = filteredContent.replace(" ", "&nbsp");

    return filteredContent;
}

async function audit(userMessage) {
    // Creating file name from current timestamp
    const currentDate = new Date();
    const currentDateString = currentDate.toISOString();
    const dirName = "audit/" + currentDateString;
    const fileName = dirName + "/" + getRandomInt(1, 10000) + ".sol";
    var mainMsg, humanMsg, contractSummary, functionSummary, files, svgItemMsg;
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

    const openai = new OpenAI({
        apiKey: API_KEY,
    });

    const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-0301",
        messages: [
            {
                role: "user",
                content: "what is smart contract audit?",
            },
        ],
        temperature: 0.76,
        max_tokens: 1067,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
    });

    gptComment = response.choices &&
        response.choices[0] &&
        response.choices[0].message.content
        ? response.choices[0].message.content.trim()
        : "You can't find answer";

    mainMsg = strToHmtl(mainMsg);
    humanMsg = strToHmtl(humanMsg);
    contractSummary = strToHmtl(contractSummary);
    functionSummary = strToHmtl(functionSummary);

    resultMsg = util.format(auditResult, currentDateString, mainMsg, svgItemMsg.replace(/"/g, "'"), humanMsg, contractSummary, functionSummary, gptComment);
    // filteredContent = filteredContent.replace(/\n/g, "<br>");
    return resultMsg.replace(/\n/g,"");
}

module.exports = {
    audit
};
