import { Order } from '../models/Order.js';

/**
 * Text normalizer helper (lowercases, strips punctuation and excess spaces)
 */
const normalizeText = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Check for potential duplicate orders in the same transport business.
 * 
 * Compares:
 * 1. transportBusinessId (Security boundary)
 * 2. companyId (if order belongs to a company)
 * 3. Required Date (same calendar day)
 * 4. Pickup & Destination addresses (normalized string similarity)
 * 5. Material description or labour requirement
 * 6. Required time proximity
 * 
 * IMPORTANT: Does NOT automatically reject. Computes a similarity score and flags
 * candidate orders for human review.
 * 
 * @param {object} params
 * @returns {Promise<{ isPossibleDuplicate: boolean, candidates: Array, topMatch: object|null }>}
 */
export const checkPossibleDuplicateOrder = async ({
  transportBusinessId,
  companyId,
  pickupAddress,
  destinationAddress,
  requiredDate,
  requiredTime,
  materialDescription,
  quantity,
  orderType,
  currentOrderId = null,
}) => {
  if (!transportBusinessId || !requiredDate) {
    return { isPossibleDuplicate: false, candidates: [], topMatch: null };
  }

  // Calculate day boundary for date comparison
  const targetDate = new Date(requiredDate);
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Search existing non-cancelled orders on the same day for this transport business
  const query = {
    transportBusinessId,
    requiredDate: { $gte: startOfDay, $lte: endOfDay },
    status: { $nin: ['cancelled', 'failed'] },
  };

  // If company is specified, scope to same company (or private orders)
  if (companyId) {
    query.companyId = companyId;
  }

  if (currentOrderId) {
    query._id = { $ne: currentOrderId };
  }

  const existingOrders = await Order.find(query)
    .populate('companyId', 'companyName companyCode')
    .populate('createdByUserId', 'name role')
    .lean();

  if (existingOrders.length === 0) {
    return { isPossibleDuplicate: false, candidates: [], topMatch: null };
  }

  const normTargetPickup = normalizeText(pickupAddress);
  const normTargetDest = normalizeText(destinationAddress);
  const normTargetMaterial = normalizeText(materialDescription);
  const normTargetTime = normalizeText(requiredTime);

  const scoredCandidates = [];

  for (const candidate of existingOrders) {
    let score = 0;
    const reasons = [];

    // 1. Same company match
    if (companyId && candidate.companyId && candidate.companyId._id?.toString() === companyId.toString()) {
      score += 25;
      reasons.push('Same company');
    }

    // 2. Pickup Address match
    const normCandPickup = normalizeText(candidate.pickupLocation?.address);
    if (normTargetPickup && normCandPickup) {
      if (normTargetPickup === normCandPickup) {
        score += 30;
        reasons.push('Exact pickup address');
      } else if (normTargetPickup.includes(normCandPickup) || normCandPickup.includes(normTargetPickup)) {
        score += 20;
        reasons.push('Similar pickup address');
      }
    }

    // 3. Destination Address match
    const normCandDest = normalizeText(candidate.destinationLocation?.address);
    if (normTargetDest && normCandDest) {
      if (normTargetDest === normCandDest) {
        score += 30;
        reasons.push('Exact destination address');
      } else if (normTargetDest.includes(normCandDest) || normCandDest.includes(normTargetDest)) {
        score += 20;
        reasons.push('Similar destination address');
      }
    }

    // 4. Material / Work match
    const normCandMaterial = normalizeText(candidate.materialDescription);
    if (normTargetMaterial && normCandMaterial) {
      if (normTargetMaterial === normCandMaterial) {
        score += 15;
        reasons.push('Exact material description');
      } else if (normTargetMaterial.includes(normCandMaterial) || normCandMaterial.includes(normTargetMaterial)) {
        score += 10;
        reasons.push('Similar materials');
      }
    }

    // 5. Quantity match
    if (quantity && candidate.quantity && Number(quantity) === Number(candidate.quantity)) {
      score += 10;
      reasons.push(`Identical quantity (${quantity})`);
    }

    // 6. Time Proximity match
    const normCandTime = normalizeText(candidate.requiredTime);
    if (normTargetTime && normCandTime && normTargetTime === normCandTime) {
      score += 15;
      reasons.push(`Identical required time (${requiredTime})`);
    }

    // If score >= 65, classify as a strong potential duplicate
    if (score >= 65) {
      scoredCandidates.push({
        candidate,
        score,
        reasons,
      });
    }
  }

  // Sort descending by score
  scoredCandidates.sort((a, b) => b.score - a.score);

  const isPossibleDuplicate = scoredCandidates.length > 0;
  const topMatch = isPossibleDuplicate ? scoredCandidates[0] : null;

  return {
    isPossibleDuplicate,
    candidates: scoredCandidates,
    topMatch,
  };
};
