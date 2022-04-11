// speed
// food with speed effect - "MoveSpdBoosts"


// _customBlock_PlayerSpeed = function () {
//   return 13 * G._customBlock_PlayerSpeedBonus();
// }

import {
  getBubbleBonus,
  getDungeonStatBonus,
  getEquippedCardBonus, getFamilyBonusBonus, getGuildBonusBonus, getHighestLevelOfClass, getMealsBonusByEffectOrStat,
  getPostOfficeBonus, getPrayerBonusAndCurse,
  getSaltLickBonus, getShrineBonus,
  getStampsBonusByEffect,
  getStarSignBonus,
  getStarSignByEffect,
  getStatFromEquipment,
  getStatueBonus,
  getTalentBonus,
  getTalentBonusIfActive
} from "./parserUtils";
import { bonuses, classFamilyBonuses, randomList } from "../data/website-data";

export const getPlayerFoodBonus = (character, statues, stamps) => {
  const postOfficeBonus = getPostOfficeBonus(character?.postOffice, 'Carepack_From_Mum', 2)
  const statuePower = getStatueBonus(statues, 'StatueG4', character?.talents);
  const equipmentFoodEffectBonus = character?.equipment?.reduce((res, item) => res + getStatFromEquipment(item, bonuses?.etcBonuses?.[9]), 0);
  const stampBonus = getStampsBonusByEffect(stamps, 'Boost_Food_Effect', 0)
  const starSignBonus = getStarSignBonus(character?.starSigns, 'Mount_Eaterest', 'All_Food_Effect');
  const cardBonus = getEquippedCardBonus(character?.cards, 'Y5');
  const cardSet = character?.cards?.cardSet?.rawName === 'CardSet1' ? character?.cards?.cardSet?.bonus : 0;
  const talentBonus = getTalentBonus(character?.starTalents, null, 'FROTHY_MALK');
  return 1 + (postOfficeBonus + (statuePower +
    (equipmentFoodEffectBonus + (stampBonus + ((starSignBonus) +
      (cardBonus + (cardSet + talentBonus))))))) / 100;
}

export const getPlayerSpeedBonus = (speedBonusFromPotions, character, playerChips, statues, saltLicks, stamps) => {
  let finalSpeed;
  const featherWeight = getTalentBonus(character?.talents, 0, 'FEATHERWEIGHT');
  const featherFlight = getTalentBonus(character?.talents, 0, 'FEATHER_FLIGHT');
  const stampBonus = getStampsBonusByEffect(stamps, 'Base_Move_Speed', 0)
  const strafe = getTalentBonusIfActive(character?.activeBuffs, 'STRAFE');
  let baseMath = speedBonusFromPotions + featherWeight + stampBonus + strafe;
  let agiMulti;
  if (character.stats?.agility < 1000) {
    agiMulti = (Math.pow(character.stats?.agility + 1, .4) - 1) / 40;
  } else {
    agiMulti = (character.stats?.agility - 1e3) / (character.stats?.agility + 2500) * .5 + .371;
  }
  const statuePower = getStatueBonus(statues, 'StatueG2', character?.talents);
  // const speedFromStatue = 1 + (speedBonusFromPotions + (statuePower) / 2.2);
  const speedStarSign = getStarSignByEffect(character?.starSigns, 'Movement_Speed');
  const equipmentSpeedEffectBonus = character?.equipment?.reduce((res, item) => res + getStatFromEquipment(item, bonuses?.etcBonuses?.[1]), 0);
  const cardBonus = getEquippedCardBonus(character?.cards, 'A5');
  finalSpeed = (baseMath + (statuePower + ((speedStarSign) + (equipmentSpeedEffectBonus + (cardBonus + featherFlight))))) / 100; // 1.708730398284699
  finalSpeed = 1 + (finalSpeed + (agiMulti) / 2.2); // 2.829035843985983
  const tipToeQuickness = getTalentBonus(character?.starTalents, null, 'TIPTOE_QUICKNESS');
  if (finalSpeed > 2) {
    finalSpeed = Math.floor(100 * finalSpeed) / 100;
  } else if (finalSpeed > 1.75) {
    finalSpeed = Math.min(2, Math.floor(100 * ((finalSpeed) + tipToeQuickness / 100)) / 100)
  } else {
    const saltLickBonus = getSaltLickBonus(saltLicks, 7);
    const groundedMotherboard = playerChips.find((chip) => chip.index === 15)?.baseVal ?? 0;
    finalSpeed = Math.min(1.75, Math.floor(100 * (finalSpeed + (saltLickBonus + groundedMotherboard + tipToeQuickness) / 100)) / 100)
  }
  // 2 < (finalSpeed) ? (s = b.engine.getGameAttribute("DummyNumbersStatManager"),
  return Math.round(finalSpeed * 100);
}


