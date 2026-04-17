// AI Prompt Templates for Cloud Kitchen WMS Analytics

export interface InventoryDataSummary {
  products: { id: number; name: string; sku: string; category: string; min_stock: number; reorder_point: number }[];
  lots: { product_id: number; quantity: number; expiry_date: string; status: string; received_date: string }[];
  movements: { product_id: number; movement_type: string; quantity: number; created_at: string; reference_type: string }[];
  transfers: { product_id: number; from_branch_id: number; to_branch_id: number; quantity: number; status: string; requested_date: string }[];
  receivingDocs: { supplier_id: number; warehouse_id: number; status: string; expected_date: string; received_date: string }[];
  branches: { id: number; name: string }[];
}

export function buildForecastPrompt(data: InventoryDataSummary): string {
  const productSummary = data.products.slice(0, 20).map(p => {
    const productLots = data.lots.filter(l => l.product_id === p.id && l.status === 'active');
    const totalStock = productLots.reduce((sum, l) => sum + l.quantity, 0);
    const inboundMoves = data.movements.filter(m => m.product_id === p.id && m.movement_type === 'inbound');
    const outboundMoves = data.movements.filter(m => m.product_id === p.id && m.movement_type === 'outbound');
    const totalInbound = inboundMoves.reduce((sum, m) => sum + m.quantity, 0);
    const totalOutbound = outboundMoves.reduce((sum, m) => sum + m.quantity, 0);
    return `- ${p.name} (${p.sku}): Stock=${totalStock}, MinStock=${p.min_stock}, ReorderPt=${p.reorder_point}, Inbound=${totalInbound}, Outbound=${totalOutbound}, Category=${p.category}`;
  }).join('\n');

  const movementTrend = summarizeMovementsByDate(data.movements);
  const branchNames = data.branches.map(b => `${b.id}:${b.name}`).join(', ');

  return `You are an AI demand forecasting analyst for a Cloud Kitchen Warehouse Management System.

Analyze the following inventory data and provide demand forecasts and recommendations.

## Current Inventory Summary
${productSummary}

## Stock Movement Trends (Last 30 days)
${movementTrend}

## Branches
${branchNames || 'No branches configured'}

## Instructions
Provide your analysis in the following structured format:

### 📊 DEMAND FORECAST SUMMARY
Provide a brief overview of overall demand patterns.

### 📈 HIGH DEMAND PRODUCTS (Next 7 Days)
List products expected to have high demand with estimated quantities needed. For each product:
- Product name and current stock level
- Predicted demand (quantity)
- Confidence level (High/Medium/Low)
- Recommended action

### ⚠️ RESTOCK ALERTS
List products that need immediate restocking based on current consumption rates and stock levels.

### 📉 LOW DEMAND / OVERSTOCK ITEMS
List products with declining demand or excess inventory that may need attention.

### 💡 OPTIMIZATION RECOMMENDATIONS
Provide 3-5 actionable recommendations for inventory optimization, including:
- Optimal reorder quantities
- Suggested safety stock adjustments
- Seasonal or trend-based insights

Keep the analysis concise, data-driven, and actionable. Use specific numbers from the data provided.`;
}

export function buildFraudDetectionPrompt(data: InventoryDataSummary): string {
  const movementDetails = data.movements.slice(0, 50).map(m => {
    const product = data.products.find(p => p.id === m.product_id);
    return `- [${m.created_at}] ${m.movement_type} | ${product?.name || `Product#${m.product_id}`} | Qty: ${m.quantity} | Ref: ${m.reference_type}#${m.reference_type}`;
  }).join('\n');

  const transferDetails = data.transfers.slice(0, 30).map(t => {
    const product = data.products.find(p => p.id === t.product_id);
    const fromBranch = data.branches.find(b => b.id === t.from_branch_id);
    const toBranch = data.branches.find(b => b.id === t.to_branch_id);
    return `- [${t.requested_date}] ${product?.name || `Product#${t.product_id}`} | Qty: ${t.quantity} | ${fromBranch?.name || 'Unknown'} → ${toBranch?.name || 'Unknown'} | Status: ${t.status}`;
  }).join('\n');

  const receivingDetails = data.receivingDocs.slice(0, 20).map(r => {
    return `- Expected: ${r.expected_date} | Received: ${r.received_date || 'N/A'} | Status: ${r.status} | Supplier#${r.supplier_id} | Warehouse#${r.warehouse_id}`;
  }).join('\n');

  // Calculate anomaly indicators
  const adjustments = data.movements.filter(m => m.movement_type === 'adjustment');
  const totalAdjustmentQty = adjustments.reduce((sum, m) => sum + Math.abs(m.quantity), 0);
  const negativeAdjustments = adjustments.filter(m => m.quantity < 0);

  return `You are an AI fraud detection and anomaly analysis specialist for a Cloud Kitchen Warehouse Management System.

Analyze the following warehouse data for potential fraud, anomalies, and suspicious patterns.

## Stock Movements (Recent)
${movementDetails || 'No movements recorded'}

## Stock Transfers
${transferDetails || 'No transfers recorded'}

## Receiving Documents
${receivingDetails || 'No receiving documents'}

## Anomaly Indicators
- Total stock adjustments: ${adjustments.length} (Total qty adjusted: ${totalAdjustmentQty})
- Negative adjustments (potential shrinkage): ${negativeAdjustments.length}
- Cancelled transfers: ${data.transfers.filter(t => t.status === 'cancelled').length}

## Instructions
Provide your analysis in the following structured format:

### 🔴 CRITICAL ALERTS
List any high-severity suspicious activities that require immediate investigation. For each:
- Description of the anomaly
- Affected products/branches
- Severity: CRITICAL
- Recommended action

### 🟡 WARNING ALERTS
List medium-severity anomalies that should be monitored. For each:
- Description of the pattern
- Risk assessment
- Severity: WARNING
- Recommended action

### 🟢 OBSERVATIONS
List low-severity observations and patterns worth noting.

### 📊 FRAUD RISK SCORE
Provide an overall fraud risk score (1-10) with justification.

### 🛡️ PREVENTIVE RECOMMENDATIONS
Provide 3-5 recommendations to strengthen inventory controls and prevent fraud:
- Process improvements
- Additional monitoring suggestions
- System controls to implement

Be thorough but avoid false positives. Base all findings on the actual data patterns provided. If data is limited, note that and provide preliminary assessments.`;
}

function summarizeMovementsByDate(movements: InventoryDataSummary['movements']): string {
  const dayMap: Record<string, { inbound: number; outbound: number; adjustment: number }> = {};

  movements.forEach(m => {
    if (!m.created_at) return;
    const day = new Date(m.created_at).toISOString().split('T')[0];
    if (!dayMap[day]) dayMap[day] = { inbound: 0, outbound: 0, adjustment: 0 };
    if (m.movement_type === 'inbound') dayMap[day].inbound += m.quantity;
    else if (m.movement_type === 'outbound') dayMap[day].outbound += m.quantity;
    else dayMap[day].adjustment += m.quantity;
  });

  const sortedDays = Object.keys(dayMap).sort();
  if (sortedDays.length === 0) return 'No movement data available';

  return sortedDays.slice(-14).map(day =>
    `${day}: In=${dayMap[day].inbound}, Out=${dayMap[day].outbound}, Adj=${dayMap[day].adjustment}`
  ).join('\n');
}