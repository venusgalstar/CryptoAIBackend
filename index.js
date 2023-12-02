const dotenv = require("dotenv");
const express = require("express");
var bodyParser = require("body-parser");
const cors = require("cors");
const http = require("http");
const OpenAI = require("openai");
const fs = require('fs');
const { exec } = require("child_process");
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
    exec(command, (error, stdout, stderr) => {
      if (error) {
        // console.error('Command output:', stderr);
        logMessages = stderr.trim();
        reject(error);
        return;
      }

      logMessages = stdout.trim();
      resolve(stdout.trim());
    });
  });
}

app.post("/executeQuery", async (req, res) => {
  try {
    // console.log("req.headers >>> ", req.headers);
    // console.log("req.body >>> ", req.body);

    const userMessage = req.body ? req.body : "Default message";

    if ( !req.body ) {
      res.status(200).send({
        result: "You didn't upload solidity code",
      });
      return;
    }

    // console.log("---userMessage:", userMessage);

    const currentDate = new Date();
    const currentDateString = currentDate.toISOString();
    const fileName = currentDateString+".sol";

    try {
      console.log("fileName:", fileName);
      await fs.writeFileSync(fileName, userMessage);   
      
    } catch{(err)=>{
      res.status(200).send({
        result: "Internal Server Error, Can't create solidity file from your code" + err,
      });
      return;
    }}

    try {
      const command = "slither " + fileName ;
      console.log("command", command);
      await executeCommand(command);

      console.log("resultStr", logMessages);

    }catch{(err)=>{
      res.status(200).send({
        result: "Internal Server Error, Can't audit solidity file from your code" + err,
      });
      return;
    }}

    const openai = new OpenAI({
      apiKey: API_KEY,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-3.5",
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

    // Debugging: Inspect response and response.choices
    // console.log("Response from OpenAI:", response);
    // console.log("Choices from OpenAI:", response.choices);
    // Return the answer

    res.status(200).send({
      result: {
        "audit_result": logMessages,
        "gpt":response.choices &&
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
