// Consider deploying a 'Pair' contract that handles *only* the swap logic (not an ERC20, does not hold any assets)
// This is probably a redundant idea, but will leave here as a placeholder in case it solves an unforseen problem
// Only instance i can think of right now that this might help is with integration-friendliness with data aggregators
// i.e.
// They listen to PoolFactory for New Pair events
// They listen to Pair for Swap events (only relevant Swap events will be caught)
// vs.
// They listen PoolFactory for New Pool events
// They listen to Pool for Swap events (relevant & also non-relevant Swap events will be caught, aggregator will have to add conditional/filtering logic)

// Other side of the coin: this may be *less* friendly for the more important swap aggregators, but we can pad these thoughts out when the time comes