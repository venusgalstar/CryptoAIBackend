const dotenv = require("dotenv");
const OpenAI = require("openai");
const fs = require('fs');

const Web3 = require("web3");
const { exec } = require("child_process");
const { auditResult } = require("./config/result");
const { issues } = require("./config/issue");
const util = require('util');
const axios = require('axios');
const natural = require('natural');

dotenv.config();
const API_KEY = process.env.OPENAI_API_KEY;
const AI_MODEL = process.env.OPENAI_MODEL;
const ETH_API_KEY = process.env.ETHERSCAN_API_KEY;
const ETH_PROVIDER = process.env.PROVIDER;
const wordsToRemove = ['solc', 'Slither'];
const tokenizer = new natural.WordTokenizer();
const maxTokensPerSegment = 1000;


const web3 = new Web3(new Web3.providers.HttpProvider(ETH_PROVIDER));

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

function isValidEvmAddress(address) {
    return /^(0x)?[0-9a-f]{40}$/i.test(address);
}

const isEOA = async (address) => {
    // Check if the address is not a smart contract (assuming the simple heuristic that smart contract addresses have a nonce greater than 0)
    const transactionCount = await web3.eth.getTransactionCount(address);

    console.log("address", address);
    console.log("isEOA", transactionCount);

    const isNotSmartContract = transactionCount === 0;

    console.log("isNotSmartContract", isNotSmartContract);
    return isNotSmartContract;
};

function divideTextByTokens(text, maxTokens) {
    // Tokenize the input text
    const tokens = tokenizer.tokenize(text);

    // Initialize variables
    var segments = [];
    let currentSegment = [];

    // Iterate through tokens and create segments
    for (const token of tokens) {
        currentSegment.push(token);

        // Check if the segment has reached the desired token count
        if (currentSegment.length >= maxTokens) {
            segments.push(currentSegment.join(' '));
            currentSegment = [];
        }
    }

    // Add the remaining tokens as the last segment
    if (currentSegment.length > 0) {
        segments.push(currentSegment.join(' '));
    }

    console.log("total segments", segments.length);
    return segments;
}