export const getAfkGain = (character, skillName, bribes, arcadeShop, dungeonUpgrades, playerChips, afkGainsTask, guildBonuses, optionsList, shrines) => {
  const afkGainsTaskBonus = afkGainsTask < character?.playerId ? 2 : 0;
  if (skillName !== 'fighting') {
    let guildAfkGains = 0;
    const amarokBonus = getEquippedCardBonus(character?.cards, 'Z2');
    const bunnyBonus = getEquippedCardBonus(character?.cards, 'F7');
    if (guildBonuses.length > 0) {
      guildAfkGains = getGuildBonusBonus(guildBonuses, 7);
    }
    const cardSet = character?.cards?.cardSet?.rawName === 'CardSet7' ? character?.cards?.cardSet?.bonus : 0;
    const conductiveProcessor = playerChips.find((chip) => chip.index === 8)?.baseVal ?? 0;
    const equipmentAfkEffectBonus = character?.equipment?.reduce((res, item) => res + getStatFromEquipment(item, bonuses?.etcBonuses?.[24]), 0);
    const equipmentShrineEffectBonus = character?.equipment?.reduce((res, item) => res + getStatFromEquipment(item, bonuses?.etcBonuses?.[59]), 0);
    const zergRushogen = getPrayerBonusAndCurse(character?.prayers, 'Zerg_Rushogen')?.bonus;
    const ruckSack = getPrayerBonusAndCurse(character?.prayers, 'Ruck_Sack')?.curse;
    const nonFightingGains = 2 + (amarokBonus + bunnyBonus) + (guildAfkGains + cardSet +
      (conductiveProcessor + (equipmentAfkEffectBonus + equipmentShrineEffectBonus + (zergRushogen - ruckSack))));
    const dungeonAfkGains = getDungeonStatBonus(dungeonUpgrades, 'AFK_Gains');
    const arcadeAfkGains = arcadeShop?.[6]?.bonus ?? 0;
    const baseMath = (nonFightingGains) + (arcadeAfkGains + dungeonAfkGains);
    // console.log('nonFightingGains', nonFightingGains);
    // console.log('baseMath', baseMath);
    if ("cooking") {
      const tickTockBonus = getTalentBonus(character?.starTalents, null, 'TICK_TOCK');
      const trappingBonus = getTrappingStuff('TrapMGbonus', 8, optionsList)
      const starSignAfkGains = getStarSignByEffect(character?.starSigns, 'Skill_AFK_Gain');
      const bribeAfkGains = bribes?.[24]?.done ? bribes?.[24]?.value : 0;
      let afkGains = .25 + (tickTockBonus + (baseMath + (trappingBonus + ((starSignAfkGains) + bribeAfkGains)))) / 100;
      if (afkGains < .8) {
        const shrineAfkGains = getShrineBonus(shrines, 8, character?.mapIndex, character.cards, 'Z9');
        afkGains = Math.min(.8, afkGains + shrineAfkGains / 100);
      }
      // console.log('afkGains', 0.43894696265172284 === afkGains);
      return afkGains;
    }
  }
  return 1;
}

const getTrappingStuff = (type, index, optionsList) => {
  if (type === 'TrapMGbonus') {
    const value = optionsList?.[99];
    if (value >= 25 * (index + 1)) {
      const parsed = randomList?.[59]?.split(' ')?.map((num) => parseFloat(num));
      return parsed?.[index];
    }
    return 0;
  }
  return 1;
}


export const allProwess = (character, meals, bubbles) => {
  const prowessBubble = getBubbleBonus(bubbles, 'kazam', 'PROWESESSARY', false);
  const starSignProwess = getStarSignByEffect(character?.starSigns, 'All_Skill_Prowess');
  const skillProwessMeals = getMealsBonusByEffectOrStat(meals, null, 'Sprow')
  return Math.max(0, Math.min(.1, (prowessBubble - 1) / 10 + (.001 * (starSignProwess) + 5e-4 * skillProwessMeals)));
}


export const getAllBaseSkillEff = (character, playerChips, jewels) => {
  const baseAllEffBox = getPostOfficeBonus(character?.postOffice, 'Myriad_Crate', 1);
  const galvanicMotherboard = playerChips.find((chip) => chip.index === 11)?.baseVal ?? 0;
  const superSource = getTalentBonus(character?.starTalents, null, 'SUPERSOURCE');
  const emeraldNavetteBonus = jewels.filter(jewel => jewel.active && jewel.name === 'Emerald_Navette').reduce((sum, jewel) => sum += (jewel.bonus * jewel.multiplier), 0);
  return (baseAllEffBox) + galvanicMotherboard + (superSource + emeraldNavetteBonus);
}

export const getAllEff = (character, meals, playerChips, cards, guildBonuses, charactersLevels) => {
  // family bonus - 19.655172413793103
  const highestLevelHunter = getHighestLevelOfClass(charactersLevels, 'Hunter');
  const familyEffBonus = getFamilyBonusBonus(classFamilyBonuses, 'EFFICIENCY_FOR_ALL_SKILLS', highestLevelHunter);
  const equipmentEffEffectBonus = character?.equipment?.reduce((res, item) => res + getStatFromEquipment(item, bonuses?.etcBonuses?.[48]), 0);
  const mealEff = getMealsBonusByEffectOrStat(meals, null, 'Seff');
  const groundedMotherboard = playerChips.find((chip) => chip.index === 11)?.baseVal ?? 0;
  const chaoticTrollBonus = getEquippedCardBonus(character?.cards, 'Boss4B');
  const cardSet = character?.cards?.cardSet?.rawName === 'CardSet2' ? character?.cards?.cardSet?.bonus : 0;
  const skilledDimwit = getPrayerBonusAndCurse(character?.prayers, 'Skilled_Dimwit')?.bonus;
  const balanceOfProficiency = getPrayerBonusAndCurse(character?.prayers, 'Balance_of_Proficiency')?.curse;
  const maestroTransfusion = getTalentBonusIfActive(character?.activeBuffs, 'MAESTRO_TRANSFUSION');
  let guildSKillEff = 0;
  if (guildBonuses.length > 0) {
    guildSKillEff = getGuildBonusBonus(guildBonuses, 6);
  }
  return (1 + ((familyEffBonus) + equipmentEffEffectBonus) / 100) *
    (1 + (mealEff + groundedMotherboard) / 100)
    * (1 + chaoticTrollBonus / 100)
    * (1 + (guildSKillEff + (cardSet + skilledDimwit)) / 100)
    * Math.max(1 - (maestroTransfusion + balanceOfProficiency) / 100, .01)
}