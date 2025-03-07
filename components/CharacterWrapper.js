import Character from "./Character";
import React, { useContext } from "react";
import styled from 'styled-components';
import { AppContext } from "./Common/context";

const CharacterWrapper = ({ characters, lab }) => {
  const { dataFilters, displayedCharactersIndices, lastUpdated } = useContext(AppContext);

  const getFilters = () => {
    return dataFilters?.reduce((res, field) => ({ ...res, ...(field?.selected ? { [field?.name]: true } : {}) }), {});
  }

  return <CharacterWrapperStyle>
    {characters?.map((characterData, tabPanelIndex) => {
      return displayedCharactersIndices[tabPanelIndex] ?
        <Character lab={lab} dataFilters={getFilters()} {...characterData} lastUpdated={lastUpdated} key={tabPanelIndex}/> : null;
    })}
  </CharacterWrapperStyle>
}

const CharacterWrapperStyle = styled.div`
  position: relative;
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(390px, 1fr));

`;

export default CharacterWrapper;