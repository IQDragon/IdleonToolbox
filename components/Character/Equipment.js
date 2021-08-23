import React, { useState } from 'react';
import styled from "styled-components";
import { cleanUnderscore, kFormatter, prefix } from "../../Utilities";

const Equipment = ({ equipment, tools, foods }) => {
  const [items, setItems] = useState(equipment);
  const [active, setActive] = useState('tab1');

  return (
    <EquipmentStyle active={active}>
      <div className={'tabs'}>
        {equipment ?
          <img onClick={() => {
            setItems(equipment);
            setActive('tab1')
          }} className={`tab1 ${active === 'tab1' && 'active'}`} src={`${prefix}data/UIinventoryEquipTabs1.png`}
               alt=""/> : null}
        {tools ?
          <img onClick={() => {
            {
              setItems(tools);
              setActive('tab2')
            }
          }} className={`tab2 ${active === 'tab2' && 'active'}`} src={`${prefix}data/UIinventoryEquipTabs2.png`}
               alt=""/> : null}
        {foods ?
          <img onClick={() => {
            setItems(foods);
            setActive('tab3')
          }} className={`tab3 ${active === 'tab3' && 'active'}`} src={`${prefix}data/UIinventoryEquipTabs3.png`}
               alt=""/> : null}
      </div>
      {items?.map(({ name: equipName, rawName, amount }, equipIndex) => {
        if (equipIndex > 7) return null;
        return (
          <Box aria-label={equipName} role="img" title={cleanUnderscore(equipName)} key={equipName + equipIndex}
               img={rawName}>{amount > 0 ? <span>{kFormatter(amount)}</span> : null}</Box>
        );
      })}
    </EquipmentStyle>
  );
};

const EquipmentStyle = styled.div`
  position: relative;
  display: grid;
  justify-content: center;
  grid-template-columns: repeat(2, max-content);
  grid-template-rows: repeat(1, 60px) repeat(4, 85px);
  background: url(${() => `${prefix}data/UIinventoryEquips.png`}) no-repeat center;
  background-size: contain;
  padding-top: 15px;
  grid-row-gap: 2px;
  grid-column-gap: 5px;

  .tabs {
    grid-column: span 2;
    position: relative;

    .tab1, .tab2, .tab3 {
      position: absolute;
      height: 50px;
      cursor: pointer;
      filter: brightness(0.5);
    }

    .tab1 {
      left: -15px;
      top: -5px;
    }

    .tab2 {
      position: absolute;
      height: 50px;
      left: 55px;
      top: -5px;
    }

    .tab3 {
      left: 125px;
      top: -5px;
    }

    > .active {
      filter: brightness(1);
    }
  }
}`;

const Box = styled.div`
  width: 85px;
  height: 85px;
  border: 1px solid #7b7b7b8c;
  position: relative;
  background: url(${({ img }) => img !== 'None' && img !== 'Blank' ? `${prefix}data/${img}.png` : ''}) no-repeat;
  background-size: contain;

  > span {
    right: 5px;
    bottom: 5px;
    padding: 0 5px;
    font-weight: bold;
    font-size: 13px;
    text-align: center;
    position: absolute;

    background: #000000eb;
  }
}
`;

export default Equipment;