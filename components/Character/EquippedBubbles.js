import React from 'react';
import { cleanUnderscore, prefix } from "../../Utilities";
import styled from 'styled-components';

const EquippedBubbles = ({ bubbles }) => {
  return (
    <EquippedBubblesStyled>
      {bubbles?.map((bubbleName, index) => {
        const alteredBubbleName = bubbleName === 'Sanic_Tools' ? 'Bug2' : bubbleName;
        return <img title={cleanUnderscore(alteredBubbleName)} key={bubbleName + index}
                    src={`${prefix}alchemy/${alteredBubbleName}.png`} alt=""/>;
      })}
    </EquippedBubblesStyled>
  );
};

const EquippedBubblesStyled = styled.div`
  justify-self: center;
  @media (max-width: 750px) {
    img {
      width: 48px;
      height: 48px;
    }
  }

  @media (max-width: 370px) {
    img {
      width: 36px;
      height: 36px;
    }
  }
`;

export default EquippedBubbles;