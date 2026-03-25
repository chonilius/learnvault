import { Card } from "@stellar/design-system"
import { type ReactNode } from "react"
import { useWallet } from "../hooks/useWallet"
import ConnectAccount from "./ConnectAccount"

// If wallet is not connected, show a prompt instead of the page content
const ConnectWalletGuard = ({ children }: { children: ReactNode }) => {
  const { address } = useWallet() // existing hook
  const isConnected = !!address
  if (!isConnected) {
    return (
      <Card>
        <p>Please connect your wallet to continue.</p>
        <ConnectAccount />
      </Card>
    )
  }
  return <>{children}</>
}

export default ConnectWalletGuard