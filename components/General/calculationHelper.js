const calcBubbleMatCost = (bubbleIndex, vialMultiplier = 1, bubbleLvl, baseCost, isLiquid, cauldronCostLvl,
                           undevelopedBubbleLv, barleyBrewLvl, lastBubbleLvl, classMultiplierLvl,
                           shopBargainBought, smrtAchievement, multiBubble) => {
  if (isLiquid) {
    return baseCost + Math.floor(bubbleLvl / 20);
  } else {
    const first = bubbleIndex < 14 ?
      baseCost * Math.pow(1.35 - (0.3 * bubbleLvl) / (50 + bubbleLvl), bubbleLvl) :
      baseCost * Math.pow(1.37 - (0.28 * bubbleLvl) / (60 + bubbleLvl), bubbleLvl);
    const cauldronCostReduxBoost = Math.max(0.1, 1 - ((Math.round(10 * growth("decay", cauldronCostLvl, 90, 100)) / 10)) / 100);
    const bubbleCostBubbleBoost = Math.max(0.05, 1 - (growth("decay", undevelopedBubbleLv, 40, 70, false) + growth("add", barleyBrewLvl * vialMultiplier, 1, 0)) / 100);
    const bubbleBargainBoost = Math.max(0.05, 1 - (growth("decay", lastBubbleLvl, 40, 12, false) / 100) * growth("decayMulti", classMultiplierLvl, 2, 50, false) * growth("decayMulti", multiBubble, 1.4, 30, false));
    const shopBargainBoost = Math.max(0.1, Math.pow(0.75, shopBargainBought));
    const smrtBoost = smrtAchievement ? 0.9 : 1;
    // for any material besides liquid
    return Math.round(first * cauldronCostReduxBoost * bubbleBargainBoost * bubbleCostBubbleBoost * shopBargainBoost * smrtBoost);
  }
};

const growth = (func, level, x1, x2, shouldRound = true) => {
  let result;
  switch (func) {
    case 'add':
      if (x2 !== 0) {
        result = (((x1 + x2) / x2 + 0.5 * (level - 1)) / (x1 / x2)) * level * x1;
      } else {
        result = level * x1;
      }
      break;
    case 'decay':
      result = (level * x1) / (level + x2);
      break;
    case 'intervalAdd':
      result = x1 + Math.floor(level / x2);
      break;
    case 'decayMulti':
      result = 1 + (level * x1) / (level + x2);
      break;
    case 'bigBase':
      result = x1 + x2 * level;
      break;
    case 'special1':
      result = 100 - (level * x1) / (level + x2);
      break;
    default:
      result = 0;
  }
  return shouldRound ? round(result) : result;
}

const round = (num) => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

const cauldrons = ['power', 'quicc', 'high-iq', 'kazam'];
const stamps = ['combat', 'skills', 'misc'];

export {
  calcBubbleMatCost,
  growth,
  cauldrons,
  stamps
}