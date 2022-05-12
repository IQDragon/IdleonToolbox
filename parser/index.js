import {
  calcCardBonus,
  calculateAfkTime,
  calculateCardSetStars,
  calculateDeathNote,
  calculateItemTotalAmount,
  calculateLeaderboard,
  calculateWeirdObolIndex,
  createActiveBuffs,
  createCogstructionData,
  createItemsWithUpgrades,
  createSerializedData,
  createTalentPage,
  getAchievementStatus,
  getActiveBubbleBonus,
  getAllCapsBonus,
  getAllSkillExp,
  getAnvilExp,
  getAnvilSpeed,
  getAnvilUpgradeCostItem,
  getBubbleBonus,
  getChargeRate,
  getCoinCost,
  getDungeonStatBonus,
  getEquippedCardBonus,
  getFamilyBonusBonus,
  getGoldenFoodBonus,
  getGoldenFoodMulti,
  getGuildBonusBonus,
  getHighestLevelOfClass,
  getInventory,
  getMaxCharge,
  getMealsBonusByEffectOrStat,
  getMealsFromSpiceValues,
  getMonsterMatCost,
  getPlayerCapacity,
  getPostOfficeBonus,
  getPrayerBonusAndCurse,
  getSaltLickBonus,
  getShrineBonus,
  getSmithingExpMulti,
  getSpiceUpgradeCost,
  getStampBonus,
  getStampsBonusByEffect,
  getStarSignBonus,
  getStatFromEquipment,
  getStatueBonus,
  getTalentBonus,
  getTalentBonusIfActive,
  getTotalCardBonusById,
  getTotalCoinCost,
  getTotalMonsterMatCost,
  getTotalStatFromEquipment,
  getVialsBonusByEffect,
  isArenaBonusActive,
  keysMap,
  mapAccountQuests,
  shopMapping,
  skillIndexMap,
  starSignsIndicesMap,
  talentPagesMap,
  tryToParse,
} from "./parserUtils";
import {
  achievements,
  anvilProducts,
  arcadeShop,
  arenaBonuses,
  bonuses,
  bribes,
  cardSets,
  carryBags,
  cauldrons,
  chips,
  classes,
  classFamilyBonuses,
  cogKeyMap,
  constellations,
  cookingMenu,
  dungeonStats,
  flagsReqs,
  guildBonuses,
  jewels,
  labBonuses,
  mapNames,
  mapPortals,
  monsters,
  petUpgrades,
  postOffice,
  prayers,
  randomList,
  refinery,
  saltLicks,
  shops,
  shrines,
  sigils,
  starSignByIndexMap,
  starSigns,
  tasks,
  vials
} from "../data/website-data";
import { growth } from "../components/General/calculationHelper";
import { round } from "../Utilities";
import { calcPlayerLineWidth, checkConnection, checkPlayerConnection, getPrismPlayerConnection } from "./lab";
import { getAfkGain, getPlayerFoodBonus, getPlayerSpeedBonus } from "./player";
import { getLadlesPerDay } from "./cooking";

const { cards, items, obols, stamps, statues } = require("../data/website-data");
const { calculateStars, createObolsWithUpgrades, filteredLootyItems } = require("./parserUtils");

const parseIdleonData = (idleonData, charNames, guildData, serverVars) => {
  try {
    let characterNames, characters;
    // PlayerDATABASE is from Steam Data Extractor
    if (idleonData?.PlayerDATABASE) {
      characterNames = Object.entries(idleonData?.PlayerDATABASE);
      characters = characterNames.map(([charName, charData], index) => ({
        name: charName,
        playerId: index,
        ...(Object.entries(charData)?.reduce((res, [key, value]) => ({ ...res, [`${key}_${index}`]: value }), {}))
      }));
    } else {
      const c = charNames?.length > 0 ? charNames : ['1', '2', '3', '4', '5', '6', '7', '8'];
      const { serializedData, chars } = createSerializedData(idleonData, c);
      idleonData = serializedData;
      characters = chars;
    }

    let account = createAccountData(idleonData, characters, serverVars);
    account.guild = createGuildData(tryToParse(guildData));
    let charactersData = createCharactersData(idleonData, characters, account);
    let skills = charactersData?.map(({ name, skillsInfo }) => ({ name, skillsInfo }));
    let leaderboard = calculateLeaderboard(skills);
    charactersData = charactersData.map((character) => ({ ...character, skillsInfo: leaderboard[character?.name] }));

    const quests = mapAccountQuests(charactersData);
    charactersData = charactersData.map(({ quests, ...rest }) => rest);
    const deathNote = calculateDeathNote(charactersData);
    account = { ...account, quests, deathNote };
    return { account, characters: charactersData, lastUpdated: new Date(), version: '1.1.7' }
  } catch (err) {
    console.error('An error has occurred while parsing idleon data', err);
    return {};
  }
}

const createGuildData = (guildData) => {
  if (!guildData) return {
    guildIconIndex: '',
    guildName: '',
    guildBonuses: []
  }

  const updatedGuildBonuses = guildBonuses?.map((guildBonus, index) => ({
    ...guildBonus,
    level: guildData?.stats?.[0]?.[index] ?? 0
  }))
  return {
    guildIconIndex: guildData?.i ?? '',
    guildName: guildData?.n ?? '',
    guildBonuses: updatedGuildBonuses
  }
}

