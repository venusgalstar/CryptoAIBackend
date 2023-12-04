
const express = require("express");
var bodyParser = require("body-parser");
const cors = require("cors");
const http = require("http");
const { audit } = require("./utils");

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

app.post("/audit", async (req, res) => {
  try {

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
      result: "An error occurred while trying to contact the OpenAI API",
    });
  }
});

const server = http.createServer(app);
server.listen(port, () => {
  console.log(`Server is running in PORT ${port}`);
});
