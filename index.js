
const express = require("express");
var bodyParser = require("body-parser");
const cors = require("cors");
const http = require("http");
const OpenAI = require("openai");
const natural = require('natural');
const { audit, auditAddress, inspectError, getSolidityCode } = require("./utils");

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

app.post("/audit/source", async (req, res) => {
  try {

    console.log("here");

    const userMessage = req.body ? req.body : "Default message";

    if (!req.body) {
      res.status(200).send({
        result: "You didn't upload solidity code",
      });
      return;
    }

    var resultMsg = await audit(userMessage);
    
    res.status(200).send({
      result: {
        "audit_result": resultMsg
      }

    });
  } catch (error) {
    console.log("********************************", error);
    res.status(500).send({
      result: "An error occurred while trying to contact the AI Auditor",
    });
  }
});

app.post("/audit/address", async (req, res) => {
  try {

    console.log("here address");

    const userMessage = req.body ? req.body : "Default message";

    if (!req.body) {
      res.status(200).send({
        result: "You didn't upload solidity code",
      });
      return;
    }

    var resultMsg = await auditAddress(userMessage);
    
    res.status(200).send({
      result: {
        "audit_result": resultMsg
      }

    });
  } catch (error) {
    console.log("********************************", error);
    res.status(500).send({
      result: "An error occurred while trying to contact the AI auditor",
    });
  }
});

const server = http.createServer(app);
server.listen(port, () => {
  console.log(`Server is running in PORT ${port}`);
});