const createAccountData = (idleonData, characters, serverVars) => {
  let account = {};
  const cardsObject = idleonData?.Cards?.[0];
  account.TimeAway = idleonData?.TimeAway;
  account.gemItemsPurchased = idleonData?.GemItemsPurchased;
  account.dungeonUpgrades = idleonData?.DungUpg?.[5]?.map((level, index) => ({ ...dungeonStats[index], level }));

  account.cards = Object.keys(cardsObject)?.reduce(
    (res, card) => {
      const cardDetails = cards?.[card];
      if (!cardDetails) return res;
      return {
        ...res,
        [cardDetails?.displayName]: {
          ...cardDetails,
          amount: cardsObject?.[card],
          stars: calculateStars(cardDetails?.perTier, cardsObject?.[card]),
        }
      }
    }, {});

  const obolsMapping = idleonData?.ObolEquippedOrder?.[1]?.map((obol, index) => ({
    displayName: items?.[obol],
    rawName: obol,
    ...(obols?.family[index] ? obols?.family[index] : {})
  }));

  account.obols = createObolsWithUpgrades(obolsMapping, idleonData?.ObolEquippedMap?.[1]);

  const lootyObject = idleonData?.Cards?.[1];
  const allItems = JSON.parse(JSON.stringify(items)); // Deep clone
  lootyObject.forEach((lootyItemName) => {
    if (allItems?.[lootyItemName]?.displayName) {
      delete allItems?.[lootyItemName];
    }
  });

  account.missingLootyItems = Object.keys(allItems).reduce((res, key) => ((!filteredLootyItems[key] && !key.includes('DungWeapon')) ? [
    ...res,
    {
      name: allItems?.[key]?.displayName,
      rawName: key,
    }] : res), []);

  const stampsMapping = { 0: "combat", 1: "skills", 2: "misc" };
  const stampsObject = idleonData?.StampLevel?.reduce((result, item, index) => ({
    ...result,
    [stampsMapping?.[index]]: Object.keys(item).reduce((res, key) => (key !== 'length' ? [
        ...res,
        { level: parseFloat(item[key]) }
      ]
      : res), []),
  }), {});

  account.stamps = {
    combat: stampsObject.combat.map((item, index) => ({ ...stamps['combat'][index], ...item })),
    skills: stampsObject.skills.map((item, index) => ({ ...stamps['skills'][index], ...item })),
    misc: stampsObject.misc.map((item, index) => ({ ...stamps['misc'][index], ...item })),
  };


  const goldStatuesObject = idleonData?.StatueG || [];
  const goldStatues = goldStatuesObject.reduce((res, item, index) => (item === 1 ? {
    ...res,
    [index]: true
  } : res), {});
  //
  const firstCharacterStatues = characters?.[0]?.['StatueLevels_0'];
  account.statues = Object.keys(goldStatues).map((statueIndex) => ({
    rawName: `StatueG${parseInt(statueIndex) + 1}`,
    level: firstCharacterStatues[statueIndex][0],
    ...(statues?.[statueIndex] || {})
  }));

  const bankMoney = parseInt(idleonData?.MoneyBANK);
  const playersMoney = characters?.reduce((res, char, index) => res + parseInt(char?.[`Money_${index}`]), 0);
  const money = bankMoney + playersMoney;
  account.money = String(money).split(/(?=(?:..)*$)/);

  const inventoryArr = idleonData?.ChestOrder;
  const inventoryQuantityArr = idleonData?.ChestQuantity;
  account.inventory = getInventory(inventoryArr, inventoryQuantityArr, 'storage');


  const shrinesArray = idleonData?.ShrineInfo;
  const startingIndex = 18;
  account.shrines = shrinesArray.reduce((res, item, localIndex) => {
    const index = startingIndex + localIndex;
    const [mapId, , , shrineLevel] = item;
    const { shrineName, desc, baseBonus, bonusPerLevel } = shrines[index];
    return mapId !== 0 && shrineName !== 'Unknown' ? [...res, {
      mapId,
      shrineLevel,
      name: shrineName,
      rawName: `ConTowerB${index}`,
      bonus: baseBonus + (shrineLevel - 1) * bonusPerLevel,
      desc
    }] : res;
  }, []);

  const colosseumIndexMapping = { 1: true, 2: true, 3: true, 4: true };
  const colosseumHighscoresArray = idleonData?.FamilyValuesMap?.ColosseumHighscores;
  account.colosseumHighscores = colosseumHighscoresArray
    .filter((_, index) => colosseumIndexMapping[index])
    .map((score) => parseFloat(score));

  const minigameIndexMapping = { 0: 'chopping', 1: 'fishing', 2: 'catching', 3: 'mining' };
  const minigameHighscoresArray = idleonData?.FamilyValuesMap?.MinigameHiscores;
  account.minigameHighscores = minigameHighscoresArray
    .filter((_, index) => minigameIndexMapping[index])
    .map((score, index) => ({ minigame: minigameIndexMapping[index], score }));

  const shopStockArray = idleonData?.['ShopStock'];
  account.shopStock = shopStockArray?.reduce((res, shopObject, shopIndex) => {
    const realShopStock = shopObject;
    // delete realShopStock.length;
    const shopName = shopMapping?.[shopIndex]?.name;
    const mapped = Object.values(realShopStock)?.reduce((res, item, itemIndex) => {
      const isIncluded = shopMapping?.[shopIndex]?.included?.[itemIndex];
      const amount = parseInt(item) || 0;
      return amount > 0 && isIncluded ? [...res, { amount: item, ...shops[shopName][itemIndex] }] : res;
    }, [])
    return [...res, mapped]
  }, []);

  // 0-3 cauldrons
  // 4 - vials
  account.alchemy = {};
  const cauldronsIndexMapping = { 0: "power", 1: "quicc", 2: "high-iq", 3: 'kazam' };
  const cauldronsTextMapping = { 0: "O", 1: "G", 2: "P", 3: 'Y' };
  const cauldronsInfoArray = idleonData?.CauldronInfo;
  account.alchemy.bubbles = cauldronsInfoArray?.reduce((res, array, index) => (index <= 3 ? {
    ...res,
    [cauldronsIndexMapping?.[index]]: Object.keys(array)?.reduce((res, key, bubbleIndex) => (
      key !== 'length' ? [
        ...res,
        {
          level: parseInt(array?.[key]) || 0,
          index: bubbleIndex,
          rawName: `aUpgrades${cauldronsTextMapping[index]}${bubbleIndex}`,
          ...cauldrons[cauldronsIndexMapping?.[index]][key],
        }] : res), [])
  } : res), {});


  const vialsObject = idleonData?.CauldronInfo?.[4];
  account.alchemy.vials = Object.keys(vialsObject).reduce((res, key, index) => {
    const vial = vials?.[index];
    return key !== 'length' ? [...res, {
      level: parseInt(vialsObject?.[key]) || 0,
      ...vial
    }] : res;
  }, []).filter(({ name }) => name);

  // first 16 elements belong to cauldrons' levels
  // 4 * 4
  const rawCauldronsLevelsArray = idleonData?.CauldronStats ? idleonData?.CauldronStats : idleonData?.CauldronInfo?.[8]?.reduce((res, array) => [...res, ...array], []);
  const cauldronsLevels = rawCauldronsLevelsArray.slice(0, 16);
  const cauldronsLevelsMapping = { 0: "power", 4: "quicc", 8: "high-iq", 12: 'kazam' };
  let cauldronsObject = {};
  const chunk = 4;
  for (let i = 0, j = cauldronsLevels.length; i < j; i += chunk) {
    const [speed, luck, cost, extra] = cauldronsLevels.slice(i, i + chunk);
    cauldronsObject[cauldronsLevelsMapping[i]] = {
      speed: parseInt(speed?.[1]) || 0,
      luck: parseInt(luck?.[1]) || 0,
      cost: parseInt(cost?.[1]) || 0,
      extra: parseInt(extra?.[1]) || 0
    };
  }
  account.alchemy.cauldrons = cauldronsObject;

  const bribesArray = idleonData?.BribeStatus;
  account.bribes = bribesArray?.reduce((res, bribeStatus, index) => {
    return bribeStatus !== -1 ? [...res, {
      done: bribeStatus === 1,
      ...(bribes?.[index] || [])
    }] : res;
  }, []);

  const constellationsArray = idleonData?.StarSignProg;
  account.constellations = constellationsArray?.reduce((res, constellation, index) => {
    const constellationInfo = constellations[index];
    const [completedChars, done] = constellation;
    const mapIndex = constellationInfo?.mapIndex;
    return mapIndex !== null ? [...res, {
      ...constellationInfo,
      location: mapNames[mapIndex],
      completedChars,
      done: !!done
    }] : res;
  }, []);

  const starSignsObject = idleonData?.StarSignsUnlocked;
  const starSignsMapping = starSigns?.map((starSign) => {
    const { starName } = starSign;
    return {
      ...starSign,
      starName: `${starSignsIndicesMap?.[starName]} - ${starName}`,
      unlocked: !!starSignsObject?.[starName]
    }
  }, []);
  const sortAlphaNum = (a, b) => a.starName.localeCompare(b.starName, 'en', { numeric: true });
  const sortedSigns = starSignsMapping.sort(sortAlphaNum);
  const lastItem = sortedSigns.pop();
  sortedSigns.splice(21, 0, lastItem);

  account.starSigns = sortedSigns;

  // Achievements
  const achievementsRegistry = idleonData?.AchieveReg;
  const steamAchievements = idleonData?.SteamAchieve;
  account.achievements = achievements.map((achievement, index) => {
    const { steamIndex } = achievement;
    const completed = steamIndex ? steamAchievements?.[steamIndex] === -1 : achievementsRegistry?.[index] === -1;
    const currentQuantity = steamIndex ? steamAchievements?.[steamIndex] : achievementsRegistry?.[index];
    return { ...achievement, completed, ...(currentQuantity >= 0 ? { currentQuantity } : {}) }
  });

  // Refinery
  // 1 - inventory, 3 - redox salt
  // [refined, rank, unknown, on/off, auto-refined %]
  const refineryObject = idleonData?.Refinery;
  const refineryStorage = idleonData?.Refinery?.[1]?.reduce((res, saltName, index) => saltName !== 'Blank' ? [...res, {
    rawName: saltName,
    name: items[saltName]?.displayName,
    amount: idleonData?.Refinery?.[2]?.[index],
    owner: 'refinery'
  }] : res, []);

  account.inventory = [...account.inventory, ...refineryStorage];
  const powerCap = randomList[18]?.split(' ');
  const refinerySaltTaskLevel = idleonData?.Tasks?.[2]?.[2]?.[6];
  const salts = refineryObject?.slice(3, 3 + idleonData?.Refinery?.[0]?.[0]);
  const saltsArray = salts?.reduce((res, salt, index) => {
    const name = `Refinery${index + 1}`
    const [refined, rank, , active, autoRefinePercentage] = salt;
    const { saltName, cost } = refinery?.[name];
    const componentsWithTotalAmount = cost?.map((item) => {
      let amount = calculateItemTotalAmount(account?.inventory, item?.name, true);
      return {
        ...item,
        totalAmount: amount
      }
    })
    return [
      ...res,
      {
        saltName,
        cost: componentsWithTotalAmount,
        rawName: name,
        powerCap: parseFloat(powerCap?.[rank]),
        refined,
        rank,
        active,
        autoRefinePercentage
      }
    ];
  }, []);

  account.refinery = {
    salts: saltsArray,
    refinerySaltTaskLevel,
    timePastCombustion: refineryObject[0][1],
    timePastSynthesis: refineryObject[0][2]
  }

  account.bundles = Object.entries(idleonData?.BundlesReceived).reduce((res, [bundleName, owned]) => owned ? [...res, {
    name: bundleName,
    owned: !!owned
  }] : res, []).sort((a, b) => a?.name?.match(/_[a-z]/i)?.[0].localeCompare(b?.name?.match(/_[a-z]/i)?.[0]))

  account.saltLicks = idleonData?.SaltLick?.map((level, index) => {
    const bonus = saltLicks[index];
    const totalAmount = calculateItemTotalAmount(account?.inventory, bonus?.name, true);
    return {
      ...bonus,
      totalAmount,
      level
    }
  }).filter(({ level }) => level > 0);

  account.flurboShop = idleonData?.DungUpg

  const forgeRowItems = 3;
  let forge = [];
  for (let row = 0; row < idleonData?.ForgeItemOrder?.length; row += 3) {
    const [ore, barrel, bar] = idleonData?.ForgeItemOrder?.slice(
      row,
      row + forgeRowItems
    );
    const [oreQuantity, barrelQuantity, barQuantity] = idleonData?.ForgeItemQuantity.slice(
      row,
      row + forgeRowItems
    );
    forge = [...forge, {
      ore: { ...items?.[ore], rawName: ore, quantity: oreQuantity },
      barrel: { ...items?.[barrel], rawName: barrel, quantity: barrelQuantity },
      bar: { ...items?.[bar], rawName: bar, quantity: barQuantity }
    }
    ]
  }

  account.forge = forge;

  // Construction
  const flagsUnlocked = idleonData?.FlagUnlock;
  const flagsPlaced = idleonData?.FlagsPlaced;
  const cogsOrder = idleonData?.CogOrder;
  const cogstruction = createCogstructionData(idleonData?.CogMap, cogsOrder);
  const cogsMap = idleonData?.CogMap?.map((cogObject) => {
    return Object.entries(cogObject)?.reduce((res, [key, value]) => cogKeyMap?.[key] && cogKeyMap?.[key] !== '_' ? {
      ...res,
      [key]: { name: cogKeyMap?.[key], value }
    } : { ...res, [key]: value }, {});
  });
  account.flags = flagsUnlocked?.reduce((res, flagSlot, index) => {
    return [...res, {
      currentAmount: flagSlot === -11 ? flagsReqs?.[index] : parseFloat(flagSlot),
      requiredAmount: flagsReqs?.[index],
      flagPlaced: flagsPlaced?.includes(index),
      cog: {
        name: cogsOrder?.[index],
        stats: cogsMap?.[index]
      }
    }];
  }, []);
  account.cogstruction = cogstruction;

  const arenaWave = idleonData?.OptionsListAccount?.[89];
  const waveReqs = randomList?.[53];

  account.trappingStuff = idleonData?.OptionsListAccount[99];

  account.meals = idleonData?.Meals?.[0]?.map((mealLevel, index) => {
    if (index > 48) return null;
    return {
      level: mealLevel,
      amount: idleonData?.Meals?.[2]?.[index],
      ...(cookingMenu?.[index] || {})
    }
  }).filter(meal => meal)

  const spicesToClaim = idleonData?.Territory?.reduce((res, territory) => {
    const [progress, amount, , spiceName] = territory;
    if (amount <= 0) return res;
    return [
      ...res,
      {
        progress,
        amount,
        spiceName
      }
    ]
  }, []);

  const spicesAvailable = idleonData?.Meals?.[3]?.filter((spiceAmount) => spiceAmount > 0).map((amount, index) => ({
    amount,
    rawName: `CookingSpice${index}`
  }));

  account.spices = {
    spicesToClaim,
    spicesAvailable
  }

  // breeding [2] - upgrades
  const petUpgradesList = idleonData?.Breeding?.[2]?.map((upgradeLevel, index) => {
    return {
      ...(petUpgrades[index] || []),
      level: upgradeLevel
    }
  })

  account.breeding = {
    maxArenaLevel: idleonData?.OptionsListAccount?.[89],
    petUpgrades: petUpgradesList,
    arenaBonuses
  };

  if (idleonData?.Lab) {
    const [cords] = idleonData?.Lab || [];
    const [chipRepo] = idleonData?.Lab?.splice(15) || [];
    const [jewelsRaw] = idleonData?.Lab?.splice(14) || [];
    const playerChipsRaw = idleonData?.Lab?.slice(1, 10) || [];
    let playerCordsChunk = 2, playersCords = [];
    for (let i = 0; i < cords?.length; i += playerCordsChunk) {
      const [x, y] = cords?.slice(i, i + playerCordsChunk);
      playersCords = [...playersCords, { x, y }];
    }
    let jewelsList = jewelsRaw?.map((jewel, index) => {
      return {
        ...(jewels?.[index] || {}),
        acquired: jewel === 1,
        rawName: `ConsoleJwl${index}`
      }
    }).filter(({ name }) => name);

    const playersChips = playerChipsRaw?.map((pChips) => {
      return pChips.map((chip) => {
        if (chips?.[chip]) return { ...chips?.[chip], chipIndex: chip }
        return chip;
      });
    });

    const chipList = JSON.parse(JSON.stringify(chips));

    chipRepo?.map((chipCount, chipIndex) => {
      if (chipIndex < chips.length) {
        const playerUsedCount = playersChips.flatMap(chips => chips).filter(chip => chip !== -1).reduce((sum, chip) => sum + (chip.index === chipList[chipIndex].index ? 1 : 0), 0);
        chipList[chipIndex].amount = chipCount - playerUsedCount;
      }
    });

    let playersInTubes = [...characters].filter((character, index) => character?.[`AFKtarget_${index}`] === "Laboratory")
      .map(character => ({
        ...character,
        x: playersCords?.[character?.playerId]?.x,
        y: playersCords?.[character?.playerId]?.y
      }));

    const calculatedTaskPixelWidth = (idleonData?.Tasks?.[2]?.[3]?.[4] ?? 0) * tasks?.[3]?.[4]?.bonusPerLevel;

    let foundNewConnection = true;
    let counter = 0;
    let labBonusesList = JSON.parse(JSON.stringify(labBonuses));
    let connectedPlayers = [];
    while (foundNewConnection) {
      foundNewConnection = false;
      counter += 1;
      playersInTubes = calcPlayerLineWidth(playersInTubes, labBonusesList, jewelsList, playersChips, account.meals, account.cards, account.gemItemsPurchased, arenaWave, waveReqs);

      if (playersInTubes.length > 0 && connectedPlayers.length === 0) {
        const prismPlayer = getPrismPlayerConnection(playersInTubes);
        if (prismPlayer) {
          connectedPlayers.push(prismPlayer);
        }
      }

      for (let i = 0; i < playersInTubes.length; i++) {
        let newPlayer, newPlayerConnection = false;
        if (i < connectedPlayers.length) {
          newPlayer = checkPlayerConnection(playersInTubes, connectedPlayers, connectedPlayers?.[i]);
          if (newPlayer && !connectedPlayers.find((player) => player.playerId === newPlayer.playerId)) {
            newPlayerConnection = true;
            connectedPlayers = [...connectedPlayers, newPlayer];
          }
          const jewelMultiplier = (labBonusesList.find(bonus => bonus.index === 8)?.active ?? false) ? 1.5 : 1;
          const viralRangeBonus = (labBonusesList.find(bonus => bonus.index === 13)?.active ?? false) ? 50 : 0;
          const connectionRangeBonus = jewelsList.filter(jewel => jewel.active && jewel.name === 'Pyrite_Rhombol').reduce((sum, jewel) => sum += (jewel.bonus * jewelMultiplier), 0);
          let labBonuses = checkConnection(labBonusesList, connectionRangeBonus, viralRangeBonus, calculatedTaskPixelWidth, connectedPlayers?.[i], false);
          labBonusesList = labBonuses.resArr;
          let jewels = checkConnection(jewelsList, connectionRangeBonus, viralRangeBonus, calculatedTaskPixelWidth, connectedPlayers?.[i], true);
          jewelsList = jewels.resArr;

          if (jewelsList?.[16]?.acquired && !jewelsList?.[16].active) {
            jewelsList[16].active = true;
            playersInTubes = calcPlayerLineWidth(playersInTubes, labBonusesList, jewelsList, playersChips, account.meals, account.cards, account.gemItemsPurchased, arenaWave, waveReqs);
            jewelsList[16].active = false;
          }
          labBonuses = checkConnection(labBonusesList, connectionRangeBonus, viralRangeBonus, calculatedTaskPixelWidth, connectedPlayers?.[i], false);
          labBonusesList = labBonuses.resArr;
          jewels = checkConnection(jewelsList, connectionRangeBonus, viralRangeBonus, calculatedTaskPixelWidth, connectedPlayers?.[i], true);
          jewelsList = jewels.resArr;
          foundNewConnection = !foundNewConnection ? newPlayerConnection || labBonuses?.newConnection || jewels?.newConnection : foundNewConnection;
        }
      }
    }
    const jewelMultiplier = (labBonusesList.find(bonus => bonus.index === 8)?.active ?? false) ? 1.5 : 1;
    if (jewelMultiplier > 1) {
      jewelsList = jewelsList.map((jewel) => ({ ...jewel, multiplier: jewelMultiplier }));
    }
    const diamondMeals = account?.meals?.reduce((res, { level }) => level >= 11 ? res + 1 : res, 0);
    const stampMultiplier = labBonusesList?.find((bonus) => bonus.name === 'Certified_Stamp_Book')?.active ? 2 : 0;
    if (stampMultiplier > 0) {
      account.stamps = Object.entries(account.stamps).reduce((res, [stampCategory, stamps]) => {
        let updatedStamps = stamps;
        if (stampCategory !== 'misc') {
          updatedStamps = stamps?.map((stamp) => ({ ...stamp, multiplier: stampMultiplier }));
        }
        return { ...res, [stampCategory]: updatedStamps };
      }, {});
    }
    const vialMultiplier = labBonusesList.find(bonus => bonus.name === "My_1st_Chemistry_Set")?.active ? 2 : 1;
    if (vialMultiplier > 1) {
      account.alchemy.vials = account?.alchemy?.vials?.map((vial) => ({ ...vial, multiplier: vialMultiplier }));
    }
    const mealMultiplier = jewelsList.filter(jewel => jewel.active && jewel.name === 'Black_Diamond_Rhinestone').reduce((sum, jewel) => sum += (jewel.bonus * jewelMultiplier), 0);
    account.meals = account?.meals?.map((meal) => ({ ...meal, multiplier: (1 + mealMultiplier / 100) }));
    const globalKitchenUpgrades = idleonData?.Cooking?.reduce((sum, table) => {
      const [speedLv, fireLv, luckLv] = table.slice(6, 9);
      return sum + speedLv + fireLv + luckLv
    }, 0);
    account.kitchens = idleonData?.Cooking?.map((table, kitchenIndex) => {
      const [status, foodIndex, spice1, spice2, spice3, spice4, speedLv, fireLv, luckLv, , currentProgress] = table;
      if (status <= 0) return null;

      // Multipliers
      // X2 from stamps (Certified stamp book) - Cooked_Meal_Stamp
      // X2 from vials (My 1st chemistry set) - LONG_ISLAND_TEA
      // jewel multiplier X1.5 (Spelunker Obol)

      // jewel meal multiplier X1.24 (* jewel multiplier) (Black diamond rhinestone)
      // jewel cooking multiplier X1 per 25 kitchen levels (* jewel multiplier) (Emerald Pyramite)
      // jewel cooking speed - X2.25 (Amethyst_Rhinestone)
      // all purple jewels active - X2.25
      // diamond chef - cooking speed per diamond meal
      // cabbage - cooking speed per 10 kitchen levels
      // Cooking Speed meals - Egg, Corndog, Soda
      // kitchen upgrade from gemshop X2
      // troll card

      const totalKitchenUpgrades = speedLv + fireLv + luckLv;
      const cookingSpeedJewelMultiplier = jewelsList.filter(jewel => jewel.active && jewel.name === 'Emerald_Pyramite').reduce((sum, jewel) => sum += (jewel.bonus * jewelMultiplier), 0)
      const cookingSpeedFromJewel = Math.floor(globalKitchenUpgrades / 25) * (cookingSpeedJewelMultiplier || 0);

      const cookingSpeedStamps = getStampsBonusByEffect(account?.stamps, 'Meal_Cooking_Spd');
      const cookingSpeedVials = getVialsBonusByEffect(account?.alchemy?.vials, 'Meal_Cooking_Speed');
      const cookingSpeedMeals = getMealsBonusByEffectOrStat(account?.meals, 'Meal_Cooking_Speed', null, mealMultiplier);
      const diamondChef = getBubbleBonus(account?.alchemy?.bubbles, 'kazam', 'DIAMOND_CHEF', false);
      const kitchenEffMeals = getMealsBonusByEffectOrStat(account?.meals, null, 'KitchenEff', mealMultiplier);
      const trollCard = account?.cards?.Troll; // Kitchen Eff card
      const allPurpleActive = jewelsList?.slice(0, 3)?.every(({ active }) => active) ? 2 : 1;
      const jewel = jewelsList?.find((jewel) => jewel.name === 'Amethyst_Rhinestone');
      let jewelBonus = jewel?.active ? jewel.bonus * jewelMultiplier : 1;
      const isRichelin = kitchenIndex < account?.gemItemsPurchased?.find((value, index) => index === 120);

      const mealSpeedBonusMath = (1 + (cookingSpeedStamps + Math.max(0, cookingSpeedFromJewel)) / 100) * (1 + cookingSpeedMeals / 100) * Math.max(1, (jewelBonus * allPurpleActive));
      const mealSpeedCardImpact = 1 + Math.min(6 * ((trollCard?.stars ?? 0) + 1)
        + (20 * getAchievementStatus(account?.achievements, 225) +
          10 * getAchievementStatus(account?.achievements, 224)), 100) / 100
      const mealSpeed = 10 *
        (1 + (isRichelin ? 2 : 0)) *
        Math.max(1, Math.pow(diamondChef, diamondMeals)) *
        (1 + speedLv / 10) *
        (1 + cookingSpeedVials / 100) *
        mealSpeedBonusMath *
        mealSpeedCardImpact *
        (1 + (kitchenEffMeals * Math.floor((totalKitchenUpgrades) / 10)) / 100);

      // Fire Speed
      const cardImpact = 1 + Math.min(6 * ((trollCard?.stars ?? 0) + 1), 50) / 100;
      const recipeSpeedVials = getVialsBonusByEffect(account?.alchemy?.vials, 'Recipe_Cooking_Speed');
      const recipeSpeedStamps = getStampsBonusByEffect(account?.stamps, 'New_Recipe_Spd');
      const recipeSpeedMeals = getMealsBonusByEffectOrStat(account?.meals, null, 'Rcook');
      const fireSpeed = 5 *
        (1 + (isRichelin ? 1 : 0)) *
        Math.max(1, Math.pow(diamondChef, diamondMeals)) *
        (1 + fireLv / 10) *
        (1 + recipeSpeedVials / 100) *
        (1 + recipeSpeedStamps / 100) *
        (1 + recipeSpeedMeals / 100) *
        cardImpact *
        (1 + kitchenEffMeals * Math.floor(totalKitchenUpgrades / 10) / 100);

      // New Recipe Luck
      const mealLuck = 1 + Math.pow(5 * luckLv, 0.85) / 100;

      // Spices Cost
      const kitchenCostVials = getVialsBonusByEffect(account?.alchemy?.vials, 'Kitchen_Upgrading_Cost');
      const kitchenCostMeals = getMealsBonusByEffectOrStat(account?.meals, null, 'KitchC');
      const arenaBonusActive = isArenaBonusActive(arenaWave, waveReqs, 7);
      const baseMath = 1 /
        ((1 + kitchenCostVials / 100) *
          (1 + kitchenCostMeals / 100) *
          (1 + (isRichelin ? 40 : 0) / 100) *
          (1 + (0.5 * (arenaBonusActive ? 1 : 0))));

      const speedCost = getSpiceUpgradeCost(baseMath, speedLv);
      const fireCost = getSpiceUpgradeCost(baseMath, fireLv);
      const luckCost = getSpiceUpgradeCost(baseMath, luckLv);

      const spices = [spice1, spice2, spice3, spice4].filter((spice) => spice !== -1);
      const spicesValues = spices.map((spiceValue) => parseInt(randomList[49]?.split(' ')[spiceValue]));
      const possibleMeals = getMealsFromSpiceValues(randomList[49], spicesValues).filter((foodIndex) => foodIndex > 0).map((foodIndex) => ({
        index: foodIndex,
        rawName: cookingMenu?.[foodIndex]?.rawName,
        cookReq: cookingMenu?.[foodIndex]?.cookReq
      }));

      return {
        status,
        ...(cookingMenu?.[foodIndex] || {}),
        luckLv,
        fireLv,
        speedLv,
        currentProgress,
        mealSpeed,
        mealLuck,
        fireSpeed,
        speedCost,
        fireCost,
        luckCost,
        ...(status === 3 ? { spices } : {}),
        ...(status === 3 ? { possibleMeals } : {})
      }
    }).filter((kitchen) => kitchen);

    playersCords = playersCords?.map((player, index) => {
      const p = playersInTubes?.find(({ playerId }) => playerId === index);
      return {
        ...player,
        lineWidth: p?.lineWidth || player?.lineWidth || 0
      }
    })
    account.lab = {
      playersCords,
      playersChips,
      connectedPlayers,
      jewels: jewelsList,
      chips: chipList,
      labBonuses: labBonusesList
    };
  } else {
    account.lab = {}
  }


  account.prayers = idleonData?.PrayersUnlocked?.reduce((res, prayerLevel, prayerIndex) => {
    const reqItem = prayers?.[prayerIndex]?.soul;
    const totalAmount = calculateItemTotalAmount(account?.inventory, items?.[reqItem]?.displayName, true);
    return prayerIndex < 19 ? [...res, {
      ...prayers?.[prayerIndex],
      prayerIndex,
      totalAmount,
      level: prayerLevel
    }] : res
  }, []);

  const arcaneUpgradesRaw = idleonData?.ArcadeUpg;
  const balls = idleonData?.OptionsListAccount?.[74];
  const goldBalls = idleonData?.OptionsListAccount?.[75];
  const arcadeShopList = arcadeShop?.map((upgrade, index) => {
    const { x1, x2, func } = upgrade;
    const level = arcaneUpgradesRaw?.[index];
    return {
      ...upgrade,
      level,
      active: serverVars?.ArcadeBonuses?.includes(index),
      bonus: growth(func, level, x1, x2, false),
      iconName: `PachiShopICON${index}`
    }
  })
  account.arcade = {
    shop: arcadeShopList,
    balls,
    goldBalls
  }
  const sigilsRaw = idleonData?.CauldronP2W[4];
  let sigilsList = [];
  for (let i = 0, j = sigilsRaw.length; i < j; i += 2) {
    const [progress, unlocked] = sigilsRaw.slice(i, i + 2);
    const sigilData = sigils?.[i / 2];
    if (sigilData) {
      sigilsList = [
        ...sigilsList,
        {
          ...(sigilData),
          unlocked,
          progress,
          bonus: unlocked === 1 ? sigilData?.boostBonus : unlocked === 0 ? sigilData?.unlockBonus : 0
        }
      ]
    }
  }

  account.sigils = sigilsList;

  account.worldTeleports = idleonData?.CurrenciesOwned['WorldTeleports'];
  account.keys = idleonData?.CurrenciesOwned['KeysAll'].reduce((res, keyAmount, index) => keyAmount > 0 ? [...res, { amount: keyAmount, ...keysMap[index] }] : res, []);
  account.colosseumTickets = idleonData?.CurrenciesOwned['ColosseumTickets'];
  account.obolFragments = idleonData?.CurrenciesOwned['ObolFragments'];
  account.silverPens = idleonData?.CurrenciesOwned['SilverPens'];
  account.goldPens = idleonData?.CurrenciesOwned['GoldPens'];
  account.gems = idleonData?.['GemsOwned'];
  account.deliveryBoxComplete = idleonData?.CurrenciesOwned['DeliveryBoxComplete'];
  account.deliveryBoxStreak = idleonData?.CurrenciesOwned['DeliveryBoxStreak'];
  account.deliveryBoxMisc = idleonData?.CurrenciesOwned['DeliveryBoxMisc'];
  account.highestDamage = idleonData?.Tasks?.[0]?.[1]?.[0];
  account.postOfficeOrders = idleonData?.Tasks?.[0]?.[1]?.[5];
  account.monstersKilled = idleonData?.Tasks?.[0]?.[0]?.[0];
  account.refinedSalts = idleonData?.Tasks?.[0]?.[2]?.[0];
  account.afkGainsTask = idleonData?.Tasks?.[2]?.[1]?.[2];
  return account;
}

