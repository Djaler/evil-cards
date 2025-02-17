import "@/styles/globals.css"
import React, { useEffect } from "react"
import Head from "next/head"
import { useAtom, useAtomValue } from "jotai"
import { useRouter } from "next/router"
import PlausibleProvider from "next-plausible"
import { Transition } from "@headlessui/react"
import packageJson from "../../package.json"

import getMetaTags from "@/lib/seo"
import { gameStateAtom, soundsAtom, reconnectingGameAtom } from "@/lib/atoms"
import { useSocket } from "@/lib/hooks"
import { PreviousPathnameProvider } from "@/lib/contexts/previous-pathname"
import { useSnackbar, updateSnackbar } from "@/components/snackbar/use"
import { mapErrorMessage } from "@/lib/functions"
import { processMessageAndSpeak, processMessageAndPlaySound } from "@/lib/audio"
import { env } from "@/lib/env/client.mjs"
import isBrowserUnsupported from "@/lib/functions/is-browser-unsupported"

import ExclamationTriangle from "../assets/exclamation-triangle.svg"

import type { AppProps } from "next/app"
import type { Message as SendMessage } from "@evil-cards/server/src/lib/ws/receive"
import type { Message as ReceiveMessage } from "@evil-cards/server/src/lib/ws/send"

const MyApp = ({ Component, pageProps }: AppProps) => {
  const { Snackbar, reconnecting } = useSocketEvents()
  const router = useRouter()

  useEffect(() => {
    const shouldNotify = isBrowserUnsupported()

    if (shouldNotify) {
      updateSnackbar({
        message:
          "Похоже, что вы используете неподдерживаемый браузер. Вы не сможете начать игру",
        open: true,
        severity: "information",
        infinite: true
      })
    }
  }, [])

  return (
    <>
      <Head>{getMetaTags(router.asPath)}</Head>
      <PlausibleProvider
        domain={env.NEXT_PUBLIC_PRODUCTION_HOST}
        enabled={env.NEXT_PUBLIC_WITH_ANALYTICS}
        customDomain={`https://analytics.${env.NEXT_PUBLIC_PRODUCTION_HOST}`}
        selfHosted
      >
        <PreviousPathnameProvider>
          {Snackbar}
          <Component {...pageProps} />

          <Reconnecting visible={reconnecting} />
        </PreviousPathnameProvider>
      </PlausibleProvider>
    </>
  )
}

const Reconnecting: React.FC<{ visible?: boolean }> = ({ visible }) => {
  return (
    <Transition
      className="fixed inset-0 z-10 flex items-center justify-center bg-black/75 "
      enter="transition duration-300"
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave="transition duration-300"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
      show={visible}
      appear
    >
      <div className="mx-2 flex flex-col items-center text-center text-xl font-medium text-gray-100">
        <ExclamationTriangle className="h-24 w-24 animate-pulse fill-red-500" />
        <span>Упс, пропало соединение.</span>
        <span>Пытаемся его восстановить.</span>
      </div>
    </Transition>
  )
}

const useSocketEvents = () => {
  const Snackbar = useSnackbar()
  const router = useRouter()

  const [gameState, setGameState] = useAtom(gameStateAtom)
  const sounds = useAtomValue(soundsAtom)

  const [reconnectingGame, setReconnectingGame] = useAtom(reconnectingGameAtom)

  const { sendJsonMessage } = useSocket<SendMessage, ReceiveMessage>({
    onJsonMessage(message) {
      if (reconnectingGame) {
        setReconnectingGame(false)

        if (message.type == "error") {
          router.replace("/")

          return
        }
      }

      if (message.type == "error" && message.details) {
        updateSnackbar({
          message: mapErrorMessage(message.details),
          open: true,
          infinite: false
        })
      }

      if (sounds) {
        if (gameState?.configuration.reader) {
          processMessageAndSpeak(message)
        }

        processMessageAndPlaySound(message)
      }

      switch (message.type) {
        case "join":
          setGameState({
            ...message.details.changedState,
            winners: null
          })
          break
        case "create":
          setGameState({
            ...message.details.changedState,
            redCard: null,
            votes: [],
            deck: [],
            votingEndsAt: null,
            winners: null
          })
          break
        default:
          if (message.type != "ping" && message.type != "error") {
            setGameState((prev) => {
              if (!prev) {
                return null
              }

              let winners = prev.winners
              if (
                message.type == "gameend" &&
                message.details.changedState.players.length >= 3
              ) {
                winners = [...message.details.changedState.players]
                  .sort((a, b) => b.score - a.score)
                  .slice(0, 3)
              }

              const votingEndsAt =
                message.type == "choosingstart"
                  ? null
                  : "votingEndsAt" in message.details.changedState
                  ? message.details.changedState.votingEndsAt
                  : prev.votingEndsAt

              return {
                ...prev,
                ...message.details.changedState,
                votingEndsAt,
                winners
              }
            })
          }
      }
    },
    onClose(_, manually, reconnectingSocket) {
      if (manually || reconnectingSocket == undefined) {
        return
      }

      setReconnectingGame(reconnectingSocket)
    },
    onOpen() {
      const player = gameState?.players.find(
        (player) => player.id == gameState.playerId
      )

      if (player && gameState) {
        sendJsonMessage({
          type: "joinsession",
          details: {
            avatarId: player.avatarId,
            nickname: player.nickname,
            sessionId: gameState.id,
            appVersion: packageJson.version
          }
        })
      }
    }
  })

  return { Snackbar, reconnecting: reconnectingGame }
}

export default MyApp
