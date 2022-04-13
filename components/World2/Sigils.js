import { cleanUnderscore, kFormatter, prefix } from "../../Utilities";
import styled from 'styled-components';

const Sigils = ({ sigils }) => {
  return (
    <SigilList>
      {sigils?.map((sigil, index) => {
        if (index > 20) return null;
        const { name, effect, unlockCost, boostBonus, unlockBonus } = sigil;
        return <Sigil key={`${name}-${index}`}>
          <img className={'icon'} src={`${prefix}data/aSiga${index}.png`} alt=""/>
          <div className={'text'}>
            <div className={'name'}>{cleanUnderscore(name)}</div>
            <div><span className={'bold'}>Effect:</span> {cleanUnderscore(effect.replace(/{/g, unlockBonus))}</div>
            <div><span className={'bold'}>Boost Bonus:</span> {kFormatter(boostBonus, 2)}</div>
            <div><span className={'bold'}>Unlock Cost:</span> {kFormatter(unlockCost, 2)}</div>
          </div>
        </Sigil>
      })}
    </SigilList>
  );
};

const SigilList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  justify-content: center;
`;

const Sigil = styled.div`
  display: flex;
  align-items: center;
  width: 450px;
  gap: 10px;

  .icon {
    object-fit: contain;
  }

  .text {
    max-width: 500px;

    .bold {
      font-weight: bold;
    }

    .name {
      font-weight: bold;
      margin-bottom: 10px;
    }
  }
`


export default Sigils;
