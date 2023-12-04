
const express = require("express");
var bodyParser = require("body-parser");
const cors = require("cors");
const http = require("http");
const { audit, auditAddress, inspectError } = require("./utils");

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

// var text=`INFO:Detectors:
// UniswapV2Router02.removeLiquidity(address,address,uint256,uint256,uint256,address,uint256) (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#318-334) ignores return value by IUniswapV2Pair(pair).transferFrom(msg.sender,pair,liquidity) (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#328)
// Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#unchecked-transfer
// INFO:Detectors:
// UniswapV2Router02._addLiquidity(address,address,uint256,uint256,uint256,uint256) (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#248-275) ignores return value by IUniswapV2Factory(factory).createPair(tokenA,tokenB) (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#258)
// UniswapV2Router02.removeLiquidity(address,address,uint256,uint256,uint256,address,uint256) (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#318-334) ignores return value by (token0) = UniswapV2Library.sortTokens(tokenA,tokenB) (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#330)
// UniswapV2Router02._swap(uint256[],address[],address) (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#427-438) ignores return value by (token0) = UniswapV2Library.sortTokens(input,output) (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#430)
// UniswapV2Router02._swapSupportingFeeOnTransferTokens(address[],address) (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#536-553) ignores return value by (token0) = UniswapV2Library.sortTokens(input,output) (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#539)
// UniswapV2Router02._swapSupportingFeeOnTransferTokens(address[],address) (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#536-553) ignores return value by (reserve0,reserve1) = pair.getReserves() (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#544)
// UniswapV2Library.getReserves(address,address,address) (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#701-705) ignores return value by (reserve0,reserve1) = IUniswapV2Pair(pairFor(factory,tokenA,tokenB)).getReserves() (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#703)
// Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#unused-return
// INFO:Detectors:
// UniswapV2Router02.constructor(address,address)._factory (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#238) lacks a zero-check on :
//                 - factory = _factory (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#239)
// UniswapV2Router02.constructor(address,address)._WETH (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#238) lacks a zero-check on :
//                 - WETH = _WETH (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#240)
// Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#missing-zero-address-validation
// INFO:Detectors:
// TransferHelper.safeApprove(address,address,uint256) (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#758-762) is never used and should be removed
// Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#dead-code
// INFO:Detectors:
// Pragma version=0.6.6 (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#1) allows old versions
// solc-0.6.6 is not recommended for deployment
// Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#incorrect-versions-of-solidity
// INFO:Detectors:
// Low level call in TransferHelper.safeApprove(address,address,uint256) (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#758-762):
//         - (success,data) = token.call(abi.encodeWithSelector(0x095ea7b3,to,value)) (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#760)
// Low level call in TransferHelper.safeTransfer(address,address,uint256) (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#764-768):
//         - (success,data) = token.call(abi.encodeWithSelector(0xa9059cbb,to,value)) (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#766)
// Low level call in TransferHelper.safeTransferFrom(address,address,address,uint256) (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#770-774):
//         - (success,data) = token.call(abi.encodeWithSelector(0x23b872dd,from,to,value)) (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#772)
// Low level call in TransferHelper.safeTransferETH(address,uint256) (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#776-779):
//         - (success) = to.call{value: value}(new bytes(0)) (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#777)
// Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#low-level-calls
// INFO:Detectors:
// Function IUniswapV2Pair.DOMAIN_SEPARATOR() (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#34) is not in mixedCase
// Function IUniswapV2Pair.PERMIT_TYPEHASH() (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#35) is not in mixedCase
// Function IUniswapV2Pair.MINIMUM_LIQUIDITY() (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#52) is not in mixedCase
// Function IUniswapV2Router01.WETH() (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#72) is not in mixedCase
// Variable UniswapV2Router02.WETH (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#231) is not in mixedCase
// Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#conformance-to-solidity-naming-conventions
// INFO:Detectors:
// Variable IUniswapV2Router01.addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256).amountADesired (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#77) is too similar to IUniswapV2Router01.addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256).amountBDesired (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#78)
// Variable UniswapV2Router02._addLiquidity(address,address,uint256,uint256,uint256,uint256).amountADesired (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#251) is too similar to UniswapV2Router02.addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256).amountBDesired (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#280)
// Variable UniswapV2Router02._addLiquidity(address,address,uint256,uint256,uint256,uint256).amountADesired (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#251) is too similar to UniswapV2Router02._addLiquidity(address,address,uint256,uint256,uint256,uint256).amountBDesired (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#252)
// Variable UniswapV2Router02.addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256).amountADesired (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#279) is too similar to UniswapV2Router02.addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256).amountBDesired (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#280)
// Variable UniswapV2Router02.addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256).amountADesired (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#279) is too similar to IUniswapV2Router01.addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256).amountBDesired (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#78)
// Variable IUniswapV2Router01.addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256).amountADesired (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#77) is too similar to UniswapV2Router02.addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256).amountBDesired (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#280)
// Variable IUniswapV2Router01.addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256).amountADesired (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#77) is too similar to UniswapV2Router02._addLiquidity(address,address,uint256,uint256,uint256,uint256).amountBDesired (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#252)
// Variable UniswapV2Router02._addLiquidity(address,address,uint256,uint256,uint256,uint256).amountADesired (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#251) is too similar to IUniswapV2Router01.addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256).amountBDesired (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#78)
// Variable UniswapV2Router02.addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256).amountADesired (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#279) is too similar to UniswapV2Router02._addLiquidity(address,address,uint256,uint256,uint256,uint256).amountBDesired (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#252)
// Variable UniswapV2Router02._addLiquidity(address,address,uint256,uint256,uint256,uint256).amountAOptimal (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#269) is too similar to UniswapV2Router02._addLiquidity(address,address,uint256,uint256,uint256,uint256).amountBOptimal (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#264)
// Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#variable-names-too-similar
// INFO:Detectors:
// getAmountsOut(uint256,address[]) should be declared external:
//         - UniswapV2Router02.getAmountsOut(uint256,address[]) (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#642-650)
// Moreover, the following function parameters should change its data location:
// path location should be calldata
// getAmountsIn(uint256,address[]) should be declared external:
//         - UniswapV2Router02.getAmountsIn(uint256,address[]) (crytic-export/etherscan-contracts/0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D.etherscan.io-UniswapV2Router02.sol#652-660)
// Moreover, the following function parameters should change its data location:
// path location should be calldata
// Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#public-function-that-could-be-declared-external
// INFO:Slither:mainet:0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D analyzed (10 contracts with 93 detectors), 33 result(s) found`;

// inspectError(text);

app.post("/audit", async (req, res) => {
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
      result: "An error occurred while trying to contact the OpenAI API",
    });
  }
});

app.post("/auditAddress", async (req, res) => {
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
      result: "An error occurred while trying to contact the OpenAI API",
    });
  }
});

const server = http.createServer(app);
server.listen(port, () => {
  console.log(`Server is running in PORT ${port}`);
});
