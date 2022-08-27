NOTE: When 'Equal' is complete, we can copy over to 'Offset' folder and extend the logic to allow asset-weighting in the pool

'Offset' pools are like an auto-balancing index fund where every asset in the pool is balanced based on desired weights of assets in the pool.
When a pool reaches stasis with no arbitrage opportunities present, each asset in the pool should match the desired weighting set by the pool.

i.e.
- SPARTA:WBNB instead of: 50% SPARTA : 50% WBNB (50/50) -> something like: 75% SPARTA : 25% WBNB (75/25)
- SPARTA:WBNB:BUSD:USDT instead of: 25% SPARTA : 25% WBNB : 25% BUSD : 25% USDT (25/25/25/25) - something like: 20% SPARTA : 10% WBNB : 40% BUSD : 30% USDT (20/10/40/30)

A hurdle to consider here is that when pools are offset, there is wasted collateral/assets in the pool (from an AMM perspective) that technically are not serving a 'utility' purpose, we would need to either accept this wastage (vs a traditional 50/50 design where 100% of each side is serving an AMM purpose) or think outside the box for a way to make use of this 'dead' collateral. At the very least, they can be used with the rest of the assets to facilitate flash loans, but would be ideal if it could facilitate more use-cases than that. 