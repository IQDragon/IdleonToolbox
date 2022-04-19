import { getPostOfficeBonus, getStampsBonusByEffect, getStatFromEquipment } from "./parserUtils";
import { bonuses, monsters } from "../data/website-data";
import { allProwess, getAllBaseSkillEff, getAllEff } from "./player";

export const getLadlesPerDay = (character, jewels, stamps, meals, playerChips, cards, guildBonuses, charactersLevels, bubbles) => {
  // cooking Eff = 3304.8828187650356
  // cooking prowess = 0.07561983471074381
  const cookingMonster = monsters.Cooking.Defence;
  const cookingEff = getCookingEff(character, jewels, stamps, meals, playerChips, cards, guildBonuses, charactersLevels);
  // console.log('cookingEff', 3304.8828187650356 === cookingEff);
  return 15 * Math.floor(Math.max(Math.pow(cookingEff / (10 * (cookingMonster)), .25 + getCookingProwess(character, meals, bubbles)), 1))
}

const getCookingEff = (character, jewels, stamps, meals, playerChips, cards, guildBonuses, charactersLevels) => {
  // allEff = 1.403555172413793
  // stamp 2000
  const allBaseSkillEff = getAllBaseSkillEff(character, playerChips, jewels);
  const allEfficiencies = getAllEff(character, meals, playerChips, cards, guildBonuses, charactersLevels);
  // console.log('allEff', 1.403555172413793 === allEfficiencies)
  const stampBonus = getStampsBonusByEffect(stamps, 'Cooking_Efficiency');
  const equipmentCookingEffectBonus = character?.equipment?.reduce((res, item) => res + getStatFromEquipment(item, bonuses?.etcBonuses?.[62]), 0);
  const postOfficeBonus = getPostOfficeBonus(character?.postOffice, 'Chefs_Essentials', 0);
  return allEfficiencies * (250 + (stampBonus + (equipmentCookingEffectBonus + (postOfficeBonus)) + allBaseSkillEff));
}

const getCookingProwess = (character, meals, bubbles) => {
  return allProwess(character, meals, bubbles);
}

