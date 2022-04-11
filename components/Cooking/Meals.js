import styled from 'styled-components'
import { cleanUnderscore, kFormatter, numberWithCommas, prefix } from "../../Utilities";
import React, { useMemo } from "react";
import InfoIcon from "@material-ui/icons/Info";
import { notateNumber } from "../../parser/parserUtils";

const Meals = ({ meals, kitchens }) => {
  const totalMealSpeed = useMemo(() => kitchens?.reduce((sum, kitchen) => sum + kitchen.mealSpeed, 0), kitchens);

  const getMealLevelCost = (level) => {
    const baseMath = 10 + (level + Math.pow(level, 2));
    return baseMath * Math.pow(1.2 + 0.05 * level, level);
  }

  const calcTimeToNextLevel = (amountNeeded, cookReq, totalMealSpeed) => {
    return amountNeeded * cookReq / totalMealSpeed;
  }

  const calcTimeTillDiamond = (meal) => {
    const { amount, level, cookReq } = meal;
    if (level >= 11) return 0;
    let amountNeeded = 0;
    for (let i = level; i < 11; i++) {
      amountNeeded += getMealLevelCost(i);
    }
    amountNeeded -= amount;
    if (amountNeeded < 0) return 0;
    return calcTimeToNextLevel(amountNeeded, cookReq, totalMealSpeed);
  }

  return (
    <MealsStyle>
      <div className="meals">
        <div className={'disclaimer'}>
          <InfoIcon style={{ marginRight: 10 }}/>
          Next level is based on all kitchen cooking the same meal
        </div>
        {meals?.map((meal, index) => {
          if (!meal) return null;
          const { name, amount, rawName, effect, level, baseStat, cookReq, multiplier } = meal;
          const levelCost = getMealLevelCost(level);
          const timeTillNextLevel = amount >= levelCost ? '0' : calcTimeToNextLevel(levelCost - amount, cookReq, totalMealSpeed);
          const timeToDiamond = calcTimeTillDiamond(meal);
          return <div className={'meal'} key={`${name}-${index}`}>
            <div className={'images'}>
              <img className={`food${level <= 0 ? ' missing' : ''}`} src={`${prefix}data/${rawName}.png`} alt=""/>
              {level > 0 ? <img className='plate' src={`${prefix}data/CookingPlate${level - 1}.png`} alt=""/> : null}
            </div>
            <div className={'meal-desc'}>
              <div className={'name'}>{cleanUnderscore(name)}(Lv. {level})</div>
              <div
                className={level > 0 ? 'acquired' : ''}>{cleanUnderscore(effect?.replace('{', kFormatter(level * baseStat * multiplier)))}</div>
              <div>
              <span
                className={level === 0 ? '' : amount >= levelCost ? 'ok' : 'missing-mat'}>{numberWithCommas(parseInt(amount))}</span> / {numberWithCommas(parseInt(levelCost))}
              </div>
              {level > 0 ? <div>
                <div>
                  Next Level In: {kFormatter(timeTillNextLevel, 2)} hrs
                </div>
                {timeToDiamond > 0 ? <div>
                  Diamond In: {notateNumber(timeToDiamond, 'Big')} hrs
                </div> : null}

              </div> : null}
            </div>
          </div>
        })}
      </div>
    </MealsStyle>
  );
};

const MealsStyle = styled.div`
  .disclaimer {
    display: flex;
    align-items: center;
    grid-column: 1 / 4;
    justify-content: center;
    font-size: 14px;
  }

  .meals {
    display: grid;
    grid-template-columns: repeat(3, minmax(150px, 1fr));
    grid-gap: 10px;
  }

  .meal {
    display: flex;
    align-items: center;

    .images {
      width: 82px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .meal-desc {
      display: flex;
      flex-direction: column;

      .name {
        font-weight: bold;
      }

      & > div {
        margin: 10px 0;
      }
    }
  }

  .acquired {
    color: #6cdf6c;
  }

  .missing {
    filter: grayscale(1);
  }

  .missing-mat {
    color: #f91d1d;
  }

  .ok {
    color: #6cdf6c;
  }
`;

export default Meals;
