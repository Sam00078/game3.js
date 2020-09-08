import React, { Component } from 'react'
import styled from 'styled-components';

import { getTournamentResult, getTournaments, getTournament } from '../helpers/database'
import shortenAddress from "../core/utilities/shortenAddress"

import { RouteComponentProps, navigate } from '@reach/router';
import qs from 'querystringify';
import { format } from 'date-fns';

import CSS from 'csstype';
import { baseColors, fonts, shadows, } from '../styles';

import {
  TOURNAMENT_STATE_ACTIVE,
  TOURNAMENT_STATE_ENDED,
  TOURNAMENT_STATE_DRAFT
} from '../constants'

import { Constants } from '@game3js/common';
import web3 from 'web3';

const SharesText = styled.p`
  display: flex;
  justify-content: space-evenly;
  align-items: center;

  .place {
    font-family: 'Apercu Bold', sans-serif;
    font-weight: bold;
    margin-right: 1rem;
  }
`;

class TournamentResultsCard extends Component<any, any> {
  constructor(props) {
    super(props)

    this.state = {
      results: [],
      tournament: {},
      isLoading: false,
      shares: []
    }
  }

  componentDidMount() {
    this.getBlockchainInfo(this.props)
  }

  componentWillReceiveProps(newProps) {
    const { tournamentId, address } = this.props
    const { tournamentId: newId, address: newAddress } = newProps

    if (tournamentId !== newId || address !== newAddress) {
      this.getBlockchainInfo(newProps)
    }
  }

  parseData(data) {
    console.log("The data is", data)
    return data.split(' ').join('').split(",");
  }

  async getTournamentAndLeaderBoards(tournamentId: any, loggedIn: boolean) {
    const { drizzle } = this.props;

    this.setState({ isLoading: true })

    console.log(`getBlockchainInfo: ${tournamentId}`)
    const contract = drizzle.contracts.Tournaments;
    let results = [];
    let tournament = {
      id: '',
      name: '',
      gameStage: undefined,
      timeZone: '',
      startTime: '',
      endTime: '',
      startDate: '',
      endDate: '',
      state: 0,
      pool: ''
    }

    // Get tournament info

    if (tournamentId === undefined) {
      tournament = null

      return this.setState({
        results,
        tournament,
        isLoading: false
      })
    }
    let raw = undefined;
    if (loggedIn) {
      raw = await contract.methods.getTournament(tournamentId).call()
      await this.fetchShares(tournamentId);
      let data = this.parseData(raw['5']);
      const gameName = data[0];
      tournament = {
        id: tournamentId,
        name: gameName,
        gameStage: undefined,
        timeZone: 'GMT+8',
        startTime: '12:00',
        endTime: format(new Date(parseInt(raw['1'])), 'MMM d, yyyy'),
        startDate: '8/16',
        endDate: '9/4',
        state: parseInt(raw['3']),
        pool: raw['4']
      }
    } else {
      raw = await getTournament(tournamentId);
      console.log("TOURNAMENT DATA FROM DB", raw);
      let data = this.parseData(raw[0].data);
      let gameName = data[0];
      tournament = {
        id: tournamentId,
        name: gameName,
        gameStage: undefined,
        timeZone: 'GMT+8',
        startTime: '12:00',
        endTime: format(new Date(parseInt(raw[0].endTime)), 'MMM d, yyyy'),
        startDate: '8/16',
        endDate: '9/4',
        state: parseInt(raw[0].state),
        pool: raw[0].pool
      }
      console.log("FETCH SHARES NOT LOGGED IN", raw[0].shares);
      console.log("FETCH POOL NOT LOGGED IN", raw[0].pool);
      this.setState({
        shares: raw[0].shares
      })
    }

    switch (tournament.name) {
      case Constants.WOM:
        tournament.gameStage = "United Kingdom";
        break;
      default:
        tournament.gameStage = undefined;
        break;
    }

    // Get tournament results
    // const resultsCount = await contract.methods.getResultsCount(tournamentId).call()
    let sessionsData = await getTournamentResult(tournamentId);
    console.log("PLAYER ADD: sessionsData", sessionsData);

    if (sessionsData.length > 0) {
      for (let resultIdx = 0; resultIdx < (sessionsData.length > 10 ? 10 : sessionsData.length); resultIdx++) {
        let playerAddress = Object.keys(sessionsData[resultIdx].sessionData.playerData)[0];
        console.log("PLAYER ADD: address", playerAddress);

        results.push({
          name: sessionsData[resultIdx].sessionData.playerData[playerAddress].name,
          tournamentId: tournamentId,
          timeIsUp: false,
          playerAddress,
          sessionId: sessionsData[resultIdx].id,
          sessionData: sessionsData[resultIdx].sessionData.playerData[playerAddress]
        })
      }
      // let sessions = [];
      // results.forEach(result => {
      //   session = await 
      // })

      // const sessions = await Promise.all(results.map(async result => {
      //   const session = await getGameSession(result.sessionId, result.playerAddress, tournamentId);
      //   return session;
      // }))  

      // results.forEach((result, idx) => result.sessionData = sessions[idx])
      console.log("RESULTS:", results)
      results = results.filter(result => !!result.sessionData && !!result.name)
      if (results.length > 1) {
        // Sorts in ascending order
        results.sort((el1, el2) => el1.sessionData.currentHighestNumber - el2.sessionData.currentHighestNumber)
      }
    }
    this.setState({
      results,
      tournament,
      isLoading: false
    })
  }