async function audit(userMessage) {
    // Creating file name from current timestamp
    const currentDate = new Date();
    const currentDateString = currentDate.toISOString();
    const dirName = "audit/" + currentDateString;
    const fileName = dirName + "/" + getRandomInt(1, 10000) + ".sol";
    var mainMsg, humanMsg, contractSummary, functionSummary, files, svgItemMsg = "", response = "";
    var errArray, gptComment = "";
    var svgArray = [];

    try {
        const mkdir = util.promisify(fs.mkdir);
        await mkdir(dirName, { recursive: true });
        console.log(`Directory ${dirName} has been created.`);
        await fs.writeFileSync(fileName, userMessage);
        console.log(`File ${fileName} has been created.`);
    } catch (err) {
        console.log("err", err);
        return "Internal Server Error, Can't create solidity file from your code" + err;
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

    } catch (err) {
        console.log("err", err);
        return "Internal Server Error, Can't audit solidity file from your code" + err;
    }

    try {
        const rmdir = util.promisify(fs.rmdir);
        await rmdir(dirName, { recursive: true });
        console.log(`File has been successfully removed.`);

    } catch (err) {
        console.log("err", err);
        return "Internal Server Error, Can't remove temp file" + err;
    }

    // try {
    //     const openai = new OpenAI({
    //         apiKey: API_KEY,
    //     });

    //     const resultSegments = divideTextByTokens("I am going to get smart contract audit report.\n It is smart contract source code.\n " + userMessage + "\n please audit this smart contract", maxTokensPerSegment);

    //     for (var idx = 0; idx < resultSegments.length; idx++) {
    //         response = await openai.chat.completions.create({
    //             model: AI_MODEL,
    //             messages: [
    //                 {
    //                     role: "user",
    //                     content: resultSegments[idx],
    //                 },
    //             ],
    //             temperature: 0.95,
    //             max_tokens: 1000,
    //         });

    //         gptComment += response.choices &&
    //             response.choices[0] &&
    //             response.choices[0].message.content
    //             ? response.choices[0].message.content.trim()
    //             : " ";

    //         console.log("gptComment", gptComment);
    //     }
    // } catch (err) {
    //     console.log("Internal Server Error, Can't remove temp file" + err);
    // }

    mainMsg = strToHmtl(mainMsg);
    humanMsg = strToHmtl(humanMsg);
    contractSummary = strToHmtl(contractSummary);
    functionSummary = strToHmtl(functionSummary);
    gptComment = gptComment.replaceAll(/\n/g, "<br>");

    gptComment = gptComment.replaceAll("OpenAI", "Our Service");
    gptComment = gptComment.replaceAll("ChatGPT", "Our Service");

    resultMsg = util.format(auditResult, "", currentDateString, errArray[0], errArray[1], errArray[2], errArray[3], errArray[4], gptComment, mainMsg, svgItemMsg.replaceAll(/"/g, "'"), humanMsg, contractSummary, functionSummary);
    return resultMsg.replaceAll(/\n/g, "");
}

async function getSolidityCode(subDirName) {
    var files = await getDotFileList(subDirName);

    console.log("files", files);

    if (files[0].indexOf(".sol") != -1) {
        try {
            const data = fs.readFileSync(subDirName + "/" + files[0], 'utf-8');
            return data;
        } catch (err) {
            console.log("Error reading file:", err);
            return null;
        }
    }

    const newSubDirName = subDirName + `/${files[0]}/contracts`;
    var newFiles = await getDotFileList(newSubDirName);
    var idx;

    console.log("newFiles", newFiles);
    for (idx = 0; idx < newFiles.length; idx++) {
        if (newFiles[idx].indexOf(".sol") == -1)
            continue;

        try {
            const data = fs.readFileSync(newSubDirName + "/" + newFiles[idx], 'utf-8');
            return data;
        } catch (err) {
            console.log("Error reading file:", err);
            return null;
        }
    }

    return null;
}

async function auditAddress(userMessage) {
    // Creating file name from current timestamp
    const currentDate = new Date();
    const currentDateString = currentDate.toISOString();
    const dirName = "audit/" + currentDateString;
    var mainMsg, humanMsg, contractSummary, functionSummary, files, svgItemMsg = "", response = "", solidityCode;
    var errArray, gptComment = "";
    var svgArray = [];
    var contractAddress = userMessage;
    var results = {
        type: "",
        address: "",
        time: "",
        result: "",
    };

    results["type"] = "code/address";
    results["address"] = userMessage;
    results["time"] = currentDateString;

    console.log("result", results);

    if (!isValidEvmAddress(userMessage)) {
        console.log("This address isn't valid EVM address", userMessage);
        results["result"] = "This address isn't valid EVM address";        
        return results;
    }

    const checkEOA = await isEOA(userMessage);
    if (checkEOA) {
        console.log("This address isn't valid smart contract address", userMessage);
        results["result"] = "This address isn't valid smart contract address";
        return results;
    }    

    const etherscanApiUrl = `https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${userMessage}&apikey=${ETH_API_KEY}`;
    const verifiedResponse = await axios.get(etherscanApiUrl);
    const status = verifiedResponse.data.status;

    if (status != 1) {
        console.log("This smart contract isn't verified", userMessage);
        results["result"] = "This smart contract isn't verified";
        return results;
    }

    try {
        const mkdir = util.promisify(fs.mkdir);
        await mkdir(dirName, { recursive: true });
        console.log(`Directory ${dirName} has been created address.`);
    } catch (err) {
        console.log("err", err);
        results["result"] = "Internal Server Error, Can't create solidity file from your code" + err;
        return results;
    }


    // Staring to Audit
    try {
        const cdDommand = `cd ${dirName}/\n`;
        var result = await executeCommand(cdDommand);

        const command = cdDommand + `slither mainet:${contractAddress} --etherscan-apikey ${ETH_API_KEY}\n`;
        mainMsg = await executeCommand(command);

        const subDir = dirName + "/crytic-export/etherscan-contracts";
        solidityCode = await getSolidityCode(subDir);

        errArray = inspectError(mainMsg);
        mainMsg = mainMsg.replaceAll("INFO:Detectors:", "\n\nINFO -> Detectors:");

        const printGraph = cdDommand + `slither mainet:${contractAddress} --print call-graph --etherscan-apikey ${ETH_API_KEY}\n`;
        var res1 = await executeCommand(printGraph);
        console.log("res1", res1);
        await sleep(1000);

        const printDotPng = cdDommand + `slither mainet:${contractAddress} --print cfg --etherscan-apikey ${ETH_API_KEY}\n`;
        console.log("res2", res2);
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

        const printContractSummary = `slither mainet:${contractAddress} --print contract-summary --etherscan-apikey ${ETH_API_KEY} --etherscan-export-directory ./`;
        contractSummary = await executeCommand(printContractSummary);

        const printFunctionSummary = `slither mainet:${contractAddress} --print function-summary --etherscan-apikey ${ETH_API_KEY}`;
        functionSummary = await executeCommand(printFunctionSummary);

        const printHumanSummary = `slither mainet:${contractAddress} --print human-summary --etherscan-apikey ${ETH_API_KEY}`;
        humanMsg = await executeCommand(printHumanSummary);

    } catch (err) {
        console.log("err", err);
        results["result"] = "Internal Server Error, Can't audit solidity file from your code" + err;
        return results;
    }

    try {
        const rmdir = util.promisify(fs.rmdir);
        await rmdir(dirName, { recursive: true });
        console.log(`File has been successfully removed.`);

    } catch (err) {
        console.log("err", err);
        results["result"] = "Internal Server Error, Can't remove temp file" + err;
        return results;
    }


    try {
        const openai = new OpenAI({
            apiKey: API_KEY,
        });

        const resultSegments = divideTextByTokens("I am going to get smart contract audit report.\n It is smart contract source code.\n " + solidityCode + "\n please audit this smart contract", maxTokensPerSegment);

        for (var idx = 0; idx < resultSegments.length; idx++) {

            console.log("idx", idx);

            response = await openai.chat.completions.create({
                model: AI_MODEL,
                messages: [
                    {
                        role: "user",
                        content: resultSegments[idx],
                    },
                ],
                temperature: 0.95,
                max_tokens: 1000,
            });

            gptComment += response.choices &&
                response.choices[0] &&
                response.choices[0].message.content
                ? response.choices[0].message.content.trim()
                : " ";

            console.log("response", response);
            console.log("gptComment", gptComment);
        }
    } catch (err) {
        console.log("Internal Server Error, Can't remove temp file" + err);
        // result["result"] = "Internal Server Error, Can't remove temp file" + err;
        // return result;
    }    

    mainMsg = strToHmtl(mainMsg);
    humanMsg = strToHmtl(humanMsg);
    contractSummary = strToHmtl(contractSummary);
    functionSummary = strToHmtl(functionSummary);
    gptComment = gptComment.replaceAll(/\n/g, "<br>");
    gptComment = gptComment.replaceAll("OpenAI", "Our Service");
    gptComment = gptComment.replaceAll("ChatGPT", "Our Service");

    resultMsg = util.format(auditResult, userMessage, currentDateString, errArray[0], errArray[1], errArray[2], errArray[3], errArray[4], gptComment, mainMsg, svgItemMsg.replaceAll(/"/g, "'"), humanMsg, contractSummary, functionSummary);
    
    
    var successResult = [];
    successResult.push({
        "title" : "Overall Rating",
        "content" : errArray,
    });

    successResult.push({
        "title" : "Overall View",
        "content" : gptComment,
    });

    successResult.push({
        "title" : "Summary of Findings",
        "content" : mainMsg,
    });

    successResult.push({
        "title" : "Configuration Audit",
        "content" : svgItemMsg.replaceAll(/"/g, "'"),
    });

    successResult.push({
        "title" : "Human Summary of Audit",
        "content" : humanMsg,
    });

    successResult.push({
        "title" : "Contract Summary of Audit",
        "content" : contractSummary,
    });

    successResult.push({
        "title" : "Function Summary of Audit",
        "content" : functionSummary,
    });

    successResult.push({
        "html" : "Final HMTL",
        "content" : resultMsg.replaceAll(/\n/g, ""),
    });

    results["result"] = successResult;

    console.log("results", results);

    return results;
}
module.exports = {
    audit,
    auditAddress,
    inspectError,
    getSolidityCode
};
