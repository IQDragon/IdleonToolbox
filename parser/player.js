// speed
// food with speed effect - "MoveSpdBoosts"


// _customBlock_PlayerSpeed = function () {
//   return 13 * G._customBlock_PlayerSpeedBonus();
// }

import {
  getEquippedCardBonus,
  getPostOfficeBonus,
  getSaltLickBonus,
  getStampsBonusByEffect,
  getStarSignBonus,
  getStarSignByEffect,
  getStatFromEquipment,
  getStatueBonus,
  getTalentBonus,
  getTalentBonusIfActive
} from "./parserUtils";
import { bonuses } from "../data/website-data";

export const getPlayerFoodBonus = (character, statues, stamps, stampMultiplier) => {
  const postOfficeBonus = getPostOfficeBonus(character?.postOffice, 'Carepack_From_Mum', 2)
  const statuePower = getStatueBonus(statues, 'StatueG4', character?.talents);
  const equipmentFoodEffectBonus = character?.equipment?.reduce((res, item) => res + getStatFromEquipment(item, bonuses?.etcBonuses?.[9]), 0);
  const stampBonus = getStampsBonusByEffect(stamps, 'Boost_Food_Effect', 0, stampMultiplier)
  const starSignBonus = getStarSignBonus(character?.starSigns, 'Mount_Eaterest', 'All_Food_Effect');
  const cardBonus = getEquippedCardBonus(character?.cards, 'Y5');
  const cardSet = character?.cards?.cardSet?.rawName === 'CardSet1' ? character?.cards?.cardSet?.bonus : 0;
  const talentBonus = getTalentBonus(character?.starTalents, null, 'FROTHY_MALK');
  return 1 + (postOfficeBonus + (statuePower +
    (equipmentFoodEffectBonus + (stampBonus + ((starSignBonus) +
      (cardBonus + (cardSet + talentBonus))))))) / 100;
}

export const getPlayerSpeedBonus = (speedBonusFromPotions, character, playerChips, statues, saltLicks, stamps, stampMultiplier) => {
  let finalSpeed = 0;
  const featherWeight = getTalentBonus(character?.talents, 0, 'FEATHERWEIGHT');
  const featherFlight = getTalentBonus(character?.talents, 0, 'FEATHER_FLIGHT');
  const stampBonus = getStampsBonusByEffect(stamps, 'Base_Move_Speed', 0, stampMultiplier)
  const strafe = getTalentBonusIfActive(character?.activeBuffs, 'STRAFE');
  let baseMath = speedBonusFromPotions + featherWeight + stampBonus + strafe;
  let agiMulti = 1;
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