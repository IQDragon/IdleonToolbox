import styled from 'styled-components'
import { cleanUnderscore, findQuantityOwned, kFormatter, prefix } from "../../Utilities";
import React from "react";

const CraftItemsList = ({
                          inventoryItems,
                          itemsList = [],
                          copies = 1,
                          showEquips = true,
                          showFinishedItems = true
                        }) => {
  return (
    <CraftItemsListStyle>
      {itemsList?.map(({ itemName, itemQuantity, rawName, type }, index) => {
        if (!showEquips && type === 'Equip') return null;
        const { amount:quantityOwned } = findQuantityOwned(inventoryItems, itemName);
        if (!showFinishedItems && quantityOwned >= itemQuantity) return null;
        return <div key={itemName + index} className='item' title={rawName}>
          <img
            title={cleanUnderscore(itemName)}
            src={`${prefix}data/${rawName}.png`}
            alt=''
          />
          <span className={quantityOwned >= (parseInt(itemQuantity) * copies) ? "material-value-done" : ""}>
            {kFormatter(quantityOwned, 2)}/{kFormatter(parseInt(itemQuantity) * copies, 2)}
        </span>
        </div>;
      })}
    </CraftItemsListStyle>
  );
};

const CraftItemsListStyle = styled.div`
  margin-top: 15px;

  display: grid;
  gap: 5px;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));

  .item {
    display: flex;
    align-items: center;
  }

  .material-value-done {
    color: #35d435;
    font-weight: bold;
    font-size: 18px;
  }
`;

export default CraftItemsList;
