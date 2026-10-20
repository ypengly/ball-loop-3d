import { Providers } from './providers'
import { GameShell } from '../components/layout/GameShell'

export default function App() {
  return (
    <Providers>
      <GameShell />
    </Providers>
  )
}
