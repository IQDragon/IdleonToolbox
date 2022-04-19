import styled from 'styled-components'
import VialTooltip from "../Common/Tooltips/VialTooltip";
import { cleanUnderscore, prefix } from "../../Utilities";
import React, { useMemo } from "react";

const Vials = ({ vials }) => {
  return (
    <VialsStyle>
      {vials?.map((vial, index) => {
        const { name, level, mainItem } = vial;
        return mainItem ? <VialTooltip {...vial} key={`${name}${index}`}>
          <div className={`vial-wrapper${level === 0 ? ' missing' : ''}`}>
            {level !== '0' ? <span className={'level'}>{level}</span> : null}
            <img className={'vial-item'} title={cleanUnderscore(mainItem)} src={`${prefix}data/${mainItem}.png`}
                 alt={mainItem}/>
            <img key={`${name}${index}`}
                 onError={(e) => {
                   e.target.src = `${prefix}data/aVials12.png`;
                   e.target.style = 'opacity: 0;'
                 }}
                 src={`${prefix}data/aVials${level === 0 ? '1' : level}.png`}
                 alt={'vial image missing'}/>
          </div>
        </VialTooltip> : null
      })}
    </VialsStyle>
  );
};

const VialsStyle = styled.div`
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 25px;
  gap: 15px;

  .vial-wrapper {
    position: relative;

    .level {
      position: absolute;
      font-weight: bold;
      background: #000000eb;
      font-size: 13px;
      padding: 5px 8px;
      top: 3px;
      right: 5px;
      border-radius: 50%;
    }

    .vial-item {
      position: absolute;
      width: 56px;
      height: 56px;
      bottom: 35px;
      left: 20px;
    }
  }

  .missing {
    filter: grayscale(1);
    opacity: 0.3;
  }
`;

export default Vials;
