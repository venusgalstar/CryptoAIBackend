const dotenv = require("dotenv");
const express = require("express");
var bodyParser = require("body-parser");
const cors = require("cors");
const http = require("http");
const OpenAI = require("openai");
const fs = require('fs');
const { exec } = require("child_process");
const { dir } = require("console");
const { auditResult, auditResult1 } = require("./config/result");
const util = require('util');
const cheerio = require('cheerio');

// console.log("auditResult", auditResult);
// console.log("auditResult1", auditResult1);

dotenv.config();
const app = express();
const port = process.env.PORT || 5000;

app.all("/*", function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "X-Requested-With, Content-Type, Accept"
  );
  res.header("Access-Control-Allow-Methods", "POST, GET");
  next();
});

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.text());
app.use(bodyParser.urlencoded({ extended: true }));

const API_KEY = process.env.OPENAI_API_KEY;
var logMessages;

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

app.post("/executeQuery", async (req, res) => {
  try {

    const userMessage = req.body ? req.body : "Default message";

    if (!req.body) {
      res.status(200).send({
        result: "You didn't upload solidity code",
      });
      return;
    }

    // Creating file name from current timestamp
    const currentDate = new Date();
    const currentDateString = currentDate.toISOString();
    const dirName = "audit/" + currentDateString;
    const fileName = dirName + "/" + getRandomInt(1, 10000) + ".sol";
    var mainMsg, humanMsg, contractSummary, functionSummary, files, svgItemMsg;
    var svgArray = [];

    try {
      await fs.mkdir(dirName, { recursive: true }, (err) => {
        if (err) {
          console.error(`Error creating directory: ${err}`);
        } else {
          console.log(`Directory ${dirName} has been created.`);
        }
      });
      await fs.writeFileSync(fileName, userMessage);
    } catch {
      (err) => {
        res.status(200).send({
          result: "Internal Server Error, Can't create solidity file from your code" + err,
        });
        return;
      }
    }

    // Staring to Audit
    try {
      const command = `slither ${fileName}`;
      mainMsg = await executeCommand(command);
      // console.log("msg", mainMsg);

      const printGraph = `slither ${fileName} --print call-graph`;
      await executeCommand(printGraph);

      const printDotPng = `slither ${fileName} --print cfg`;
      await executeCommand(printDotPng);

      files = await getDotFileList(dirName);

      for (var idx = 0; idx < files.length; idx++) {

        if( files[idx].indexOf("dot") == -1 )
          continue;
        
        const command = `dot '${dirName}/${files[idx]}' -Tsvg`;
        var svgItem = await executeCommand(command);
        svgItem = svgItem.replace(/"/g,"'");
        svgItemMsg += "<tr><td><h3>"+files[idx]+"</h3>"+svgItem+"</td></tr>";
        svgArray.push(svgItem);
      }

      const printContractSummary = `slither ${fileName} --print contract-summary`;
      contractSummary = await executeCommand(printContractSummary);

      const printFunctionSummary = `slither ${fileName} --print function-summary`;
      functionSummary = await executeCommand(printFunctionSummary);

      const printHumanSummary = `slither ${fileName} --print human-summary`;
      console.log("printHumanSummary", printHumanSummary);
      humanMsg = await executeCommand(printHumanSummary);
      // console.log("msg", humanMsg);

    } catch {
      (err) => {
        console.log("err", err);
        res.status(200).send({
          result: "Internal Server Error, Can't audit solidity file from your code" + err,
        });
        return;
      }
    }

    try {
      fs.rmdir(dirName, { recursive: true},(err) => {
        if (err) {
            console.error(`Error removing folder: ${err}`);
        } else {
            console.log(`File has been successfully removed.`);
        }
      });
    } catch{(err)=>{
      res.status(200).send({
        result: "Internal Server Error, Can't remove temp file" + err,
      });
      return;
    }}

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

    mainMsg = mainMsg.replace(/\n/g, "<br>");
    humanMsg = humanMsg.replace(/\n/g, "<br>");
    humanMsg = humanMsg.replace(/\u001b\[\d+m/g,'');

    functionSummary = functionSummary.replace(/\u001b\[\d+m/g,' ');
    functionSummary = functionSummary.replace(/\n/g, "<br>");

    contractSummary = contractSummary.replace(/\n/g, "<br>");

    resultMsg = util.format(auditResult, currentDateString, mainMsg, svgItemMsg, humanMsg, contractSummary, functionSummary);

    res.status(200).send({
      result: {
        "audit_result": resultMsg.replace(/\n/g, ''),
        "gpt": response.choices &&
          response.choices[0] &&
          response.choices[0].message.content
          ? response.choices[0].message.content.trim()
          : "You can't find answer",
      }

    });
  } catch (error) {
    console.log("********************************", error);
    res.status(500).send({
      result: "An error occurred while trying to contact the OpenAI API",
    });
  }
});

const server = http.createServer(app);
server.listen(port, () => {
  console.log(`Server is running in PORT ${port}`);
});