  getBlockchainInfo = async (props) => {
    const { tournamentId } = props

    if (this.props.drizzle.contracts.Tournaments) {
      const { drizzle } = this.props;
      // Get the latest tournament
      const contract = drizzle.contracts.Tournaments;

      console.log("TOURNAMENT ID = ", tournamentId)
      const tournamentLength = await contract.methods.getTournamentsCount().call();
      let tI = undefined;
      if (tournamentLength > 0) {
        tI = tournamentId || tournamentId === 0 ? tournamentId : tournamentLength - 1;
      }
      await this.getTournamentAndLeaderBoards(tI, true);
    } else {
      let ids = await getTournaments();
      console.log("IDSSSS", ids);
      let tId = undefined;
      if (ids.length > 0) {
        tId = ids[ids.length - 1].id
      }
      console.log("THE ID IN DB IS", tId);
      await this.getTournamentAndLeaderBoards(tId, false);
    }
  }

getStatus(tournament: any) {
  switch (tournament.state) {
    case TOURNAMENT_STATE_DRAFT:
      return 'Draft'
      break;
    case TOURNAMENT_STATE_ACTIVE:
      return 'Active'
      break;
    case TOURNAMENT_STATE_ENDED:
      return 'Done'
      break;
    default:
      return 'None'
      break;
  }
}

formatTourneyTimeInfo(tournament: any) {
  const {
    startDate,
    endTime,
    startTime,
    timeZone
  } = tournament;
  let info =
    `Ends on ${endTime} ${timeZone}`;

  return info;
}

// Formats the title of the tournament along with its ID 
formatTourneyTitle(tournament: any) {
  return `${tournament.name} #${tournament.id}`;
}

handleJoinClick = () => {
  navigate('tournaments')
}

setResultBgColor(playerAddress, currentPlayerAddress) {
  if (playerAddress && playerAddress.toLowerCase() === currentPlayerAddress.toLowerCase()) {
    return baseColors.lightGrey;
  } else {
    return baseColors.white;
  }
}

fetchShares = async (tournamentId) => {
  console.log("FETCH SHARES");
  const { drizzle } = this.props;

  try {
    const contract = drizzle.contracts.Tournaments;
    const shares = await contract.methods.getShares(tournamentId).call();

    this.setState({ shares });
  }
  catch (e) { }
}

setTrophy(idx, shares) {
  if (idx < shares.length) {
    switch (idx) {
      case 0:
        return <span>&#x1F947;</span>
      case 1:
        return <span>&#x1F948;</span>
      default:
        return <span>&#x1F949;</span>
    }
  }
}

formatTime = (time, isLeaderBoards) => {
  if (time) {
    const seconds = (parseInt(time) / 1000).toFixed(2);
    const minutes = Math.floor(parseInt(seconds) / 60);
    let totalTime = '';
    if (parseInt(seconds) > 60) {
      let sec = (parseInt(seconds) % 60).toFixed(2);

      totalTime += isLeaderBoards ? (minutes + ":" + sec).toString() : (minutes + "min" + " " + sec + "sec").toString()
    } else {
      totalTime += isLeaderBoards ? ("0:" + seconds).toString() : (seconds + "sec").toString()
    }
    return totalTime
  }
}

render() {
  const { results, isLoading, tournament, shares } = this.state;
  const { tournamentId, playerAddress } = this.props;

    // console.log("SHARES FROM STATE", shares);
    // console.log("POOL FROM STATE", tournament.pool);
    // console.log(results);

    if (isLoading) {
      return (
        <div style={divLoadingStyle}>
          Loading...
        </div>
      )
    }

  let resultDivs = null;

    if (results.length > 0) {
      console.log("result length > 0")
      resultDivs = results.map( (result, idx) => {

        if (result.sessionData) {
          return( 
          <div 
            style={{...resultDivStyle, background: `rgb(${this.setResultBgColor(playerAddress, result.playerAddress)})`}} 
            key={result.sessionId}
          >
            <span style={playerAddressStyle}>
              {shortenAddress(result.playerAddress)}
            </span>
              {idx < shares.length ? <span>{
               <p>{this.setTrophy(idx, shares)} {(parseInt(web3.utils.fromWei(tournament.pool)) * parseInt(shares[idx]) / 100)} ETH</p>
              }</span> : ""}
              <span style={timeLeftStyle}>
                {result.sessionData.currentHighestNumber && this.formatTime(result.sessionData.currentHighestNumber, true)}
              </span>
            </div>
          )
        }
      });
    } else {
      if (!tournamentId) {
        resultDivs = (
          <div style={resultDivStyle}>
            Join Tournament to be in leaderboards!
          </div>
        )
      } else {
        resultDivs = shares.map( (share, idx) => {
          let place = <span className="place">{idx + 1}</span>;
          let trophy = <span className="trophy">{this.setTrophy(idx, shares)}</span>;
          let shareETH = <span className="share">{(parseInt(web3.utils.fromWei(tournament.pool)) * parseInt(share) / 100)} ETH</span>
          return(
          <SharesText key={idx}>
            <span>
              {place} 
              {trophy} 
            </span>
            {shareETH}
          </SharesText>
          )
        })
      }
    }

return (
  <div style={widgetStyle}>
    {!!tournament ? (
      <>
        <div style={tournamentInfoStyle}>
          {tournament.gameStage ? (
            <span style={tourneyTitleStyle}>{tournament.gameStage}</span>
          ) : (
              <span style={tourneyTitleStyle}>{this.formatTourneyTitle(tournament)}</span>
            )
          }
          <span style={tourneyTitleInfo}>{this.formatTourneyTimeInfo(tournament)}</span>
          <span style={tourneyTitleInfo}>Status: {this.getStatus(tournament)}</span>
        </div>
        <div style={leaderBoardStyle}>
          <h1 style={titleHeader}>Leaderboard</h1>
          <div style={resultDivsStyle}>
            {resultDivs}
          </div>
        </div>
        {tournamentId === undefined ? (
          <button style={joinTourneyBtn} onClick={this.handleJoinClick}>JOIN TOURNAMENT</button>
        ) : (
            <div style={totalBuyIn} >
              <span>Total Buy-in Pool</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{tournament.pool && web3.utils.fromWei((tournament.pool).toString())} ETH</span>
            </div>
          )}
      </>
    ) : (
        <div style={tournamentInfoStyle}>
          <span style={tourneyTitleStyle}>No Tournaments</span>
        </div>
      )}
  </div>
)
  }
}

