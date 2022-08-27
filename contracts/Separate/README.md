'Separate' structure is where the pool contracts handle the AMM logic along with holding the assets assigned to that particular pool.
This is the traditional structure as seen in V1 & V2 of the AMM protocol.

See 'Combined' for an alternative structure we can explore later where all assets from every pool are stored in a single contract and the pool contracts contain only the AMM logic for each pool.