'Combined' structure is where only the pool AMM logic is contained in the pool contracts, and all assets (WBNB, SPARTA, BUSD, etc) are actually held in a single separate 'combined collateral' contract.
This would have some major benefits (reduced gas from reduced swap-hops, easier migration? ... etc) and also some major complexity hurdles

We can start with a traditional design/structure (see 'Separate') and explore this afterwards