// scripts/index.js
async function main () {
    const accounts = await ethers.provider.listAccounts();
    console.log(accounts);
    const address = '0x5FbDB2315678afecb367f032d93F642f64180aa3';//update when deployed
    const Sparta = await ethers.getContractFactory('Sparta');
    const sparta = await Sparta.attach(address); //Attach address to instance
  }
  
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });