import { getCardBonusByEffect, getMealsBonusByEffectOrStat, isArenaBonusActive } from "./parserUtils";
import { tasks } from "../data/website-data";

export const getDistance = (x1, y1, x2, y2) => {
  return 0.9604339 * Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2)) + 0.397824735 * Math.min(Math.abs(x1 - x2), Math.abs(y1 - y2));
}

export const getRange = (connectionBonus, viralRangeBonus, index, isJewel) => {
  if ((!isJewel && (index === 13 || index === 8)) || (index === 9 && isJewel)) {
    return 80;
  }
  return 80 * (1 + (connectionBonus + viralRangeBonus) / 100);
}

export const calcPlayerLineWidth = (playersInTubes, labBonuses, jewels, chips, meals, cards, taskPixelWidth, gemItemsPurchased, arenaWave, waveReqs) => {
  return playersInTubes?.map((character, index) => {
    const soupedTubes = (gemItemsPurchased?.find((value, index) => index === 123) ?? 0) * 2;
    const petArenaBonus = isArenaBonusActive(arenaWave, waveReqs, 13) ? 20 : 0;
    const calculatedTaskPixelWidth = (taskPixelWidth ?? 0) * tasks?.[3]?.[4]?.bonusPerLevel;
    const lineWidth = getPlayerLineWidth(character,
      character?.[`Lv0_${character?.playerId}`]?.[12], // lab skill
      index < soupedTubes,
      labBonuses,
      jewels,
      chips?.[character?.playerId],
      meals,
      cards,
      calculatedTaskPixelWidth,
      petArenaBonus
    );
    return {
      ...character,
      lineWidth: lineWidth
    };
  })
}

export const getPlayerLineWidth = (playerCords, labLevel, soupedTube, labBonuses, jewels, chips, meals, cards, taskPixelWidth, petArenaBonus) => {
  const jewelMultiplier = (labBonuses.find(bonus => bonus.index === 8)?.active ?? false) ? 1.5 : 1;
  const labSkillLevel = labLevel ?? 0;
  let baseLineWidth = 50 + (2 * labSkillLevel);
  const { acquired, x, y, bonus } = jewels[5];
  if (acquired) {
    if (getDistance(x, y, playerCords.x, playerCords.y) < 150) {
      baseLineWidth *= 1 + (bonus * jewelMultiplier / 100);
    }
  }
  const bonusLineWidth = soupedTube ? 30 : 0;
  const conductiveMotherboardBonus = chips.reduce((res, chip) => chip.index === 6 ? res + chip.baseVal : res, 0);
  const blackDiamondRhinstone = jewels.filter(jewel => jewel.active && jewel.name === 'Black_Diamond_Rhinestone').reduce((sum, jewel) => sum += (jewel.bonus * jewelMultiplier), 0)
  const mealPxBonus = getMealsBonusByEffectOrStat(meals, null, 'PxLine', blackDiamondRhinstone);
  const mealLinePctBonus = getMealsBonusByEffectOrStat(meals, null, 'LinePct', blackDiamondRhinstone);
  const lineWidthCards = getCardBonusByEffect(cards, 'Line_Width_(Passive)');
  return Math.floor((baseLineWidth + taskPixelWidth + (mealPxBonus + Math.min(lineWidthCards, 50)))
    * (1 + ((mealLinePctBonus + conductiveMotherboardBonus + (20 * petArenaBonus) + bonusLineWidth) / 100)));
}

export const getPrismPlayerConnection = (playersInTubes) => {
  for (let i = 0; i < playersInTubes.length; i++) {
    const { x, y, lineWidth } = playersInTubes[i];
    const dist = getDistance(43, 229, x, y);
    if (dist < lineWidth) {
      return playersInTubes[i];
    }
  }
  return null;
}

export const checkPlayerConnection = (playersInTubes, connectedPlayers, playerCords) => {
  for (let i = 0; i < playersInTubes.length; i++) {
    const { x, y, lineWidth } = playersInTubes[i];
    const inRange = getDistance(playerCords.x, playerCords.y, x, y) < lineWidth;
    if (!connectedPlayers.find((player) => player.playerId === playersInTubes[i].playerId) && inRange) {
      return playersInTubes[i];
    }
  }
  return null;
}

// Check connection for jewels / bonuses
export const checkConnection = (array, connectionRangeBonus, viralRangeBonus, playerCords, acquirable) => {
  return array?.reduce((res, object, index) => {
    let newConnection = false;
    const range = getRange(connectionRangeBonus, viralRangeBonus, index, acquirable);
    const distance = getDistance(playerCords.x, playerCords.y, object.x, object.y);
    const inRange = distance < range;
    if (inRange && !object.active && (!acquirable || acquirable && object.acquired)) {
      object.active = true;
      newConnection = true;
    }
    return { resArr: [...res.resArr, object], newConnection }
  }, { resArr: [], newConnection: false });
};

