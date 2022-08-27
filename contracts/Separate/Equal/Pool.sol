import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Pools containing logic + assets (ERC20)
// Equal pools maintain stasis between each token evenly (cannot change weighting of assets)
contract Pool is ERC20 {
    constructor(address _token)
        ERC20("NameOfThePoolToken-SpartanV3Pool", "TickerOfThePoolToken")
    {}

    function swap() {}

    function etc() {}
}
