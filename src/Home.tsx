import { useEffect, useState } from "react";
import styled from "styled-components";
import Countdown from "react-countdown";
import { Button, CircularProgress, Snackbar } from "@material-ui/core";
import Alert from "@material-ui/lab/Alert";

import * as anchor from "@project-serum/anchor";

import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { WalletDialogButton } from "@solana/wallet-adapter-material-ui";

import {
  CandyMachine,
  awaitTransactionSignatureConfirmation,
  getCandyMachineState,
  mintOneToken,
} from "./candy-machine";

const ConnectButton = styled(WalletDialogButton)``;

const CounterText = styled.span``; // add your styles here

const MintContainer = styled.div``; // add your styles here

const MintButton = styled(Button)``; // add your styles here

export interface HomeProps {
  candyMachineId: anchor.web3.PublicKey;
  config: anchor.web3.PublicKey;
  connection: anchor.web3.Connection;
  startDate: number;
  treasury: anchor.web3.PublicKey;
  txTimeout: number;
}

const Home = (props: HomeProps) => {
  const [isActive, setIsActive] = useState(false); // true when countdown completes
  const [isSoldOut, setIsSoldOut] = useState(false); // true when items remaining is zero
  const [isMinting, setIsMinting] = useState(false); // true when user got to press MINT

  const [itemsAvailable, setItemsAvailable] = useState(0);
  const [itemsRedeemed, setItemsRedeemed] = useState(0);

  const [alertState, setAlertState] = useState<AlertState>({
    open: false,
    message: "",
    severity: undefined,
  });

  const [startDate, setStartDate] = useState(new Date(props.startDate));

  const wallet = useAnchorWallet();
  const [candyMachine, setCandyMachine] = useState<CandyMachine>();

  const refreshCandyMachineState = () => {
    (async () => {
      if (!wallet) return;

      const {
        candyMachine,
        goLiveDate,
        itemsAvailable,
        itemsRemaining,
        itemsRedeemed,
      } = await getCandyMachineState(
        wallet as anchor.Wallet,
        props.candyMachineId,
        props.connection
      );

      setItemsAvailable(itemsAvailable);
      setItemsRedeemed(itemsRedeemed);

      setIsSoldOut(itemsRemaining === 0);
      setStartDate(goLiveDate);
      setCandyMachine(candyMachine);
    })();
  };

  const onMint = async () => {
    try {
      setIsMinting(true);
      if (wallet && candyMachine?.program) {
        const mintTxId = await mintOneToken(
          candyMachine,
          props.config,
          wallet.publicKey,
          props.treasury
        );

        const status = await awaitTransactionSignatureConfirmation(
          mintTxId,
          props.txTimeout,
          props.connection,
          "singleGossip",
          false
        );

        if (!status?.err) {
          setAlertState({
            open: true,
            message: "Congratulations! Mint succeeded!",
            severity: "success",
          });
        } else {
          setAlertState({
            open: true,
            message: "Mint failed! Please try again!",
            severity: "error",
          });
        }
      }
    } catch (error: any) {
      // TODO: blech:
      let message = error.msg || "Minting failed! Please try again!";
      if (!error.msg) {
        if (error.message.indexOf("0x138")) {
        } else if (error.message.indexOf("0x137")) {
          message = `SOLD OUT!`;
        } else if (error.message.indexOf("0x135")) {
          message = `Insufficient funds to mint. Please fund your wallet.`;
        }
      } else {
        if (error.code === 311) {
          message = `SOLD OUT!`;
          setIsSoldOut(true);
        } else if (error.code === 312) {
          message = `Minting period hasn't started yet.`;
        }
      }

      setAlertState({
        open: true,
        message,
        severity: "error",
      });
    } finally {
      setIsMinting(false);
      refreshCandyMachineState();
    }
  };

  useEffect(refreshCandyMachineState, [
    wallet,
    props.candyMachineId,
    props.connection,
  ]);

  return (
    <main> 
      <div className="content">
      <table>
        <tr>
        <td className="container">
        <h1>Heroes of Argentum</h1>
        <p>Heroes of Argentum is a collection of NFTs - unique digital collectibles, 
          on the Solana Blockchain. 10,000 heroes have been programmatically 
          generated from a vast array of combinations, each with unique characteristics and 
          different traits.</p>
        <p>Own a hero and join the world of Argentum!</p>
        {wallet && <h2>{itemsRedeemed}/{itemsAvailable} minted</h2>}

        <MintContainer>
          {!wallet ? (
            <ConnectButton>Connect Wallet</ConnectButton>
          ) : (
            <MintButton
              disabled={isSoldOut || isMinting || !isActive}
              onClick={onMint}
              variant="contained"
            >
              {isSoldOut ? (
                "SOLD OUT"
              ) : isActive ? (
                isMinting ? (
                  <CircularProgress />
                ) : (
                  "MINT"
                )
              ) : (
                <Countdown
                  date={startDate}
                  onMount={({ completed }) => completed && setIsActive(true)}
                  onComplete={() => setIsActive(true)}
                  renderer={renderCounter}
                />
              )}
            </MintButton>
          )}
        </MintContainer>

        <Snackbar
          open={alertState.open}
          autoHideDuration={6000}
          onClose={() => setAlertState({ ...alertState, open: false })}
        >
          <Alert
            onClose={() => setAlertState({ ...alertState, open: false })}
            severity={alertState.severity}
          >
            {alertState.message}
          </Alert>
        </Snackbar>
        <div className="footer">
          <div className="buttons">
            <a target="_blank" href="https://twitter.com/HeroesArgentum">
              <img className="logo" src="./twitter-logo.png" width="32" height="32" alt="twitter"></img>
            </a>
            <div className="tooltip">
              <span className="tooltiptext">Soon!</span>
              <img className="logo" src="./discord-logo.png" width="32" height="32" alt="discord"></img>
            </div>
            <a target="_blank" href="https://solscan.io/account/Cb9TfAyWW4DpThYfwnuJ4mhsGTEK6iLaZypLD3eA6vQp">
              <img className="logo" src="./solscan-logo.png" width="32" height="32" alt="solscan"></img>
            </a>
            <a target="_blank" href="https://github.com/martinabenedictis/heroesofargentum">
              <img className="logo" src="./github-logo.png" width="32" height="32" alt="github"></img>
            </a>
            <a target="_blank" href="https://www.google.com/calendar/event?action=TEMPLATE&text=Heroes+of+Argentum+NFT&dates=20211213T140000/20211213T140000&details=Heroes+of+Argentum+is+a+collection+of+NFTs+%26%238211%3B+unique+digital+collectibles+on+Solana+%0A+++Discord+%3A+TBA%0A++Mint+%3A+0.10+SOL%0A+++Supply+%3A+10+000%0A+Twitter+%3A+%40HeroesArgentum%0A++Website+%3A+https%3A%2F%2Fwww.heroesofargentum.io%2F++%0A&location&trp=false&sprop=website:https://nftsolana.io&ctz=UTC">
              <img className="logo" src="./calendar-logo.png" width="32" height="32" alt="calendar"></img>
            </a>
          </div>
          <div className="ad">
            <small>&nbsp;As seen on</small>
            <br></br>
            <a target="_blank" href="https://nftsolana.io/calendar-nft/heroes-of-argentum-nft/">
              <img className="logo" src="./nft-sol-calendar-colored.png" width="140" height="54" alt="solana-nft-calendar"></img>
            </a>
          </div>
        </div>
      </td>
      <td className="container">
        <table>
          <tr>
            <td className="tile"><img src="./ao0.gif" width="160" height="160" alt="img0"></img></td>
            <td className="tile"><img src="./ao1.gif" width="160" height="160" alt="img1"></img></td>
            <td className="tile"><img src="./ao2.gif" width="160" height="160" alt="img2"></img></td>
          </tr>
          <tr>
            <td className="tile"><img src="./ao3.gif" width="160" height="160" alt="img3"></img></td>
            <td className="tile"><img src="./ao4.gif" width="160" height="160" alt="img4"></img></td>
            <td className="tile"><img src="./ao5.gif" width="160" height="160" alt="img5"></img></td>
          </tr>
          <tr>
            <td className="tile"><img src="./ao6.gif" width="160" height="160" alt="img6"></img></td>
            <td className="tile"><img src="./ao7.gif" width="160" height="160" alt="img7"></img></td>
            <td className="tile"><img src="./ao8.gif" width="160" height="160" alt="img8"></img></td>
          </tr>
        </table>
      </td>
      </tr>
      </table>
      </div>
    </main>
  );
};

interface AlertState {
  open: boolean;
  message: string;
  severity: "success" | "info" | "warning" | "error" | undefined;
}

const renderCounter = ({ days, hours, minutes, seconds, completed }: any) => {
  return (
    <CounterText>
      {days} days, {hours} hours, {minutes} minutes, {seconds} seconds
    </CounterText>
  );
};

export default Home;
