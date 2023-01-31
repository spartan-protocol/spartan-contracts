This is the community repository for the Spartan Protocol AMM

### General repository info:

There are three main branches for this repo:

- `development` ongoing development branches are merged into this
- `testnet` this represents the state of current contracts on testnet
- `mainnet` this represents the state of current contracts on mainnet

##### development:

[Click here to jump to the `development` branch.](https://github.com/spartan-protocol/spartan-contracts/tree/development)
Contributors should work off a fork/duplicate of the `development` branch and make a merge request from their forked branch to `development` when suitable

##### testnet:

[Click here to jump to the `testnet` branch.](https://github.com/spartan-protocol/spartan-contracts/tree/testnet)
Contributors deploying to testnet and performing testing in that environment should only request a merge request to `testnet` once consensus is that their testnet deploy is the most current one in use by the community.

Take note in advance of the latest commit hash of the branch you deployed to testnet (or ideally just make a fork/branch clearly named something like `testnet-deploy-004` or something and/or a GitHub issue with suitable identifiers)

##### mainnet:

[Click here to jump to the `mainnet` branch.](https://github.com/spartan-protocol/spartan-contracts/tree/mainnet)

Contributors deploying to mainnet and performing live testing should only request a merge request to `mainnet` once consensus is that their mainnet deploy is the most current one in use by the community.

Take note in advance of the latest commit hash of the branch you deployed to mainnet (or ideally just make a fork/branch clearly named something like `mainnet-deploy-004` or something and/or a GitHub issue with suitable identifiers)

### Running locally:

Get deps: `yarn`
Run tests: `yarn test` (Script which compiles and calls `npx hardhat test`)

Only compile: `yarn compile` (Script which calls `npx hardhat compile`)
Only run a mock RPC node: `yarn node` (Script which calls `npx hardhat node`)

### Formatting & standards (not yet finalised):

Filenames:

- Folders: lower-case-with-dash-separators
- Primary solidity files: PascalCase (camelCase with leading capital letter) like `PoolFactory.sol`
- Secondary solidity files (interfaces): camelCase with leading `i` like `iPoolFactory.sol`
- All other files: standard camelCase like `poolFactoryTests.js`

Inside solidity files:

- Solidity contract names: PascalCase
  ie: `contract PoolFactory { }`
- Private global vars: with leading `_`
  ie: `uint128 private _asset1Depth;`
- Global vars of type `address`: camelCase with tailing `Addr`
  ie: `poolFactoryAddr`
- Address-type args handed into 'address changing or setting' functions like constructors etc: camelCase with leading `new` and tailing `Addr`
  ie: `newPoolFactoryAddr`
