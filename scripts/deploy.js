// scripts/deploy.js
async function main () {
    // We get the contract to deploy
    const Sparta = await ethers.getContractFactory('Sparta');
    console.log('Deploying Sparta...');
    const sparta = await Sparta.deploy();
    await sparta.deployed();
    console.log('Sparta deployed to:', sparta.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });