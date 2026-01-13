# Bagalytics: Jupiter Limit Order Fee Predictor

## Goal

Add a feature to Bagalytics that displays open Jupiter limit orders for a token, bucketed by price level, showing potential creator fees (1% of volume) that will be earned when price crosses each level.

## User Value

Token creators on Bags.fm earn 1% of all trading volume. Limit orders represent guaranteed future volume - when price crosses a limit order's trigger, the order executes and the creator earns fees. This feature lets creators see:

- How much fee income is "locked in" at each price level
- Cumulative fees if price pumps to X or dumps to Y
- Where the volume walls are (dense order clusters)

## Visualization Concept

Price axis with markers showing fee potential:

```
$124 in fees ─── 0.0₃9704 (ATH)
 $82 in fees ─── 0.0₃7855
              ─── 0.0₃4166 (current)
$151 in fees ─── 0.0₃3149
$228 in fees ─── 0.0₃2060
```

### Data Source

- Jupiter Limit Order V2 Program: `j1o2qRpjcyUwEvwtcfhEQefh773ZgjxcVRry7LDqg5X`
- Target token (CMEM): `2TsmuYUrsctE57VLckZBYEEzdokUF8j8e1GavekWBAGS`

### Tasks

1. **Query Jupiter limit orders for a specific token**
   - Research Jupiter's limit order SDK or API
   - Determine best method to get all open orders where token is input OR output
   - Options to explore: SDK deserialization, API endpoints, direct RPC with filters

2. **Extract order data**
   - For each order: inputMint, outputMint, makingAmount, takingAmount
   - Calculate trigger price: takingAmount / makingAmount (adjusted for decimals)
   - Determine order side: if inputMint = our token → sell order, if outputMint = our token → buy order

3. **Bucket orders by price**
   - Group orders into price buckets (e.g., 1% increments)
   - Sum volume per bucket
   - Calculate fee potential per bucket (volume × 0.01)
   - Calculate cumulative fees (if price sweeps from current to bucket)

4. **Display in Bagalytics UI**
   - Add to existing React dashboard
   - Show sell orders above current price
   - Show buy orders below current price
   - Display fee potential per level and cumulative totals

### Output Data Structure

```typescript
interface OrderBucket {
  priceLevel: number;
  side: 'buy' | 'sell';
  orderCount: number;
  totalVolumeUsd: number;
  feePotentialUsd: number;
  cumulativeFeesIfSweep: number;
}

interface LimitOrderData {
  sellBuckets: OrderBucket[];  // above current price
  buyBuckets: OrderBucket[];   // below current price
  totalFeePotentialUp: number;
  totalFeePotentialDown: number;
}
```

## Resources

- Jupiter Docs: https://station.jup.ag/docs/limit-order
- Jupiter SDK: @jup-ag/limit-order-sdk