const createCharactersData = (idleonData, characters, account) => {
  const charactersLevels = characters?.map((char, charIndex) => {
    const personalValuesMap = char?.[`PersonalValuesMap_${charIndex}`];
    return { level: personalValuesMap?.StatList?.[4], class: classes?.[char?.[`CharacterClass_${charIndex}`]] }
  });
  return characters?.map((char, charIndex) => {
    const character = {};
    const personalValuesMap = char?.[`PersonalValuesMap_${charIndex}`];
    if (!personalValuesMap) return;
    character.name = char?.name;
    character.class = classes?.[char?.[`CharacterClass_${charIndex}`]];
    character.afkTime = calculateAfkTime(char?.[`PlayerAwayTime_${charIndex}`], idleonData?.TimeAway?.GlobalTime);
    character.afkTarget = monsters?.[char?.[`AFKtarget_${charIndex}`]]?.Name;
    const currentMapIndex = char?.[`CurrentMap_${charIndex}`];
    character.mapIndex = currentMapIndex;
    character.currentMap = mapNames?.[currentMapIndex];
    character.money = String(parseInt(char?.[`Money_${charIndex}`])).split(/(?=(?:..)*$)/);
    const statMap = { 0: 'strength', 1: 'agility', 2: 'wisdom', 3: 'luck', 4: 'level' };
    character.stats = personalValuesMap?.StatList?.reduce((res, statValue, index) => ({
      ...res,
      [statMap[index]]: statValue
    }), {});
    character.level = character.stats.level;


    // inventory bags used
    const rawInvBagsUsed = char?.[`InvBagsUsed_${charIndex}`]
    const bags = Object.keys(rawInvBagsUsed);
    character.invBagsUsed = bags?.map((bag) => ({
      id: bag,
      name: items[`InvBag${parseInt(bag) < 100 ? parseInt(bag) + 1 : bag}`]?.displayName,
      rawName: `InvBag${parseInt(bag) < 100 ? parseInt(bag) + 1 : bag}`
    })).filter(bag => bag.name);
    const carryCapacityObject = char?.[`MaxCarryCap_${charIndex}`];
    character.carryCapBags = Object.keys(carryCapacityObject).map((bagName) => (carryBags?.[bagName]?.[carryCapacityObject[bagName]])).filter(bag => bag)


    // equipment indices (0 = armor, 1 = tools, 2 = food)
    const equipmentMapping = { 0: "armor", 1: "tools", 2: "food" };
    const equippableNames = char?.[
      `EquipmentOrder_${charIndex}`
      ]?.reduce(
      (result, item, index) => ({
        ...result,
        [equipmentMapping?.[index]]: item,
      }), {});
    const equipapbleAmount = char[`EquipmentQuantity_${charIndex}`]?.reduce((result, item, index) => ({
      ...result,
      [equipmentMapping?.[index]]: item,
    }), {});

    const equipmentStoneData = char[`EquipmentMap_${charIndex}`]?.[0];
    character.equipment = createItemsWithUpgrades(equippableNames.armor, equipmentStoneData, character.name);
    const toolsStoneData = char[`EquipmentMap_${charIndex}`]?.[1];
    character.tools = createItemsWithUpgrades(equippableNames.tools, toolsStoneData, character.name);
    character.food = Array.from(Object.values(equippableNames.food)).reduce((res, item, index) =>
      item
        ? [...res, {
          name: items?.[item]?.displayName,
          rawName: item,
          owner: character.name,
          amount: parseInt(equipapbleAmount.food[index] || equipapbleAmount.food[index]),
          ...(items?.[item] || {})
        }] : res, []);


    const inventoryArr = char[`InventoryOrder_${charIndex}`];
    const inventoryQuantityArr = char[`ItemQuantity_${charIndex}`];
    character.inventory = getInventory(inventoryArr, inventoryQuantityArr, character.name);


    // star signs
    const starSignsObject = personalValuesMap?.StarSign;
    character.starSigns = starSignsObject
      .split(",")
      .map((starSign) => {
        if (!starSign || starSign === '_') return null;
        const silkrodeNanochipBonus = account?.lab?.playersChips?.[charIndex].find((chip) => chip.index === 15);
        const updatedBonuses = starSignByIndexMap?.[starSign]?.bonuses?.map((star) => ({
          ...star,
          bonus: star?.bonus * (silkrodeNanochipBonus ? 2 : 1)
        }));
        return { ...starSignByIndexMap?.[starSign], bonuses: updatedBonuses };
      })
      .filter(item => item);

    // equipped bubbles
    const cauldronBubbles = idleonData?.CauldronBubbles;
    const bigBubblesIndices = { '_': 'power', 'a': 'quicc', 'b': 'high-iq', 'c': 'kazam' };
    character.equippedBubbles = cauldronBubbles?.[charIndex].reduce(
      (res, bubbleIndStr) => {
        if (!bubbleIndStr) return res;
        const cauldronIndex = bigBubblesIndices[bubbleIndStr[0]];
        const bubbleIndex = bubbleIndStr.substring(1);
        return [...res, account?.alchemy?.bubbles?.[cauldronIndex][bubbleIndex]];
      }, []);

    const levelsRaw = char?.[`Exp0_${charIndex}`];
    const levelsReqRaw = char?.[`ExpReq0_${charIndex}`];
    const skillsInfoObject = char?.[`Lv0_${charIndex}`];

    character.skillsInfo = skillsInfoObject.reduce(
      (res, level, index) =>
        index < 13 ? {
          ...res,
          [skillIndexMap[index]?.name]: {
            level: level !== -1 ? level : 0,
            exp: parseFloat(levelsRaw[index]),
            expReq: parseFloat(levelsReqRaw[index]),
            icon: skillIndexMap[index]?.icon
          },
        } : res, {});

    const talentsObject = char?.[`SkillLevels_${charIndex}`];
    const maxTalentsObject = char?.[`SkillLevelsMAX_${charIndex}`];
    const pages = talentPagesMap?.[character?.class];
    const {
      flat: flatTalents,
      talents
    } = createTalentPage(character?.class, pages, talentsObject, maxTalentsObject);
    character.talents = talents;
    character.flatTalents = flatTalents;
    const {
      flat: flatStarTalents,
      talents: orderedStarTalents
    } = createTalentPage(character?.class, ["Special Talent 1", "Special Talent 2", "Special Talent 3"], talentsObject, maxTalentsObject, true);
    character.starTalents = orderedStarTalents;
    character.flatStarTalents = flatStarTalents;
    const activeBuffs = char?.[`BuffsActive_${charIndex}`];
    character.activeBuffs = createActiveBuffs(activeBuffs, [...flatTalents, ...flatStarTalents]);

    const prayersArray = char?.[`Prayers_${charIndex}`];
    const PrayersUnlocked = idleonData?.PrayersUnlocked;
    character.prayers = prayersArray.reduce((res, prayerIndex) => (prayerIndex >= 0 ? [...res, {
      ...prayers?.[prayerIndex],
      prayerIndex,
      level: PrayersUnlocked?.[prayerIndex]
    }] : res), []);

    const cardSet = char?.[`CSetEq_${charIndex}`];
    const equippedCards = char?.[`CardEquip_${charIndex}`]
      .map((card) => ({
        cardName: cards?.[card]?.displayName,
        stars: account?.cards?.[cards?.[card]?.displayName]?.stars,
        bonus: calcCardBonus(card),
        ...cards?.[card]
      }))
      .filter((_, ind) => ind < 8); //cardEquipMap
    const cardsSetObject = cardSets[Object.keys(cardSet)?.[0]] || {};
    character.cards = {
      cardSet: {
        ...cardsSetObject,
        bonus: Object.values(cardSet)?.[0],
        stars: calculateCardSetStars(cardsSetObject, Object.values(cardSet)?.[0])
      },
      equippedCards,
    };

    // crafting material in production
    // AnvilPA - production
    // AnvilPAstats - stats
    // AnvilPAselect - selected

    let anvilProduction = char?.[`AnvilPA_${charIndex}`];
    let [availablePoints,
      pointsFromCoins,
      pointsFromMats,
      xpPoints,
      speedPoints,
      capPoints] = char?.[`AnvilPAstats_${charIndex}`];

    let anvilSelected = char?.[`AnvilPAselect_${charIndex}`];
    if (!Array.isArray(anvilSelected)) {
      anvilSelected = [anvilSelected];
    }

    const production = anvilProduction?.reduce((res, item, index) => {
      const [currentAmount, currentXP, currentProgress, totalProduced] = item;
      return [
        ...res,
        {
          currentAmount,
          currentXP,
          currentProgress: parseFloat(currentProgress),
          totalProduced,
          ...(anvilProducts[index] || {}),
          hammers: anvilSelected?.filter((item) => item === index)?.length
        }
      ]
    }, []);

    const stats = {
      availablePoints,
      pointsFromCoins,
      pointsFromMats,
      xpPoints,
      speedPoints,
      capPoints
    };

    const anvilnomicsBubbleBonus = getBubbleBonus(account?.alchemy?.bubbles, 'quicc', 'ANVILNOMICS');
    const isArcher = talentPagesMap[character.class].includes('Archer');
    const archerMultiBubble = isArcher ? getBubbleBonus(account?.alchemy?.bubbles, 'quicc', 'ARCHER_OR_BUST') : 1;
    const anvilCostReduction = anvilnomicsBubbleBonus * archerMultiBubble;
    const anvilCost = getAnvilUpgradeCostItem(pointsFromMats);
    stats.anvilCost = {
      ...anvilCost,
      totalMats: getTotalMonsterMatCost(anvilCost, pointsFromMats, anvilCostReduction),
      nextMatUpgrade: getMonsterMatCost(pointsFromMats, anvilCostReduction),
      totalCoins: getTotalCoinCost(pointsFromCoins, anvilCostReduction),
      nextCoinUpgrade: getCoinCost(pointsFromCoins, anvilCostReduction, true),
    };

    const worldTour = account?.lab?.labBonuses?.find((bonus) => bonus.name === 'Shrine_World_Tour')?.active
    account.shrines = account?.shrines?.map((shrine) => ({ ...shrine, worldTour }));
    // ANVIL EXP
    const sirSavvyStarSign = getStarSignBonus(character?.starSigns, 'Sir_Savvy', 'Skill_Exp');
    const cEfauntCardBonus = getEquippedCardBonus(character?.cards, 'Z7');

    const goldenHam = character?.food?.find(({ name }) => name === 'Golden_Ham');
    const highestLevelShaman = getHighestLevelOfClass(charactersLevels, 'Shaman');
    const familyBonus = getFamilyBonusBonus(classFamilyBonuses, 'GOLDEN_FOODS', highestLevelShaman);
    const equipmentGoldFoodBonus = character?.equipment?.reduce((res, item) => res + getStatFromEquipment(item, bonuses?.etcBonuses?.[8]), 0);
    const hungryForGoldTalentBonus = getTalentBonus(character?.talents, 1, 'HAUNGRY_FOR_GOLD');
    const goldenAppleStamp = getStampBonus(account?.stamps, 'misc', 'StampC7', 0);
    const goldenFoodAchievement = getAchievementStatus(account?.achievements, 37);
    const goldenGoodMulti = getGoldenFoodMulti(
      familyBonus,
      equipmentGoldFoodBonus,
      hungryForGoldTalentBonus,
      goldenAppleStamp,
      goldenFoodAchievement
    );
    const goldenFoodBonus = getGoldenFoodBonus(goldenGoodMulti, goldenHam?.Amount, goldenHam?.amount);

    const skillExpCardSetBonus = character?.cards?.cardSet?.rawName === 'CardSet3' ? character?.cards?.cardSet?.bonus : 0;
    const summereadingShrineBonus = getShrineBonus(account?.shrines, 5, char?.[`CurrentMap_${charIndex}`], character.cards, 'Z9');
    const ehexpeeStatueBonus = getStatueBonus(account?.statues, 'StatueG18', character?.talents);
    const unendingEnergyBonus = getPrayerBonusAndCurse(character?.prayers, 'Unending_Energy')?.bonus
    const skilledDimwitCurse = getPrayerBonusAndCurse(character?.prayers, 'Skilled_Dimwit')?.curse;
    const theRoyalSamplerCurse = getPrayerBonusAndCurse(character?.prayers, 'The_Royal_Sampler')?.curse;
    const equipmentBonus = character?.equipment?.reduce((res, item) => res + getStatFromEquipment(item, bonuses.etcBonuses?.[27]), 0);
    const maestroTransfusionTalentBonus = getTalentBonusIfActive(character?.activeBuffs, 'MAESTRO_TRANSFUSION');
    const duneSoulLickBonus = getSaltLickBonus(account?.saltLicks, 3);
    const dungeonSkillExpBonus = getDungeonStatBonus(account?.dungeonUpgrades, 'Class_Exp');
    const allSkillExp = getAllSkillExp(
      sirSavvyStarSign,
      cEfauntCardBonus,
      goldenFoodBonus,
      skillExpCardSetBonus,
      summereadingShrineBonus,
      ehexpeeStatueBonus,
      unendingEnergyBonus,
      skilledDimwitCurse,
      theRoyalSamplerCurse,
      equipmentBonus,
      maestroTransfusionTalentBonus,
      duneSoulLickBonus,
      dungeonSkillExpBonus,
    );

    const focusedSoulTalentBonus = getTalentBonus(character?.talents, 0, 'FOCUSED_SOUL');
    const happyDudeTalentBonus = getTalentBonus(character?.talents, 0, 'HAPPY_DUDE');
    const smithingCards = getTotalCardBonusById(character?.cards?.equippedCards, 49);
    const blackSmithBoxBonus0 = getPostOfficeBonus(character?.postOffice, 'Blacksmith_Box', 0);
    const leftHandOfLearningTalentBonus = getTalentBonus(character?.talents, 2, 'LEFT_HAND_OF_LEARNING');
    const smithingExpMulti = getSmithingExpMulti(
      focusedSoulTalentBonus,
      happyDudeTalentBonus,
      smithingCards,
      blackSmithBoxBonus0,
      allSkillExp,
      leftHandOfLearningTalentBonus);
    const anvilExp = getAnvilExp(xpPoints, smithingExpMulti);
    stats.anvilExp = 100 * (anvilExp - 1);

    // if (charIndex === 6) {
    //   console.log('hello')
    // }

    // ANVIL SPEED MATH;
    const anvilZoomerBonus = getStampBonus(account?.stamps, 'skills', 'StampB3', character?.skillsInfo?.smithing?.level);
    const blackSmithBoxBonus1 = getPostOfficeBonus(character?.postOffice, 'Blacksmith_Box', 1);
    const hammerHammerBonus = getActiveBubbleBonus(character?.equippedBubbles, 'aUpgradesG2');
    const anvilStatueBonus = getStatueBonus(account?.statues, 'StatueG12', character?.talents);
    const bobBuildGuyStarSign = getStarSignBonus(character?.starSigns, 'Bob_Build_Guy', 'Speed_in_Town');
    const talentTownSpeedBonus = getTalentBonus(character?.talents, 0, 'BROKEN_TIME');
    stats.anvilSpeed = 3600 * getAnvilSpeed(character?.stats.agility, speedPoints, anvilZoomerBonus, blackSmithBoxBonus1, hammerHammerBonus, anvilStatueBonus, bobBuildGuyStarSign, talentTownSpeedBonus);

    let guildCarryBonus = 0;
    let zergPrayerBonus = getPrayerBonusAndCurse(character?.prayers, 'Zerg_Rushogen')?.curse;
    let ruckSackPrayerBonus = getPrayerBonusAndCurse(character?.prayers, 'Ruck_Sack')?.bonus;

    if (account?.guild?.guildBonuses.length > 0) {
      guildCarryBonus = getGuildBonusBonus(account?.guild?.guildBonuses, 2);
    }
    const telekineticStorageBonus = getTalentBonus(character?.starTalents, null, 'TELEKINETIC_STORAGE');
    const carryCapShrineBonus = getShrineBonus(account?.shrines, 3, char?.[`CurrentMap_${charIndex}`], character.cards, 'Z9');
    const allCapacity = getAllCapsBonus(guildCarryBonus, telekineticStorageBonus, carryCapShrineBonus, zergPrayerBonus, ruckSackPrayerBonus);

    const mattyBagStampBonus = getStampBonus(account?.stamps, 'skills', 'StampB8', character?.skillsInfo?.smithing?.level);
    const masonJarStampBonus = getStampBonus(account?.stamps, 'misc', 'StampC2', character?.skillsInfo?.smithing?.level);
    const gemShopCarryBonus = account?.gemItemsPurchased?.find((value, index) => index === 58) ?? 0;
    const extraBagsTalentBonus = getTalentBonus(character?.talents, 1, 'EXTRA_BAGS');
    const starSignExtraCap = getStarSignBonus(character?.starSigns, 'Pack_Mule', 'Carry_Cap');

    const charMaterialBag = character?.carryCapBags?.find(({ Class }) => Class === 'bCraft');
    const playerCapacity = getPlayerCapacity(charMaterialBag, {
      allCapacity,
      mattyBagStampBonus,
      masonJarStampBonus,
      gemShopCarryBonus,
      extraBagsTalentBonus,
      starSignExtraCap
    })

    stats.anvilCapacity = Math.round(playerCapacity * (2 + 0.1 * capPoints));
    const selectedProducts = anvilSelected
      .sort((a, b) => a - b)
      .map((item) => anvilProducts[item]);

    character.anvil = {
      guild: account?.guild?.guildBonuses.length > 0,
      stats,
      production,
      selected: selectedProducts,
    };


    const cookingAfkGains = getAfkGain(character, 'cooking', account?.bribes,
      account?.arcade?.shop,
      account?.dungeonUpgrades,
      account?.lab?.playersChips?.[charIndex],
      account?.afkGainsTask,
      account?.guild?.guildBonuses,
      account?.trappingStuff,
      account?.shrines
    );
    const ladlesPerDay = getLadlesPerDay(character,
      account?.lab?.jewels,
      account?.stamps,
      account?.meals,
      account?.lab?.playersChips?.[charIndex],
      account?.cards,
      account?.guild?.guildBonuses,
      charactersLevels,
      account?.alchemy?.bubbles
    );

    character.ladlesPerDay = Math.round(ladlesPerDay * cookingAfkGains);

    // printer
    const fieldsPrint = idleonData?.Printer;
    const printData = fieldsPrint.slice(5, fieldsPrint.length); // REMOVE 5 '0' ELEMENTS
    // There are 14 items per character
    // Every 2 items represent an item and it's value in the printer.
    // The first 5 pairs represent the stored samples in the printer.
    // The last 2 pairs represent the samples in production.
    const chunk = 14;
    const relevantPrinterData = printData.slice(
      charIndex * chunk,
      charIndex * chunk + chunk
    );
    character.printer = relevantPrinterData.reduce(
      (result, printItem, sampleIndex, array) => {
        if (sampleIndex % 2 === 0) {
          const sample = array
            .slice(sampleIndex, sampleIndex + 2)
            .map((item, sampleIndex) => sampleIndex === 0 ? item : item);
          if (sampleIndex < 10) {
            result.stored.push({ item: sample[0], value: sample[1] });
          } else {
            result.selected.push({ item: sample[0], value: sample[1] });
          }
        }
        return result;
      },
      { stored: [], selected: [] }
    );


    const obolObject = char?.[`ObolEquippedOrder_${charIndex}`];
    const obolsMap = obolObject.map((obol, index) => ({
      index: calculateWeirdObolIndex(index),
      displayName: items?.[obol]?.displayName,
      rawName: obol,
      ...(obols?.character[index] ? obols?.character[index] : {})
    }));
    const obolUpgradesObject = char?.[`ObolEquippedMap_${charIndex}`];
    const sortedObols = obolsMap.sort((a, b) => a.index - b.index)
    character.obols = createObolsWithUpgrades(sortedObols, obolUpgradesObject);

    // 0 - current worship charge rate
    const playerStuffArray = char?.[`PlayerStuff_${charIndex}`];
    const worshipLevel = character?.skillsInfo?.worship?.level;
    // const prayDayStamp = account?.stamps?.skills?.find(({ rawName }) => rawName === 'StampB35');
    // const prayDayBonus = growth(prayDayStamp?.func, prayDayStamp?.level, prayDayStamp?.x1, prayDayStamp?.x2);
    const prayDayBonus = getStampBonus(account?.stamps, 'misc', 'StampB35', 0);
    const gospelLeaderBubble = account?.alchemy?.bubbles?.['high-iq']?.find(({ rawName }) => rawName === 'aUpgradesP12');
    let gospelBonus = growth(gospelLeaderBubble?.func, gospelLeaderBubble?.level, gospelLeaderBubble?.x1, gospelLeaderBubble?.x2) ?? 0;
    const multiBubble = account?.alchemy?.bubbles?.['high-iq']?.find(({ rawName }) => rawName === 'aUpgradesP1');
    const multiBonus = growth(multiBubble?.func, multiBubble?.level, multiBubble?.x1, multiBubble?.x2) ?? 0;
    const popeBubble = account?.alchemy?.bubbles?.['high-iq']?.find(({ rawName }) => rawName === 'aUpgradesP11');
    const popeBonus = character?.equippedBubbles?.find(({ bubbleName }) => bubbleName === 'CALL_ME_POPE') ? growth(popeBubble?.func, popeBubble?.level, popeBubble?.x1, popeBubble?.x2) : 0;
    const maxChargeCard = character?.cards?.equippedCards?.find(({ cardIndex }) => cardIndex === 'F10');
    const maxChargeCardBonus = calcCardBonus(maxChargeCard);
    let nearbyOutletBonus = 0;
    if (pages?.includes('Mage')) {
      gospelBonus = gospelBonus * multiBonus;
      const nearbyOutletTalent = character?.talents?.[2]?.orderedTalents?.find(({ name }) => name === 'NEARBY_OUTLET');
      nearbyOutletBonus = growth(nearbyOutletTalent?.func, nearbyOutletTalent?.level, nearbyOutletTalent?.x1, nearbyOutletTalent?.x2);
    }
    const chargeCard = character?.cards?.equippedCards?.find(({ cardIndex }) => cardIndex === 'F11');
    const chargeCardBonus = calcCardBonus(chargeCard);
    // const flowinStamp = account?.stamps?.skills?.find(({ rawName }) => rawName === 'StampB34');
    // const flowinStampBonus = growth(flowinStamp?.func, flowinStamp?.level, flowinStamp?.x1, flowinStamp?.x2);
    const flowinStampBonus = getStampBonus(account?.stamps, 'misc', 'StampB34', 0);
    const hasSkull = character?.tools?.[5]?.rawName !== 'Blank';
    const maxCharge = hasSkull ? getMaxCharge(character?.tools?.[5], maxChargeCardBonus, prayDayBonus, gospelBonus, worshipLevel, popeBonus) : 0;
    const chargeRate = hasSkull ? getChargeRate(character?.tools?.[5], worshipLevel, popeBonus, chargeCardBonus, flowinStampBonus, nearbyOutletBonus) : 0;

    character.worship = {
      maxCharge: round(maxCharge),
      chargeRate: round(chargeRate),
      currentCharge: round(parseInt(playerStuffArray[0]))
    }

    // 3 - critter name
    const trapsArray = char[`PldTraps_${charIndex}`];
    character.traps = trapsArray?.reduce((res, critterInfo) => {
      const [critterId, , timeElapsed, critterName, , , trapTime] = critterInfo;
      if (critterId === -1 && critterId === '-1') return res;
      const timeLeft = trapTime - timeElapsed;
      return critterName ? [...res, {
        name: items[critterName]?.displayName,
        rawName: critterName,
        timeLeft: new Date().getTime() + (timeLeft * 1000)
      }] : res;
    }, []);

    const quests = char?.[`QuestComplete_${charIndex}`];
    character.quests = Object.keys(quests).reduce((res, key) => {
      let [npcName, questIndex] = key.split(/([0-9]+)/);
      if (key.includes('Fishpaste')) {
        npcName = 'Fishpaste97';
      }
      return { ...res, [npcName]: { ...(res?.[npcName] || {}), [questIndex]: quests[key] } }
    }, {});

    const postOfficeObject = char?.[`PostOfficeInfo_${charIndex}`];
    let totalPointsSpent = 0;
    const boxes = postOffice?.map((box, index) => {
      const points = postOfficeObject?.[index]?.[0] ?? postOfficeObject?.[index];
      totalPointsSpent += points;
      return { ...box, level: points || 0 }
    });

    character.postOffice = {
      boxes,
      unspentPoints: (account?.deliveryBoxComplete + account?.deliveryBoxStreak + account?.deliveryBoxMisc - totalPointsSpent) || 0
    }

    const speedFromPots = getTotalStatFromEquipment(character?.food, 'Effect', 'MoveSpdBoosts');
    const foodBonus = getPlayerFoodBonus(character, account?.statues, account?.stamps);
    const speedBonusFromPotions = speedFromPots * foodBonus;
    character.stats.playerSpeed = getPlayerSpeedBonus(speedBonusFromPotions, character, account?.lab?.playersChips?.[charIndex], account?.statues, account?.saltLicks, account?.stamps);

    const omegaNanochipBonus = account?.lab?.playersChips?.[charIndex].find((chip) => chip.index === 20);
    const omegaMotherboardChipBonus = account?.lab?.playersChips?.[charIndex].find((chip) => chip.index === 21);
    character.cards.equippedCards = character?.cards?.equippedCards?.map((card, index) => ((index === 0 && omegaNanochipBonus) || (index === 7 && omegaMotherboardChipBonus)) ? ({
      ...card,
      chipBoost: 2
    }) : card);

    const crystalShrineBonus = getShrineBonus(account?.shrines, 6, char?.[`CurrentMap_${charIndex}`], character.cards, 'Z9');
    const crystallinStampBonus = getStampBonus(account?.stamps, 'misc', 'StampC3', 0);
    const poopCard = character?.cards?.equippedCards?.find(({ cardIndex }) => cardIndex === 'A10');
    const poopCardBonus = poopCard ? calcCardBonus(poopCard) : 0;
    const demonGenie = character?.cards?.equippedCards?.find(({ cardIndex }) => cardIndex === 'G4');
    const demonGenieBonus = demonGenie ? calcCardBonus(demonGenie) : 0;
    const crystals4DaysTalent = character?.starTalents?.orderedTalents?.find(({ name }) => name === 'CRYSTALS_4_DAYYS');
    const crystals4DaysBonus = crystals4DaysTalent ? growth(crystals4DaysTalent?.funcX, crystals4DaysTalent?.level, crystals4DaysTalent?.x1, crystals4DaysTalent?.x2, false) : 0;
    const cmonOutCrystalsTalent = character?.talents?.[1]?.orderedTalents?.find(({ name }) => name === 'CMON_OUT_CRYSTALS');
    const cmonOutCrystalsBonus = cmonOutCrystalsTalent ? growth(cmonOutCrystalsTalent?.funcX, cmonOutCrystalsTalent?.level, cmonOutCrystalsTalent?.x1, cmonOutCrystalsTalent?.x2, false) : 0;
    const nonPredatoryBox = character?.postOffice?.boxes?.find(({ name }) => name === 'Non_Predatory_Loot_Box');
    const nonPredatoryBoxCrystalUpgrade = nonPredatoryBox?.upgrades?.[2]
    const nonPredatoryBoxBonus = growth(nonPredatoryBoxCrystalUpgrade?.func, nonPredatoryBox?.level > 0 ? nonPredatoryBox?.level - 100 : 0, nonPredatoryBoxCrystalUpgrade?.x1, nonPredatoryBoxCrystalUpgrade?.x2, false);

    character.crystalSpawnChance = 0.0005 * (1 + cmonOutCrystalsBonus / 100) * (1 + (nonPredatoryBoxBonus + crystalShrineBonus) / 100) * (1 + crystals4DaysBonus / 100)
      * (1 + crystallinStampBonus / 100) * (1 + (poopCardBonus + demonGenieBonus) / 100);

    const kills = char?.[`KillsLeft2Advance_${charIndex}`];
    character.kills = kills?.reduce((res, map, index) => [...res, parseFloat(mapPortals?.[index]?.[0]) - parseFloat(map?.[0])], []);
    character.nextPortal = {
      goal: mapPortals?.[currentMapIndex]?.[0] ?? 0,
      current: parseFloat(mapPortals?.[currentMapIndex]?.[0]) - parseFloat(kills?.[currentMapIndex]) ?? 0
    };

    character.cooldowns = char?.[`AttackCooldowns_${charIndex}`];
    return character;
  });
}

export default parseIdleonData;