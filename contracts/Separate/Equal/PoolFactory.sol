pragma solidity 0.8.9;

/**
 * Pool Factory to create pools & pairs
 *
 * A single pool can have 2 or more assets
 * 2 assets = 1 pair && 1 pool
 * 3 assets = 3 pairs && 1 pool
 * 4 assets = 6 pairs && 1 pool
 * ... etc
 *
 * -- Notes for friendly integrations:
 * Follow the UniV2 event names and structure for easy integration with data aggregators
 * Consider following the UniV2 var + function names and structure for easy integration with data & also swap aggregators
 *
 * -- Notes for var arrays like 'address[] public allPools':
 * Supply a '.length' getter rather than returning 'address[] memory' for scalability
 * Also supply a mapping to grab an individual item from the array by index. ie. 'mapping(address => mapping(address => address)) public getPool'
 * Interfacing contract can then loop and multicall the public allPools var using id ranges
 */
contract PoolFactory {
    /** Vars */
    mapping(address => mapping(address => address)) public getPool;
    address[] public allPools;
    // The lines below: Use UniV2 structure for easier integration with data & swap aggregators
    // This means:
    // 1. deploying a non-ERC20 contract per pair && also an ERC20 per pool
    // OR 2. make this mapping an `address[]` array instead of a single `address` and assign it the pool address
    // OR 3. abandon data-aggregator-friendliness and focus on swap-aggregator friendliness for this aspect
    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    /** Events */
    event PairCreated(
        address indexed token0,
        address indexed token1,
        address pair,
        uint256 id
    ); // Use UniV2 event structure for easier integration with data aggregators

    event PoolCreated(
        address[] tokens,
        address[] pairs,
        address pool,
        uint256 id
    ); // TBD: what would we need in this event? (address[] pairs only required if we deploy a contract per pair)

    /** Modifiers */

    /** Setters */
    function createPool(address[] tokenArray) {
        // ADD CHECK?: tokenArray.length must be >= 2 (what if we want to allow for single-token pools to enable a platform for projects to deploy single-staking vaults?)
        // ADD CHECK?: tokenArray must contain SPARTA token?
        // NOTE: it is probably important to sort the token array prior to proceeding?
        // ADD CHECK?: pool must not already exist (duplicate pool === mapping/hash of tokenArray?) (however 'offset' style pools would suggest a need for allowing duplicate arrays of tokens with different weighting-arrays?)
        // ADD: Deploy the pool?
        // ADD LOOP: createPair()
        // ADD EMIT: PoolCreated()
    }

    function createPair(address tokenA, address tokenB)
        external
        returns (address pair)
    {
        // ADD CHECK: tokenA cannot be equal to tokenB
        // NOTE: did we perform sorting in createPool already? if not, we might need to here?
        // ADD CHECK: make sure first token (sorted) is not address(0) (tokens afterwards theoretically are > address(0) as we have sorted them and checked the smallest address already)
        // NOTE: if the pair already exists thats okay, this is expected due to the multi-token pool types
        // NOTE: However: this means we probably still need to check (without revert) the pair exists and assign a unique ID/counter?
        // ADD: Deploy the pair? (Or are we just going to use mappings instead?)
        // ADD: Add pair mapping/s?
        // ADD: Add to pair array?
        // ADD EMIT: PairCreated()
    }

    /** Getters */
    function allPoolsLength() external view returns (uint256) {
        return allPools.length;
    }

    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }
}
