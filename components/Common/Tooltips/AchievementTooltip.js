import styled from 'styled-components'
import { Tooltip } from "@material-ui/core";
import { cleanUnderscore, prefix } from "../../../Utilities";

const AchievementTooltip = ({ desc, name, rewards, currentQuantity, quantity, rawName, children }) => {
  return (
    <AchievementTooltipStyle
      interactive
      enterTouchDelay={100}
      placement={"top-start"}
      title={<div className='tooltip-body'>
        <div className={'title'}>
          <img src={`${prefix}data/${rawName}.png`} alt=""/>
          {cleanUnderscore(name)}
        </div>
        {cleanUnderscore(desc)}
        <div>
          <div className={'sub-title'}>Rewards:</div>
          {cleanUnderscore(rewards.join(', '))}
        </div>
        {currentQuantity ? <div>
          Progress: {currentQuantity} {quantity > 1 ? <span> / {quantity}</span> : null}
        </div> : null}
      </div>}>
      {children}
    </AchievementTooltipStyle>
  );
};

const AchievementTooltipStyle = styled((props) => (
  <Tooltip
    {...props}
    classes={{ popper: props.className, tooltip: "tooltip", touch: "touch" }}
  />
))`

  & .tooltip {
    will-change: contents;
    background-color: #393e46;
    box-shadow: 0 2px 4px -1px rgb(0 0 0 / 20%),
    0px 4px 5px 0px rgb(0 0 0 / 14%), 0px 1px 10px 0px rgb(0 0 0 / 12%);
    font-size: 16px;
    min-width: 330px;

  }

  & .touch {
  }

  .tooltip-body {
    min-width: 330px;
    padding: 10px;

    .info {
      margin-bottom: 15px;
    }
  }

  .title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 22px;
    margin-bottom: 15px;
    font-weight: bold;
  }

  .sub-title {
    font-size: 18px;
    margin: 10px 0;
    font-weight: bold;
  }
`;

export default AchievementTooltip;