const widgetStyle: CSS.Properties = {
  width: '100%',
  height: '100%',
  padding: '0.8rem 1rem',
  justifyContent: 'center',
}

const leaderBoardStyle: CSS.Properties = {
  width: '100%',
  padding: '0.8rem 1rem',
  display: 'flex',
  flexDirection: 'column',
  margin: '0 0 0.5rem 0',
  background: `rgb(${baseColors.white})`,
  boxShadow: shadows.soft,
  justifyContent: 'center',
  // borderRadius: '7px 7px 0 0'
}

const divLoadingStyle: CSS.Properties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}

const titleHeader: CSS.Properties = {
  textTransform: 'uppercase',
  fontFamily: fonts.family.ApercuBold,
  margin: '1rem auto',
  fontSize: fonts.size.h4,
  fontWeight: fonts.weight.medium,
  color: `rgb(${baseColors.dark})`
}

const resultDivsStyle: CSS.Properties = {
  width: '100%',
  padding: '1rem',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center'
}

const resultDivStyle: CSS.Properties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  margin: '0 0 1rem 0',
  padding: '0.3rem 0.5rem'
}

const playerAddressStyle: CSS.Properties = {
  fontSize: fonts.size.medium,
  color: `rgb(${baseColors.dark})`,
  fontFamily: fonts.family.ApercuBold,
  marginRight: '0.2rem'
}

const timeLeftStyle: CSS.Properties = {
  fontSize: fonts.size.medium,
  color: `#0093d5`,
  fontFamily: fonts.family.ApercuBold,
  marginLeft: '0.2rem'
}

const tournamentInfoStyle: CSS.Properties = {
  width: '100%',
  background: `#ffb600`,
  padding: '0.9rem',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: shadows.soft,
  justifyContent: 'center',
  alignItems: 'center',
  borderRadius: '7px 7px 0 0'
}

const tourneyTitleStyle: CSS.Properties = {
  fontSize: fonts.size.h5,
  fontFamily: fonts.family.ApercuBold,
  color: `rgb(${baseColors.dark})`,
  margin: '5px'
}

const tourneyTitleInfo: CSS.Properties = {
  fontSize: fonts.size.medium,
  fontFamily: fonts.family.ApercuLight,
  color: `rgb(${baseColors.dark})`
}

const joinTourneyBtn: CSS.Properties = {
  fontSize: fonts.size.medium,
  fontFamily: fonts.family.ApercuBold,
  color: `rgb(${baseColors.dark})`,
  background: `#06df9b`,
  padding: '1rem 0.9rem',
  width: '100%',
  cursor: 'pointer',
  outline: 'none',
  border: 'none',
  borderRadius: '7px'
}

const totalBuyIn: CSS.Properties = {
  fontSize: fonts.size.medium,
  fontFamily: fonts.family.ApercuBold,
  color: `rgb(${baseColors.dark})`,
  background: `#06df9b`,
  padding: '1rem 0.9rem',
  width: '100%',
  cursor: 'pointer',
  outline: 'none',
  border: 'none',
  borderRadius: '7px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  flexDirection: 'column',
}

export default TournamentResultsCard