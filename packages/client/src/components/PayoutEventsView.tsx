import React, { Component } from 'react';
import { drizzleConnect } from "@drizzle/react-plugin";
import { Flex, Flash, Card, Box, Text } from "rimble-ui";

import styled from "styled-components";
import Tournament from './Tournament';

const StyledFlex = styled(Flex)`
  flex-direction: column;

  @media screen and (min-width: 768px) {
    flex-direction: row;
  }
`
const StyledCard = styled(Card)`
  padding: 1rem 0.5rem;
  margin: 1rem;
  
  @media screen and (min-width: 640px) {
    padding: 2rem 1rem;
    margin: 0 1rem;
  }
`

class PayoutEventsView extends Component<any, any> {
  constructor(props) {
    super(props);
    this.state = {
      currentNetwork: null,
      address: null,
      events:[],
    }
  }

  componentDidMount() {
    const { address, networkId, drizzleStatus, drizzle} =  this.props

    this.updateAddress(address)
    this.updateDrizzle(networkId, drizzleStatus, drizzle)
  }

  componentWillReceiveProps(newProps) {
    const { address, networkId, drizzleStatus, drizzle } = this.props
    const { address: newAddress, networkId: newNetworkId, 
      drizzleStatus: newDrizzleStatus, drizzle: newDrizzle } = newProps

    if (address !== newAddress) {
      this.updateAddress(newAddress)
    }
    if (networkId !== newNetworkId || drizzleStatus !== newDrizzleStatus
      || drizzle !== newDrizzle) {
      this.updateDrizzle(newNetworkId, newDrizzleStatus, newDrizzle)
    }
  }

  updateAddress = (address) => {
    this.setState({ address })
  }

  updateDrizzle = (networkId, drizzleStatus, drizzle) => {
    if (networkId) {
      this.setState({ currentNetwork: networkId} );
    }
    if (!drizzleStatus.initialized && window.web3 && drizzle !== null) {
      window.web3.version.getNetwork((error, networkId) => {
        this.setState({ currentNetwork: parseInt(networkId) } );
      });
    }
    if (drizzleStatus.initialized && window.web3 && drizzle !== null) {
      this.fetchEvents();
    }
  }

  fetchEvents = async () => {
    const { drizzle, account } = this.props;

    const contract = drizzle.contracts.Tournaments;
    contract.events.PrizeTransfered({
      filter: { player: account },
      fromBlock: 0
    })
    .on('data', (event) => {
      this.addEvent(event)
    })
  }

  addEvent = (event) => {
    const { events } = this.state
    events.push(event)
    this.setState({
      events
    })
  }

  render() {
    const { account, accountValidated} = this.props
    const { events } = this.state

    const eventsRendered = events.map(event => 
      <Flex key={event.id}>
        <Box mr={2}>Amount: {event.returnValues.amount}</Box>
        <Box mr={2}>tournamentId: {event.returnValues.tournamentId}</Box>
        <Box mr={2}>resultId: {event.returnValues.resultId}</Box>
      </Flex>
    )

    // event.returnValues.amount
    // tournamentId
    // resultId

    return (
      <StyledCard px={3} py={4}>
        {account && accountValidated ? (
          <>
            {eventsRendered}
          </>
        ) : (
          <Flash> You have to be logged in to view. </Flash>
        )}
      </StyledCard>  
    );
  }

}
/*
 * Export connected component.
 */
const mapStateToProps = state => {
  return {
    drizzleStatus: state.drizzleStatus,
    address: state.accounts[0],
    networkId: state.web3.networkId
  };
};
  
export default drizzleConnect(PayoutEventsView, mapStateToProps);