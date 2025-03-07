import styled from 'styled-components';
import { prefix } from "../../Utilities";
import React, { useEffect, useState } from "react";
import TalentTooltip from "../Common/Tooltips/TalentTooltip";

const Talents = ({ talents, starTalents }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [activeTalents, setActiveTalents] = useState();
  const [specialsTab, setSpecialTabs] = useState(1);

  useEffect(() => {
    const tempTalents = activeTab === 3 ? handleStarTalents(starTalents, specialsTab) : talents[activeTab];
    setActiveTalents(tempTalents);
    setSpecialTabs(1);
  }, [activeTab]);

  const switchSpecials = (tab) => {
    setSpecialTabs(tab);
    setActiveTalents(handleStarTalents(starTalents, tab));
  }

  const handleStarTalents = (tab, tabIndex) => {
    const clonedTalents = JSON.parse(JSON.stringify(tab?.orderedTalents));
    let tempTalents = tabIndex === 1 ? clonedTalents?.slice(0, 13) : tabIndex === 2 ? clonedTalents?.slice(13, 26) : clonedTalents?.slice(26, clonedTalents.length);
    // fill for a full talent page
    if (tempTalents.length < 13) {
      tempTalents = new Array(13).fill(1).map((_, ind) => tempTalents[ind] ?? {});
    }
    // insert arrows
    tempTalents?.splice(10, 0, { talentId: 'arrow' });
    tempTalents?.splice(14, 0, { talentId: 'arrow' });
    return {
      ...tab,
      orderedTalents: tempTalents
    };
  }

  const getLevelAndMaxLevel = (level, maxLevel) => {
    if ((!level || level === -1) || (!maxLevel || maxLevel === -1)) {
      return '';
    }
    return `${level}/${maxLevel}`;
  }

  return (
    <StyledTalents active={activeTab}>
      <div className="tabs">
        {Object.keys(talents)?.map((index) => {
          const tabName = talents?.[index]?.name;
          const tabIndex = parseInt(index);
          return <img
            className={`${activeTab === tabIndex ? 'active' : ''} ${tabName.includes('Special') ? 'star' : ''}`}
            key={talents?.[index]?.name + '' + index}
            onClick={() => setActiveTab(tabIndex)}
            src={`${prefix}data/${talents?.[index]?.name.replace(' ', '_')}_Tab.png`} alt=""/>
        })}
        <img
          className={`${activeTab === 3 ? 'active' : ''} star`}
          onClick={() => setActiveTab(3)}
          src={`${prefix}data/Star_Talents_Tab.png`} alt=""/>
      </div>
      <div className="talents-wrapper">
        {activeTalents?.orderedTalents?.map((talentDetails, index) => {
          const { talentId, level, maxLevel } = talentDetails;
          if (index >= 15) return null;
          return (talentId === 'Blank' || talentId === '84' || talentId === 'arrow') ?
            <div key={talentId + '' + index} className={`blank ${(index === 10 || index === 14) && 'arrow'}`}>
              {(index !== 10 && index !== 14) && <img src={`${prefix}data/UISkillIconLocke.png`} alt=""/>}
              {index === 10 && specialsTab > 1 ?
                <img onClick={() => switchSpecials(specialsTab - 1)} className={'arrow'}
                     src={`${prefix}data/UIAnvilArrowsG2.png`}
                     alt=""/> : null}
              {(index === 14 || index === 26) && specialsTab < 3 ?
                <img onClick={() => switchSpecials(specialsTab + 1)} className={'arrow'}
                     src={`${prefix}data/UIAnvilArrowsG1.png`}
                     alt=""/> : null}
            </div> :
            <TalentTooltip key={talentId + '' + index} {...talentDetails}>
              <div className={'talent-wrapper'}>
              <span
                className={'talent-level'}>{getLevelAndMaxLevel(level, maxLevel)}</span>
                {talentId ? <img src={`${prefix}data/UISkillIcon${talentId}.png`} alt=""/> :
                  <img src={`${prefix}data/UISkillIconLocke.png`} alt=""/>}
              </div>
            </TalentTooltip>;
        })}
      </div>
      {activeTab === 3 ? <div className="star-talents-arrows">
        <span className={'arrow-text'}>Specials {specialsTab}</span>
      </div> : null}
    </StyledTalents>
  );
};

const StyledTalents = styled.div`
  background: url(${() => `${prefix}data/UIskills.png`}) no-repeat top;
  text-align: center;
  height: 320px;

  .tabs {
    position: relative;
    display: grid;
    margin-top: 10px;
    grid-template-columns: repeat(auto-fill, 56px);
    grid-template-rows: 42px;
    column-gap: 2px;
    justify-content: center;

    .active {
      filter: brightness(1);
    }

    .star {
      position: absolute;
      right: 0;
    }

    > img {
      cursor: pointer;
      filter: brightness(0.4);

      &:last-child {
        justify-self: flex-end;
      }
    }
  }

  .star-talents-arrows {
    height: 80%;
  }

  .arrow {
    cursor: pointer;
    align-self: center;
  }


  .talents-wrapper {
    position: relative;
    margin-top: 25px;
    display: grid;
    grid-template-columns: repeat(5, 56px);
    column-gap: 10px;
    row-gap: 10px;
    justify-content: center;
    margin-bottom: 10px;

    .talent-wrapper {
      position: relative;

      .talent-level {
        position: absolute;
        font-weight: bold;
        background: #000000eb;
        font-size: 10px;
        padding: 0 5px;
        text-align: center;
        right: 0;
        bottom: 0;
      }
    }
  }
`;

export default Talents;
